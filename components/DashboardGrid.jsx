'use client';

// ============================================================
// Dashboard widget grid.
//
// Every widget is a real component bound to a real endpoint. The grid supports
// show/hide, size (sm → full), drag reorder, per-widget refresh interval, and
// it persists a PERSONAL layout per administrator — Super Admins can additionally
// save the organisation default everyone else starts from.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from './SessionProvider';
import {
  Panel, StatCard, StatusBadge, SourceBadge, EmptyState, SkeletonCard, ErrorState,
  BarChart, fmtMoney, fmtNumber, fmtDateTime, RelativeTime,
} from './ui';
import { APPS, APP_COLORS } from '../lib/apps';

const SIZE_CLASS = { sm: 'pb-widget-sm', md: 'pb-widget-md', lg: 'pb-widget-lg', xl: 'pb-widget-xl', full: 'pb-widget-full' };
const SIZE_CYCLE = ['sm', 'md', 'lg', 'xl', 'full'];

/* ------------------------------------------------------------------ */
/* Widget bodies                                                       */
/* ------------------------------------------------------------------ */

function WidgetShell({ widget, children, tools }) {
  return (
    <div className="pb-widget-shell h-100">
      <div className="pb-widget-tools">{tools}</div>
      {children}
    </div>
  );
}

function HealthWidget({ data }) {
  if (!data) return <SkeletonCard height={200} />;
  return (
    <Panel title="Connected application health" icon="bi-plug" pad={false}>
      <div className="pb-table-wrap">
        <table className="table align-middle">
          <thead><tr><th>Application</th><th>Status</th><th>Last sync</th></tr></thead>
          <tbody>
            {APPS.map((a) => {
              const s = data.health?.statuses?.[a.slug] || { status: 'pending' };
              return (
                <tr key={a.slug}>
                  <td>
                    <Link href={`/admin/apps/${a.slug}`} className="d-flex align-items-center gap-2" style={{ color: 'var(--pb-text)' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: APP_COLORS[a.slug] }} />
                      {a.name}
                    </Link>
                  </td>
                  <td><StatusBadge status={s.status} dot /></td>
                  <td><small className="pb-mono">{s.reason ? s.reason.slice(0, 44) : fmtDateTime(s.lastSync)}</small></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.health?.unconfigured?.length > 0 && (
        <div className="pb-card-foot">
          Unconfigured (no metrics shown): <span className="pb-mono">{data.health.unconfigured.join(', ')}</span>
        </div>
      )}
    </Panel>
  );
}

function ActivityWidget({ data }) {
  if (!data) return <SkeletonCard height={200} />;
  const rows = (data.activity || []).slice(0, 6);
  return (
    <Panel title="System notifications & audit" icon="bi-bell" pad={false}>
      {rows.length === 0 ? (
        <EmptyState icon="◌" title="No activity recorded yet" body="Audit entries appear as administrators act and syncs run." />
      ) : (
        <ul className="list-group list-group-flush" style={{ background: 'transparent' }}>
          {rows.map((a, i) => (
            <li key={a.id || i} className="list-group-item d-flex gap-2" style={{ background: 'transparent', color: 'var(--pb-text)' }}>
              <i className={`bi ${a.result === 'success' ? 'bi-check-circle-fill text-success' : a.result === 'denied' ? 'bi-shield-x text-danger' : 'bi-exclamation-triangle-fill text-warning'} mt-1`} aria-hidden="true" />
              <div className="flex-grow-1">
                <div style={{ fontSize: '.86rem' }}>
                  {a.action} <span style={{ color: 'var(--pb-text-muted)' }}>·</span>{' '}
                  <span style={{ color: 'var(--pb-text)' }}>{a.target || '—'}</span>
                </div>
                <small style={{ color: 'var(--pb-text-muted)' }}><RelativeTime iso={a.at} /> · {fmtDateTime(a.at)} · {a.actor || 'system'}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function OrdersWidget({ data }) {
  if (!data) return <SkeletonCard height={220} />;
  if (!data.recordTotals?.orders) {
    return (
      <Panel title="Recent orders — all sources" icon="bi-receipt">
        <EmptyState icon="◌" title="No orders synced yet"
          body="Once a storefront connector is configured and synced, orders appear here with their source application." />
      </Panel>
    );
  }
  return (
    <Panel title="Orders by application" icon="bi-receipt" pad={false}>
      <div className="pb-table-wrap">
        <table className="table">
          <thead><tr><th>Application</th><th>Revenue (PKR, paid)</th><th>Other currencies</th></tr></thead>
          <tbody>
            {(data.byApp || []).map((row) => (
              <tr key={row.app}>
                <td><SourceBadge slug={row.app} /></td>
                <td>{row.pkr ? fmtMoney(row.pkr) : '—'}</td>
                <td className="pb-mono">
                  {Object.keys(row.other || {}).length
                    ? Object.entries(row.other).map(([c, v]) => `${c} ${fmtNumber(v)}`).join(' · ')
                    : '—'}
                </td>
              </tr>
            ))}
            <tr>
              <td><strong>Total (paid)</strong></td>
              <td><strong>{fmtMoney(data.kpis?.revenuePkr)}</strong></td>
              <td className="pb-mono">
                {Object.entries(data.kpis?.otherCurrencies || {}).map(([c, v]) => `${c} ${fmtNumber(v)}`).join(' · ') || '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="pb-card-foot d-flex justify-content-between">
        <span>{fmtNumber(data.kpis?.paidOrders)} paid · {fmtNumber(data.kpis?.pendingOrders)} awaiting review</span>
        <Link href="/admin/orders">View all →</Link>
      </div>
    </Panel>
  );
}

function RevenueTrendWidget({ data }) {
  if (!data) return <SkeletonCard height={240} />;
  const series = (data.byApp || []).map((r) => ({ label: APPS.find((a) => a.slug === r.app)?.short || r.app, value: r.pkr, color: APP_COLORS[r.app] }));
  const hasAny = series.some((s) => s.value > 0);
  return (
    <Panel title="Revenue by application (PKR, paid only)" icon="bi-graph-up"
      actions={<Link href="/admin/finance" className="btn btn-sm btn-outline-secondary">Finance →</Link>}>
      {hasAny ? (
        <BarChart data={series} format={(v) => (v ? `${Math.round(v / 1000)}k` : '0')} />
      ) : (
        <EmptyState icon="◌" title="No paid revenue recorded yet"
          body="Figures appear after a storefront connector completes a sync. Nothing is estimated." />
      )}
      <div className="pb-legend mt-2">
        <span><span className="sw" style={{ background: 'var(--pb-accent)' }} />PKR (reporting currency)</span>
        {Object.keys(data.kpis?.otherCurrencies || {}).length > 0 && (
          <span>Other currencies reported separately: {Object.keys(data.kpis.otherCurrencies).join(', ')}</span>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Widget registry (client side)                                       */
/* ------------------------------------------------------------------ */

function widgetBody(id, data) {
  switch (id) {
    case 'kpi-revenue':
      return <StatCard label="Revenue (paid, PKR)" icon="bi-cash-stack" value={fmtMoney(data?.kpis?.revenuePkr ?? 0)}
        sub={Object.keys(data?.kpis?.otherCurrencies || {}).length
          ? `plus ${Object.entries(data.kpis.otherCurrencies).map(([c, v]) => `${c} ${fmtNumber(v)}`).join(' · ')} reported separately`
          : 'reporting currency'} />;
    case 'kpi-profit':
      return <StatCard label="Gross profit" icon="bi-percent" value="Not configured"
        sub="Requires a recorded cost of goods or payout fee. Nothing is estimated in the meantime."
        tone="warning" />;
    case 'kpi-orders':
      return <StatCard label="Orders & subscriptions" icon="bi-receipt" value={fmtNumber(data?.kpis?.paidOrders ?? 0)}
        sub={`${fmtNumber(data?.kpis?.pendingOrders ?? 0)} awaiting payment review`} />;
    case 'kpi-customers':
      return <StatCard label="Customer records" icon="bi-people" value={fmtNumber(data?.kpis?.customers ?? 0)}
        sub="combined across connected applications" />;
    case 'kpi-visitors':
      return <StatCard label="Active visitors" icon="bi-activity" value="Not available"
        sub="No website analytics provider is configured." tone="warning" />;
    case 'kpi-conversion':
      return <StatCard label="Conversion performance" icon="bi-funnel" value="Not available"
        sub="Requires storefront analytics events." tone="warning" />;
    case 'chart-revenue':
      return <RevenueTrendWidget data={data} />;
    case 'chart-orders':
      return <OrdersWidget data={data} />;
    case 'chart-traffic':
      return (
        <Panel title="Traffic & visitors" icon="bi-graph-up-arrow">
          <EmptyState icon="◎" title="Traffic analytics not connected"
            body="Point this widget at a first-party events endpoint or a supported analytics integration to enable it." />
        </Panel>
      );
    case 'funnel-conversion':
      return (
        <Panel title="Conversion funnel" icon="bi-funnel">
          <EmptyState icon="◎" title="Funnel not connected"
            body="A funnel needs visit, cart and checkout events. Connect the storefront analytics source to enable it." />
        </Panel>
      );
    case 'table-orders':
      return <OrdersWidget data={data} />;
    case 'app-health':
      return <HealthWidget data={data} />;
    case 'settlements':
      return (
        <Panel title="Payment settlements" icon="bi-bank" actions={<Link href="/admin/finance" className="btn btn-sm btn-outline-secondary">Open</Link>}>
          <p className="mb-2" style={{ fontSize: '.88rem', color: 'var(--pb-text-muted)' }}>
            Settlement state is taken from each order record when the source application reports it.
          </p>
          <span className="pb-chip pb-chip-secondary">Dedupe key: source application + source record id</span>
        </Panel>
      );
    case 'marketing-perf':
      return (
        <Panel title="Marketing campaign performance" icon="bi-megaphone" actions={<Link href="/admin/marketing" className="btn btn-sm btn-outline-secondary">Open</Link>}>
          <EmptyState icon="◎" title="Awaiting provider figures"
            body="Spend, reach and conversions stay blank until a supported ad provider reports them." />
        </Panel>
      );
    case 'support-activity':
    case 'tickets':
      return (
        <Panel title={id === 'tickets' ? 'Support ticket metrics' : 'Support activity'} icon="bi-life-preserver"
          actions={<Link href="/admin/support" className="btn btn-sm btn-outline-secondary">Open</Link>}>
          <div className="row g-2">
            <div className="col-6"><div className="pb-stat-label">Leads open</div><div className="pb-stat-value" style={{ fontSize: 22 }}>{fmtNumber(data?.kpis?.openLeads ?? 0)}</div></div>
            <div className="col-6"><div className="pb-stat-label">Enquiries open</div><div className="pb-stat-value" style={{ fontSize: 22 }}>{fmtNumber(data?.kpis?.openEnquiries ?? 0)}</div></div>
          </div>
        </Panel>
      );
    case 'broadcast-health':
      return (
        <Panel title="Broadcast health" icon="bi-broadcast" actions={<Link href="/admin/live" className="btn btn-sm btn-outline-secondary">IPTV →</Link>}>
          <div className="row g-2">
            <div className="col-6"><div className="pb-stat-label">Channels live</div><div className="pb-stat-value" style={{ fontSize: 22 }}>{fmtNumber(data?.kpis?.liveChannels ?? 0)}</div></div>
            <div className="col-6"><div className="pb-stat-label">Viewers now</div><div className="pb-stat-value" style={{ fontSize: 22 }}>{fmtNumber(data?.kpis?.liveViewers ?? 0)}</div></div>
          </div>
          <div className="mt-2"><Link href="/admin/magxtv" style={{ fontSize: '.85rem' }}>MagXTV schedules & results →</Link></div>
        </Panel>
      );
    case 'activity':
      return <ActivityWidget data={data} />;
    default:
      return <Panel title={id}><EmptyState icon="◌" title="Widget not implemented" body={`No renderer is registered for '${id}'.`} /></Panel>;
  }
}

/* ------------------------------------------------------------------ */
/* Grid                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardGrid({ orgDefault = null }) {
  const { api, can } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [layout, setLayout] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const dragId = useRef(null);

  /* ---------- widget registry + layout ---------- */
  useEffect(() => {
    (async () => {
      const res = await api('/api/admin/layout');
      if (res?.ok) {
        setRegistry({ widgets: res.widgets || [], defaultLayout: res.defaultLayout, perms: res.perms });
        setLayout(res.personal || res.org || orgDefault || res.defaultLayout);
      }
    })();
  }, [api, orgDefault]);

  /* ---------- dashboard data ---------- */
  const loadData = useCallback(async () => {
    const res = await api('/api/admin/overview');
    if (res?.ok) { setData(res); setError(null); setRefreshedAt(new Date().toISOString()); }
    else setError(res?.reason || res?.error || 'Unable to load dashboard data');
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshMs = layout?.refreshMs || 60000;
  useEffect(() => {
    if (!data) return undefined;
    const t = setInterval(loadData, refreshMs);
    return () => clearInterval(t);
  }, [loadData, refreshMs, data]);

  const visible = useMemo(() => (layout?.widgets || []).filter((w) => w.visible), [layout]);

  /* ---------- mutations ---------- */
  const mutate = (fn) => setLayout((prev) => ({ ...prev, widgets: fn(prev.widgets) }));

  const savePersonal = async () => {
    setBusy('personal');
    const res = await api('/api/admin/layout', { method: 'POST', body: { action: 'save-personal', layout } });
    setBusy(null);
    setNotice(res?.ok ? { tone: 'success', text: res.message } : { tone: 'danger', text: res?.error || 'Save failed' });
  };

  const saveOrg = async () => {
    setBusy('org');
    const res = await api('/api/admin/layout', { method: 'POST', body: { action: 'save-org', layout } });
    setBusy(null);
    setNotice(res?.ok ? { tone: 'success', text: res.message } : { tone: 'danger', text: res?.error || 'Save failed' });
  };

  const reset = async () => {
    setBusy('reset');
    const res = await api('/api/admin/layout', { method: 'POST', body: { action: 'reset-personal' } });
    setBusy(null);
    if (res?.ok) {
      const again = await api('/api/admin/layout');
      setLayout(again?.personal || again?.org || again?.defaultLayout);
      setNotice({ tone: 'success', text: res.message });
    }
  };

  const cycleSize = (id) => {
    mutate((widgets) => widgets.map((w) => {
      if (w.id !== id) return w;
      const i = SIZE_CYCLE.indexOf(w.size || 'md');
      return { ...w, size: SIZE_CYCLE[(i + 1) % SIZE_CYCLE.length] };
    }));
  };

  const toggleVisible = (id) => mutate((widgets) => widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));

  const onDrop = (targetId) => {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;
    mutate((widgets) => {
      const arr = [...widgets];
      const fi = arr.findIndex((w) => w.id === from);
      const ti = arr.findIndex((w) => w.id === targetId);
      if (fi < 0 || ti < 0) return widgets;
      const [moved] = arr.splice(fi, 1);
      arr.splice(ti, 0, moved);
      return arr;
    });
  };

  const titleFor = (id) => registry?.widgets?.find((w) => w.id === id)?.title || id;

  if (error) return <ErrorState title="Dashboard data unavailable" message={error} onRetry={loadData} />;

  return (
    <>
      {/* toolbar */}
      <div className="pb-toolbar mb-3">
        <span className="pb-live-status">
          <span className="pulse" />
          {data ? `live · refreshed ${fmtDateTime(refreshedAt)}` : 'loading…'}
        </span>
        {data?.health && (
          <span className="pb-live-status">
            {data.health.connected}/{data.health.total} apps connected
            {data.health.degraded?.length ? ` · ${data.health.degraded.length} degraded` : ''}
          </span>
        )}
        {data?.sources?.orders && (
          <span className="pb-chip pb-chip-secondary">data store: {data.sources.orders}</span>
        )}
        <div className="spacer" />
        {notice && <span className={`pb-chip pb-chip-${notice.tone === 'success' ? 'success' : 'danger'}`}>{notice.text}</span>}
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditing((v) => !v)}>
          <i className={`bi ${editing ? 'bi-check-lg' : 'bi-sliders'} me-1`} aria-hidden="true" />
          {editing ? 'Done customising' : 'Customise dashboard'}
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={loadData}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />Refresh
        </button>
      </div>

      {/* widget picker while editing */}
      {editing && registry && (
        <Panel title="Widgets" icon="bi-grid-1x2" className="mb-3">
          <div className="row g-2">
            {(layout?.widgets || []).map((w) => (
              <div className="col-md-6 col-xl-4" key={w.id}>
                <div className="d-flex align-items-center gap-2 p-2" style={{ border: '1px solid var(--pb-line)', borderRadius: 'var(--pb-radius-sm)' }}>
                  <input type="checkbox" className="form-check-input" checked={w.visible}
                    aria-label={`Show ${titleFor(w.id)}`} onChange={() => toggleVisible(w.id)} />
                  <span className="flex-grow-1" style={{ fontSize: '.85rem' }}>{titleFor(w.id)}</span>
                  <span className="pb-chip pb-chip-secondary">{w.size}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pb-dirty-bar">
            <span style={{ fontSize: '.82rem', color: 'var(--pb-text-muted)' }}>
              Layout saved per administrator. Super Admins can also publish the organisation default.
            </span>
            <div className="spacer" />
            <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={reset}>
              {busy === 'reset' ? 'Resetting…' : 'Reset my layout'}
            </button>
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={savePersonal}>
              {busy === 'personal' ? 'Saving…' : 'Save my layout'}
            </button>
            {can?.('settings:manage') && (
              <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={saveOrg}>
                {busy === 'org' ? 'Saving…' : 'Save as organisation default'}
              </button>
            )}
          </div>
        </Panel>
      )}

      {/* grid */}
      <div className="pb-widget-grid">
        {visible.map((w) => (
          <div
            key={w.id}
            className={`${SIZE_CLASS[w.size] || 'pb-widget-md'}`}
            draggable={editing}
            onDragStart={() => { dragId.current = w.id; }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(w.id)}
          >
            <WidgetShell
              widget={w.id}
              tools={editing ? (
                <>
                  <button className="pb-icon-btn" style={{ width: 26, height: 26 }} title="Cycle size"
                    aria-label={`Change size of ${titleFor(w.id)}`} onClick={() => cycleSize(w.id)}>
                    <i className="bi bi-arrows-angle-expand" aria-hidden="true" />
                  </button>
                  <button className="pb-icon-btn" style={{ width: 26, height: 26 }} title="Hide widget"
                    aria-label={`Hide ${titleFor(w.id)}`} onClick={() => toggleVisible(w.id)}>
                    <i className="bi bi-eye-slash" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            >
              {widgetBody(w.id, data)}
            </WidgetShell>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <EmptyState icon="◎" title="Every widget is hidden"
          body="Open Customise dashboard to bring widgets back." />
      )}

      {data?.health?.unconfigured?.length > 0 && (
        <p className="mt-4 mb-0" style={{ fontSize: '.84rem', color: 'var(--pb-text-muted)' }}>
          Not configured, therefore excluded from every total on this page:{' '}
          <span className="pb-mono">{data.health.unconfigured.join(', ')}</span>.
          Configure them in <Link href="/admin/settings">System Settings</Link>.
        </p>
      )}
    </>
  );
}
