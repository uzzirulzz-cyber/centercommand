'use client';

import { useState } from 'react';
import { PRODUCTS } from '../../../lib/data';
import { PageHeader, Panel, DataTable, StatusBadge, ExportCSVButton, fmtMoney } from '../../../components/ui';

const columns = [
  { key: 'sku', label: 'SKU', render: (r) => <span className="pb-mono">{r.sku}</span>, value: (r) => r.sku },
  { key: 'name', label: 'Product', value: (r) => r.name },
  { key: 'type', label: 'Type', value: (r) => r.type },
  { key: 'price', label: 'Price', render: (r) => fmtMoney(r.price, r.currency), value: (r) => r.price },
  { key: 'licenses', label: 'Licenses issued', value: (r) => r.licenses },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} />, value: (r) => r.status },
];

export default function Products() {
  const [filter, setFilter] = useState('all');
  const rows = PRODUCTS.filter((p) => filter === 'all' || p.status === filter);

  return (
    <>
      <PageHeader
        title="Products, Inventory & Digital Licenses"
        subtitle="Source: PlayBeat.digital storefront catalog. Writes go through the native API connector (authorized roles only)."
        actions={
          <>
            <ExportCSVButton filename="products.csv" columns={columns} rows={rows} />
            <button className="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#newProduct">+ New product</button>
          </>
        }
      />
      <Panel pad={false} actions={
        <div className="btn-group btn-group-sm">
          {['all', 'active', 'archived'].map((f) => (
            <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      } title="Catalog">
        <DataTable columns={columns} rows={rows} empty={{ title: 'No products match this filter' }} />
      </Panel>

      <div className="modal fade" id="newProduct" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header"><h2 className="modal-title fs-6">New product</h2>
              <button className="btn-close" data-bs-dismiss="modal" aria-label="Close" /></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Name</label><input className="form-control" placeholder="Beat Pack Vol. 10" /></div>
              <div className="row g-2">
                <div className="col"><label className="form-label">Price (PKR)</label><input className="form-control" type="number" placeholder="12000" /></div>
                <div className="col"><label className="form-label">Type</label>
                  <select className="form-select"><option>Digital license</option><option>Subscription</option></select></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button className="btn btn-primary" data-bs-dismiss="modal">Create via connector</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
