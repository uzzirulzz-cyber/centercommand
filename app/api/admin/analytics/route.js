// ============================================================
// /api/admin/analytics — business-specific analytics derived from record data.
//
// There is no traffic provider wired here, so web-session metrics (visitors,
// bounce, conversion funnel) are reported as NOT AVAILABLE with the reason,
// rather than invented. Order, customer, catalog and broadcast analytics are
// real aggregations of the synced records.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { queryRecords } from '../../../../lib/records';
import { allConnectorStatuses } from '../../../../lib/connectors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const dayOf = (row) => String(row?.date || row?.createdAt || row?.syncedAt || '').slice(0, 10);

function bucketCounts(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const v = row?.[key];
    if (v === undefined || v === null || v === '') continue;
    const label = String(v);
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export async function GET(req) {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'analytics:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'analytics:view') }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(7, Number(url.searchParams.get('days') || 90)));
  const since = Date.now() - days * 86400000;

  const orders = await queryRecords({ apps: ['playbeat-digital', 'playbeat-live', 'makethisdeal'], perPage: 200, maxPerPage: 200 });
  const products = await queryRecords({ apps: ['playbeat-digital'], perPage: 200, maxPerPage: 200 });
  const customers = await queryRecords({ apps: ['playbeat-digital', 'playbeat-live', 'makethisdeal', 'pulse-crm'], perPage: 200, maxPerPage: 200 });
  const live = await queryRecords({ apps: ['playbeat-live'], perPage: 200, maxPerPage: 200 });
  const crm = await queryRecords({ apps: ['pulse-crm', 'makethisdeal'], perPage: 200, maxPerPage: 200 });

  const inWindow = (rows) => rows.filter((r) => {
    const t = new Date(dayOf(r) || 0).getTime();
    return Number.isFinite(t) && t > 0 ? t >= since : true;
  });

  const paidStatuses = new Set(['paid', 'completed', 'settled', 'success']);
  const windowOrders = inWindow(orders.rows);
  const paid = windowOrders.filter((r) => paidStatuses.has(String(r.status || '').toLowerCase()));

  const byDayMap = new Map();
  for (const r of paid) {
    const d = dayOf(r);
    if (!d) continue;
    const cur = byDayMap.get(d) || { date: d, orders: 0, pkr: 0 };
    cur.orders += 1;
    if (String(r.currency || 'PKR').toUpperCase() === 'PKR') cur.pkr += num(r.amount);
    byDayMap.set(d, cur);
  }

  const revenuePkr = paid.filter((r) => String(r.currency || 'PKR').toUpperCase() === 'PKR').reduce((s, r) => s + num(r.amount), 0);
  const aov = paid.length ? Math.round((revenuePkr / Math.max(1, paid.filter((r) => String(r.currency || 'PKR').toUpperCase() === 'PKR').length)) * 100) / 100 : 0;

  const statuses = await allConnectorStatuses();

  return NextResponse.json({
    ok: true,
    windowDays: days,
    commerce: {
      ordersInWindow: windowOrders.length,
      paidOrders: paid.length,
      revenuePkr,
      averageOrderValuePkr: aov,
      refundedOrders: windowOrders.filter((r) => String(r.status || '').toLowerCase() === 'refunded').length,
      byStatus: bucketCounts(windowOrders, 'status'),
      byApplication: bucketCounts(windowOrders, 'app'),
      byDay: [...byDayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    },
    catalog: {
      products: products.total,
      byType: bucketCounts(products.rows, 'type'),
      licensesIssued: products.rows.reduce((s, r) => s + num(r.licenses), 0),
      topByLicences: products.rows
        .map((r) => ({ name: r.name || r.sku || r.sourceId, licenses: num(r.licenses) }))
        .sort((a, b) => b.licenses - a.licenses)
        .slice(0, 8),
    },
    customers: {
      total: customers.total,
      byApplication: bucketCounts(customers.rows, 'app'),
      linkedIdentities: customers.rows.filter((r) => r.linked === true).length,
      unlinked: customers.rows.filter((r) => r.linked === false).length,
    },
    broadcast: {
      channels: live.total,
      liveNow: live.rows.filter((r) => String(r.status || '').toLowerCase() === 'live').length,
      viewers: live.rows.reduce((s, r) => s + num(r.viewers), 0),
      byHealth: bucketCounts(live.rows, 'health'),
    },
    crm: {
      leads: crm.total,
      byStage: bucketCounts(crm.rows, 'stage'),
      byChannel: bucketCounts(crm.rows, 'channel'),
    },
    unavailable: [
      {
        metric: 'Website visitors, bounce rate and conversion funnel',
        reason: 'No website analytics provider is configured. Adding a first-party events endpoint or a supported analytics integration will enable these.',
      },
      {
        metric: 'Marketing attribution',
        reason: 'Requires provider-reported campaign figures (Meta / Google Ads). Nothing is estimated in the meantime.',
      },
    ],
    health: statuses,
  });
}
