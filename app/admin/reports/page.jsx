'use client';

import { ORDERS, CUSTOMERS, LEADS, DEALS } from '../../../lib/data';
import { PageHeader, Panel, ExportCSVButton, fmtMoney } from '../../../components/ui';

const REPORTS = [
  { name: 'Orders (all sources, deduplicated)', file: 'report-orders.csv', rows: ORDERS, cols: [{ key: 'orderNo', label: 'Order' }, { key: 'app', label: 'Source app' }, { key: 'customer', label: 'Customer' }, { key: 'item', label: 'Item' }, { key: 'amount', label: 'Amount', value: (r) => `${r.currency} ${r.amount}` }, { key: 'status', label: 'Status' }, { key: 'date', label: 'Date' }] },
  { name: 'Customers (combined, with source IDs)', file: 'report-customers.csv', rows: CUSTOMERS, cols: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'source', label: 'Source app' }, { key: 'sourceId', label: 'Source record ID' }, { key: 'spend', label: 'LTV', value: (r) => `${r.currency} ${r.spend}` }] },
  { name: 'CRM leads by stage', file: 'report-leads.csv', rows: LEADS, cols: [{ key: 'name', label: 'Lead' }, { key: 'stage', label: 'Stage' }, { key: 'owner', label: 'Owner' }, { key: 'channel', label: 'Channel' }, { key: 'value', label: 'Value', value: (r) => `${r.currency} ${r.value}` }] },
  { name: 'Marketplace listings', file: 'report-deals.csv', rows: DEALS, cols: [{ key: 'title', label: 'Listing' }, { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' }, { key: 'enquiries', label: 'Enquiries' }, { key: 'value', label: 'Value', value: (r) => `${r.currency} ${r.value}` }] },
];

export default function Reports() {
  const pkr = ORDERS.filter((o) => o.status === 'paid' && o.currency === 'PKR').reduce((s, o) => s + o.amount, 0);
  const usd = ORDERS.filter((o) => o.status === 'paid' && o.currency === 'USD').reduce((s, o) => s + o.amount, 0);
  return (
    <>
      <PageHeader title="Reports & Exports"
        subtitle={`Reporting currency: PKR. Current paid totals — ${fmtMoney(pkr)} · plus ${fmtMoney(usd, 'USD')} labeled separately. Amounts are never double-counted across apps.`} />
      <div className="row g-3">
        {REPORTS.map((r) => (
          <div className="col-md-6" key={r.file}>
            <Panel title={r.name}>
              <div className="d-flex justify-content-between align-items-center">
                <small style={{ color: 'var(--bs-secondary-color)' }}>{r.rows.length} rows · CSV · generated client-side in this prototype</small>
                <ExportCSVButton filename={r.file} columns={r.cols} rows={r.rows} label="Download" />
              </div>
            </Panel>
          </div>
        ))}
      </div>
      <p className="mt-3" style={{ fontSize: '.85rem', color: 'var(--bs-secondary-color)' }}>
        Production: exports are generated server-side from connector reads with the same idempotent keys used
        by sync, so an export can never diverge from the dashboard totals.
      </p>
    </>
  );
}
