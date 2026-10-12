// GET /api/auth/session — who am I (server-authoritative), plus the CSRF token.
import { NextResponse } from 'next/server';
import { getSession, CSRF_COOKIE } from '../../../../lib/auth/sessions';
import { ACTIONS, roleCan } from '../../../../lib/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const session = await getSession({ touch: true }); // sliding idle timeout
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const permissions = Object.fromEntries(ACTIONS.map((a) => [a, roleCan(session.role, a)]));
  return NextResponse.json({
    authenticated: true,
    user: {
      email: session.email,
      role: session.role,
      apps: session.apps,
      issuedAt: new Date(session.issuedAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
    permissions,
    csrfToken: req.cookies.get(CSRF_COOKIE)?.value || null,
  });
}
