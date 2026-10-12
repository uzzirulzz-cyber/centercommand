
// Tracking & Measurement configuration (GA4, GTM, Meta pixel, ads switch).
// Values persist in the keyed config store and are verified by read-back.
import { getConfig, setConfig } from '../../../../lib/config';
import { audit } from '../../../../lib/audit';
import { guard, json, bodyOf, listify } from '../../../../lib/adminRoute';

const KEY = 'admin.tracking';
const PUBLIC_KEYS = ['ga4Id', 'gtmId', 'metaPixelId', 'googleAdsId', 'adsEnabled', 'capiEnabled'];

function normalise(v) {
  const o = {};
  for (const k of PUBLIC_KEYS) o[k] = v && v[k] !== undefined ? v[k] : null;
  return o;
}

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const value = normalise((await getConfig(KEY)) || {});
  return json({ ok: true, configured: true, status: 'connected', value, rows: [], items: listify(value, PUBLIC_KEYS) });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'tracking:write', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const next = normalise(body);
  await setConfig(KEY, next);
  const back = normalise((await getConfig(KEY)) || {});
  const persisted = JSON.stringify(back) === JSON.stringify(next);
  await audit({ action: 'tracking.saved', actor: session.email, target: KEY, result: persisted ? 'success' : 'failure' });
  if (!persisted) return json({ error: 'value was not persisted by the store' }, 500);
  return json({ ok: true, message: 'Tracking configuration saved and verified by read-back.', items: listify(back, PUBLIC_KEYS) });
}
