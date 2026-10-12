// ============================================================
// /api/admin/overview — the dashboard's data source.
//
// Every number here is DERIVED from synced connector records and the real
// sync state. When an application is not configured it contributes nothing and
// is reported as unconfigured, so the dashboard shows an honest zero with the
// reason attached instead of an invented metric.
//
// Currency rule: PKR is the reporting currency. Other currencies are totalled
// separately and labelled — never blended into the PKR figure.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { queryRecords } from '../../../../lib/records';
import { allConnectorStatuses } from '../../../../lib/connectors';
import { readAudit } from '../../../../lib/audit';
import { APPS } from '../../../../lib/apps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPORTING_CURRENCY = 'PKR';

function num(v) {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function sumByCurrency(rows, { statusKey = 'status', amountKey = 'amount', paidValues = ['paid', 'completed', 'settled', 'success'] } = {}) {
  const totals = {};
  let paidCount = 0;
  let pendingCount = 0;
  for (const row of rows) {
    const status = String(row?.[statusKey] ?? '').toLowerCase();
    const amount = num(row?.[amountKey]);
    const currency = String(row?.currency || REPORTING_CURRENCY).toUpperCase();
    if (paidValues.includes(status)) {
      totals[currency] = (totals[currency] || 0) + amount;
      paidCount += 1;
    } else if (status && status !== 'refunded' && status !== 'cancelled') {
      pendingCount += 1;
    }
  }
  return { totals, paidCount, pendingCount };
}

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });
  }

  const statuses = await allConnectorStatuses();
  const bySlug = Object.fromEntries(statuses.map((s) => [s.slug, s]));

  const commerceApps = ['playbeat-digital', 'playbeat-live', 'makethisdeal'];
  const ordersRes = await queryRecords({ apps: commerceApps, perPage: 200, maxPerPage: 200 });
  const customersRes = await queryRecords({ apps: ['playbeat-digital', 'playbeat-live', 'makethisdeal', 'pulse-crm'], perPage: 200, maxPerPage: 200 });
  const liveRes = await queryRecords({ apps: ['playbeat-live'], perPage: 200, maxPerPage: 200 });
  const magxRes = await queryRecords({ apps: ['magxtv'], perPage: 200, maxPerPage: 200 });
  const dealsRes = await queryRecords({ apps: ['makethisdeal'], perPage: 200, maxPerPage: 200 });
  const crmRes = await queryRecords({ apps: ['pulse-crm'], perPage: 200, maxPerPage: 200 });

  const money = sumByCurrency(ordersRes.rows);

  // Per-application revenue, PKR only, so the chart cannot mislead.
  const byApp = commerceApps.map((slug) => {
    const rows = ordersRes.rows.filter((r) => r.app === slug);
    const m = sumByCurrency(rows);
    return { app: slug, pkr: m.totals[REPORTING_CURRENCY] || 0, other: Object.fromEntries(Object.entries(m.totals).filter(([c]) => c !== REPORTING_CURRENCY)) };
  });

  const viewers = liveRes.rows.reduce((s, r) => s + num(r?.viewers), 0);
  const liveChannels = liveRes.rows.filter((r) => String(r?.status).toLowerCase() === 'live').length;
  const openEnquiries = dealsRes.rows
    .filter((r) => String(r?.status).toLowerCase() !== 'closed')
    .reduce((s, r) => s + num(r?.enquiries), 0);
  const openLeads = crmRes.rows.filter((r) => !['won', 'lost', 'closed'].includes(String(r?.stage || '').toLowerCase())).length;

  const unconfigured = statuses.filter((s) => s.status === 'pending').map((s) => s.slug);
  const degraded = statuses.filter((s) => s.status === 'degraded').map((s) => ({ slug: s.slug, reason: s.reason || null, lastSync: s.lastSync || null }));

  const auditRows = await readAudit(12);

  return NextResponse.json({
    ok: true,
    reportingCurrency: REPORTING_CURRENCY,
    kpis: {
      revenuePkr: money.totals[REPORTING_CURRENCY] || 0,
      otherCurrencies: Object.fromEntries(Object.entries(money.totals).filter(([c]) => c !== REPORTING_CURRENCY)),
      paidOrders: money.paidCount,
      pendingOrders: money.pendingCount,
      customers: customersRes.total,
      liveViewers: viewers,
      liveChannels,
      openEnquiries,
      openLeads,
      matches: magxRes.total,
    },
    byApp,
    recordTotals: {
      orders: ordersRes.total,
      customers: customersRes.total,
      live: liveRes.total,
      magxtv: magxRes.total,
      deals: dealsRes.total,
      crm: crmRes.total,
    },
    health: { statuses: bySlug, unconfigured, degraded, connected: statuses.filter((s) => s.status === 'connected').length, total: APPS.length },
    activity: auditRows,
    sources: { orders: ordersRes.source, customers: customersRes.source },
  });
}
