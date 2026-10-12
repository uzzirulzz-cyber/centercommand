
'use client';
import LivePanel from '../../../components/LivePanel';

export default function IntegrationHealthPage() {
  return (
    <LivePanel
      title="Integration Health"
      subtitle="Credentials for every connected application. Values are written server-side only and read back masked; environment variables always win. An application is shown as connected ONLY after a real authenticated health check — until then it stays pending and contributes no metrics."
      endpoint="/api/admin/connectors-config"
      fields={[
        { name: 'app', label: 'Application', type: 'select', options: ['playbeat-digital', 'playbeat-live', 'magxtv', 'makethisdeal', 'pulse-crm'] },
        { name: 'apiUrl', label: 'API base URL', placeholder: 'https://playbeat.digital/api/admin' },
        { name: 'apiKey', label: 'API key / admin token', placeholder: 'stored server-side, never displayed again' },
      ]}
      actions={[
        { action: 'save', label: 'Save credentials', variant: 'btn-primary' },
        { action: 'clear', label: 'Clear stored credentials', variant: 'btn-outline-danger' },
      ]}
      columns={[
        { key: 'app', label: 'Application' },
        { key: 'status', label: 'Status' },
        { key: 'urlVar', label: 'URL variable' },
        { key: 'keyVar', label: 'Key variable' },
        { key: 'envUrl', label: 'URL in env' },
        { key: 'envKey', label: 'Key in env' },
        { key: 'storedUrl', label: 'Saved URL (masked)' },
        { key: 'storedKey', label: 'Saved key (masked)' },
        { key: 'reason', label: 'Detail' },
      ]}
      emptyNote="No connectors registered."
    />
  );
}
