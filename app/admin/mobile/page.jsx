
'use client';
import LivePanel from '../../../components/LivePanel';

export default function MobilePage() {
  return (
    <LivePanel
      title="Mobile & Android Admin"
      subtitle="Release rows, versions, device inventory, notifications and storefront config from the application's own mobile API. Web and mobile share one backend and one customer database."
      endpoint="/api/admin/mobile"
      fields={[
        { name: 'app', label: 'Application', type: 'select', options: ['playbeat-digital', 'playbeat-live'] },
        { name: 'resource', label: 'Read resource', type: 'select', options: ['app/release', 'app/version', 'app/devices', 'app/notifications', 'app/storefront-config'] },
        { name: 'deviceId', label: 'Device id (revoke)' },
        { name: 'version', label: 'Version' },
        { name: 'platform', label: 'Platform', type: 'select', options: ['android', 'ios'] },
        { name: 'title', label: 'Notification title' },
        { name: 'bodyText', label: 'Notification body', wide: true },
      ]}
      actions={[
        { action: 'load', label: 'Load from source' },
        { action: 'release.save', label: 'Save release row' },
        { action: 'devices.revoke', label: 'Revoke device' },
        { action: 'storefront.reset', label: 'Reset storefront config' },
        { action: 'push.send', label: 'Send push', variant: 'btn-primary' },
      ]}
      columns={[
        { key: 'id', label: 'Id' }, { key: 'version', label: 'Version' },
        { key: 'platform', label: 'Platform' }, { key: 'status', label: 'Status' },
        { key: 'deviceId', label: 'Device' }, { key: 'updatedAt', label: 'Updated' },
      ]}
    />
  );
}
