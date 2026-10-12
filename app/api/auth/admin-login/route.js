// POST /api/auth/admin-login  — README §8.3
import { NextResponse } from 'next/server';
import { findUserByEmail, createSession } from '../../../../lib/auth/store';
import { verifyPassword, verifyTotp } from '../../../../lib/auth/credentials';
import { setSessionCookie, CSRF_COOKIE } from '../../../../lib/auth/sessions';
import { loginAllowed, recordLoginFailure, recordLoginSuccess, issueCsrfToken, csrfCookieOptions } from '../../../../lib/auth/guard';
import { audit } from '../../../../lib/audit';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Open-redirect guard: only internal /admin paths are ever returned. */
function safeNext(raw) {
  const v = String(raw || '');
  if (!v.startsWith('/admin')) return '/admin';
  if (v.startsWith('//') || v.includes('://') || v.includes('\\')) return '/admin';
  return v;
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  let body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const totp = String(body.totp || '');
  const ipKey = `ip:${ip}`;
  const acctKey = `acct:${email}`;

  const gate = await loginAllowed(ipKey, acctKey);
  if (!gate.allowed) {
    const secs = Math.ceil(gate.retryAfterMs / 1000);
    await audit({ action: 'auth.lockout', actor: email || 'unknown', ip, userAgent, result: 'denied' });
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${secs}s.` },
      { status: 429, headers: { 'Retry-After': String(secs) } }
    );
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  // Identical outcome for unknown account and wrong password — no user enumeration.
  const ok = await verifyPassword(password, user?.passwordHash || null);

  if (!user || !ok || user.disabled) {
    await recordLoginFailure(ipKey, acctKey);
    await audit({ action: 'auth.signin', actor: email, ip, userAgent, result: 'failure' });
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  if (user.mfaSecret) {
    if (!totp) {
      await audit({ action: 'auth.mfa.challenge', actor: email, ip, userAgent, result: 'prompted' });
      return NextResponse.json({ error: 'MFA code required.', mfaRequired: true }, { status: 401 });
    }
    if (!verifyTotp(user.mfaSecret, totp)) {
      await recordLoginFailure(ipKey, acctKey);
      await audit({ action: 'auth.mfa', actor: email, ip, userAgent, result: 'failure' });
      return NextResponse.json({ error: 'Invalid MFA code.', mfaRequired: true }, { status: 401 });
    }
  }

  // Success: mint a fresh opaque session (rotation = any previous sid is gone).
  const sid = await createSession(
    { id: user.id, email: user.email, role: user.role, apps: user.apps },
    { ip, userAgent }
  );
  setSessionCookie(sid);

  const csrf = issueCsrfToken();
  cookies().set(CSRF_COOKIE, csrf, csrfCookieOptions());

  await recordLoginSuccess(ipKey, acctKey);
  await audit({
    action: 'auth.signin',
    actor: user.email,
    role: user.role,
    ip,
    userAgent,
    result: 'success',
  });

  return NextResponse.json({
    ok: true,
    redirect: safeNext(body.next),
    user: { email: user.email, role: user.role, apps: user.apps },
  });
}
