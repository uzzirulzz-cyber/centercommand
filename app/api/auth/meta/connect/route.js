import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/sessions';
import { can } from '../../../../../lib/rbac';
import { META_SCOPES, META_STATE_COOKIE, metaConfigStatus, metaCallbackUrl } from '../../../../../lib/connectors/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const session = await getSession({ touch: true });
  if (!session || !can(session, 'apps:manage')) {
    return NextResponse.redirect(new URL('/admin/signin?next=%2Fadmin%2Fmeta', req.url));
  }

  const config = metaConfigStatus();
  if (!config.ready) {
    return NextResponse.redirect(new URL('/admin/meta?meta_error=configuration', req.url));
  }

  const state = crypto.randomBytes(32).toString('base64url');
  const url = new URL(`https://www.facebook.com/v${process.env.META_GRAPH_VERSION.replace(/^v/i, '')}/dialog/oauth`);
  url.searchParams.set('client_id', process.env.META_APP_ID);
  url.searchParams.set('redirect_uri', metaCallbackUrl());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', META_SCOPES.join(','));

  const response = NextResponse.redirect(url);
  response.cookies.set(META_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/meta',
    maxAge: 600,
  });
  return response;
}
