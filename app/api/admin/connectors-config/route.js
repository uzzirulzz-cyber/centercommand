
// Integration health: which variables each connector needs, whether they are
// present in the deployment environment, and the masked values saved from the
// admin. Saving a value never returns it back. A connector only becomes live
// after a real authenticated health check — until then it stays 'pending'.
import { getConfig, setConfig } from '../../../../lib/config';
import { APP_CONTRACTS } from '../../../../lib/appContracts';
import { CONNECTOR_SLUGS, credKey, envKeysFor, envPresence, mask, hydrateConnectorEnv } from '../../../../lib/connectors/storeCreds';
import { allConnectorStatuses } from '../../../../lib/connectors';
import { audit } from '../../../../lib/audit';
import { guard, json, bodyOf } from '../../../../lib/adminRoute';

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  await hydrateConnectorEnv().catch(() => []);
  const presence = envPresence();
  const statuses = await allConnectorStatuses().catch(() => []);
  const byslug = Object.fromEntries((statuses || []).map((s) => [s.slug, s]));

  const rows = [];
  for (const [slug, prefix] of Object.entries(CONNECTOR_SLUGS)) {
    const stored = (await getConfig(credKey(slug)).catch(() => null)) || {};
    const { url, key } = envKeysFor(slug);
    const st = byslug[slug] || {};
    rows.push({
      id: slug,
      app: (APP_CONTRACTS[slug] && APP_CONTRACTS[slug].label) || slug,
      urlVar: url, keyVar: key,
      envUrl: presence[slug].urlPresent, envKey: presence[slug].keyPresent,
      storedUrl: stored.apiUrl ? mask(stored.apiUrl) : '', storedKey: stored.apiKey ? mask(stored.apiKey) : '',
      status: st.status || (st.configured === false ? 'pending' : 'unknown'),
      lastSync: st.lastSync || '', reason: st.reason || (st.missingVars || []).join(', '),
      configured: Boolean(st.configured),
    });
  }
  return json({
    ok: true, configured: true, status: 'connected', rows,
    items: [
      { label: 'connectors registered', detail: rows.length },
      { label: 'live (passed a health check)', detail: rows.filter((r) => r.status === 'connected').length },
      { label: 'pending', detail: rows.filter((r) => r.status !== 'connected').length },
      { label: 'secret handling', detail: 'keys are written server-side only and always read back masked' },
      { label: 'precedence', detail: 'environment variables win; stored values fill the gap so rotation stays a deployment action' },
    ],
  });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'apps:manage', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const slug = String(body.app || '');
  if (!CONNECTOR_SLUGS[slug]) return json({ error: `unknown application '${slug}'` }, 400);
  const action = String(body.action || 'save');

  if (action === 'clear') {
    await setConfig(credKey(slug), { apiUrl: '', apiKey: '' });
    await audit({ action: 'connectors.clear', actor: session.email, target: slug, result: 'success' });
    return json({ ok: true, message: `Stored credentials for ${slug} cleared. Environment values, if any, still apply.` });
  }
  if (action !== 'save') return json({ error: `unknown action '${action}'` }, 400);

  const apiUrl = String(body.apiUrl || '').trim();
  const apiKey = String(body.apiKey || '').trim();
  if (!apiUrl && !apiKey) return json({ error: 'provide an API URL and/or an API key' }, 400);
  let origin = '';
  if (apiUrl) {
    try { const u = new URL(apiUrl); if (!/^https?:$/.test(u.protocol)) throw new Error('scheme'); origin = u.origin; }
    catch { return json({ error: 'the API URL must be an absolute http(s) URL' }, 400); }
  }

  const prev = (await getConfig(credKey(slug)).catch(() => null)) || {};
  const next = { apiUrl: apiUrl || prev.apiUrl || '', apiKey: apiKey || prev.apiKey || '', updatedAt: new Date().toISOString(), updatedBy: session.email };
  await setConfig(credKey(slug), next);
  const back = (await getConfig(credKey(slug)).catch(() => null)) || {};
  const persisted = back.apiUrl === next.apiUrl && back.apiKey === next.apiKey;
  await audit({ action: 'connectors.save', actor: session.email, target: slug, result: persisted ? 'success' : 'failure' });
  if (!persisted) return json({ error: 'value was not persisted by the store' }, 500);
  await hydrateConnectorEnv().catch(() => []);

  return json({
    ok: true,
    message: `Saved for ${slug}. Values stay server-side and are read back masked. Run Test Connection — the app only reports "connected" after a real authenticated health check.`,
    rows: [{ id: slug, app: slug, storedUrl: mask(next.apiUrl), storedKey: mask(next.apiKey), urlVar: envKeysFor(slug).url, keyVar: envKeysFor(slug).key }],
  });
}
