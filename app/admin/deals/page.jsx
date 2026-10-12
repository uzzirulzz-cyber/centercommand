'use client';

import { DEALS } from '../../../lib/data';
import { PageHeader, Panel, DataTable, StatusBadge, ExportCSVButton, fmtMoney } from '../../../components/ui';

const columns = [
  { key: 'title', label: 'Listing', value: (r) => r.title },
  { key: 'category', label: 'Category', render: (r) => <span className="badge text-bg-secondary">{r.category}</span>, value: (r) => r.category },
  { key: 'value', label: 'Value', render: (r) => fmtMoney(r.value, r.currency), value: (r) => `${r.currency} ${r.value}` },
  { key: 'enquiries', label: 'Enquiries', value: (r) => r.enquiries },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status[0].toUpperCase() + r.status.slice(1)} />, value: (r) => r.status },
  { key: 'actions', label: '', render: () => <button className="btn btn-sm btn-outline-secondary">Open</button> },
];

export default function Deals() {
  return (
    <>
      <PageHeader
        title="Deals, Listings & Enquiries"
        subtitle="Source: MakeThisDeal.biz — listings, leads, enquiries and transactions via its native API."
        actions={<ExportCSVButton filename="deals.csv" columns={columns} rows={DEALS} />}
      />
      <Panel title="Listings" pad={false}>
        <DataTable columns={columns} rows={DEALS} pageSize={10} />
      </Panel>
    </>
  );
}
