'use client';

import { MATCHES } from '../../../lib/data';
import { PageHeader, Panel, DataTable, StatusBadge } from '../../../components/ui';

export default function Sports() {
  return (
    <>
      <PageHeader
        title="Sports Schedules, Results & Broadcast Health"
        subtitle="Source: MagXTV.click — live matches, schedules, results, highlights and statistics."
      />
      <div className="alert alert-secondary d-flex gap-2 align-items-center">
        <span>ℹ️</span>
        <div><strong>Betting remains disabled</strong> on MagXTV.click per platform policy. This console manages broadcasting only — schedules, results, highlights and stream health.</div>
      </div>
      <Panel title="Matches & broadcasts" pad={false}
        actions={<button className="btn btn-sm btn-primary">+ Schedule match</button>}>
        <DataTable
          pageSize={10}
          columns={[
            { key: 'league', label: 'League', render: (r) => <span className="badge text-bg-secondary">{r.league}</span> },
            { key: 'home', label: 'Match', render: (r) => <span>{r.home} <span style={{ color: 'var(--bs-secondary-color)' }}>vs</span> {r.away}</span> },
            { key: 'time', label: 'Time (UTC)', render: (r) => <span className="pb-mono">{r.time}</span> },
            { key: 'channel', label: 'Channel' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status === 'finished' ? 'Finished' : undefined} /> },
            { key: 'health', label: 'Broadcast health', render: (r) => <StatusBadge status={r.health} /> },
            { key: 'actions', label: '', render: () => <button className="btn btn-sm btn-outline-secondary">Highlights</button> },
          ]}
          rows={MATCHES}
        />
      </Panel>
    </>
  );
}
