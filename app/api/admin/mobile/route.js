
// Mobile / Android administration for PlayBeat Digital's own app API
// (api/app/index.ts upstream): release rows, version, device inventory,
// notifications, storefront config and push delivery.
import { getConnector, connectorStatus } from '../../../../lib/connectors';
import { audit } from '../../../../lib/audit';
import { guard, json, bodyOf, extractRows, listify } from '../../../../lib/adminRoute';

const APP = 'playbeat-digital';
const READS = { 'app/release': 'app/release', 'app/version': 'app/version', 'app/devices': 'app/devices', 'app/notifications': 'app/notifications', 'app/storefront-config': 'app/storefront-config' };
const WRITES = { 'release.save': 'app/release', 'devices.revoke': 'app/devices/revoke', 'push.send': 'app/push/send', 'storefront.reset': 'app/storefront-config/reset' };

function connectorFor(slug) {
  try { return getConnector(slug || APP); } catch { return null; }
}

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const u = new URL(req.url);
  const slug = u.searchParams.get('app') || APP;
  const connector = connectorFor(slug);
  if (!connector) return json({ error: `unknown application '${slug}'` }, 404);
  const status = await connectorStatus(slug).catch(() => null);
  const missingVars = connector.missingVars || [];

  if (!connector.configured) {
    return json({
      ok: true, app: slug, configured: false, status: (status && status.status) || 'pending',
      missingVars, reason: `not configured — missing ${missingVars.join(', ')}`, rows: [],
      items: [
        { label: 'shared backend', detail: 'https://playbeat.digital/api/*' },
        { label: 'shared customer database', detail: 'one account across web and mobile' },
        { label: 'android package', detail: 'digital.playbeat.app' },
        { label: 'android min OS', detail: '7.0 (API 24)' },
        { label: 'ios minimum', detail: '16.0' },
        { label: 'store URL', detail: 'empty ⇒ rendered as "Pending deployment", never a fabricated link' },
      ],
    });
  }
  const resource = String(u.searchParams.get('resource') || 'app/release');
  if (!READS[resource]) return json({ error: `unknown mobile resource '${resource}'` }, 400);
  try {
    const rows = extractRows(await connector.read(READS[resource], { page: 1, perPage: 100 }));
    return json({ ok: true, app: slug, resource, configured: true, status: (status && status.status) || 'connected', rows });
  } catch (e) {
    return json({ ok: false, app: slug, resource, configured: true, error: e.message, rows: [] }, 502);
  }
}

export async function POST(req) {
  const { session, error } = await guard(req, 'mobile:manage', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const action = String(body.action || '');
  const slug = body.app || APP;
  const connector = connectorFor(slug);
  if (!connector) return json({ error: `unknown application '${slug}'` }, 404);

  if (action === 'load') return GET(req);

  const upstream = WRITES[action];
  if (!upstream) return json({ error: `unknown action '${action}'` }, 400);
  if (!connector.configured) {
    return json({ error: 'not configured', missingVars: connector.missingVars || [] }, 409);
  }
  const payload = {
    app: 'playbeat-admin', version: body.version || null, platform: body.platform || null,
    deviceId: body.deviceId || null, title: body.title || null, body: body.bodyText || body.message || null,
    storefrontConfig: body.storefrontConfig || null, note: body.note || null,
  };
  try {
    const result = await connector.write(upstream, payload);
    await audit({ action: `mobile.${action}`, actor: session.email, target: `${slug}:${upstream}`, result: 'success' });
    return json({ ok: true, message: `Accepted by ${slug} (${upstream}).`, result, items: listify({ accepted: action, upstream }) });
  } catch (e) {
    await audit({ action: `mobile.${action}`, actor: session.email, target: `${slug}:${upstream}`, result: 'failure' });
    return json({ ok: false, error: `the source application rejected the request — ${e.message}` }, 502);
  }
}
