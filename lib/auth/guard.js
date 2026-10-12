// ============================================================
// Login throttling/lockout + CSRF double-submit token (README §8.3, §8.6).
// ============================================================
import crypto from 'node:crypto';
import { getPool, postgresEnabled } from '../db';

/* ------------------------- login throttling ------------------------- */

const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30 * 1000;
const MAX_LOCK_MS = 15 * 60 * 1000;

const buckets = new Map(); // key -> { failures, lockedUntil }

function bucket(key) {
  return buckets.get(key) || { failures: 0, lockedUntil: 0 };
}

/** Checked BEFORE verifying credentials. */
export async function loginAllowed(...keys) {
  const now = Date.now();
  if (postgresEnabled()) {
    const { rows } = await getPool().query(
      'SELECT locked_until FROM pb_login_attempts WHERE key = ANY($1::text[])',
      [keys]
    );
    const active = rows.find((row) => Number(row.locked_until) > now);
    return active
      ? { allowed: false, retryAfterMs: Number(active.locked_until) - now }
      : { allowed: true, retryAfterMs: 0 };
  }
  for (const k of keys) {
    const b = bucket(k);
    if (b.lockedUntil > now) {
      return { allowed: false, retryAfterMs: b.lockedUntil - now };
    }
  }
  return { allowed: true, retryAfterMs: 0 };
}

export async function recordLoginFailure(...keys) {
  const now = Date.now();
  if (postgresEnabled()) {
    const pool = getPool();
    for (const key of keys) {
      await pool.query(
        `INSERT INTO pb_login_attempts (key, failures, locked_until)
         VALUES ($1, 1, 0)
         ON CONFLICT (key) DO UPDATE SET
           failures = pb_login_attempts.failures + 1,
           locked_until = CASE
             WHEN pb_login_attempts.failures + 1 > $2
             THEN $3 + LEAST($4, $5 * POWER(2, pb_login_attempts.failures + 1 - $2 - 1))
             ELSE pb_login_attempts.locked_until
           END`,
        [key, FREE_ATTEMPTS, now, MAX_LOCK_MS, BASE_LOCK_MS]
      );
    }
    return;
  }
  for (const k of keys) {
    const b = bucket(k);
    b.failures += 1;
    if (b.failures > FREE_ATTEMPTS) {
      const step = b.failures - FREE_ATTEMPTS - 1;
      b.lockedUntil = now + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** step);
    }
    buckets.set(k, b);
  }
}

export async function recordLoginSuccess(...keys) {
  if (postgresEnabled()) {
    await getPool().query('DELETE FROM pb_login_attempts WHERE key = ANY($1::text[])', [keys]);
    return;
  }
  for (const k of keys) buckets.delete(k);
}

/* ------------------------------- CSRF ------------------------------- */

export function issueCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  if (x.length === 0 || x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

/**
 * Double-submit validation: the header must match the readable cookie.
 * `SameSite=Lax` on the session cookie is the second layer.
 */
export function csrfValid(req) {
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get('x-csrf-token');
  return safeEqual(headerToken, cookieToken);
}

export const CSRF_COOKIE = 'pb_csrf';

export function csrfCookieOptions() {
  return {
    httpOnly: false,        // must be readable by the client to echo it back
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(8 * 60 * 60),
  };
}
