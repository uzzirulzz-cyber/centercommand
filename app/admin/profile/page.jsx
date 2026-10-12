
'use client';
import LivePanel from '../../../components/LivePanel';

export default function ProfilePage() {
  return (
    <LivePanel
      title="Profile & Account"
      subtitle="Your own admin preferences: display name, timezone, landing page, table density and failure notifications. Your password is owned by the identity store and is not edited here."
      endpoint="/api/admin/profile"
      fields={[
        { name: 'displayName', label: 'Display name' },
        { name: 'timezone', label: 'Timezone', placeholder: 'Asia/Karachi' },
        { name: 'landingPage', label: 'Landing page', placeholder: '/admin' },
        { name: 'density', label: 'Table density', type: 'select', options: ['comfortable', 'compact'] },
        { name: 'notifyOnFailure', label: 'Notify on failure', placeholder: 'true / false' },
      ]}
      actions={[{ action: 'save', label: 'Save preferences', variant: 'btn-primary' }]}
    />
  );
}
