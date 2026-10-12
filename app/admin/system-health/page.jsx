
'use client';
import LivePanel from '../../../components/LivePanel';

export default function SystemHealthPage() {
  return (
    <LivePanel
      title="System Health"
      subtitle="Store probe, connector mode and the live status of every connected application. Environment values are reported by presence only — never a secret."
      endpoint="/api/admin/system-health"
      columns={[
        { key: 'component', label: 'Component' },
        { key: 'state', label: 'State' },
        { key: 'detail', label: 'Detail' },
      ]}
    />
  );
}
