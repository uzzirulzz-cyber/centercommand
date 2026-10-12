'use client';

// ============================================================
// Module workspace — the shared shell body for every data module.
//
// It binds an enterprise data grid to /api/admin/records/[module], so search,
// sorting and pagination happen on the server against real synced records.
//
// State rules enforced here:
//   • an unconfigured application shows "not configured" and NO rows — never a
//     zero that implies real data
//   • a degraded application shows a stale-data warning with the last sync time
//   • a role without the module's write permission gets a read-only grid
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DataGrid from './DataGrid';
import { useSession } from './SessionProvider';
import { PageHeader, Panel, StatCard, StatusBadge, fmtNumber, fmtDateTime, RelativeTime, ExportButtons } from './ui';
import { APPS, APP_COLORS } from '../lib/apps';
import { DATA_MODULES } from '../lib/modules';

export default function ModuleWorkspace({ module: moduleKey }) {
  const cfg = DATA_MODULES[moduleKey];
  const { api, can } = useSession();
  const [meta, setMeta] = useState(null);
  const [notice, setNotice] = useState(null);
  const [appFilter, setAppFilter] = useState('');

  const loadMeta = useCallback(async () => {
    const res = await api(`/api/admin/records/${moduleKey}?perPage=1${appFilter ? `&app=${appFilter}` : ''}`);
    if (res?.ok) {
      setMeta({
        statuses: res.statuses || {},
        configured: res.configured,
        canWrite: res.canWrite,
        total: res.total,
        discoverableKeys: res.discoverableKeys || [],
        source: res.source,
        note: res.note || null,
      });
    } else {
      setMeta({
        statuses: {}, configured: false, canWrite: false, total: 0,
        error: res?.error || res?.reason || 'Unable to reach the module endpoint.',
      });
    }
  }, [api, moduleKey, appFilter]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  /* ---------- columns: declared keys first, then anything real we discover ---- */
  const columns = useMemo(() => {
    const declared = cfg.keys.map(([key, label]) => ({
      key,
      label,
      value: (row) => row?.[key] ?? '',
      render: (row) => {
        const v = row?.[key];
        if (key === cfg.statusKey) return <StatusBadge status={String(v || '').toLowerCase()} label={v ? String(v) : undefined} />;
        if (v === undefined || v === null || v === '') return '—';
        if (typeof v === 'number') return fmtNumber(v);
        return String(v);
      },
    }));
    const known = new Set(cfg.keys.map(([k]) => k));
    const extras = (meta?.discoverableKeys || [])
      .filter((k) => !known.has(k) && !['app', 'sourceId', 'syncedAt'].includes(k))
      .slice(0, 8)
      .map((k) => ({
        key: k,
        label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
        value: (row) => row?.[k] ?? '',
        render: (row) => {
          const v = row?.[k];
          if (v === undefined || v === null || v === '') return '—';
          if (typeof v === 'boolean') return v ? 'Yes' : 'No';
          if (typeof v === 'object') return <span className="pb-mono">{JSON.stringify(v).slice(0, 48)}</span>;
          return String(v);
        },
      }));
    return [
      { key: 'app', label: 'Source', minWidth: 110, render: (r) => (
        <span className="pb-src" style={{ color: APP_COLORS[r.app] || 'var(--pb-accent)', borderColor: `color-mix(in srgb, ${APP_COLORS[r.app] || 'var(--pb-accent)'} 40%, transparent)`, background: `color-mix(in srgb, ${APP_COLORS[r.app] || 'var(--pb-accent)'} 12%, transparent)` }}>
          <span className="dot" style={{ background: APP_COLORS[r.app] || 'var(--pb-accent)' }} />
          {APPS.find((a) => a.slug === r.app)?.short || r.app}
        </span>
      ), value: (r) => r.app },
      { key: 'sourceId', label: 'Source record ID', minWidth: 150, render: (r) => <span className="pb-mono">{r.sourceId || '—'}</span>, value: (r) => r.sourceId },
      ...declared,
      ...extras,
    ];
  }, [cfg, meta]);

  const loader = useCallback(async ({ page, perPage, search, sort, dir, filters }) => {
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (search) params.set('q', search);
    if (sort) { params.set('sort', sort); params.set('dir', dir); }
    if (appFilter) params.set('app', appFilter);
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const res = await api(`/api/admin/records/${moduleKey}?${params.toString()}`);
    if (!res?.ok) throw new Error(res?.reason || res?.error || 'Unable to load records');
    setMeta((prev) => ({ ...(prev || {}), statuses: res.statuses || {}, configured: res.configured, canWrite: res.canWrite, total: res.total, source: res.source }));
    return res;
  }, [api, moduleKey, appFilter]);

  const onInlineEdit = useCallback(async (row, field, value) => {
    const res = await api(`/api/admin/records/${moduleKey}`, {
      method: 'PATCH',
      body: { app: row.app, sourceId: row.sourceId, changes: { [field]: value } },
    });
    if (!res?.ok) return { ok: false, error: res?.error || res?.reason || 'Write rejected' };
    setNotice({ tone: 'success', text: res.message || 'Change accepted by the source application.' });
    return { ok: true };
  }, [api, moduleKey]);

  const bulkActions = useMemo(() => {
    if (!meta?.canWrite) return [];
    return [{
      label: 'Bulk action',
      icon: 'bi-collection',
      tone: 'outline-secondary',
      run: async (rows, done) => {
        const res = await api(`/api/admin/records/${moduleKey}`, {
          method: 'DELETE',
          body: { items: rows.map((r) => ({ app: r.app, sourceId: r.sourceId })) },
        });
        setNotice({ tone: res?.ok ? 'success' : 'danger', text: res?.message || res?.error || 'Bulk action failed.' });
        done?.();
      },
    }];
  }, [api, moduleKey, meta]);

  const statusEntries = Object.entries(meta?.statuses || {});
  const connected = statusEntries.filter(([, s]) => s.status === 'connected').length;
  const degraded = statusEntries.filter(([, s]) => s.status === 'degraded');
  const unconfigured = statusEntries.filter(([, s]) => s.status === 'pending').map(([slug]) => slug);

  const filterDefs = useMemo(() => {
    const defs = [];
    if (cfg.apps.length > 1) {
      defs.push({ key: 'app', label: 'Application', options: cfg.apps });
    }
    return defs;
  }, [cfg]);

  return (
    <>
      <PageHeader
        title={cfg.title}
        icon={cfg.icon}
        subtitle={cfg.subtitle}
        actions={
          <>
            <ExportButtons filename={`${moduleKey}-export`} columns={columns.map((c) => ({ key: c.key, label: c.label, value: c.value }))} rows={[]} label="Export" />
            {meta?.canWrite && (
              <button className="btn btn-sm btn-primary" onClick={() => setNotice({ tone: 'info', text: 'Use inline editing in the grid, or the module form, to write through to the source application.' })}>
                <i className="bi bi-plus-lg me-1" aria-hidden="true" />New record
              </button>
            )}
          </>
        }
      />

      {/* honesty banner: unconfigured / degraded are stated, not hidden */}
      {meta && !meta.configured && (
        <div className="alert alert-warning d-flex gap-2 align-items-start">
          <i className="bi bi-plug-fill mt-1" aria-hidden="true" />
          <div>
            <strong>Not configured — no metrics shown.</strong>{' '}
            {unconfigured.length > 0
              ? <>These applications have no working credential yet: <span className="pb-mono">{unconfigured.join(', ')}</span>.</>
              : <>This module has no reachable application yet.</>}{' '}
            Add the connector credentials in <Link href="/admin/settings">System Settings</Link>, then run <em>Test Connection</em>.
            Nothing on this page is estimated.
          </div>
        </div>
      )}

      {degraded.length > 0 && (
        <div className="alert alert-warning">
          <strong>Stale data:</strong>{' '}
          {degraded.map(([slug, s]) => (
            <span key={slug} className="me-2">
              {APPS.find((a) => a.slug === slug)?.name || slug} — last successful sync {fmtDateTime(s.lastSync)}
              {s.error ? ` (${s.error})` : ''}
            </span>
          ))}
        </div>
      )}

      {cfg.betting === false && (
        <div className="alert alert-secondary d-flex gap-2 align-items-center">
          <i className="bi bi-shield-slash" aria-hidden="true" />
          <div><strong>Betting remains disabled.</strong> This module manages schedules, results, highlights and stream health only.</div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <StatCard label="Records" value={fmtNumber(meta?.total ?? 0)} icon="bi-database"
            sub={meta?.source ? `read from ${meta.source} store` : 'loading…'} />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Applications" value={`${connected}/${statusEntries.length || cfg.apps.length}`} icon="bi-plug"
            sub={unconfigured.length ? `unconfigured: ${unconfigured.join(', ')}` : 'all reporting'}
            tone={unconfigured.length ? 'warning' : 'success'} />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Your access" value={meta?.canWrite ? 'Read & write' : 'Read-only'} icon="bi-shield-check"
            sub={meta?.canWrite ? 'writes are proxied to the source application' : 'your role cannot modify these records'} />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard label="Duplicate protection" value="Idempotent" icon="bi-arrow-repeat"
            sub="keyed by source application + source record id" />
        </div>
      </div>

      {notice && (
        <div className={`alert alert-${notice.tone === 'info' ? 'secondary' : notice.tone} d-flex justify-content-between align-items-center py-2`}>
          <span>{notice.text}</span>
          <button className="btn-close btn-sm" aria-label="Dismiss" onClick={() => setNotice(null)} />
        </div>
      )}

      <Panel pad={false} title={`${cfg.title} — live records`}
        actions={
          <select className="form-select form-select-sm" style={{ width: 'auto' }} value={appFilter}
            aria-label="Scope to application" onChange={(e) => setAppFilter(e.target.value)}>
            <option value="">All applications</option>
            {cfg.apps.map((slug) => {
              const s = meta?.statuses?.[slug];
              return <option key={slug} value={slug}>
                {APPS.find((a) => a.slug === slug)?.name || slug}{s ? ` — ${s.status}` : ''}
              </option>;
            })}
          </select>
        }>
        <DataGrid
          storageKey={`module-${moduleKey}`}
          columns={columns}
          loader={loader}
          selectable={Boolean(meta?.canWrite)}
          bulkActions={bulkActions}
          filterDefs={filterDefs}
          onInlineEdit={meta?.canWrite ? onInlineEdit : null}
          editableFields={meta?.canWrite ? cfg.keys.map(([k]) => k) : []}
          searchPlaceholder={`Search ${cfg.title.toLowerCase()}…`}
          emptyTitle={meta?.configured ? 'No records yet' : 'No records — application not configured'}
          emptyBody={meta?.configured
            ? 'Run a sync from the App Registry or wait for the scheduled synchronization.'
            : 'Records appear here once the connector is configured and has completed a successful sync.'}
        />
      </Panel>

      {cfg.note && (
        <p className="mt-3 mb-0" style={{ fontSize: '.84rem', color: 'var(--pb-text-muted)' }}>{cfg.note}</p>
      )}
    </>
  );
}
