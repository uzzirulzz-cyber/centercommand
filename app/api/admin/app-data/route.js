
// Pass-through reader for ANY connected application's own API.
// The connector owns the credentials; this route never sees or returns a secret.
// An unconfigured application answers with configured:false and ZERO rows —
// there is no fallback dataset.
import { getConnector, connectorStatus } from '../../../../lib/connectors';
import { audit } from '../../../../lib/audit';
import { guard, json, extractRows } from '../../../../lib/adminRoute';

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const u = new URL(req.url);
  const slug = String(u.searchParams.get('app') || '');
  const resource = String(u.searchParams.get('resource') || '');
  const perPage = Math.min(200, Math.max(1, Number(u.searchParams.get('perPage') || 50)));

  let connector = null;
  try { connector = getConnector(slug); } catch { connector = null; }
  if (!connector) return json({ error: `unknown application '${slug}'` }, 404);

  const status = await connectorStatus(slug).catch(() => null);
  const missingVars = connector.missingVars || [];

  if (!connector.configured) {
    return json({
      ok: true, app: slug, resource, configured: false, degraded: false,
      status: (status && status.status) || 'pending', missingVars,
      reason: (status && status.reason) || `not configured — missing ${missingVars.join(', ')}`,
      rows: [],
    });
  }
  if (!resource) {
    return json({
      ok: true, app: slug, configured: true, status: (status && status.status) || 'connected',
      resources: Object.keys(connector.resources || {}), rows: [],
      items: Object.entries(connector.resources || {}).map(([k, v]) => ({ label: k, detail: `${(v || []).length} endpoint(s)` })),
    });
  }
  try {
    const page = await connector.read(resource, { page: 1, perPage });
    const rows = extractRows(page);
    await audit({ action: 'app-data.read', actor: session.email, target: `${slug}:${resource}`, result: 'success' });
    return json({
      ok: true, app: slug, resource, configured: true,
      status: (status && status.status) || 'connected',
      rows, count: rows.length,
      items: [{ label: 'app', detail: slug }, { label: 'resource', detail: resource }, { label: 'returned', detail: rows.length }],
    });
  } catch (e) {
    await audit({ action: 'app-data.read', actor: session.email, target: `${slug}:${resource}`, result: 'failure' });
    return json({ ok: false, app: slug, resource, configured: true, error: e.message, rows: [] }, 502);
  }
}
