import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/sessions';
import { can } from '../../../../../lib/rbac';
import { audit } from '../../../../../lib/audit';
import {
  META_STATE_COOKIE, metaConfigStatus, metaCallbackUrl,
  metaGraphUrl, metaGet, discoverMetaAssets, saveMetaToken,
} from '../../../../../lib/connectors/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resultUrl(req, key, value) {
  const url = new URL('/admin/meta', req.url);
  url.searchParams.set(key, value);
  return url;
}

export async function GET(req) {
  const session = await getSession({ touch: true });
  const query = req.nextUrl.searchParams;
  const state = query.get('state') || '';
  const expected = req.cookies.get(META_STATE_COOKIE)?.value || '';
  const response = (url) => {
    const out = NextResponse.redirect(url);
    out.cookies.set(META_STATE_COOKIE, '', { path: '/api/auth/meta', maxAge: 0 });
    return out;
  };

  if (!session || !can(session, 'apps:manage')) return response(resultUrl(req, 'meta_error', 'session'));
  if (!state || !expected || state !== expected) {
    await audit({ action: 'meta.oauth.callback', actor: session.email, target: 'meta', result: 'denied', reason: 'state mismatch' });
    return response(resultUrl(req, 'meta_error', 'state'));
  }
  if (query.has('error')) {
    await audit({ action: 'meta.oauth.callback', actor: session.email, target: 'meta', result: 'cancelled' });
    return response(resultUrl(req, 'meta_error', 'cancelled'));
  }
  const config = metaConfigStatus();
  const code = query.get('code');
  if (!config.ready || !code || code.length > 4096) return response(resultUrl(req, 'meta_error', 'configuration'));

  try {
    const exchangeUrl = new URL(metaGraphUrl('oauth/access_token'));
    exchangeUrl.searchParams.set('client_id', process.env.META_APP_ID);
    exchangeUrl.searchParams.set('client_secret', process.env.META_FB_APP_SECRET);
    exchangeUrl.searchParams.set('redirect_uri', metaCallbackUrl());
    exchangeUrl.searchParams.set('code', code);
    const exchangeResponse = await fetch(exchangeUrl, { cache: 'no-store' });
    const exchanged = await exchangeResponse.json();
    if (!exchangeResponse.ok || !exchanged.access_token) throw new Error(exchanged.error?.message || 'Meta token exchange failed');

    let longLived = exchanged;
    try {
      const longLivedUrl = new URL(metaGraphUrl('oauth/access_token'));
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
      longLivedUrl.searchParams.set('client_id', process.env.META_APP_ID);
      longLivedUrl.searchParams.set('client_secret', process.env.META_FB_APP_SECRET);
      longLivedUrl.searchParams.set('fb_exchange_token', exchanged.access_token);
      const longLivedResponse = await fetch(longLivedUrl, { cache: 'no-store' });
      const longLivedData = await longLivedResponse.json();
      if (longLivedResponse.ok && longLivedData.access_token) longLived = longLivedData;
    } catch { /* the valid short-lived token remains usable until it expires */ }

    const profile = await metaGet(longLived.access_token, 'me?fields=id,name,email');
    if (!profile.id) throw new Error('Meta profile could not be read');

    let returnedScopes = Array.isArray(exchanged.granted_scopes) ? exchanged.granted_scopes : [];
    try {
      const permissionPayload = await metaGet(longLived.access_token, 'me/permissions');
      if (Array.isArray(permissionPayload.data)) returnedScopes = permissionPayload.data.filter((item) => item.status === 'granted').map((item) => item.permission);
    } catch { /* retain only scopes explicitly returned by the token exchange */ }
    const assets = await discoverMetaAssets(longLived.access_token, returnedScopes);
    await saveMetaToken({
      accessToken: longLived.access_token,
      tokenType: longLived.token_type || exchanged.token_type || 'bearer',
      expiresAt: longLived.expires_in ? new Date(Date.now() + Number(longLived.expires_in) * 1000).toISOString() : null,
      userId: String(profile.id),
      userName: String(profile.name || '').slice(0, 120),
      userEmail: String(profile.email || '').slice(0, 180),
      scopes: returnedScopes,
      assets,
      connectedAt: new Date().toISOString(),
    }, session.email);
    await audit({ action: 'meta.oauth.connected', actor: session.email, target: String(profile.id), result: 'success', detail: { scopes: returnedScopes } });
    return response(resultUrl(req, 'meta_connected', '1'));
  } catch (error) {
    await audit({ action: 'meta.oauth.callback', actor: session.email, target: 'meta', result: 'failure', reason: String(error.message || 'OAuth failed').slice(0, 200) });
    return response(resultUrl(req, 'meta_error', 'exchange'));
  }
}
