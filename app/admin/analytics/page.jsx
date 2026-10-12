'use client';
import { useEffect, useState } from 'react';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel, StatCard, fmtNumber, asText } from '../../../components/ui';
import PayloadView, { numericLeaves, MiniBars, rowsOf } from '../../../components/PayloadView';

export default function Analytics() {
  const { api } = useSession();
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    (async () => {
      const [a, o] = await Promise.all([api('/api/admin/analytics'), api('/api/admin/overview')]);
      if (a?.ok) setData(a); else setError(a?.error || a?.reason || 'analytics endpoint unavailable');
      if (o?.ok) setOverview(o);
    })();
  }, [api]);

  const leaves = data ? numericLeaves(data) : [];
  const rows = data ? rowsOf(data) : [];
  return (
    <>
      <PageHeader title="Analytics" icon="bi-graph-up-arrow" subtitle="Business analytics computed server-side from synced records. Test records and unconfigured applications are excluded rather than counted as zero." />
      {error && <div className="alert alert-warning small">{asText(error)}</div>}
      <div className="row g-3">
        <div className="col-6 col-lg-3"><StatCard label="Numeric signals" value={fmtNumber(leaves.length)} sub="returned by the analytics endpoint" icon="bi-activity" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Record sets" value={fmtNumber(rows.length)} sub="tables available for drill-down" icon="bi-table" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Reporting currency" value="PKR" sub="foreign amounts labelled individually" icon="bi-cash-coin" /></div>
        <div className="col-6 col-lg-3"><StatCard label="Duplicate protection" value="On" sub="payments keyed per application + record id" icon="bi-shield-check" /></div>
        {leaves.length > 0 && <div className="col-12 col-xl-5"><MiniBars items={leaves.slice(0, 10)} label="Analytics signals" /></div>}
        <div className={leaves.length > 0 ? 'col-12 col-xl-7' : 'col-12'}>
          <PayloadView data={data} label="Analytics" emptyHint="No analytics counters were returned — typically because the reporting application is not configured yet." />
        </div>
        {overview && <div className="col-12"><Panel pad={false} title="Consolidated business figures" /><PayloadView data={overview} label="Overview" /></div>}
      </div>
    </>
  );
}
