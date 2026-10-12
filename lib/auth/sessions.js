// ============================================================
// Session cookie plumbing (README §8.2 / §8.6).
//
// Cookie: pb_admin_sid — HttpOnly; Secure; SameSite=Lax; Path=/
// Carries ONLY an opaque id: no email, no role, no app scope.
// ============================================================
import { cookies } from 'next/headers';
import { getSessionBySid, SESSION_POLICY } from './store';

export const SESSION_COOKIE = 'pb_admin_sid';
export const CSRF_COOKIE = 'pb_csrf';

const SECURE = process.env.NODE_ENV === 'production';

export function sessionCookieOptions() {
  return {
    httpOnly: true,          // unreachable from JS — blocks XSS session theft
    secure: SECURE,
    sameSite: 'lax',         // CSRF baseline; paired with a double-submit token
    path: '/',
    maxAge: Math.floor(SESSION_POLICY.ABSOLUTE_MS / 1000),
  };
}

/** Read + validate the session. `touch` only where cookies are writable. */
export async function getSession({ touch = false } = {}) {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  return await getSessionBySid(sid, { touch });
}

/** Issue the session cookie (Route Handlers / Server Actions only). */
export function setSessionCookie(sid) {
  cookies().set(SESSION_COOKIE, sid, sessionCookieOptions());
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
}

export function currentSid() {
  return cookies().get(SESSION_COOKIE)?.value || null;
}
