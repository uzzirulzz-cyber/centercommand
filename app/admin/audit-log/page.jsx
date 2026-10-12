
'use client';
import LivePanel from '../../../components/LivePanel';

export default function AuditLogPage() {
  return (
    <LivePanel
      title="Audit Log"
      subtitle="Every privileged action recorded server-side: who, what, on which target and whether it succeeded."
      endpoint="/api/admin/audit-log"
      fields={[
        { name: 'actor', label: 'Filter by actor' },
        { name: 'action', label: 'Filter by action' },
      ]}
      columns={[
        { key: 'at', label: 'When' }, { key: 'actor', label: 'Actor' },
        { key: 'action', label: 'Action' }, { key: 'target', label: 'Target' },
        { key: 'result', label: 'Result' },
      ]}
    />
  );
}
