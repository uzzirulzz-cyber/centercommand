// POST /api/auth/admin-logout — server-side revocation (README §8.2).
import { NextResponse } from 'next/server';
import { currentSid, getSession, clearSessionCookie } from '../../../../lib/auth/sessions';
import { revokeSession } from '../../../../lib/auth/store';
import { csrfValid, CSRF_COOKIE } from '../../../../lib/auth/guard';
import { audit } from '../../../../lib/audit';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!csrfValid(req)) {
    return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });
  }
  const session = await getSession();
  const sid = currentSid();
  if (sid) await revokeSession(sid);   // replaying the old cookie now fails
  clearSessionCookie();
  cookies().set(CSRF_COOKIE, '', { path: '/', maxAge: 0 });
  await audit({ action: 'auth.signout', actor: session?.email || 'unknown', result: 'success' });
  return NextResponse.json({ ok: true });
}
