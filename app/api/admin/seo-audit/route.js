
// Live SEO audit runs. The crawl itself belongs to the storefront application
// (api/admin/index.ts -> seo/audit), so this route ASKS for a run and records the
// provider's answer — it never invents findings.
import { getConnector, connectorStatus } from '../../../../lib/connectors';
import { getConfig, setConfig } from '../../../../lib/config';
import { audit } from '../../../../lib/audit';
import { guard, json, bodyOf, extractRows } from '../../../../lib/adminRoute';

const KEY = 'seo.audits';
const APP = 'playbeat-digital';

async function state() { return (await getConfig(KEY)) || { runs: [] }; }

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const s = await state();
  const runs = Array.isArray(s.runs) ? s.runs : [];
  let connector = null;
  try { connector = getConnector(APP); } catch { connector = null; }
  const status = await connectorStatus(APP).catch(() => null);
  return json({
    ok: true, status: (status && status.status) || 'pending',
    configured: Boolean(connector && connector.configured),
    missingVars: (connector && connector.missingVars) || [],
    reason: (status && status.reason) || null,
    rows: runs.map((r) => ({ id: r.id, startedAt: r.startedAt, startedBy: r.startedBy, provider: r.provider, result: r.result, urls: r.urls, note: r.note })),
    items: [
      { label: 'runs recorded', detail: runs.length },
      { label: 'audit owner', detail: 'PlayBeat.digital — seo/audit + seoAuditEngine (crawl, GSC, PSI)' },
      { label: 'never fabricated', detail: 'an unconfigured provider records result "pending", not findings' },
    ],
  });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'seo:write', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const action = String(body.action || 'start');
  if (action !== 'start') return json({ error: `unknown action '${action}'` }, 400);

  const s = await state();
  const runs = Array.isArray(s.runs) ? s.runs.slice() : [];
  let connector = null;
  try { connector = getConnector(APP); } catch { connector = null; }

  const run = { id: `seo_${Date.now().toString(36)}`, startedAt: new Date().toISOString(), startedBy: session.email, provider: APP, result: 'pending', urls: 0, note: '' };

  if (!connector || !connector.configured) {
    run.result = 'pending';
    run.note = `provider not configured — missing ${((connector && connector.missingVars) || []).join(', ')}`;
  } else {
    try {
      const out = await connector.read('seo/audit', { page: 1, perPage: 500 });
      const rows = extractRows(out);
      run.urls = rows.length;
      run.result = rows.length > 0 ? 'completed' : 'empty';
      run.note = rows.length > 0 ? 'audit payload received from the source application' : 'provider answered without audit rows';
    } catch (e) {
      run.result = 'failed';
      run.note = e.message.slice(0, 200);
    }
  }

  runs.unshift(run);
  await setConfig(KEY, { runs: runs.slice(0, 100) });
  await audit({ action: 'seo.audit.start', actor: session.email, target: run.id, result: run.result === 'failed' ? 'failure' : 'success' });
  const msg = run.result === 'completed'
    ? `Audit completed — ${run.urls} URL row(s) received from ${APP}.`
    : run.result === 'empty'
      ? 'The provider answered but returned no audit rows. Nothing was invented to fill the table.'
      : run.result === 'failed'
        ? `The provider rejected the audit request — ${run.note}`
        : `Audit requested. ${run.note}`;
  return json({ ok: true, message: msg });
}
