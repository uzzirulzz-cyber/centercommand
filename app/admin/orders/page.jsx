'use client';

import { useState } from 'react';
import { ORDERS } from '../../../lib/data';
import { APPS } from '../../../lib/apps';
import { PageHeader, Panel, DataTable, StatusBadge, SourceBadge, ExportCSVButton, fmtMoney } from '../../../components/ui';

const PROOF_BADGE = {
  verified: 'success',
  'awaiting review': 'warning',
  'n/a': 'secondary',
};

const columns = [
  { key: 'orderNo', label: 'Order', render: (r) => <span className="pb-mono">{r.orderNo}</span>, value: (r) => r.orderNo },
  { key: 'app', label: 'Source', render: (r) => <SourceBadge slug={r.app} />, value: (r) => r.app },
  { key: 'customer', label: 'Customer', value: (r) => r.customer },
  { key: 'item', label: 'Item', value: (r) => r.item },
  { key: 'amount', label: 'Amount', render: (r) => fmtMoney(r.amount, r.currency), value: (r) => `${r.currency} ${r.amount}` },
  { key: 'paymentProof', label: 'Payment proof', render: (r) => <span className={`badge text-bg-${PROOF_BADGE[r.paymentProof]}`}>{r.paymentProof}</span>, value: (r) => r.paymentProof },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} />, value: (r) => r.status },
  { key: 'date', label: 'Date', value: (r) => r.date },
];

export default function Orders() {
  const [app, setApp] = useState('all');
  const [status, setStatus] = useState('all');
  const rows = ORDERS.filter((o) => (app === 'all' || o.app === app) && (status === 'all' || o.status === status));

  return (
    <>
      <PageHeader
        title="Orders, Subscriptions & Payment Proofs"
        subtitle="Combined, deduplicated across apps — each payment is keyed by (source app, source order id) so it is never counted twice. PKR is the reporting currency; other currencies stay labeled."
        actions={<ExportCSVButton filename="orders.csv" columns={columns} rows={rows} />}
      />
      <Panel pad={false} title="Orders" actions={
        <div className="d-flex gap-2 flex-wrap">
          <select className="form-select form-select-sm" style={{ width: 'auto' }} value={app} onChange={(e) => setApp(e.target.value)} aria-label="Filter by application">
            <option value="all">All applications</option>
            {APPS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select>
          <select className="form-select form-select-sm" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      }>
        <DataTable columns={columns} rows={rows} empty={{ title: 'No orders match these filters' }} />
      </Panel>
    </>
  );
}
