'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel, StatusBadge, fmtDateTime, RelativeTime, SkeletonRows, asText } from '../../../components/ui';
import { AppControls } from '../../../components/AppControls';
import { APPS, APP_COLORS } from '../../../lib/apps';

export default function ApplicationsHealth() {
  const { api } = useSession();
  const [rows, setRows] = useState(null);
  const [mode, setMode] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const [h, ...rest] = await Promise.all([api('/api/health'), ...APPS.map((a) => api(`/api/connectors/${a.slug}`))]);
    if (h?.ok) setMode(h.mode); else setError(h?.error || 'health endpoint unavailable');
    setRows(APPS.map((a, i) => ({ app: a, res: rest[i] || {} })));
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const [workers, setWorkers] = useState(null);
  const [running, setRunning] = useState(false);

  const loadWorkers = useCallback(async () => {
    const res = await api('/api/admin/workers');
    if (res?.workers) setWorkers(res.workers);
  }, [api]);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);

  const runWorkers = async () => {
    setRunning(true);
    await api('/api/admin/workers', { method: 'POST', body: { action: 'run' } });
    await Promise.all([loadWorkers(), load()]);
    setRunning(false);
  };

  return (
    <>
      <PageHeader
        title="Applications & Health"
        icon="bi-plug"
        subtitle="Authenticated server-side checks per application: connection state, last successful synchronization, circuit-breaker state and what is still missing. An app is never labelled connected without a successful check."
        actions={<Link className="btn btn-sm btn-outline-secondary" href="/admin/apps">App Registry</Link>}
      />
      {error && <div className="alert alert-warning small">{asText(error)}</div>}
      {!rows && <Panel><SkeletonRows rows={5} /></Panel>}
      <div className="row g-3">
        {(rows || []).map(({ app, res }) => {
          // /api/connectors/[app] nests the live status under `status`; normalise
          // it once so every field below reads from the same object.
          const st = res?.status || {};
          const missing = st.missingVars || [];
          return (
            <div className="col-12 col-xl-6" key={app.slug}>
              <Panel pad>
                <div className="d-flex align-items-start gap-3 mb-2">
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: `${APP_COLORS[app.slug]}22`, border: `1px solid ${APP_COLORS[app.slug]}55`, display: 'grid', placeItems: 'center' }}>▶</span>
                  <div className="me-auto">
                    <div style={{ fontWeight: 700 }}>{app.name}</div>
                    <div className="small" style={{ color: 'var(--pb-text-muted)' }}>{app.domain} · {app.connector}</div>
                  </div>
                  <StatusBadge status={st.status || 'pending'} />
                </div>
                <div className="d-flex justify-content-between small mb-1"><span>Last successful sync</span><span className="pb-mono">{res?.syncState?.lastSyncAt ? <RelativeTime iso={res.syncState.lastSyncAt} /> : 'never'}</span></div>
                <div className="d-flex justify-content-between small mb-1"><span>Records stored</span><span className="pb-mono">{res?.syncState?.stored ?? '—'}</span></div>
                <div className="d-flex justify-content-between small mb-1"><span>Circuit breaker</span><span className="pb-mono">{res?.breaker?.open ? 'open' : 'closed'}</span></div>
                <div className="d-flex justify-content-between small mb-2"><span>Checked</span><span className="pb-mono">{res?.checkedAt ? fmtDateTime(res.checkedAt) : 'on request'}</span></div>
                {missing.length > 0 && <div className="alert alert-secondary small mb-2">Missing server-side configuration: <span className="pb-mono">{missing.join(', ')}</span></div>}
                {res?.error && <div className="alert alert-warning small mb-2">{asText(res.error)}</div>}
                {st.reason && !res?.error && <div className="small mb-2" style={{ color: 'var(--bs-secondary-color)' }}>{asText(st.reason)}</div>}
                <AppControls slug={app.slug} initial={st} onChange={load} />
              </Panel>
            </div>
          );
        })}
      </div>
      <Panel title="Sync workers" className="mt-3" pad={false}
        actions={<button className="btn btn-sm btn-primary" disabled={running} onClick={runWorkers}>{running ? 'Running…' : 'Run workers now'}</button>}>
        {!workers && <SkeletonRows rows={4} />}
        {workers && (
          <div className="table-responsive">
            <table className="table table-sm mb-0 align-middle">
              <thead>
                <tr><th>Application</th><th>Schedule</th><th>State</th><th>Last run</th><th>Records</th><th>Detail</th></tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.slug}>
                    <td>{w.name}</td>
                    <td className="pb-mono small">{w.schedule}</td>
                    <td><StatusBadge status={!w.enabled ? 'disconnected' : w.lastStatus === 'ok' ? 'connected' : w.lastStatus === 'failed' ? 'degraded' : 'pending'} /></td>
                    <td className="pb-mono small">{w.lastRunAt ? <RelativeTime iso={w.lastRunAt} /> : 'never'}</td>
                    <td className="pb-mono small">{w.stored ?? '—'}</td>
                    <td className="small" style={{ color: 'var(--bs-secondary-color)' }}>{asText(w.lastError || (w.lastStatus === 'skipped' ? 'not configured — skipped' : '—'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="small mt-3 mb-0" style={{ color: 'var(--pb-text-muted)' }}>
        Connector mode is <span className="pb-mono">{mode || '—'}</span>. Credentials are read server-side only; they never reach this browser.
      </p>
    </>
  );
}
