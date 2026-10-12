// ============================================================
// Admin user store + opaque server-side session store (README §8.2).
//
// Sessions are OPAQUE 256-bit ids backed by a server-side record — not
// self-contained tokens. That is what makes revocation immediate and stops an
// old token from outliving a role change.
//
// JSON files back local development; PostgreSQL backs production.
// ============================================================
import crypto from 'node:crypto';
import { readJSON, writeJSON } from '../store';
import { getPool, postgresEnabled, withTransaction } from '../db';

const IDLE_MS = Number(process.env.PB_SESSION_IDLE_MINUTES || 30) * 60 * 1000;
const ABSOLUTE_MS = Number(process.env.PB_SESSION_ABSOLUTE_HOURS || 8) * 60 * 60 * 1000;

/* ----------------------------- users ----------------------------- */

export async function listUsers() {
  if (postgresEnabled()) {
    const { rows } = await getPool().query('SELECT data FROM pb_users ORDER BY email');
    return rows.map((row) => row.data);
  }
  return readJSON('users.json', []);
}

export async function findUserByEmail(email) {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;

  if (postgresEnabled()) {
    const { rows } = await getPool().query('SELECT data FROM pb_users WHERE email = $1', [target]);
    return rows[0]?.data || null;
  }
  const users = (await listUsers()).filter((u) => u && typeof u.email === 'string' && u.email.trim());
  return users.find((u) => u.email.toLowerCase() === target) || null;
}

export async function upsertUser(user) {
  const safeUser = user || {};
  const email = String(safeUser.email || '').trim().toLowerCase();

  if (!email) {
    throw new Error('User email is required');
  }

  const normalized = { ...safeUser, email };
  if (postgresEnabled()) {
    await getPool().query(
      `INSERT INTO pb_users (id, email, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, data = EXCLUDED.data`,
      [normalized.id, email, normalized]
    );
    return normalized;
  }

  const users = (await listUsers()).filter((u) => u && typeof u.email === 'string' && u.email.trim());
  const i = users.findIndex((u) => u.email.toLowerCase() === email);
  if (i === -1) users.push(normalized); else users[i] = { ...users[i], ...normalized };
  writeJSON('users.json', users);
  return users[i === -1 ? users.length - 1 : i];
}

/* ---------------------------- sessions ---------------------------- */

// sid -> { userId, email, role, apps, issuedAt, lastSeen, expiresAt, revokedAt, ip, userAgent }
function readSessions() {
  return readJSON('sessions.json', {});
}

function writeSessions(all) {
  writeJSON('sessions.json', all);
}

function prune(all) {
  const now = Date.now();
  let changed = false;
  for (const [sid, s] of Object.entries(all)) {
    if (s.revokedAt || s.expiresAt <= now) { delete all[sid]; changed = true; }
  }
  return changed;
}

/** Mint an opaque session id; the record never reaches the browser. */
export async function createSession(user, { ip, userAgent } = {}) {
  const sid = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  if (postgresEnabled()) {
    return withTransaction(async (client) => {
      const { rows } = await client.query('SELECT data FROM pb_users WHERE id = $1 FOR UPDATE', [user.id]);
      if (!rows[0]) throw new Error('Cannot create a session for a missing user');
      const currentUser = rows[0].data;
      const sessionNow = Date.now();
      const session = {
        sid,
        userId: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        apps: currentUser.apps || [],
        issuedAt: sessionNow,
        lastSeen: sessionNow,
        expiresAt: sessionNow + ABSOLUTE_MS,
        revokedAt: null,
        ip: ip || null,
        userAgent: userAgent || null,
      };
      await client.query('DELETE FROM pb_sessions WHERE expires_at <= $1', [sessionNow]);
      await client.query(
        'INSERT INTO pb_sessions (sid, user_id, expires_at, last_seen, data) VALUES ($1, $2, $3, $4, $5)',
        [sid, session.userId, session.expiresAt, session.lastSeen, session]
      );
      return sid;
    });
  }

  const session = {
    sid,
    userId: user.id,
    email: user.email,
    role: user.role,
    apps: user.apps || [],
    issuedAt: now,
    lastSeen: now,
    expiresAt: now + ABSOLUTE_MS,
    revokedAt: null,
    ip: ip || null,
    userAgent: userAgent || null,
  };
  const all = readSessions();
  prune(all);
  all[sid] = session;
  writeSessions(all);
  return sid;
}

/**
 * Look up a session. `touch: true` applies the SLIDING idle timeout and must
 * only be used where cookies can be written (Route Handlers).
 */
export async function getSessionBySid(sid, { touch = false } = {}) {
  if (!sid) return null;
  if (postgresEnabled()) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT data, expires_at, last_seen FROM pb_sessions WHERE sid = $1',
      [sid]
    );
    const row = rows[0];
    if (!row) return null;

    const now = Date.now();
    if (Number(row.expires_at) <= now || (touch && now - Number(row.last_seen) > IDLE_MS)) {
      await pool.query('DELETE FROM pb_sessions WHERE sid = $1', [sid]);
      return null;
    }
    if (touch) {
      row.data.lastSeen = now;
      await pool.query(
        'UPDATE pb_sessions SET last_seen = $2, data = $3 WHERE sid = $1',
        [sid, now, row.data]
      );
    }
    return row.data;
  }

  const all = readSessions();
  const s = all[sid];
  if (!s) return null;

  const now = Date.now();
  if (s.revokedAt || s.expiresAt <= now) { delete all[sid]; writeSessions(all); return null; }
  if (touch) {
    if (now - s.lastSeen > IDLE_MS) {                 // idle too long -> expire
      delete all[sid];
      writeSessions(all);
      return null;
    }
    s.lastSeen = now;
    writeSessions(all);
  }
  return s;
}

export async function revokeSession(sid) {
  if (!sid) return false;
  if (postgresEnabled()) {
    const { rowCount } = await getPool().query('DELETE FROM pb_sessions WHERE sid = $1', [sid]);
    return rowCount > 0;
  }
  const all = readSessions();
  if (!all[sid]) return false;
  all[sid].revokedAt = Date.now();
  delete all[sid];
  writeSessions(all);
  return true;
}

/** Used on role/app-scope change, password change, or admin-initiated revoke. */
export async function revokeAllForUser(userId) {
  if (postgresEnabled()) {
    const { rowCount } = await getPool().query('DELETE FROM pb_sessions WHERE user_id = $1', [userId]);
    return rowCount;
  }
  const all = readSessions();
  let n = 0;
  for (const [sid, s] of Object.entries(all)) {
    if (s.userId === userId) { delete all[sid]; n += 1; }
  }
  writeSessions(all);
  return n;
}

export async function setUserRole(userId, role, apps, actorEmail) {
  if (postgresEnabled()) {
    return withTransaction(async (client) => {
      const { rows } = await client.query('SELECT data FROM pb_users WHERE id = $1 FOR UPDATE', [userId]);
      if (!rows[0]) return null;
      const user = {
        ...rows[0].data,
        role,
        apps,
        updatedAt: new Date().toISOString(),
        updatedBy: actorEmail,
      };
      await client.query('UPDATE pb_users SET data = $2 WHERE id = $1', [userId, user]);
      const revoked = await client.query('DELETE FROM pb_sessions WHERE user_id = $1', [userId]);
      return { user, revoked: revoked.rowCount };
    });
  }
  const users = (await listUsers()).filter((u) => u && u.id);
  const i = users.findIndex((u) => u.id === userId);
  if (i === -1) return null;
  users[i] = { ...users[i], role, apps, updatedAt: new Date().toISOString(), updatedBy: actorEmail };
  writeJSON('users.json', users);
  const revoked = await revokeAllForUser(userId); // role change kills live sessions
  return { user: users[i], revoked };
}

export const SESSION_POLICY = { IDLE_MS, ABSOLUTE_MS };
