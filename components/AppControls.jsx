'use client';

// ============================================================
// Real connector controls. Every button calls the guarded Route Handler;
// the server decides permission, and the UI hides what the role cannot do.
// There is no client-side simulation left — an unconfigured app reports
// 'pending' because the server says so.
// ============================================================
import { useState } from 'react';
import { fmtDateTime, asText } from './ui';
import { useSession } from './SessionProvider';

export function AppControls({ slug, initial, onChange }) {
  const { api, can } = useSession();
  const [status, setStatus] = useState(initial || { status: 'pending' });
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const run = async (action) => {
    setBusy(action);
    setNotice(null);
    const res = await api(`/api/connectors/${slug}`, { method: 'POST', body: { action } });
    setBusy(null);

    if (!res.ok) {
      setNotice({ tone: 'danger', text: asText(res.error || res.reason || 'Request failed.') });
    } else if (action === 'sync') {
      const s = res.summary
        ? Object.entries(res.summary).map(([k, v]) => `${k}: +${v.inserted}/${v.updated} upd`).join(' · ')
        : null;
      setNotice({ tone: 'success', text: `Sync complete.${s ? ' ' + s : ''}` });
    } else if (action === 'test') {
      setNotice({
        tone: res.ok ? 'success' : 'warning',
        text: res.ok ? `Health check passed${res.detail ? ` (${asText(res.detail)})` : ''}.` : asText(res.reason || 'Health check failed.'),
      });
    }

    const refreshed = await api(`/api/connectors/${slug}`);
    if (refreshed?.status) {
      setStatus(refreshed.status);
      onChange?.(refreshed.status);
    }
  };

  const st = status?.status || 'pending';
  const configured = st !== 'pending';
  const statusLabel = {
    connected: ['success', 'Connected'],
    degraded: ['warning', 'Degraded'],
    pending: ['secondary', 'Not configured'],
    disconnected: ['danger', 'Disabled'],
    demo: ['info', 'Demo data'],
  }[st] || ['secondary', st];

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <span className={`badge text-bg-${statusLabel[0]}`}>{statusLabel[1]}</span>

      <button className="btn btn-sm btn-outline-secondary" disabled={!!busy || !can('dashboard:view', slug)}
        onClick={() => run('test')} title="Authenticated server-side health check">
        {busy === 'test' ? 'Testing…' : 'Test Connection'}
      </button>

      <button className="btn btn-sm btn-outline-primary" disabled={!!busy || !configured || !can('apps:manage', slug)}
        onClick={() => run('sync')}
        title={!configured ? 'Configure this application before syncing' : 'Idempotent sync keyed by (app, sourceId)'}>
        {busy === 'sync' ? 'Syncing…' : 'Sync Now'}
      </button>

      <button className="btn btn-sm btn-outline-danger" disabled={!!busy || !configured || !can('apps:manage', slug)}
        onClick={() => run(st === 'disconnected' ? 'enable' : 'disable')}>
        {st === 'disconnected' ? 'Enable' : 'Disable'}
      </button>

      {status?.lastSync && (
        <small style={{ color: 'var(--bs-secondary-color)' }}>Last sync: {fmtDateTime(status.lastSync)}</small>
      )}

      {status?.reason && st === 'pending' && (
        <small className="pb-mono" style={{ color: 'var(--bs-secondary-color)' }}>{asText(status.reason)}</small>
      )}

      {notice && <div className={`alert alert-${notice.tone} py-1 px-2 mb-0 small w-100`}>{notice.text}</div>}
    </div>
  );
}
