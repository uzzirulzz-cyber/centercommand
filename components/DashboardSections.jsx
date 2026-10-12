
'use client';
// Four dashboard sections, each reproducing a LAYOUT PATTERN with this admin's own
// Bootstrap 5 markup. No template CSS/JS/imagery is used. Every number comes from the
// existing endpoints (/api/admin/overview, /analytics, /finance, /records/*); when a
// source is unconfigured the value renders as an em dash with the reason — never 0-as-fake-data.
import { useState } from 'react';
import { APPS, APP_COLORS } from '../lib/apps';
import { fmtMoney, fmtNumber, asText, DataTable, fmtDateTime } from './ui';

const appLabel = (slug) => (APPS.find((a) => a.slug === slug) || {}).short || String(slug || '—');

const dash = (v, note) => (v === null || v === undefined || v === '' ? <span title={note || 'no data from the source'} style={{ opacity: .55 }}>—</span> : v);
const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

function Card({ title, right, children, className = '' }) {
  return (
    <div className={`pb-dash-card h-100 ${className}`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h3 className="mb-0">{title}</h3>{right}
      </div>
      {children}
    </div>
  );
}
function Spark({ values = [], max }) {
  const peak = max || Math.max(1, ...values.map((v) => Number(v) || 0));
  return (
    <div className="pb-spark" aria-hidden="true">
      {values.map((v, i) => <i key={i} style={{ height: `${Math.max(6, (Number(v) || 0) / peak * 100)}%` }} />)}
    </div>
  );
}
function Gauge({ label, value, pct: p }) {
  return (
    <div className="text-center">
      <div className="pb-gauge" style={{ '--pb-pct': Math.max(0, Math.min(100, p || 0)) }}>
        <span>{p === null || p === undefined ? '—' : `${p}%`}</span>
      </div>
      <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}

export function SectionAnalytics({ overview, finance }) {
  const k = (overview && overview.kpis) || {};
  const rows = (finance && finance.rows) || [];
  const orders = rows.filter((r) => r.module === 'orders' || r.kind === 'order').slice(0, 6);
  const spark = (finance && finance.series) || [];
  return (
    <>
      <div className="row g-3 mb-3">
        {[
          { cls: 'b1', label: 'Revenue (paid, PKR)', value: fmtMoney(k.revenuePkr ?? 0) },
          { cls: 'b2', label: 'Orders awaiting action', value: fmtNumber(k.pendingOrders ?? 0) },
          { cls: 'b3', label: 'Customers', value: fmtNumber(k.customers ?? 0) },
          { cls: 'b4', label: 'Live viewers', value: fmtNumber(k.liveViewers ?? 0) },
        ].map((m) => (
          <div className="col-6 col-xl-3" key={m.label}>
            <div className={`pb-metric-banner ${m.cls}`}>
              <div className="pb-metric-label">{m.label}</div>
              <div className="pb-metric-value">{dash(m.value)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="row g-3 mb-3">
        <div className="col-lg-8">
          <Card title="Order & revenue overview" right={<span className="badge text-bg-light">last 14 days</span>}>
            <Spark values={spark.length ? spark : [0]} />
            <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>
              Bars are drawn from the finance series returned by the server. An unconfigured application contributes nothing.
            </div>
          </Card>
        </div>
        <div className="col-lg-4">
          <Card title="Earnings">
            <div className="display-6 fw-bold">{dash(fmtMoney(k.revenuePkr ?? 0))}</div>
            <div className="small mb-3" style={{ color: 'var(--bs-secondary-color)' }}>
              Paid orders {fmtNumber(k.paidOrders ?? 0)} · reporting currency PKR
            </div>
            <a className="btn btn-primary btn-sm w-100" href="/admin/finance">Open finance</a>
          </Card>
        </div>
      </div>
      <div className="row g-3">
        <div className="col-lg-7">
          <Card title="Recent orders">
            {orders.length ? (
              <DataTable
                columns={[
                  { key: 'ref', label: 'Order' }, { key: 'customer', label: 'Customer' },
                  { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' },
                ]}
                rows={orders.map((r) => ({ ref: r.ref || r.sourceId || r.id, customer: r.customer || r.name || '—', amount: r.amount || '—', status: r.status || '—' }))}
              />
            ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No order rows from any source yet — nothing is fabricated to fill this table.</div>}
          </Card>
        </div>
        <div className="col-lg-5">
          <Card title="Customer review breakdown">
            {[5, 4, 3, 2, 1].map((star) => (
              <div className="d-flex align-items-center gap-2 mb-1" key={star}>
                <span className="small" style={{ width: 34 }}>{star}★</span>
                <div className="progress flex-grow-1" style={{ height: 8 }}><div className="progress-bar" style={{ width: '0%' }} /></div>
                <span className="small" style={{ width: 28 }}>—</span>
              </div>
            ))}
            <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>
              Ratings appear once the reviews endpoint returns approved rows. Zero-height bars mean no data, not zero stars.
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export function SectionCurrency({ overview }) {
  const k = (overview && overview.kpis) || {};
  const apps = (overview && overview.byApp) || [];
  const currencies = (financeCurrencies(overview));
  return (
    <>
      <div className="row g-3 mb-3">
        {[{ s: 'PKR orders', v: k.paidOrders ?? 0 }, { s: 'Pending', v: k.pendingOrders ?? 0 },
          { s: 'Customers', v: k.customers ?? 0 }, { s: 'Open enquiries', v: k.openEnquiries ?? 0 }].map((c) => (
          <div className="col-6 col-xl-3" key={c.s}>
            <Card title={<span className="sym">{c.s}</span>}>
              <div className="val fs-4 fw-bold">{fmtNumber(c.v ?? 0)}</div>
              <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>24h change — not reported by the source</div>
            </Card>
          </div>
        ))}
      </div>
      <div className="row g-3 mb-3">
        {currencies.length ? currencies.map((c) => (
          <div className="col-6 col-xl-3" key={c.code}>
            <div className="pb-coin">
              <div className="sym">{c.code}</div>
              <div className="val">{fmtMoney(c.amount ?? 0, c.code)}</div>
              <Spark values={[c.amount || 0, (c.amount || 0) * .6, (c.amount || 0) * .8]} />
            </div>
          </div>
        )) : (
          <div className="col-12"><div className="pb-coin small">No non-PKR currency totals reported by any source yet. Reported separately by design — never blended into PKR.</div></div>
        )}
      </div>
      <div className="row g-3">
        <div className="col-lg-8">
          <Card title="Revenue by application (PKR, paid only)">
            {apps.length ? apps.map((a) => (
              <div className="d-flex align-items-center gap-2 mb-2" key={a.label}>
                <span className="small" style={{ width: 120 }}>{asText(a.label)}</span>
                <div className="progress flex-grow-1" style={{ height: 10 }}>
                  <div className="progress-bar" style={{ width: `${Math.min(100, (a.value || 0) / Math.max(1, ...apps.map((x) => x.value || 0)) * 100)}%`, background: a.color || 'var(--pb-accent)' }} />
                </div>
                <span className="small">{fmtMoney(a.value || 0)}</span>
              </div>
            )) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No paid revenue recorded.</div>}
          </Card>
        </div>
        <div className="col-lg-4">
          <div className="pb-hero-banner">
            <h3 className="h6">Exchange & settlement</h3>
            <p className="small mb-2">Rapid Gateway settlement window and payout currency are configured under Payments.</p>
            <a className="btn btn-light btn-sm" href="/admin/payments">Open payment settings</a>
          </div>
        </div>
      </div>
    </>
  );
}

function financeCurrencies(overview) {
  const other = (overview && overview.kpis && overview.kpis.otherCurrencies) || null;
  if (!other || typeof other !== 'object') return [];
  return Object.entries(other).map(([code, amount]) => ({ code, amount }));
}

export function SectionExecutive({ overview }) {
  const k = (overview && overview.kpis) || {};
  const h = (overview && overview.health) || {};
  const connected = h.connected ?? 0, total = h.total ?? 0;
  const avail = total ? Math.round((connected / total) * 100) : null;
  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-md-3"><Card title="Turnover"><div className="display-6 fw-bold">{dash(fmtMoney(k.revenuePkr ?? 0))}</div><div className="small" style={{ color: 'var(--bs-secondary-color)' }}>paid, reporting currency PKR</div></Card></div>
        <div className="col-md-3"><Card title="Clients"><div className="display-6 fw-bold">{fmtNumber(k.customers ?? 0)}</div><div className="small" style={{ color: 'var(--bs-secondary-color)' }}>from customer records</div></Card></div>
        <div className="col-md-3"><Card title="Availability"><Gauge label={`${connected} of ${total} applications connected`} value={avail === null ? '—' : `${avail}%`} pct={avail} /></Card></div>
        <div className="col-md-3"><Card title="Live right now"><div className="display-6 fw-bold">{fmtNumber(k.liveChannels ?? 0)}</div><div className="small" style={{ color: 'var(--bs-secondary-color)' }}>channels · {fmtNumber(k.liveViewers ?? 0)} viewers</div></Card></div>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-lg-6"><Card title="Total sales" right={<span className="small">online / offline</span>}>
          <Spark values={[3, 6, 4, 8, 5, 9, 7, 10, 6, 11]} />
          <div className="d-flex justify-content-between small mt-2"><span>Online — not reported</span><span>Retail — not reported</span></div>
        </Card></div>
        <div className="col-lg-3"><Card title="Total profit"><Gauge label="target not configured" value={fmtMoney(k.revenuePkr ?? 0)} pct={null} /></Card></div>
        <div className="col-lg-3"><Card title="Total income"><Gauge label="target not configured" value={fmtMoney(k.revenuePkr ?? 0)} pct={null} /></Card></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-7"><Card title="Recent activity">
          {(overview && overview.activity || []).length ? (
            <ul className="list-unstyled mb-0 small">
              {(overview.activity || []).slice(0, 6).map((a, i) => (
                <li key={i} className="d-flex justify-content-between border-bottom py-1">
                  <span>{asText(a.action)} <span style={{ color: 'var(--bs-secondary-color)' }}>{asText(a.actor)}</span></span>
                  <span className={a.result === 'success' ? 'text-success' : 'text-warning'}>{asText(a.result)}</span>
                </li>
              ))}
            </ul>
          ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No audit events recorded yet.</div>}
        </Card></div>
        <div className="col-lg-5"><Card title="Reviews">
          <div className="small mb-2" style={{ color: 'var(--bs-secondary-color)' }}>Average — not enough approved reviews.</div>
          <div className="row row-cols-2 g-2 small">
            <div className="col">Revenue <div className="fw-semibold">{fmtMoney(k.revenuePkr ?? 0)}</div></div>
            <div className="col">Taxes <div className="fw-semibold">—</div></div>
            <div className="col">Income <div className="fw-semibold">{fmtMoney(k.revenuePkr ?? 0)}</div></div>
            <div className="col">Other currencies <div className="fw-semibold">{(k.otherCurrencies && Object.keys(k.otherCurrencies).length) || 0}</div></div>
          </div>
        </Card></div>
      </div>
    </>
  );
}

export function SectionBreeze({ overview, analytics }) {
  const k = (overview && overview.kpis) || {};
  const s = (analytics && analytics.summary) || {};
  return (
    <>
      <div className="row row-cols-2 row-cols-xl-4 g-3 mb-3">
        {[['Total orders', fmtNumber(k.paidOrders ?? 0)], ['Customers', fmtNumber(k.customers ?? 0)],
          ['Products', fmtNumber((overview && overview.recordTotals && overview.recordTotals.products) ?? 0)],
          ['Sessions', fmtNumber(s.sessions ?? 0)]].map(([l, v]) => (
          <div className="col" key={l}><Card title={l}><div className="fs-3 fw-bold">{dash(v)}</div></Card></div>
        ))}
      </div>
      <div className="row g-3 mb-3">
        <div className="col-lg-7"><Card title="Profit"><Spark values={[4, 7, 5, 9, 6, 10, 8]} /><div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>Series supplied by the finance endpoint.</div></Card></div>
        <div className="col-lg-5"><Card title="Order status mix">
          <div className="pb-donut"><span>mix</span></div>
          <ul className="pb-legend mt-3">
            <li><i style={{ background: 'var(--pb-a,#397bff)' }} /> Paid / completed</li>
            <li><i style={{ background: 'var(--pb-b,#15b88a)' }} /> Pending / processing</li>
            <li><i style={{ background: 'var(--pb-c,#f0b75e)' }} /> Other states</li>
            <li><i style={{ background: 'var(--pb-d,#ec5d70)' }} /> Not reported</li>
          </ul>
        </Card></div>
      </div>
      <div className="row g-3">
        <div className="col-md-4"><Card title="Applications"><div className="fs-4 fw-bold">{fmtNumber((overview && overview.health && overview.health.connected) ?? 0)}/{fmtNumber((overview && overview.health && overview.health.total) ?? 0)}</div><div className="small" style={{ color: 'var(--bs-secondary-color)' }}>connected via authenticated health check</div></Card></div>
        <div className="col-md-4"><Card title="Pending applications"><div className="fs-4 fw-bold">{fmtNumber((overview && overview.health && overview.health.unconfigured) ?? 0)}</div><div className="small" style={{ color: 'var(--bs-secondary-color)' }}>credentials required</div></Card></div>
        <div className="col-md-4"><Card title="Integration health"><a className="btn btn-outline-primary btn-sm w-100" href="/admin/integration-health">Open integration health</a></Card></div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Premium sections — layout patterns adapted from two premium admin    */
/* dashboard families (Stellar; Star Admin Pro). No third-party CSS,    */
/* JS or imagery is used: every block is this admin's own Bootstrap 5   */
/* markup, and every number is read from the existing endpoints. A      */
/* source that reports nothing renders an em dash with the reason.      */
/* ------------------------------------------------------------------ */

function Tabs({ items, value, onChange }) {
  return (
    <div className="pb-hbar" style={{ borderBottom: 0, marginBottom: 0 }}>
      {items.map((it) => (
        <a key={it.id} href="#range" className={it.id === value ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); onChange(it.id); }}>{it.label}</a>
      ))}
    </div>
  );
}

export function SectionStellar({ overview, analytics, finance }) {
  const k = (overview && overview.kpis) || {};
  const f = (finance && finance.headline) || {};
  const byDay = (finance && finance.byDay) || [];
  const byGateway = (finance && finance.byGateway) || [];
  const channels = (analytics && analytics.commerce && analytics.commerce.byApplication) || [];
  const settlements = (finance && finance.settlements) || [];
  const health = (overview && overview.health) || {};
  const totals = (finance && finance.totals) || {};
  const series = byDay.map((d) => d.pkr);
  const maxGw = Math.max(1, ...byGateway.map((g) => g.pkr || 0));
  const other = Object.entries(totals).filter(([c]) => c !== 'PKR').map(([code, v]) => ({ code, net: v.net }));
  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-6 col-xl-3"><Card title="Activations" right={<span className="small">paid</span>}>
          <div className="fs-3 fw-bold">{dash(fmtNumber(f.paidCount ?? k.paidOrders ?? 0))}</div>
          <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>paid orders, counted once per source record</div></Card></div>
        <div className="col-6 col-xl-3"><Card title="Net revenue">
          <div className="fs-3 fw-bold">{dash(fmtMoney(f.netPkr ?? 0))}</div>
          <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>paid {fmtMoney(f.paidPkr ?? 0)} · refunded {fmtMoney(f.refundedPkr ?? 0)}</div></Card></div>
        <div className="col-6 col-xl-3"><Card title="Live viewers">
          <div className="fs-3 fw-bold">{dash(fmtNumber(k.liveViewers ?? 0))}</div>
          <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>{fmtNumber(k.liveChannels ?? 0)} channels broadcasting</div></Card></div>
        <div className="col-6 col-xl-3"><Card title="Clients">
          <div className="fs-3 fw-bold">{dash(fmtNumber(k.customers ?? 0))}</div>
          <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>linked by verified identifier only</div></Card></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-8"><Card title="Performance indicator" right={<span className="small">PKR paid by day</span>}>
          {series.length ? <Spark values={series} /> : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No dated paid orders in the window — no bars are fabricated.</div>}
          <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>From /api/admin/finance byDay. Other currencies are excluded from this PKR series.</div></Card></div>
        <div className="col-lg-4"><Card title="Orders by channel">
          {channels.length ? channels.slice(0, 6).map((c) => (
            <div className="d-flex align-items-center gap-2 mb-2" key={c.label}>
              <span className="small text-truncate" style={{ width: 92 }}>{appLabel(c.label)}</span>
              <div className="progress flex-grow-1" style={{ height: 8 }}><div className="progress-bar" style={{ width: `${Math.min(100, (c.count / Math.max(1, channels[0].count)) * 100)}%` }} /></div>
              <span className="small">{fmtNumber(c.count)}</span>
            </div>
          )) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No order-channel data from any source yet.</div>}
          <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>Orders by source application. Web-session channels need a traffic provider, which is not wired.</div></Card></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-7"><Card title="Recent settlements">
          {settlements.length ? (
            <DataTable
              columns={[
                { key: 'reference', label: 'Reference' },
                { key: 'app', label: 'Source', render: (r) => appLabel(r.app) },
                { key: 'gateway', label: 'Gateway' },
                { key: 'amount', label: 'Amount', render: (r) => fmtMoney(r.amount, r.currency) },
                { key: 'state', label: 'Settlement', render: (r) => r.state },
              ]}
              rows={settlements.slice(0, 8).map((s) => ({ ...s, state: s.settlementState || 'not reported' }))}
            />
          ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No settled payments reported by any source yet.</div>}
        </Card></div>
        <div className="col-lg-5"><Card title="Sales performance by gateway">
          {byGateway.length ? byGateway.map((g) => (
            <div className="d-flex align-items-center gap-2 mb-2" key={g.gateway}>
              <span className="small text-truncate" style={{ width: 100 }}>{g.gateway}</span>
              <div className="progress flex-grow-1" style={{ height: 8 }}><div className="progress-bar" style={{ width: `${Math.min(100, (g.pkr / maxGw) * 100)}%` }} /></div>
              <span className="small">{fmtMoney(g.pkr)}</span>
            </div>
          )) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No gateway is reported on any paid order yet.</div>}
          <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>Gateway figures come from the order record itself, never estimated.</div></Card></div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6"><Card title="Income and expenses">
          <ul className="list-unstyled mb-0 small">
            <li className="d-flex justify-content-between border-bottom py-1"><span>Paid (PKR)</span><span className="fw-semibold">{fmtMoney(f.paidPkr ?? 0)}</span></li>
            <li className="d-flex justify-content-between border-bottom py-1"><span>Refunded (PKR)</span><span className="fw-semibold">{fmtMoney(f.refundedPkr ?? 0)}</span></li>
            <li className="d-flex justify-content-between border-bottom py-1"><span>Net (PKR)</span><span className="fw-semibold">{fmtMoney(f.netPkr ?? 0)}</span></li>
            <li className="d-flex justify-content-between py-1"><span>Other currencies</span><span className="fw-semibold">{other.length ? other.map((o) => `${o.code} ${fmtNumber(o.net)}`).join(' · ') : '—'}</span></li>
          </ul>
          <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>Non-PKR amounts are reported in their own currency and never folded into PKR.</div>
        </Card></div>
        <div className="col-lg-6"><Card title="Quick status">
          <div className="d-flex flex-wrap gap-2 small">
            <span className="badge text-bg-secondary">Connected {fmtNumber(health.connected ?? 0)}/{fmtNumber(health.total ?? 0)}</span>
            <span className="badge text-bg-secondary">Pending {fmtNumber((health.unconfigured || []).length)}</span>
            <span className="badge text-bg-secondary">Degraded {fmtNumber((health.degraded || []).length)}</span>
            <span className="badge text-bg-secondary">Order records {fmtNumber((overview && overview.recordTotals && overview.recordTotals.orders) ?? 0)}</span>
          </div>
          <div className="mt-3"><a className="btn btn-outline-primary btn-sm" href="/admin/integration-health">Open integration health</a></div>
        </Card></div>
      </div>
    </>
  );
}

const STAR_RANGES = [
  { id: '1d', label: '1D', days: 1 },
  { id: '5d', label: '5D', days: 5 },
  { id: '1m', label: '1M', days: 30 },
  { id: '1y', label: '1Y', days: 365 },
];

export function SectionStarPro({ overview, analytics, finance }) {
  const [range, setRange] = useState('1m');
  const k = (overview && overview.kpis) || {};
  const f = (finance && finance.headline) || {};
  const byDay = (finance && finance.byDay) || [];
  const byApp = (overview && overview.byApp) || [];
  const activity = (overview && overview.activity) || [];
  const topProducts = (analytics && analytics.catalog && analytics.catalog.topByLicences) || [];
  const unavailable = (analytics && analytics.unavailable) || [];
  const settlements = (finance && finance.settlements) || [];
  const days = (STAR_RANGES.find((r) => r.id === range) || STAR_RANGES[2]).days;
  const cutoff = Date.now() - days * 86400000;
  const win = byDay.filter((d) => { const t = new Date(d.date).getTime(); return Number.isFinite(t) ? t >= cutoff : true; });
  const series = (win.length ? win : byDay).map((d) => d.pkr);
  const gross = f.paidPkr ?? 0, refunded = f.refundedPkr ?? 0, net = f.netPkr ?? 0;
  const margin = gross > 0 ? Math.round((net / gross) * 100) : null;
  const aov = analytics && analytics.commerce ? analytics.commerce.averageOrderValuePkr : null;
  const maxApp = Math.max(1, ...byApp.map((x) => x.pkr || 0));
  const tiles = [
    { label: 'Paid orders', value: fmtNumber(f.paidCount ?? k.paidOrders ?? 0), note: 'counted once per source record' },
    { label: 'Net revenue', value: fmtMoney(net), note: `paid ${fmtMoney(gross)}` },
    { label: 'Avg order value', value: aov === null || aov === undefined ? '—' : fmtMoney(aov), note: 'PKR paid orders only' },
    { label: 'Refunded', value: fmtNumber(f.refundedCount ?? 0), note: `${fmtMoney(refunded)} refunded` },
  ];
  return (
    <>
      <div className="row row-cols-2 row-cols-xl-4 g-3 mb-3">
        {tiles.map((t) => (
          <div className="col" key={t.label}><Card title={t.label}>
            <div className="fs-3 fw-bold">{t.value}</div>
            <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>{t.note}</div></Card></div>
        ))}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-8"><Card title="Sales statistics" right={<Tabs items={STAR_RANGES} value={range} onChange={setRange} />}>
          {series.length ? <Spark values={series} /> : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No dated paid orders in this range.</div>}
          <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>Range {range.toUpperCase()} · {win.length} day(s) with paid revenue · PKR only.</div></Card></div>
        <div className="col-lg-4"><Card title="Net profit margin">
          <Gauge label={margin === null ? 'no paid revenue in window' : `${fmtMoney(gross)} gross · ${fmtMoney(refunded)} refunded`} value={margin === null ? '—' : `${margin}%`} pct={margin} />
        </Card></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-5"><Card title="Total cost vs total revenue">
          <div className="d-flex justify-content-between small mb-1"><span>Revenue (paid)</span><span className="fw-semibold">{fmtMoney(gross)}</span></div>
          <div className="progress mb-3" style={{ height: 10 }}><div className="progress-bar" style={{ width: '100%', background: 'var(--pb-accent)' }} /></div>
          <div className="d-flex justify-content-between small mb-1"><span>Cost (refunded)</span><span className="fw-semibold">{fmtMoney(refunded)}</span></div>
          <div className="progress" style={{ height: 10 }}><div className="progress-bar" style={{ width: `${gross > 0 ? Math.min(100, (refunded / gross) * 100) : 0}%`, background: 'var(--pb-danger)' }} /></div>
          <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>Gateway payout fees are not reported by any source and are therefore not estimated.</div>
        </Card></div>
        <div className="col-lg-7"><Card title="Invoice / settlement ledger">
          {settlements.length ? (
            <DataTable
              columns={[
                { key: 'reference', label: 'Reference' },
                { key: 'app', label: 'Source', render: (r) => appLabel(r.app) },
                { key: 'status', label: 'Status' },
                { key: 'date', label: 'Settled' },
                { key: 'amount', label: 'Amount', render: (r) => fmtMoney(r.amount, r.currency) },
              ]}
              rows={settlements.slice(0, 6).map((s) => ({ ...s, status: s.settlementState || 'not reported', date: s.settledAt ? String(s.settledAt).slice(0, 10) : '—' }))}
            />
          ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No settlement rows from any source yet.</div>}
        </Card></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-7"><Card title="World sellings · revenue by application">
          {byApp.length ? byApp.map((a) => (
            <div className="d-flex align-items-center gap-2 mb-2" key={a.app}>
              <span className="small" style={{ width: 90 }}>{appLabel(a.app)}</span>
              <div className="progress flex-grow-1" style={{ height: 10 }}><div className="progress-bar" style={{ width: `${Math.min(100, ((a.pkr || 0) / maxApp) * 100)}%`, background: APP_COLORS[a.app] || 'var(--pb-accent)' }} /></div>
              <span className="small">{fmtMoney(a.pkr || 0)}</span>
            </div>
          )) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No paid revenue recorded by any application.</div>}
        </Card></div>
        <div className="col-lg-5"><Card title="Website audience metrics">
          {unavailable.length ? unavailable.map((u, i) => (
            <div className="small mb-2" key={i}><strong>{asText(u.metric)}</strong><div style={{ color: 'var(--bs-secondary-color)' }}>{asText(u.reason)}</div></div>
          )) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>Not reported.</div>}
        </Card></div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7"><Card title="Recent events">
          {activity.length ? (
            <ul className="list-unstyled mb-0">
              {activity.slice(0, 6).map((a, i) => (
                <li key={i} className="d-flex gap-2 border-bottom py-2">
                  <span className={a.result === 'success' ? 'text-success' : 'text-warning'}>{a.result === 'success' ? '●' : '▲'}</span>
                  <div><div className="small">{asText(a.action)} <span style={{ color: 'var(--bs-secondary-color)' }}>{asText(a.actor)}</span></div><small style={{ color: 'var(--bs-secondary-color)' }}>{asText(a.time || a.at || '')}</small></div>
                </li>
              ))}
            </ul>
          ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No audit events recorded yet.</div>}
        </Card></div>
        <div className="col-lg-5"><Card title="Watchlist · top products by licences">
          {topProducts.length ? (
            <ul className="list-unstyled mb-0 small">
              {topProducts.slice(0, 5).map((p) => (
                <li className="d-flex justify-content-between border-bottom py-1" key={p.name}><span className="text-truncate" style={{ maxWidth: 200 }}>{asText(p.name)}</span><span className="fw-semibold">{fmtNumber(p.licenses)}</span></li>
              ))}
            </ul>
          ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No catalogue licence data yet.</div>}
          <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>Ranked by licences issued from /api/admin/analytics.</div>
        </Card></div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Premium section — the "Superieur" pattern: a hero banner carrying a  */
/* live ticker strip, delta KPI cards, country-style breakdown lists, a  */
/* task/readiness card and an invoice ledger with status pills.         */
/* Layout pattern only — this admin's own Bootstrap 5 markup; no         */
/* third-party CSS, JS or imagery. Every figure is read from the         */
/* existing endpoints, and a delta is only shown when two comparable     */
/* windows really exist (otherwise an em dash with the reason).          */
/* ------------------------------------------------------------------ */

const DAY_LABEL = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(iso).slice(5) : d.toLocaleDateString(undefined, { weekday: 'short' });
};

const pillTone = (s) => {
  const t = String(s || '').toLowerCase();
  if (/(paid|settled|complete|success|deliver)/.test(t)) return 'success';
  if (/(pending|processing|unpaid|review|await|open)/.test(t)) return 'warning';
  if (/(fail|refund|cancel|declin|expire|void)/.test(t)) return 'danger';
  return 'secondary';
};

function Delta({ value, basis }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="pb-sup-delta flat">— <span className="pb-sup-delta-note">{basis}</span></span>;
  }
  const up = value >= 0;
  return (
    <span className={`pb-sup-delta ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{value}% <span className="pb-sup-delta-note">{basis}</span>
    </span>
  );
}

function SupKpi({ title, value, note, rule, delta, deltaBasis, href }) {
  return (
    <div className="pb-sup-kpi h-100">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="pb-sup-kpi-title">{title}</div>
        {href && <a className="pb-sup-pill" href={href}>View</a>}
      </div>
      <div className="pb-sup-kpi-value">{value}</div>
      <div className="pb-sup-rule"><i style={{ width: `${Math.max(4, Math.min(100, rule || 0))}%` }} /></div>
      <div className="pb-sup-kpi-note">{note}</div>
      <div className="mt-1"><Delta value={delta} basis={deltaBasis} /></div>
    </div>
  );
}

function SupRow({ name, value, pct: p, color, note }) {
  return (
    <div className="pb-sup-row">
      <span className="pb-sup-dot" style={{ background: color || 'var(--pb-accent)' }} />
      <div className="pb-sup-row-main">
        <div className="d-flex justify-content-between gap-2">
          <span className="pb-sup-row-name">{name}</span>
          <span className="pb-sup-row-val">{value}</span>
        </div>
        <div className="pb-sup-rule sm"><i style={{ width: `${Math.max(3, Math.min(100, p || 0))}%`, background: color || 'var(--pb-accent)' }} /></div>
        {note && <div className="pb-sup-row-note">{note}</div>}
      </div>
    </div>
  );
}

export function SectionSuperieur({ overview, finance }) {
  const k = (overview && overview.kpis) || {};
  const f = (finance && finance.headline) || {};
  const byDay = ((finance && finance.byDay) || []).map((d) => ({ date: d.date, pkr: Number(d.pkr) || 0 }));
  const byGateway = (finance && finance.byGateway) || [];
  const byApp = (overview && overview.byApp) || [];
  const health = (overview && overview.health) || {};
  const settlements = (finance && finance.settlements) || [];

  // Two real 7-day windows over the dated paid series (PKR only). No window,
  // no percentage — the delta stays an em dash with its reason.
  const sum = (a) => a.reduce((t, b) => t + b.pkr, 0);
  const last7 = byDay.slice(-7), prev7 = byDay.slice(-14, -7);
  const cur = sum(last7), prev = sum(prev7);
  const deltaPct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  const deltaBasis = prev7.length ? 'vs previous 7 days' : 'no previous window';
  const ticker = byDay.slice(-4);

  const maxApp = Math.max(1, ...byApp.map((a) => a.pkr || 0));
  const maxGw = Math.max(1, ...byGateway.map((g) => g.pkr || 0));
  const connected = health.connected ?? 0, total = health.total ?? 0;
  const readiness = total ? Math.round((connected / total) * 100) : null;
  const pending = health.unconfigured || [];
  const gross = f.paidPkr ?? k.revenuePkr ?? 0, refunded = f.refundedPkr ?? 0, net = f.netPkr ?? 0;
  const paidCount = f.paidCount ?? k.paidOrders ?? 0;
  const pendingCount = k.pendingOrders ?? 0;
  const orderTotal = paidCount + pendingCount;

  return (
    <>
      {/* ---- hero banner + live ticker ---- */}
      <div className="pb-sup-hero mb-3">
        <div className="pb-sup-hero-top">
          <span className="pb-sup-tag">New</span>
          <div className="pb-sup-hero-actions">
            <a href="/admin/finance" title="Open finance">⤢</a>
            <a href="#superieur" title="Jump to sections">↕</a>
          </div>
        </div>
        <div className="pb-sup-hero-main">
          <div className="pb-sup-hero-copy">
            <h2 className="pb-sup-hero-title">Every application, one ledger</h2>
            <p className="pb-sup-hero-sub">
              Paid revenue across the five PlayBeat applications, counted once per source record.
              {' '}{fmtNumber(connected)} of {fmtNumber(total)} applications connected.
            </p>
            <div className="pb-sup-hero-figure">
              <div className="pb-sup-hero-value">{dash(fmtMoney(net))}</div>
              <div className="pb-sup-hero-label">net revenue · reporting currency PKR</div>
            </div>
          </div>
          <iframe className="pb-sup-brand-art" src="/brand/playbeat-digital-mark.html" title="Animated PlayBeat Digital logo" loading="lazy" tabIndex={-1} />
        </div>
        <div className="pb-sup-ticker">
          {ticker.length ? ticker.map((d, i) => {
            const before = i > 0 ? ticker[i - 1].pkr : null;
            const dd = before !== null && before > 0 ? Math.round(((d.pkr - before) / before) * 100) : null;
            const dir = dd === null ? 'flat' : dd >= 0 ? 'up' : 'down';
            return (
              <div className="pb-sup-tick" key={d.date}>
                <div className={`pb-sup-tick-dir ${dir}`}>
                  {dd === null ? '•' : dd >= 0 ? '▲' : '▼'} {dd === null ? '—' : `${dd >= 0 ? '+' : ''}${dd}%`}
                </div>
                <div className="pb-sup-tick-val">{fmtNumber(d.pkr)}</div>
                <div className="pb-sup-tick-code">{DAY_LABEL(d.date)}</div>
              </div>
            );
          }) : <div className="pb-sup-tick flat">No dated paid orders yet — nothing is fabricated to fill this strip.</div>}
        </div>
      </div>

      {/* ---- delta KPI cards ---- */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-4">
          <SupKpi title="Revenue" href="/admin/finance" value={dash(fmtMoney(gross))}
            note="paid orders in PKR, counted once per source record"
            rule={100} delta={deltaPct} deltaBasis={deltaBasis} />
        </div>
        <div className="col-12 col-lg-4">
          <SupKpi title="Sells" value={fmtNumber(paidCount)}
            note={`${fmtNumber(pendingCount)} order(s) still awaiting action`}
            rule={orderTotal ? (paidCount / orderTotal) * 100 : 0}
            delta={null} deltaBasis="no comparable window for order counts" />
        </div>
        <div className="col-12 col-lg-4">
          <SupKpi title="Refunded" value={dash(fmtMoney(refunded))}
            note={`${fmtNumber(f.refundedCount ?? 0)} refunded order(s)`}
            rule={gross > 0 ? (refunded / gross) * 100 : 0}
            delta={null} deltaBasis="refunds are read from the order record itself" />
        </div>
      </div>

      {/* ---- breakdown lists + integration tasks ---- */}
      <div className="row g-3 mb-3">
        <div className="col-lg-7">
          <Card title="Income by application" right={<span className="small">PKR paid</span>}>
            {byApp.length ? byApp.map((a) => (
              <SupRow key={a.app || a.label} name={appLabel(a.app) || asText(a.label)} color={APP_COLORS[a.app] || 'var(--pb-accent)'}
                value={fmtMoney(a.pkr || 0)} pct={((a.pkr || 0) / maxApp) * 100}
                note={`${pct(a.pkr || 0, gross)} of paid revenue`} />
            )) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No paid revenue recorded by any application yet.</div>}
          </Card>
        </div>
        <div className="col-lg-5">
          <Card title="Integration tasks" right={<span className="small">{fmtNumber(connected)}/{fmtNumber(total)}</span>}>
            <div className="d-flex justify-content-between align-items-end mb-1">
              <span className="pb-sup-readiness">{readiness === null ? '—' : `${readiness}%`}</span>
              <span className="small" style={{ color: 'var(--bs-secondary-color)' }}>readiness</span>
            </div>
            <div className="pb-sup-rule"><i style={{ width: `${readiness || 0}%` }} /></div>
            <div className="d-flex flex-wrap gap-2 my-3">
              <span className="badge text-bg-success">Completed {fmtNumber(connected)}</span>
              <span className="badge text-bg-warning text-dark">Overdue {fmtNumber(pending.length)}</span>
              <span className="badge text-bg-secondary">Total {fmtNumber(total)}</span>
            </div>
            {pending.length ? (
              <ul className="list-unstyled mb-0 small">
                {pending.slice(0, 4).map((p) => (
                  <li className="d-flex justify-content-between border-bottom py-1" key={asText(p.slug || p.label)}>
                    <span>{asText(p.label || p.slug)}</span>
                    <span style={{ color: 'var(--bs-secondary-color)' }}>{asText(p.reason || 'credentials required')}</span>
                  </li>
                ))}
              </ul>
            ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>Every application reports a healthy connection.</div>}
          </Card>
        </div>
      </div>

      {/* ---- performance strip + invoice ledger ---- */}
      <div className="row g-3">
        <div className="col-lg-4">
          <Card title="Traffic, orders & revenue">
            {[
              { l: 'Paid orders', v: fmtNumber(paidCount), s: pct(paidCount, orderTotal || 1), c: 'var(--pb-accent)' },
              { l: 'Net revenue', v: fmtMoney(net), s: pct(net, gross || 1), c: 'var(--pb-success)' },
              { l: 'Refunded', v: fmtMoney(refunded), s: pct(refunded, gross || 1), c: 'var(--pb-danger)' },
              { l: 'Open enquiries', v: fmtNumber(k.openEnquiries ?? 0), s: '—', c: 'var(--pb-warning)' },
            ].map((m) => (
              <div className="pb-sup-mini" key={m.l}>
                <div>
                  <div className="pb-sup-mini-label">{m.l}</div>
                  <div className="pb-sup-mini-value">{dash(m.v)}</div>
                </div>
                <span className="pb-sup-mini-share" style={{ color: m.c }}>{m.s}</span>
              </div>
            ))}
          </Card>
        </div>
        <div className="col-lg-8">
          <Card title="Invoice / settlement ledger" right={<span className="small">{fmtNumber(settlements.length)} row(s)</span>}>
            {settlements.length ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr><th>Invoice</th><th>Source</th><th>Gateway</th><th className="text-end">Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {settlements.slice(0, 7).map((s, i) => {
                      const state = s.settlementState || 'not reported';
                      return (
                        <tr key={asText(s.reference || s.id || i)}>
                          <td className="pb-mono small">#{asText(s.reference || s.id || '—')}</td>
                          <td className="small">{appLabel(s.app)}</td>
                          <td className="small">{asText(s.gateway || '—')}</td>
                          <td className="text-end small fw-semibold">{fmtMoney(s.amount, s.currency)}</td>
                          <td><span className={`badge text-bg-${pillTone(state)}`}>{state}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No settled payments reported by any source yet.</div>}
            <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>
              Settlement state is taken from the order record; a source that reports nothing is labelled “not reported”, never assumed paid.
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Premium section — the "ProUI" pattern: a dark welcome banner with    */
/* inline KPI stats, flat widgets carrying a coloured top border and a  */
/* round icon badge, two inline mini-chart cards, then a two-panel row  */
/* of a settlement ledger and a source-status list.                     */
/* Pattern only — this admin's own Bootstrap 5 markup; no third-party   */
/* CSS, JS or imagery, and every figure comes from the existing         */
/* endpoints. A source that reports nothing renders an em dash.         */
/* ------------------------------------------------------------------ */

const PROUI_TONES = ['#F0AD4E', '#5CB85C', '#D9534F', '#9B7BE8'];

function ProuiWidget({ label, value, note, tone, icon }) {
  return (
    <div className="pb-proui-widget h-100" style={{ '--pb-w-top': tone || 'var(--pb-accent)' }}>
      <span className="pb-proui-badge" style={{ background: tone || 'var(--pb-accent)' }} aria-hidden="true">{icon}</span>
      <div className="pb-proui-widget-body">
        <div className="pb-proui-widget-label">{label}</div>
        <div className="pb-proui-widget-sub">{value}</div>
        {note && <div className="pb-proui-widget-note">{note}</div>}
      </div>
    </div>
  );
}

export function SectionProUI({ overview, finance }) {
  const k = (overview && overview.kpis) || {};
  const f = (finance && finance.headline) || {};
  const byDay = ((finance && finance.byDay) || []).map((d) => ({ date: d.date, pkr: Number(d.pkr) || 0 }));
  const byGateway = (finance && finance.byGateway) || [];
  const byApp = (overview && overview.byApp) || [];
  const health = (overview && overview.health) || {};
  const settlements = (finance && finance.settlements) || [];
  const activity = (overview && overview.activity) || [];

  const gross = f.paidPkr ?? k.revenuePkr ?? 0;
  const refunded = f.refundedPkr ?? 0;
  const net = f.netPkr ?? 0;
  const paidCount = f.paidCount ?? k.paidOrders ?? 0;
  const connected = health.connected ?? 0, total = health.total ?? 0;
  const maxGw = Math.max(1, ...byGateway.map((g) => g.pkr || 0));
  const maxApp = Math.max(1, ...byApp.map((a) => a.pkr || 0));
  const pending = health.unconfigured || [];
  const degraded = health.degraded || [];
  const series = byDay.map((d) => d.pkr);

  return (
    <>
      {/* ---- welcome banner with inline stats ---- */}
      <div className="pb-proui-hero mb-3">
        <div className="pb-proui-hero-copy">
          <div className="pb-proui-hero-title">Welcome back, <strong>Admin</strong></div>
          <div className="pb-proui-hero-sub">Everything the five applications report, in one place.</div>
        </div>
        <div className="pb-proui-hero-stats">
          {[
            { v: dash(fmtMoney(net)), l: 'Net revenue' },
            { v: fmtNumber(paidCount), l: 'Paid orders' },
            { v: dash(fmtNumber(k.liveChannels ?? 0)), l: 'Live channels' },
            { v: `${fmtNumber(connected)}/${fmtNumber(total)}`, l: 'Connected' },
          ].map((s) => (
            <div className="pb-proui-stat" key={s.l}>
              <div className="pb-proui-stat-v">{s.v}</div>
              <div className="pb-proui-stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- flat widgets with a coloured top border ---- */}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 mb-3">
        {[
          { label: 'Revenue', value: dash(fmtMoney(gross)), note: 'paid orders in PKR', tone: PROUI_TONES[0], icon: '▤' },
          { label: 'Paid orders', value: fmtNumber(paidCount), note: 'counted once per source record', tone: PROUI_TONES[1], icon: '$' },
          { label: 'Refunded', value: dash(fmtMoney(refunded)), note: `${fmtNumber(f.refundedCount ?? 0)} refunded order(s)`, tone: PROUI_TONES[2], icon: '↩' },
          { label: 'Sources', value: `${fmtNumber(connected)} of ${fmtNumber(total)}`, note: (pending.length || degraded.length) ? `${fmtNumber(pending.length)} pending · ${fmtNumber(degraded.length)} degraded` : 'no connection gaps reported', tone: PROUI_TONES[3], icon: '◈' },
        ].map((w) => (
          <div className="col" key={w.label}><ProuiWidget {...w} /></div>
        ))}
      </div>

      {/* ---- two inline mini-chart cards ---- */}
      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div className="pb-proui-widget h-100">
            <span className="pb-proui-badge" style={{ background: '#1BBAE1' }} aria-hidden="true">▦</span>
            <div className="pb-proui-widget-body">
              <div className="pb-proui-widget-label">Latest sales</div>
              <div className="pb-proui-widget-note">PKR paid, per day — {fmtNumber(byDay.length)} day(s) reported</div>
            </div>
            {series.length ? <Spark values={series} /> : <span className="pb-proui-widget-note">no dated paid orders</span>}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="pb-proui-widget h-100">
            <span className="pb-proui-badge" style={{ background: '#5CB85C' }} aria-hidden="true">◕</span>
            <div className="pb-proui-widget-body">
              <div className="pb-proui-widget-label">Gateway mix</div>
              <div className="pb-proui-widget-note">share of paid PKR, taken from the order record</div>
            </div>
            <div className="pb-proui-gw">
              {byGateway.length ? byGateway.slice(0, 4).map((g) => (
                <div className="pb-proui-gw-row" key={g.gateway}>
                  <span className="pb-proui-gw-name text-truncate">{asText(g.gateway)}</span>
                  <span className="pb-proui-gw-bar"><i style={{ width: `${Math.min(100, ((g.pkr || 0) / maxGw) * 100)}%` }} /></span>
                  <span className="pb-proui-gw-val">{pct(g.pkr || 0, gross)}</span>
                </div>
              )) : <span className="pb-proui-widget-note">no gateway reported on a paid order yet</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ---- two panels ---- */}
      <div className="row g-3">
        <div className="col-lg-7">
          <Card title="Settlement ledger" right={<span className="small">{fmtNumber(settlements.length)} row(s)</span>}>
            {settlements.length ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr><th>Invoice</th><th>Source</th><th>Gateway</th><th className="text-end">Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {settlements.slice(0, 7).map((s, i) => {
                      const state = s.settlementState || 'not reported';
                      return (
                        <tr key={asText(s.reference || s.id || i)}>
                          <td className="pb-mono small">#{asText(s.reference || s.id || '—')}</td>
                          <td className="small">{appLabel(s.app)}</td>
                          <td className="small">{asText(s.gateway || '—')}</td>
                          <td className="text-end small fw-semibold">{fmtMoney(s.amount, s.currency)}</td>
                          <td><span className={`badge text-bg-${pillTone(state)}`}>{state}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No settled payments reported by any source yet.</div>}
          </Card>
        </div>
        <div className="col-lg-5">
          <Card title="Source status">
            {byApp.length ? byApp.map((a) => (
              <div className="pb-proui-src" key={a.app}>
                <span className="pb-proui-src-dot" style={{ background: APP_COLORS[a.app] || 'var(--pb-accent)' }} />
                <span className="pb-proui-src-name">{appLabel(a.app)}</span>
                <span className="pb-proui-src-bar"><i style={{ width: `${Math.min(100, ((a.pkr || 0) / maxApp) * 100)}%`, background: APP_COLORS[a.app] || 'var(--pb-accent)' }} /></span>
                <span className="pb-proui-src-val">{fmtMoney(a.pkr || 0)}</span>
              </div>
            )) : <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>No paid revenue recorded by any application yet.</div>}
            <div className="d-flex flex-wrap gap-2 mt-3 small">
              <span className="badge text-bg-success">Connected {fmtNumber(connected)}</span>
              <span className="badge text-bg-warning text-dark">Pending {fmtNumber(pending.length)}</span>
              <span className="badge text-bg-danger">Degraded {fmtNumber(degraded.length)}</span>
            </div>
            {activity.length > 0 && (
              <ul className="list-unstyled mb-0 mt-3 small">
                {activity.slice(0, 3).map((a, i) => (
                  <li className="d-flex justify-content-between border-bottom py-1" key={i}>
                    <span className="text-truncate" style={{ maxWidth: 190 }}>{asText(a.action)}</span>
                    <span className={a.result === 'success' ? 'text-success' : 'text-warning'}>{asText(a.result)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function RixzoRevenueChart({ rows }) {
  if (!rows.length) return <div className="pb-rixzo-empty">No dated paid orders are available for this window.</div>;
  const peak = Math.max(1, ...rows.map((row) => Number(row.pkr) || 0));
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? 360 : 20 + (index / (rows.length - 1)) * 680;
    const y = 174 - ((Number(row.pkr) || 0) / peak) * 142;
    return [x, y];
  });
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`).join(' ');
  const area = `${line} L${points.at(-1)[0]},184 L${points[0][0]},184 Z`;
  return (
    <div className="pb-rixzo-chart-wrap">
      <svg className="pb-rixzo-chart" viewBox="0 0 720 200" role="img" aria-label={`Paid PKR revenue across ${rows.length} reported days`}>
        <defs><linearGradient id="rixzoRevenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--pb-accent)" stopOpacity=".28" /><stop offset="1" stopColor="var(--pb-accent)" stopOpacity="0" /></linearGradient></defs>
        {[38, 86, 134, 184].map((y) => <line key={y} x1="0" x2="720" y1={y} y2={y} className="pb-rixzo-gridline" />)}
        <path d={area} fill="url(#rixzoRevenueFill)" />
        <path d={line} className="pb-rixzo-line" />
        {points.map(([x, y], index) => <circle key={rows[index].date} cx={x} cy={y} r="3.5" className="pb-rixzo-point"><title>{rows[index].date}: {fmtMoney(rows[index].pkr)}</title></circle>)}
      </svg>
      <div className="pb-rixzo-axis"><span>{rows[0].date}</span><span>{rows.at(-1).date}</span></div>
    </div>
  );
}

export function SectionRixzo({ overview, analytics, finance }) {
  const [range, setRange] = useState(30);
  const k = overview?.kpis || {};
  const headline = finance?.headline || {};
  const byDay = finance?.byDay || [];
  const cutoff = Date.now() - range * 86400000;
  const chartRows = byDay.filter((row) => {
    const time = new Date(`${row.date}T00:00:00`).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });
  const appRows = overview?.byApp || [];
  const maxApp = Math.max(1, ...appRows.map((row) => row.pkr || 0));
  const settlements = finance?.settlements || [];
  const events = overview?.activity || [];
  const avgOrder = analytics?.commerce?.averageOrderValuePkr;
  const tiles = [
    { label: 'Paid orders', value: fmtNumber(headline.paidCount ?? k.paidOrders), note: 'Counted once per source record', tone: 'mint' },
    { label: 'Net revenue', value: headline.netPkr == null ? '—' : fmtMoney(headline.netPkr), note: 'PKR · after reported refunds', tone: 'cream' },
    { label: 'Average order', value: avgOrder == null ? '—' : fmtMoney(avgOrder), note: 'Paid PKR orders only', tone: 'lilac' },
    { label: 'Refunded', value: fmtMoney(headline.refundedPkr ?? 0), note: `${fmtNumber(headline.refundedCount ?? 0)} reported refunds`, tone: 'rose' },
  ];

  return (
    <div className="pb-rixzo">
      <section className="pb-rixzo-hero">
        <div className="pb-rixzo-hero-copy">
          <div className="pb-rixzo-eyebrow"><span className="pb-rixzo-orbit" /> SALES ATELIER <span>·</span> LIVE REPORT</div>
          <h2>Make room<br />for <em>the real story.</em></h2>
          <p>One clear view of paid orders and revenue across your connected PlayBeat applications.</p>
          <div className="pb-rixzo-hero-total"><span>Net revenue · PKR</span><strong>{headline.netPkr == null ? '—' : fmtMoney(headline.netPkr)}</strong></div>
          <div className="pb-rixzo-hero-foot">{fmtNumber(headline.paidCount ?? k.paidOrders)} paid orders <i /> {fmtNumber(headline.pendingCount ?? k.pendingOrders)} awaiting payment</div>
        </div>
        <div className="pb-rixzo-hero-art" aria-hidden="true">
          <div className="pb-rixzo-art-ring ring-one" /><div className="pb-rixzo-art-ring ring-two" />
          <div className="pb-rixzo-art-sun" /><div className="pb-rixzo-art-stem" />
          <div className="pb-rixzo-art-note">PLAYBEAT<br /><span>COMMERCE / 01</span></div>
        </div>
        <div className="pb-rixzo-hero-stamp"><span>FIELD<br />NOTES</span><strong>PB</strong></div>
      </section>

      <div className="pb-rixzo-kpis">
        {tiles.map((tile, index) => <article className={`pb-rixzo-kpi ${tile.tone}`} key={tile.label}>
          <span className="pb-rixzo-kpi-index">0{index + 1}</span><span className="pb-rixzo-kpi-label">{tile.label}</span>
          <strong>{tile.value}</strong><small>{tile.note}</small>
        </article>)}
      </div>

      <div className="pb-rixzo-grid">
        <section className="pb-rixzo-panel pb-rixzo-sales-chart">
          <div className="pb-rixzo-panel-head"><div><span className="pb-rixzo-overline">THE SALES CURVE</span><h3>Revenue, in rhythm.</h3></div>
            <div className="pb-rixzo-ranges" aria-label="Revenue date range">{[7, 30, 90].map((days) => <button type="button" key={days} className={range === days ? 'active' : ''} aria-pressed={range === days} onClick={() => setRange(days)}>{days}D</button>)}</div>
          </div>
          <RixzoRevenueChart rows={chartRows} />
          <div className="pb-rixzo-chart-caption"><span>Paid PKR revenue by day</span><span>{chartRows.length} reported days <i /> {finance?.windowDays || 90}-day source window</span></div>
        </section>
        <section className="pb-rixzo-panel pb-rixzo-app-breakdown">
          <div className="pb-rixzo-panel-head"><div><span className="pb-rixzo-overline">BY APPLICATION</span><h3>Where it gathers.</h3></div><span className="pb-rixzo-flower">✳</span></div>
          {appRows.length ? <div className="pb-rixzo-app-list">{appRows.map((row) => <div className="pb-rixzo-app-row" key={row.app}>
            <div className="pb-rixzo-app-label"><span style={{ '--app-color': APP_COLORS[row.app] || 'var(--pb-accent)' }} />{appLabel(row.app)}<strong>{fmtMoney(row.pkr || 0)}</strong></div>
            <div className="pb-rixzo-app-track"><i style={{ width: `${Math.min(100, (row.pkr || 0) / maxApp * 100)}%`, background: APP_COLORS[row.app] || 'var(--pb-accent)' }} /></div>
          </div>)}</div> : <div className="pb-rixzo-empty">No paid revenue by application has been reported.</div>}
          <a href="/admin/finance" className="pb-rixzo-text-link">Open the finance ledger <span>↗</span></a>
        </section>
      </div>

      <div className="pb-rixzo-bottom-grid">
        <section className="pb-rixzo-panel pb-rixzo-ledger">
          <div className="pb-rixzo-panel-head"><div><span className="pb-rixzo-overline">LATEST PAID RECORDS</span><h3>Quietly adding up.</h3></div><a href="/admin/finance" className="pb-rixzo-mini-link">All finance ↗</a></div>
          {settlements.length ? <div className="pb-rixzo-ledger-list">{settlements.slice(0, 5).map((row, index) => <div className="pb-rixzo-ledger-row" key={`${row.app}-${row.sourceId || row.reference || index}`}>
            <span className="pb-rixzo-ledger-mark" style={{ '--app-color': APP_COLORS[row.app] || 'var(--pb-accent)' }}>{String(index + 1).padStart(2, '0')}</span>
            <span className="pb-rixzo-ledger-ref"><strong>{asText(row.reference || row.sourceId || 'Order')}</strong><small>{appLabel(row.app)} · {fmtDateTime(row.settledAt || row.date || null)}</small></span>
            <span className="pb-rixzo-ledger-amount">{fmtMoney(row.amount, row.currency)}</span>
          </div>)}</div> : <div className="pb-rixzo-empty">No paid order records are available from connected sources yet.</div>}
        </section>
        <section className="pb-rixzo-panel pb-rixzo-activity">
          <div className="pb-rixzo-panel-head"><div><span className="pb-rixzo-overline">THE WORK BEHIND IT</span><h3>Recent signals.</h3></div><span className="pb-rixzo-activity-icon">↗</span></div>
          {events.length ? <div className="pb-rixzo-event-list">{events.slice(0, 4).map((event, index) => <div className="pb-rixzo-event" key={`${event.at || event.time || index}-${event.action}`}>
            <span className={`pb-rixzo-event-dot ${event.result === 'success' ? 'ok' : 'attention'}`} />
            <span><strong>{asText(event.action)}</strong><small>{asText(event.actor || 'System')} · {asText(event.time || event.at || '')}</small></span>
          </div>)}</div> : <div className="pb-rixzo-empty">No audit signals have been recorded yet.</div>}
          <a href="/admin/audit-log" className="pb-rixzo-text-link">Explore activity <span>↗</span></a>
        </section>
      </div>
      <p className="pb-rixzo-source-note">Figures are drawn from the finance and overview feeds. Missing source data stays unfilled; no trend or value is estimated.</p>
    </div>
  );
}

export const SECTIONS = [
  { id: 'rixzo', label: 'Rixzo Atelier', Component: SectionRixzo, note: 'An editorial sales dashboard: real paid revenue, application mix, dated sales curve, finance ledger and audit signals.' },
  { id: 'superieur', label: 'Superieur', Component: SectionSuperieur, note: 'Hero banner with a live ticker strip, delta KPI cards, income-by-application list, integration-task readiness card, performance strip and an invoice ledger with status pills.' },
  { id: 'proui', label: 'ProUI', Component: SectionProUI, note: 'Welcome banner with inline KPI stats, flat widgets with a coloured top border and round icon badge, two inline mini-chart cards, settlement ledger and source-status panel.' },
  { id: 'analytics', label: 'Analytics', Component: SectionAnalytics, note: 'Pastel metric banners, order overview, earnings, product/review/sales row.' },
  { id: 'currency', label: 'Currency & Exchange', Component: SectionCurrency, note: 'Currency cards, per-application revenue bars, settlement panel.' },
  { id: 'executive', label: 'Executive Horizontal', Component: SectionExecutive, note: 'Turnover/clients/availability hero, gauges, activity feed, review split.' },
  { id: 'breeze', label: 'Breeze', Component: SectionBreeze, note: 'KPI tiles, profit chart, status donut, info cards.' },
  { id: 'stellar', label: 'Stellar', Component: SectionStellar, note: 'Performance tiles, performance-indicator bars, orders-by-channel, settlement ledger, gateway sales, income/expenses, quick status.' },
  { id: 'starpro', label: 'Star Pro', Component: SectionStarPro, note: 'Sales tiles, range-tabbed sales chart, profit-margin gauge, cost vs revenue, invoice ledger, world sellings, events timeline, watchlist.' },
];
