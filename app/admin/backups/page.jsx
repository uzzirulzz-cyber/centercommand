
'use client';
import LivePanel from '../../../components/LivePanel';

export default function BackupsPage() {
  return (
    <LivePanel
      title="Restore Points"
      subtitle="Admin-side restore markers held in the configuration store. A real database snapshot is taken by your deployment provider — this panel records and verifies the marker, it does not overwrite your data."
      endpoint="/api/admin/backups"
      fields={[
        { name: 'label', label: 'Label', placeholder: 'before theme publish' },
        { name: 'note', label: 'Note', wide: true, placeholder: 'what changed and why' },
        { name: 'id', label: 'Restore point id (delete / restore)' },
      ]}
      actions={[
        { action: 'create', label: 'Create restore point', variant: 'btn-primary' },
        { action: 'delete', label: 'Delete point', variant: 'btn-outline-danger' },
        { action: 'restore', label: 'Request restore' },
      ]}
      columns={[
        { key: 'label', label: 'Label' }, { key: 'kind', label: 'Kind' },
        { key: 'createdBy', label: 'By' }, { key: 'createdAt', label: 'Created' },
        { key: 'note', label: 'Note' },
      ]}
    />
  );
}
