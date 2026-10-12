'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel, StatCard, StatusBadge, fmtDateTime, fmtNumber, RelativeTime, asText } from '../../../components/ui';
import PayloadView from '../../../components/PayloadView';
import { APPS, APP_COLORS } from '../../../lib/apps';

export default function CommandCenter() {
  const { api } = useSession();
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [a, b] = await Promise.all([api('/api/admin/overview'), api('/api/health')]);
      if (!live) return;
      if (a?.ok) setOverview(a); else setError(a?.error || 'Overview endpoint unavailable');
      if (b?.ok) setHealth(b);
    })();
    return () => { live = false; };
  }, [api]);

  const statuses = health?.statuses || health?.apps || [];
  const list = Array.isArray(statuses) ? statuses : Object.values(statuses || {});
  const connected = list.filter((s) => s?.status === 'connected').length;

  return (
    <>
      <PageHeader
        title="Central Command Center"
        icon="bi-broadcast-pin"
        subtitle="One screen for every connected application: live status, synchronization state and the latest server-computed business figures."
        actions={<Link className="btn btn-sm btn-outline-secondary" href="/admin/applications">Application health</Link>}
      />

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard label="Applications" value={fmtNumber(APPS.length)} sub={`${connected} reporting connected`} icon="bi-grid-3x3-gap" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Connector mode" value={String(health?.mode || '—')} sub={health?.mode === 'demo' ? 'fixtures, clearly labelled' : 'live endpoints only'} icon="bi-plug" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Sync engine" value="Idempotent" sub="keyed by application + source record id" icon="bi-arrow-repeat" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Reporting currency" value="PKR" sub="other currencies labelled at source" icon="bi-cash-coin" /></div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <Panel pad={false} title="Application status" actions={<Link className="small" href="/admin/apps">App Registry</Link>}>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead><tr><th>Application</th><th>Status</th><th>Last sync</th><th>Detail</th></tr></thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan="4" className="text-center small" style={{ color: 'var(--pb-text-muted)' }}>Waiting for the health endpoint…</td></tr>}
                  {list.map((s) => {
                    const slug = s.slug || s.app || s.name;
                    const app = APPS.find((a) => a.slug === slug);
                    return (
                      <tr key={slug}>
                        <td>
                          <span className="pb-dot" style={{ background: APP_COLORS[slug] || 'var(--pb-accent)', display: 'inline-block', width: 8, height: 8, borderRadius: 99, marginRight: 8 }} />
                          <Link href={`/admin/apps/${slug}`}>{app?.name || s.name || slug}</Link>
                          {app?.domain && <div className="small" style={{ color: 'var(--pb-text-muted)' }}>{app.domain}</div>}
                        </td>
                        <td><StatusBadge status={s.status} /></td>
                        <td>{s.lastSync ? <RelativeTime iso={s.lastSync} /> : <span className="small" style={{ color: 'var(--pb-text-muted)' }}>never</span>}</td>
                        <td className="small" style={{ color: 'var(--pb-text-muted)' }}>
                          {s.status === 'pending' ? `not configured — ${(s.missingVars || []).join(', ') || 'credentials required'}` : (asText(s.reason || s.note || '—'))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
        <div className="col-12 col-xl-5">
          <Panel title="Live system status">
            <div className="d-flex justify-content-between small mb-2"><span>Connector mode</span><span className="pb-mono">{health?.mode || '—'}</span></div>
            <div className="d-flex justify-content-between small mb-2"><span>Connected apps</span><span className="pb-mono">{connected} / {APPS.length}</span></div>
            <div className="d-flex justify-content-between small mb-2"><span>Circuit breaker</span><span className="pb-mono">{health?.breakerOpen?.length ? `${health.breakerOpen.length} open` : 'closed'}</span></div>
            <div className="d-flex justify-content-between small"><span>Checked</span><span className="pb-mono">{health?.checkedAt ? fmtDateTime(health.checkedAt) : 'on request'}</span></div>
            {error && <div className="alert alert-warning small mt-3 mb-0">{asText(error)}</div>}
          </Panel>
        </div>
        <div className="col-12">
          <PayloadView data={overview} label="Consolidated overview" note="Figures come from the server's own aggregation of synced records. An application that is not configured contributes no numbers." />
        </div>
      </div>
    </>
  );
}
