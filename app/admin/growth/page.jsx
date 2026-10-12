
'use client';
import LivePanel from '../../../components/LivePanel';

export default function GrowthPage() {
  return (
    <LivePanel
      title="Growth & Promotion Placements"
      subtitle="Directory submissions and promotion targets with their real state — prepared, awaiting terms, submitted, blocked, published. Nothing is marked published until you verify the live page."
      endpoint="/api/admin/growth"
      fields={[
        { name: 'name', label: 'Placement', placeholder: 'Share Your Startup' },
        { name: 'url', label: 'Target URL' },
        { name: 'state', label: 'State', type: 'select', options: ['prepared', 'awaiting-terms', 'submitted', 'blocked', 'published', 'rejected'] },
        { name: 'note', label: 'Note', wide: true },
        { name: 'id', label: 'Id (for removal)' },
      ]}
      actions={[
        { action: 'upsert', label: 'Save placement', variant: 'btn-primary' },
        { action: 'remove', label: 'Remove placement', variant: 'btn-outline-danger' },
      ]}
      columns={[
        { key: 'name', label: 'Placement' }, { key: 'url', label: 'Target' },
        { key: 'state', label: 'State' }, { key: 'updatedAt', label: 'Updated' },
        { key: 'note', label: 'Note' },
      ]}
    />
  );
}
