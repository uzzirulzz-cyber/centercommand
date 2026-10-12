'use client';

import { useState } from 'react';
import { CUSTOMERS, LEADS } from '../../../lib/data';
import { PageHeader, Panel, DataTable, SourceBadge, ExportCSVButton, fmtMoney } from '../../../components/ui';

const custCols = [
  { key: 'name', label: 'Customer', value: (r) => r.name },
  { key: 'email', label: 'Verified identifier', render: (r) => <span className="pb-mono">{r.email}</span>, value: (r) => r.email },
  { key: 'source', label: 'Source', render: (r) => <SourceBadge slug={r.source} />, value: (r) => r.source },
  { key: 'sourceId', label: 'Source record', render: (r) => <span className="pb-mono">{r.sourceId}</span>, value: (r) => r.sourceId },
  { key: 'linked', label: 'Identity link', render: (r) => r.linked ? <span className="badge text-bg-success">Verified link</span> : <span className="badge text-bg-secondary">Unlinked</span>, value: (r) => (r.linked ? 'linked' : 'unlinked') },
  { key: 'spend', label: 'Lifetime value', render: (r) => fmtMoney(r.spend, r.currency), value: (r) => `${r.currency} ${r.spend}` },
  { key: 'since', label: 'Since', value: (r) => r.since },
];

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won'];

export default function Customers() {
  const [tab, setTab] = useState('customers');

  return (
    <>
      <PageHeader
        title="Customers & CRM"
        subtitle="Combined customer view across all apps. Records are linked only through verified identifiers (email, phone, SSO subject) — never auto-merged by name — and always keep their original source IDs."
        actions={<ExportCSVButton filename="customers.csv" columns={custCols} rows={CUSTOMERS} />}
      />

      <ul className="nav nav-tabs mb-3" role="tablist">
        {[['customers', 'All customers'], ['pipeline', 'Pulse CRM pipeline'], ['integrations', 'Messaging integrations']].map(([k, l]) => (
          <li className="nav-item" key={k} role="presentation">
            <button className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)} role="tab" aria-selected={tab === k}>{l}</button>
          </li>
        ))}
      </ul>

      {tab === 'customers' && (
        <Panel pad={false} title="Combined customers">
          <DataTable columns={custCols} rows={CUSTOMERS} />
        </Panel>
      )}

      {tab === 'pipeline' && (
        <>
          <div className="alert alert-warning small">
            Pulse CRM (<span className="pb-mono">uzzirulzz-cyber/eaedpulseplus</span>) is registered but not yet
            configured — the board below shows demo leads. Install the CRM modules per README §7 and run
            <em> Test Connection</em> to load live pipelines, assignments, tasks and follow-ups.
          </div>
          <div className="pb-kanban">
            {STAGES.map((stage) => {
              const leads = LEADS.filter((l) => l.stage === stage);
              return (
                <div className="pb-kanban-col" key={stage}>
                  <header>{stage}<span className="badge text-bg-secondary">{leads.length}</span></header>
                  {leads.map((l) => (
                    <div className="pb-lead-card" key={l.id}>
                      <div style={{ color: 'var(--bs-emphasis-color)', fontWeight: 600 }}>{l.name}</div>
                      <div className="d-flex justify-content-between mt-1">
                        <small style={{ color: 'var(--bs-secondary-color)' }}>{l.channel} · {l.owner}</small>
                        <small style={{ color: 'var(--pb-accent)', fontWeight: 600 }}>{fmtMoney(l.value, l.currency)}</small>
                      </div>
                    </div>
                  ))}
                  {!leads.length && <div className="pb-empty" style={{ padding: '1rem' }}>No leads</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'integrations' && (
        <div className="row g-3">
          {[
            ['WhatsApp Business API', 'Not configured — requires META_WABA_TOKEN + phone number id. Messaging only; calling is not exposed by this provider tier.'],
            ['Facebook / Messenger', 'Not configured — requires a Meta app with pages_messaging and a signed webhook.'],
            ['Instagram Messaging', 'Not configured — requires instagram_manage_messages on a professional account.'],
          ].map(([name, note]) => (
            <div className="col-md-4" key={name}>
              <Panel title={name}>
                <span className="badge text-bg-secondary mb-2">Not configured</span>
                <p className="mb-0" style={{ fontSize: '.85rem', color: 'var(--bs-secondary-color)' }}>{note}</p>
              </Panel>
            </div>
          ))}
          <div className="col-12">
            <Panel title="Honesty rule">
              Only messaging/calling capabilities actually granted by the connected provider are enabled —
              the UI never advertises a channel that is not live, and never labels an unconfigured connection
              as connected.
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
