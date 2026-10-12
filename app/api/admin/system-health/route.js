
// System health: connector status for every application, presence-only environment
// report, integration contract status and a store read-back probe. Never prints a
// secret value — only whether a variable is present.
import { allConnectorStatuses, CONNECTOR_MODE } from '../../../../lib/connectors';
import { APP_CONTRACTS, contractReport } from '../../../../lib/appContracts';
import { getConfig, setConfig, CONFIG_KEYS } from '../../../../lib/config';
import { guard, json } from '../../../../lib/adminRoute';

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;

  const statuses = await allConnectorStatuses().catch(() => []);
  const report = contractReport(process.env);

  let envReport = null;
  try {
    const mod = await import('../../../../lib/env');
    if (typeof mod.envReport === 'function') envReport = mod.envReport();
  } catch { envReport = null; }

  // Store read-back probe: write a heartbeat then read it, proving the DB store works.
  const stamped = new Date().toISOString();
  let storeOk = false;
  try { await setConfig('ops.health.probe', { stamped }); const back = await getConfig('ops.health.probe'); storeOk = Boolean(back && back.stamped === stamped); } catch { storeOk = false; }

  const rows = [
    { id: 'store', component: 'Configuration / records store', state: storeOk ? 'ok' : 'down', detail: storeOk ? `read-back verified ${stamped}` : 'write/read-back failed', },
    { id: 'mode', component: 'Connector mode', state: CONNECTOR_MODE() === 'live' ? 'ok' : 'attention', detail: `PB_CONNECTOR_MODE=${CONNECTOR_MODE()}` },
    ...statuses.map((s) => ({
      id: s.slug, component: s.name || s.slug, state: s.status,
      detail: s.status === 'connected' ? `last sync ${s.lastSync || 'unknown'}` : (s.reason || (s.missingVars || []).join(', ')),
    })),
  ].map((r, i) => ({ ...r, id: r.id || `row-${i}` }));

  return json({
    ok: true, configured: true, status: 'connected',
    checkedAt: stamped, rows,
    items: [
      { label: 'applications registered', detail: App_count() },
      { label: 'contracts known', detail: `${report.configured} fully configured / ${report.total} registered` },
      { label: 'environment variables (presence only)', detail: envReport ? JSON.stringify(envReport).slice(0, 400) : 'env report unavailable' },
      { label: 'config keys in use', detail: Object.values(CONFIG_KEYS || {}).join(', ') },
    ],
  });
}

function App_count() { return Object.keys(APP_CONTRACTS || {}).length; }
