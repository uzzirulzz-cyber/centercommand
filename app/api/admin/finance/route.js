// ============================================================
// /api/admin/finance — revenue, settlements and reconciliation.
//
// Everything is DERIVED from synced order records with a single rule: a payment
// is counted once, keyed by (source application, source record id). Nothing is
// estimated, and a currency that is not PKR is reported in its own bucket and
// never folded into the PKR total.
//
// Gateway settlement state comes from the record's own fields when the source
// application provides them; when it does not, the row is marked
// "not reported" instead of being assigned a made-up status.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { queryRecords } from '../../../../lib/records';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMMERCE_APPS = ['playbeat-digital', 'playbeat-live', 'makethisdeal'];
const REPORTING_CURRENCY = 'PKR';
const PAID = new Set(['paid', 'completed', 'settled', 'success', 'captured']);
const REFUNDED = new Set(['refunded', 'reversed', 'chargeback', 'voided']);

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export async function GET(req) {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'finance:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'finance:view') }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(7, Number(url.searchParams.get('days') || 90)));
  const since = Date.now() - days * 86400000;

  const { rows, total, source } = await queryRecords({ apps: COMMERCE_APPS, perPage: 200, maxPerPage: 200 });

  const inWindow = rows.filter((r) => {
    const raw = r?.date || r?.createdAt || r?.syncedAt || r?.updatedAt;
    const t = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(t) ? t >= since : true; // undated rows are kept so the total still reconciles
  });

  const totals = {};            // currency -> { paid, refunded, net }
  const byDay = {};             // ISO day -> PKR paid
  const byGateway = {};         // gateway label -> { count, pkr }
  const settlements = [];
  let paidCount = 0, refundedCount = 0, pendingCount = 0;
  const seen = new Set();       // dedupe key: app + sourceId

  for (const row of inWindow) {
    const key = `${row.app}::${row.sourceId || row.id || row.orderNo || ''}`;
    if (seen.has(key)) continue;  // a double-count here would be a reporting bug
    seen.add(key);

    const currency = String(row.currency || REPORTING_CURRENCY).toUpperCase();
    const amount = num(row.amount ?? row.total ?? row.value);
    const status = String(row.status || '').toLowerCase();
    totals[currency] = totals[currency] || { paid: 0, refunded: 0, net: 0 };

    if (PAID.has(status)) {
      totals[currency].paid += amount;
      paidCount += 1;
      const day = String(row.date || row.createdAt || row.syncedAt || '').slice(0, 10);
      if (day && currency === REPORTING_CURRENCY) byDay[day] = (byDay[day] || 0) + amount;

      const gateway = String(row.gateway || row.paymentMethod || row.provider || 'not reported').slice(0, 40);
      byGateway[gateway] = byGateway[gateway] || { count: 0, pkr: 0 };
      byGateway[gateway].count += 1;
      if (currency === REPORTING_CURRENCY) byGateway[gateway].pkr += amount;

      settlements.push({
        app: row.app,
        sourceId: row.sourceId || null,
        reference: row.orderNo || row.id || row.sourceId || null,
        gateway,
        currency,
        amount,
        // Present only when the source application actually reports it.
        settlementState: row.settlementStatus || row.settlement_state || null,
        settledAt: row.settledAt || null,
      });
    } else if (REFUNDED.has(status)) {
      totals[currency].refunded += amount;
      refundedCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  for (const c of Object.keys(totals)) totals[c].net = Math.round((totals[c].paid - totals[c].refunded) * 100) / 100;

  return NextResponse.json({
    ok: true,
    windowDays: days,
    reportingCurrency: REPORTING_CURRENCY,
    totals,
    headline: {
      paidPkr: totals[REPORTING_CURRENCY]?.paid || 0,
      refundedPkr: totals[REPORTING_CURRENCY]?.refunded || 0,
      netPkr: totals[REPORTING_CURRENCY]?.net || 0,
      paidCount,
      refundedCount,
      pendingCount,
      otherCurrencies: Object.fromEntries(Object.entries(totals).filter(([c]) => c !== REPORTING_CURRENCY)),
      recordsScanned: inWindow.length,
      recordsAvailable: total,
    },
    byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, pkr]) => ({ date, pkr })),
    byGateway: Object.entries(byGateway).map(([gateway, v]) => ({ gateway, ...v })).sort((a, b) => b.pkr - a.pkr),
    settlements: settlements.slice(0, 100),
    reconciliation: {
      dedupeKey: 'source application + source record id',
      duplicatesSkipped: inWindow.length - seen.size,
      source,
    },
  });
}
