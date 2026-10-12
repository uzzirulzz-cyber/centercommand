'use client';
import { useEffect, useState } from 'react';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel, asText } from '../../../components/ui';
import PayloadView, { numericLeaves, MiniBars } from '../../../components/PayloadView';

export default function Finance() {
  const { api } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    (async () => {
      const res = await api('/api/admin/finance');
      if (res?.ok) setData(res); else setError(res?.error || res?.reason || 'finance endpoint unavailable');
    })();
  }, [api]);
  const leaves = data ? numericLeaves(data) : [];
  return (
    <>
      <PageHeader title="Finance & Revenue" icon="bi-cash-stack" subtitle="Revenue traceable to its source application. A payment is counted once, keyed by source application and source record id; PKR is the reporting currency and any other currency stays labelled." />
      {error && <div className="alert alert-warning small">{asText(error)}</div>}
      <div className="row g-3">
        <div className="col-12 col-xl-5">{leaves.length > 0 && <MiniBars items={leaves.slice(0, 10)} label="Revenue signals" />}</div>
        <div className="col-12 col-xl-7"><PayloadView data={data} label="Finance" emptyHint="The finance endpoint returned no settlement figures for the current configuration." /></div>
        <div className="col-12">
          <Panel title="How revenue is kept traceable">
            <ul className="small mb-0" style={{ color: 'var(--pb-text-muted)' }}>
              <li>Every synced payment keeps its source application, source record id and original currency.</li>
              <li>Records are upserted on (application, source record id), so re-running a sync cannot double-count a payment.</li>
              <li>Cross-application totals are computed from stored records only — no direct writes into another application's database.</li>
              <li>Applications without a configured connector contribute nothing and are shown as unconfigured, never as zero revenue.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
