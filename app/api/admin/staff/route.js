// ============================================================
// /api/admin/staff — real staff + audit reads, guarded (README §8.4).
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason, ROLE_MATRIX, ROLES } from '../../../../lib/rbac';
import { listUsers, setUserRole, revokeAllForUser } from '../../../../lib/auth/store';
import { readAudit, audit } from '../../../../lib/audit';
import { csrfValid } from '../../../../lib/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });
  }

  // Never leak password hashes or MFA secrets to the client.
  const users = (await listUsers()).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    apps: u.apps || [],
    mfaSecret: Boolean(u.mfaSecret),
    disabled: Boolean(u.disabled),
    updatedAt: u.updatedAt || null,
  }));

  return NextResponse.json({
    users,
    audit: await readAudit(200),
    matrix: ROLE_MATRIX,
    roles: ROLES,
  });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });

  let body = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (body.action !== 'set-role') {
    return NextResponse.json({ error: 'unsupported action' }, { status: 400 });
  }
  if (!can(session, 'apps:manage')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'apps:manage') }, { status: 403 });
  }
  if (!ROLES.includes(body.role)) {
    return NextResponse.json({ error: `unknown role '${body.role}'` }, { status: 400 });
  }

  const result = await setUserRole(body.userId, body.role, body.apps || ['*'], session.email);
  if (!result) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  // A role change revokes the target's live sessions — the new role applies on
  // their next request instead of when their old token happens to expire.
  await audit({
    action: 'role.changed',
    actor: session.email,
    target: `${result.user.email} → ${body.role}`,
    result: 'success',
    reason: `revoked ${result.revoked} live session(s)`,
  });

  return NextResponse.json({ ok: true, revoked: result.revoked });
}

export async function DELETE(req) {
  // Admin-initiated "revoke all sessions" for a user.
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });
  if (!can(session, 'apps:manage')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'apps:manage') }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const n = await revokeAllForUser(userId);
  await audit({ action: 'session.revoked_all', actor: session.email, target: userId, result: 'success', reason: `${n} session(s)` });
  return NextResponse.json({ ok: true, revoked: n });
}
