'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { APPS, APP_COLORS } from '../lib/apps';
import { ORDERS, CHANNELS, DEALS, AUDIT } from '../lib/data';
import { PageHeader, StatCard, StatusBadge, SourceBadge, Panel, BarChart, DataTable, fmtMoney, fmtDateTime, asText } from './ui';
import DataSourceBanner from './DataSourceBanner';
import { useSession } from './SessionProvider';
import PlayBeatOrbitMark from './PlayBeatOrbitMark';

const WIDGETS = [
  { id: 'kpis', label: 'Revenue, orders, viewers and enquiries' },
  { id: 'revenue', label: 'Revenue by application' },
  { id: 'connections', label: 'Application health' },
  { id: 'live', label: 'PlayBeat Live workspace' },
  { id: 'orders', label: 'Recent orders' },
  { id: 'activity', label: 'Recent activity' },
];
const DEFAULT_DASHBOARD = { hiddenWidgets: [], widgetOrder: WIDGETS.map((widget) => widget.id), widgetSizes: {}, refreshSeconds: 0 };
const EMPTY_KPIS = { revenuePkr: 0, otherCurrencies: {}, paidOrders: 0, pendingOrders: 0, customers: 0, liveViewers: 0, liveChannels: 0, openEnquiries: 0, openLeads: 0 };

function auditTime(entry) {
  return entry?.at || entry?.time || entry?.createdAt || null;
}

export default function DashboardWorkspace() {
  const { api, can } = useSession();
  const [mode, setMode] = useState(null);
  const [connectorStates, setConnectorStates] = useState([]);
  const [liveBridge, setLiveBridge] = useState(null);
  const [overview, setOverview] = useState(null);
  const [finance, setFinance] = useState(null);
  const [orders, setOrders] = useState(null);
  const [dashboard, setDashboard] = useState(DEFAULT_DASHBOARD);
  const [customizing, setCustomizing] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const refreshDashboard = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    const read = (path) => api(path).catch(() => null);
    const [health, summary, orderRows, financeReport] = await Promise.all([
      read('/api/health'),
      read('/api/admin/overview'),
      read('/api/admin/records/orders?sort=date&dir=desc&perPage=20'),
      can('finance:view') ? read('/api/admin/finance?days=90') : Promise.resolve(null),
    ]);
    if (health?.mode) setMode(health.mode);
    if (Array.isArray(health?.statuses)) setConnectorStates(health.statuses);
    if (summary?.ok) {
      setOverview(summary);
      const statuses = Object.values(summary.health?.statuses || {});
      if (statuses.length) setConnectorStates(statuses);
    }
    if (orderRows?.ok) setOrders(orderRows);
    if (financeReport?.ok) setFinance(financeReport);
    setLastRefreshed(new Date().toISOString());
    if (!quiet) setLoading(false);
  }, [api, can]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const config = await api('/api/admin/config').catch(() => null);
      if (alive && config?.dashboard) setDashboard({ ...DEFAULT_DASHBOARD, ...config.dashboard });
      if (alive) await refreshDashboard();
    })();
    return () => { alive = false; };
  }, [api, refreshDashboard]);

  useEffect(() => {
    let alive = true;
    const refreshLive = async () => {
      if (document.visibilityState !== 'visible') return;
      const result = await api('/api/admin/playbeat-live').catch(() => null);
      if (alive && result?.ok) setLiveBridge(result);
    };
    refreshLive();
    const timer = window.setInterval(refreshLive, 60_000);
    document.addEventListener('visibilitychange', refreshLive);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', refreshLive); };
  }, [api]);

  useEffect(() => {
    const seconds = Number(dashboard.refreshSeconds || 0);
    if (!seconds) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshDashboard({ quiet: true });
    }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [dashboard.refreshSeconds, refreshDashboard]);

  const saveDashboard = async () => {
    setBusy(true);
    const res = await api('/api/admin/config', { method: 'POST', body: { action: 'dashboard:save', dashboard } });
    setBusy(false);
    setMessage(res?.ok ? 'Your dashboard layout is saved to your account.' : (res?.error || 'Could not save dashboard settings.'));
  };
  const moveWidget = (id, delta) => setDashboard((current) => {
    const order = [...(current.widgetOrder || WIDGETS.map((widget) => widget.id))];
    const index = order.indexOf(id), nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    return { ...current, widgetOrder: order };
  });

  // Fixture data is only rendered when the environment explicitly reports demo mode.
  const demoMode = mode === 'demo';
  const demoPaidPKR = ORDERS.filter((order) => order.status === 'paid' && order.currency === 'PKR');
  const demoPaidUSD = ORDERS.filter((order) => order.status === 'paid' && order.currency === 'USD');
  const demoRevenuePKR = demoPaidPKR.reduce((sum, order) => sum + order.amount, 0);
  const demoRevenueUSD = demoPaidUSD.reduce((sum, order) => sum + order.amount, 0);
  const k = demoMode ? {
    revenuePkr: demoRevenuePKR, otherCurrencies: { USD: demoRevenueUSD }, paidOrders: demoPaidPKR.length + demoPaidUSD.length,
    pendingOrders: ORDERS.filter((order) => order.status === 'pending').length,
    liveViewers: CHANNELS.reduce((sum, channel) => sum + channel.viewers, 0),
    liveChannels: CHANNELS.filter((channel) => channel.status === 'live').length,
    openEnquiries: DEALS.filter((deal) => deal.status !== 'closed').reduce((sum, deal) => sum + deal.enquiries, 0),
  } : (overview?.kpis || EMPTY_KPIS);
  const demoByApp = APPS.map((app) => ({ app: app.slug, pkr: demoPaidPKR.filter((order) => order.app === app.slug).reduce((sum, order) => sum + order.amount, 0) }));
  const byApp = (demoMode ? demoByApp : (overview?.byApp || [])).map((item) => ({
    label: APPS.find((app) => app.slug === (item.app || item.slug))?.short || item.app || item.slug || 'Application',
    color: APP_COLORS[item.app || item.slug],
    value: Number(item.pkr ?? item.value ?? 0),
  }));
  const connectionFor = (slug) => connectorStates.find((item) => item.slug === slug);
  const otherCurrencies = Object.entries(k.otherCurrencies || {}).filter(([, amount]) => Number(amount) > 0).map(([code, amount]) => `${fmtMoney(amount, code)} in ${code}`).join(' · ');
  const liveOrders = (orders?.rows || []).slice(0, 20);
  const activityRows = demoMode ? AUDIT.slice(0, 5) : (overview?.activity || []).slice(0, 8);
  const financeNote = !can('finance:view') ? 'Your role does not include finance:view; the finance report is hidden.' : !finance ? 'Finance report is still loading or unavailable. See Finance & Revenue for details.' : '';
  const noSource = (label, detail, href, cta) => <Panel title={label}><p className="mb-2 small" style={{ color: 'var(--bs-secondary-color)' }}>{detail}</p>{href && <Link className="btn btn-sm btn-outline-primary" href={href}>{cta}</Link>}</Panel>;
  const content = {
    kpis: <div className="row g-3">
      <div className="col-6 col-xl-3"><StatCard label="Revenue (paid, PKR)" value={fmtMoney(k.revenuePkr)} sub={otherCurrencies || 'PKR reporting currency'} /></div>
      <div className="col-6 col-xl-3"><StatCard label="Paid orders" value={Number(k.paidOrders || 0).toLocaleString()} sub={`${Number(k.pendingOrders || 0).toLocaleString()} awaiting payment review`} /></div>
      <div className="col-6 col-xl-3"><StatCard label="Live viewers now" value={Number(k.liveViewers || 0).toLocaleString()} sub={`${Number(k.liveChannels || 0).toLocaleString()} channels reporting live`} /></div>
      <div className="col-6 col-xl-3"><StatCard label="Open enquiries" value={Number(k.openEnquiries || 0).toLocaleString()} sub={`${Number(k.openLeads || 0).toLocaleString()} CRM leads in progress`} /></div>
    </div>,
    revenue: <Panel title="Revenue by application · PKR, paid only" actions={<Link href="/admin/finance" className="btn btn-sm btn-outline-secondary">Finance report</Link>}>
      {byApp.length ? <BarChart data={byApp} format={(value) => (value ? `${Math.round(value / 1000)}k` : '0')} /> : <div className="small py-3" style={{ color: 'var(--bs-secondary-color)' }}>No paid revenue has been synced yet. Connect a commerce source to populate this report.</div>}
      <small style={{ color: 'var(--bs-secondary-color)' }}>Revenue comes from synced paid orders. Other currencies remain separate; nothing is estimated.</small>
      {financeNote && <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>{financeNote}</div>}
    </Panel>,
    connections: <Panel title="Connection status" pad={false} actions={<Link href="/admin/apps" className="btn btn-sm btn-outline-secondary">Manage apps</Link>}><div className="pb-table-wrap"><table className="table align-middle"><thead><tr><th>Application</th><th>Status</th><th>Last sync · UTC</th></tr></thead><tbody>{APPS.map((app) => { const state = connectionFor(app.slug); return <tr key={app.slug}><td><Link href={`/admin/apps/${app.slug}`} className="d-flex align-items-center gap-2" style={{ color: 'var(--bs-emphasis-color)' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: APP_COLORS[app.slug] }} />{app.name}</Link></td><td><StatusBadge status={state?.status || 'pending'} /></td><td><small className="pb-mono">{fmtDateTime(state?.lastSync || null)}</small></td></tr>; })}</tbody></table></div></Panel>,
    live: <Panel title="PlayBeat Live · separate workspace" actions={<Link href="/admin/live" className="btn btn-sm btn-outline-secondary">Open Live workspace</Link>}><div className="d-flex justify-content-between align-items-center mb-2"><span className="small">Dashboard bridge</span><StatusBadge status={liveBridge?.source?.status || 'pending'} /></div><p className="small mb-1" style={{ color: 'var(--bs-secondary-color)' }}>{liveBridge?.source?.connected ? 'Bridge checked independently. Audience totals below come from synced channel records.' : (liveBridge?.source?.error || 'Bridge is not configured. No substitute traffic values are shown.')}</p><small className="pb-mono" style={{ color: 'var(--bs-secondary-color)' }}>Last check · {fmtDateTime(liveBridge?.checkedAt || null)}</small></Panel>,
    orders: demoMode ? <Panel title="Recent orders" pad={false} actions={<Link href="/admin/orders" className="btn btn-sm btn-outline-secondary">View all</Link>}><DataTable pageSize={5} columns={[{ key: 'orderNo', label: 'Order', render: (row) => <span className="pb-mono">{row.orderNo}</span> }, { key: 'app', label: 'Source', render: (row) => <SourceBadge slug={row.app} /> }, { key: 'customer', label: 'Customer' }, { key: 'amount', label: 'Amount', render: (row) => fmtMoney(row.amount, row.currency) }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }]} rows={ORDERS} />
      </Panel> : liveOrders.length ? <Panel title="Recent orders" pad={false} actions={<Link href="/admin/orders" className="btn btn-sm btn-outline-secondary">View all {orders?.total ? `(${orders.total})` : ''}</Link>}><DataTable pageSize={5} columns={[{ key: 'orderNo', label: 'Order', render: (row) => <span className="pb-mono">{asText(row.orderNo || row.reference || row.sourceId || row.id)}</span> }, { key: 'app', label: 'Source', render: (row) => <SourceBadge slug={row.app} /> }, { key: 'customer', label: 'Customer', render: (row) => asText(row.customer || row.email || row.name) }, { key: 'amount', label: 'Amount', render: (row) => row.amount == null ? '—' : fmtMoney(row.amount, row.currency || 'PKR') }, { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status || 'pending'} /> }]} rows={liveOrders} />
      </Panel> : noSource('Recent orders', orders?.configured === false ? 'No commerce connector is configured. Configure one to bring real orders into the admin.' : loading ? 'Loading synced order records…' : 'No order records have been synced yet.', '/admin/apps', 'Configure applications'),
    activity: activityRows.length ? <Panel title="Recent activity" pad={false}><ul className="list-group list-group-flush" style={{ background: 'transparent' }}>{activityRows.map((entry, index) => <li key={entry.id || `${entry.action}-${index}`} className="list-group-item d-flex gap-2" style={{ background: 'transparent', borderColor: 'var(--pb-line)', color: 'var(--bs-body-color)' }}><span>{['success', 'connected'].includes(String(entry.result || '').toLowerCase()) ? '✓' : '•'}</span><div><div style={{ fontSize: '.87rem' }}>{asText(entry.action || entry.event || 'Admin activity')} — <span style={{ color: 'var(--bs-emphasis-color)' }}>{asText(entry.target || entry.detail || '')}</span></div><small style={{ color: 'var(--bs-secondary-color)' }}>{fmtDateTime(auditTime(entry))} · {asText(entry.actor || 'System')}</small></div></li>)}</ul></Panel> : noSource('Recent activity', demoMode ? 'No demo activity is available.' : loading ? 'Loading the audit log…' : 'No admin audit activity has been recorded yet.', '/admin/audit-log', 'Open audit log'),
  };
  const order = dashboard.widgetOrder?.length ? dashboard.widgetOrder : WIDGETS.map((widget) => widget.id);

  return <>
    <div className="pb-dashboard-heading">
      <PlayBeatOrbitMark size="dashboard" />
      <div className="pb-dashboard-heading-content">
        <PageHeader title="Central Command Center" subtitle="Live overview across connected PlayBeat applications. Every figure comes from the source records and sync state." actions={<><button className="btn btn-sm btn-outline-secondary" onClick={() => refreshDashboard()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh data'}</button><button className="btn btn-sm btn-outline-secondary" onClick={() => setCustomizing((value) => !value)}>{customizing ? 'Close editor' : 'Customize dashboard'}</button><Link href="/admin/apps" className="btn btn-sm btn-primary">＋ Applications</Link></>} />
      </div>
    </div>
    {mode && <DataSourceBanner mode={mode} statuses={connectorStates} />}
    <div className="d-flex justify-content-end mb-2"><small style={{ color: 'var(--bs-secondary-color)' }}>Dashboard data refreshed · {fmtDateTime(lastRefreshed)}</small></div>
    {message && <div className="alert alert-secondary py-2 small" role="status">{message}</div>}
    {!overview && !loading && <div className="alert alert-warning py-2 small" role="status">The live overview could not be loaded. Refresh to retry; connector status remains available below.</div>}
    {customizing && <div className="pb-card mb-3"><div className="pb-card-head"><strong>Personal dashboard layout</strong><span className="small">Changes are saved for your admin account</span></div><div className="pb-card-body"><div className="row g-3 align-items-end mb-3"><div className="col-sm-6 col-lg-4"><label className="form-label small">Refresh interval</label><select className="form-select form-select-sm" value={dashboard.refreshSeconds} onChange={(e) => setDashboard({ ...dashboard, refreshSeconds: Number(e.target.value) })}><option value="0">Manual</option><option value="60">Every minute</option><option value="300">Every 5 minutes</option><option value="900">Every 15 minutes</option></select></div><div className="col"><small style={{ color: 'var(--bs-secondary-color)' }}>Refresh reads live overview, order, finance and health endpoints. It does not fabricate data or mark a disconnected source as live.</small></div><div className="col-auto"><button className="btn btn-sm btn-primary" disabled={busy} onClick={saveDashboard}>Save layout</button></div></div><div className="pb-widget-editor">{order.map((id, index) => { const widget = WIDGETS.find((item) => item.id === id); if (!widget) return null; return <div className="pb-widget-editor-row" key={id}><span className="pb-widget-grip" aria-hidden="true">⠿</span><strong className="small">{widget.label}</strong><select className="form-select form-select-sm" aria-label={`${widget.label} width`} value={(dashboard.widgetSizes || {})[id] || (id === 'kpis' ? '12' : '6')} onChange={(e) => setDashboard({ ...dashboard, widgetSizes: { ...(dashboard.widgetSizes || {}), [id]: e.target.value } })}><option value="4">One third</option><option value="6">Half width</option><option value="12">Full width</option></select><button className="btn btn-sm btn-outline-secondary" aria-label={`Move ${widget.label} up`} disabled={!index} onClick={() => moveWidget(id, -1)}>↑</button><button className="btn btn-sm btn-outline-secondary" aria-label={`Move ${widget.label} down`} disabled={index === order.length - 1} onClick={() => moveWidget(id, 1)}>↓</button><input className="form-check-input" type="checkbox" aria-label={`Show ${widget.label}`} checked={!(dashboard.hiddenWidgets || []).includes(id)} onChange={(e) => setDashboard({ ...dashboard, hiddenWidgets: e.target.checked ? (dashboard.hiddenWidgets || []).filter((item) => item !== id) : [...(dashboard.hiddenWidgets || []), id] })} /></div>; })}</div></div></div>}
    <div className="row g-3">
      {order.map((id) => {
        if ((dashboard.hiddenWidgets || []).includes(id) || !content[id]) return null;
        const size = (dashboard.widgetSizes || {})[id] || (id === 'kpis' ? '12' : '6');
        return <div key={id} className={`col-12 col-lg-${size}`} style={{ order: order.indexOf(id) }}>{content[id]}</div>;
      })}
    </div>
  </>;
}
