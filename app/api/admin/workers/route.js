// ============================================================
// Worker control — the roster, its state, and a manual run.
//
// GET  : the per-app worker roster with schedule, last run and stored counts.
// POST : run every worker now (or one app), or enable/disable a worker.
//        Mutations require apps:manage + a valid CSRF token.
// ============================================================
import { allWorkerStates, runAllWorkers, setWorkerEnabled, WORKER_SCHEDULE } from '../../../../lib/workers';
import { audit } from '../../../../lib/audit';
import { guard, json, bodyOf } from '../../../../lib/adminRoute';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const workers = await allWorkerStates();
  return json({
    ok: true, configured: true, status: 'connected',
    schedule: WORKER_SCHEDULE,
    workers,
    rows: workers.map((w) => ({
      id: w.slug, app: w.name, schedule: w.schedule, enabled: w.enabled,
      lastRunAt: w.lastRunAt || '', lastStatus: w.lastStatus,
      stored: w.stored ?? '', lastSyncAt: w.lastSyncAt || '', lastError: w.lastError || '',
    })),
    items: [
      { label: 'workers assigned', detail: workers.length },
      { label: 'enabled', detail: workers.filter((w) => w.enabled).length },
      { label: 'last run', detail: workers.map((w) => w.lastRunAt).filter(Boolean).sort().pop() || 'never' },
      { label: 'cadence', detail: `${WORKER_SCHEDULE} (every 15 min) via /api/cron/sync` },
      { label: 'honesty rule', detail: 'a worker for an unconfigured app is skipped, never faked' },
    ],
  });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'apps:manage', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const action = String(body.action || 'run');

  if (action === 'enable' || action === 'disable') {
    const slug = String(body.app || '');
    if (!slug) return json({ error: 'app is required' }, 400);
    const state = await setWorkerEnabled(slug, action === 'enable');
    await audit({ action: `worker.${action}`, actor: session.email, target: slug, result: 'success' });
    return json({ ok: true, worker: state, message: `Worker for ${slug} ${action}d.` });
  }

  if (action !== 'run') return json({ error: `unknown action '${action}'` }, 400);

  const only = body.app ? [String(body.app)] : null;
  const summary = await runAllWorkers({ only });
  await audit({
    action: 'workers.run', actor: session.email, target: body.app || 'all',
    result: summary.synced > 0 ? 'success' : (summary.failed > 0 ? 'failure' : 'skipped'),
    detail: summary.results,
  });
  return json({
    ok: true, ...summary,
    message: `Workers run: ${summary.synced} synced, ${summary.skipped} skipped, ${summary.failed} failed.`,
  });
}
