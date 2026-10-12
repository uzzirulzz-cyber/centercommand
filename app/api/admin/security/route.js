// ============================================================
// /api/admin/security — audit log, live sessions and staff roles.
//
// This is the real read model behind the Security & Audit page: it reads the
// append-only audit log, the server-side session store and the user store. No
// password hashes and no MFA secrets are ever sent to the client.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason, ROLE_MATRIX, ROLES, ACTIONS } from '../../../../lib/rbac';
import { listUsers } from '../../../../lib/auth/store';
import { readAudit } from '../../../../lib/audit';
import { getPool, postgresEnabled } from '../../../../lib/db';
import { readJSON } from '../../../../lib/store';
import { envReport, connectorMode } from '../../../../lib/env';
import { allConnectorStatuses } from '../../../../lib/connectors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function publicUser(u) {
  return {
    id: u.id,
    name: u.name || null,
    email: u.email,
    role: u.role,
    apps: u.apps || [],
    mfa: Boolean(u.mfaSecret),
    disabled: Boolean(u.disabled),
    updatedAt: u.updatedAt || null,
    updatedBy: u.updatedBy || null,
  };
}

/** Active sessions, without exposing the session id itself. */
async function liveSessions() {
  if (postgresEnabled()) {
    const { rows } = await getPool().query(
      'SELECT data, expires_at, last_seen FROM pb_sessions ORDER BY last_seen DESC LIMIT 200'
    );
    return rows.map((r) => ({
      email: r.data?.email || null,
      role: r.data?.role || null,
      issuedAt: r.data?.issuedAt ? new Date(Number(r.data.issuedAt)).toISOString() : null,
      lastSeen: r.last_seen ? new Date(Number(r.last_seen)).toISOString() : null,
      expiresAt: r.expires_at ? new Date(Number(r.expires_at)).toISOString() : null,
      ip: r.data?.ip || null,
      userAgent: r.data?.userAgent || null,
    }));
  }
  const all = readJSON('sessions.json', {});
  return Object.values(all)
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
    .slice(0, 200)
    .map((s) => ({
      email: s.email || null,
      role: s.role || null,
      issuedAt: s.issuedAt ? new Date(s.issuedAt).toISOString() : null,
      lastSeen: s.lastSeen ? new Date(s.lastSeen).toISOString() : null,
      expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : null,
      ip: s.ip || null,
      userAgent: s.userAgent || null,
    }));
}

export async function GET(req) {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(20, Number(url.searchParams.get('limit') || 200)));
  const want = url.searchParams.get('include') || '';

  const auditRows = await readAudit(limit);
  const payload = {
    ok: true,
    audit: auditRows,
    denied: auditRows.filter((r) => r.result === 'denied' || r.result === 'failure').slice(0, 40),
    permissions: { security: can(session, 'security:view'), staff: can(session, 'staff:manage'), settings: can(session, 'settings:manage') },
    me: { email: session.email, role: session.role, apps: session.apps, issuedAt: new Date(session.issuedAt).toISOString(), expiresAt: new Date(session.expiresAt).toISOString() },
  };

  if (can(session, 'security:view')) {
    payload.sessions = await liveSessions();
    payload.roles = ROLES;
    payload.matrix = ROLE_MATRIX;
    payload.actions = ACTIONS;
    payload.env = envReport();
    payload.mode = connectorMode();
    payload.statuses = await allConnectorStatuses();
  }

  if ((want === 'staff' || want === 'all') && can(session, 'dashboard:view')) {
    payload.staff = (await listUsers()).map(publicUser);
  }

  return NextResponse.json(payload);
}
