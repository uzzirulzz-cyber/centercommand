// ============================================================
// Edge middleware — a CHEAP gate only (README §8.6).
// It checks that a session cookie is PRESENT. The AUTHORITATIVE session lookup
// and role check run in a Node Route Handler / server component, where the
// session store is reachable. Passing middleware is NOT authorization.
// ============================================================
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'pb_admin_sid';

export const config = {
  matcher: ['/admin/:path*', '/api/connectors/:path*', '/api/auth/session'],
};

function harden(res) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Frame-Options', 'DENY');
  return res;
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // The sign-in screen and the login endpoint are intentionally public.
  if (pathname.startsWith('/admin/signin')) return harden(NextResponse.next());

  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasCookie) return harden(NextResponse.next());

  if (pathname.startsWith('/api/')) {
    return harden(NextResponse.json({ error: 'unauthenticated' }, { status: 401 }));
  }

  const url = req.nextUrl.clone();
  url.pathname = '/admin/signin';
  url.searchParams.set('next', pathname);
  return harden(NextResponse.redirect(url));
}
