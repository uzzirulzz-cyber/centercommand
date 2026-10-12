// ============================================================
// Per-app sync workers.
//
// Every registered application gets ONE worker. A worker owns the schedule and
// the last-run record, and it calls the SAME idempotent connector.sync() the
// "Sync Now" button calls — it never invents data. A worker for an application
// that is not configured is SKIPPED and recorded as skipped, never faked.
// ============================================================
import { APPS } from './apps';
import { getConnector, CONNECTOR_MODE } from './connectors';
import { getConfig, setConfig } from './config';
import { getSyncState } from './store';
import { hydrateConnectorEnv } from './connectors/storeCreds';

/** One schedule for every worker; Vercel Cron reads the same expression. */
export const WORKER_SCHEDULE = '*/15 * * * *';

export function workerKey(slug) {
  return `worker:${slug}`;
}

/** The worker roster — one worker per registered application. */
export function workerDefs() {
  return APPS.map((app) => {
    const connector = getConnector(app.slug);
    const raw = connector?.resources;
    const resources = Array.isArray(raw) ? raw : Object.keys(raw || {});
    return { slug: app.slug, name: app.name, schedule: WORKER_SCHEDULE, resources };
  });
}

export async function workerState(slug) {
  const cfg = (await getConfig(workerKey(slug)).catch(() => null)) || {};
  const sync = await getSyncState(slug).catch(() => null);
  return {
    slug,
    enabled: cfg.enabled !== false,
    schedule: WORKER_SCHEDULE,
    lastRunAt: cfg.lastRunAt || null,
    lastStatus: cfg.lastStatus || 'never',
    lastSummary: cfg.lastSummary || null,
    lastError: cfg.lastError || null,
    runs: cfg.runs || 0,
    consecutiveFailures: cfg.consecutiveFailures || 0,
    stored: sync?.stored ?? null,
    lastSyncAt: sync?.lastSync || null,
  };
}

export async function allWorkerStates() {
  const defs = workerDefs();
  const states = await Promise.all(defs.map((d) => workerState(d.slug)));
  return defs.map((def, i) => ({ ...def, ...states[i] }));
}

export async function setWorkerEnabled(slug, enabled) {
  const cur = (await getConfig(workerKey(slug)).catch(() => null)) || {};
  await setConfig(workerKey(slug), { ...cur, enabled: Boolean(enabled), schedule: WORKER_SCHEDULE });
  return workerState(slug);
}

/**
 * Run one worker. Returns a plain result record; the caller decides how to
 * surface it. Never throws — a failure is recorded, not propagated.
 */
export async function runWorker(slug) {
  await hydrateConnectorEnv([slug]);
  const connector = getConnector(slug);
  const now = new Date().toISOString();
  const prev = (await getConfig(workerKey(slug)).catch(() => null)) || {};
  const base = { ...prev, schedule: WORKER_SCHEDULE };

  if (!connector) {
    await setConfig(workerKey(slug), { ...base, lastRunAt: now, lastStatus: 'unknown-app', lastError: 'no adapter' });
    return { slug, ok: false, status: 'unknown-app', reason: 'no adapter' };
  }

  // Never run live imports in fixture mode or mark fixtures as production records.
  if (CONNECTOR_MODE() !== 'live') {
    await setConfig(workerKey(slug), { ...base, lastRunAt: now, lastStatus: 'skipped', lastError: 'connector mode is demo' });
    return { slug, ok: false, status: 'skipped', reason: 'PB_CONNECTOR_MODE is not live' };
  }

  // Honest skip: an unconfigured application is never synced and never faked.
  if (!connector.configured) {
    const reason = `not configured — missing ${(connector.missingVars || []).join(', ')}`;
    await setConfig(workerKey(slug), { ...base, lastRunAt: now, lastStatus: 'skipped', lastError: null });
    return { slug, ok: false, status: 'skipped', reason };
  }

  try {
    // A configured URL is not proof that the upstream service works.
    // Health-check before ingestion; a failed probe must not be counted as a sync.
    const health = await connector.healthCheck();
    if (!health.ok) throw new Error(health.reason || 'upstream health check failed');
    const result = await connector.sync();
    const ok = Boolean(result?.ok);
    const next = {
      ...base,
      lastRunAt: now,
      lastStatus: ok ? 'ok' : 'failed',
      lastSummary: result?.summary || null,
      lastError: ok ? null : (result?.reason || 'sync failed'),
      runs: (prev.runs || 0) + 1,
      consecutiveFailures: ok ? 0 : (prev.consecutiveFailures || 0) + 1,
    };
    await setConfig(workerKey(slug), next);
    return { slug, ok, status: next.lastStatus, summary: next.lastSummary, reason: next.lastError };
  } catch (error) {
    const next = {
      ...base,
      lastRunAt: now,
      lastStatus: 'failed',
      lastError: error.message,
      runs: (prev.runs || 0) + 1,
      consecutiveFailures: (prev.consecutiveFailures || 0) + 1,
    };
    await setConfig(workerKey(slug), next);
    return { slug, ok: false, status: 'failed', reason: error.message };
  }
}

/** Run every enabled worker (optionally a subset). Sequential — connectors are I/O bound. */
export async function runAllWorkers({ only = null } = {}) {
  const defs = workerDefs().filter((d) => (only ? only.includes(d.slug) : true));
  const results = [];
  for (const def of defs) {
    const st = await workerState(def.slug);
    if (!st.enabled) {
      results.push({ slug: def.slug, ok: false, status: 'disabled' });
      continue;
    }
    results.push(await runWorker(def.slug));
  }
  return {
    ranAt: new Date().toISOString(),
    mode: CONNECTOR_MODE(),
    schedule: WORKER_SCHEDULE,
    results,
    synced: results.filter((r) => r.ok).length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };
}
