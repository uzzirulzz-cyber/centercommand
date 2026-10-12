'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../components/SessionProvider';
import DataSourceBanner from '../../../components/DataSourceBanner';
import { CHANNELS } from '../../../lib/data';
import { PageHeader, Panel, DataTable, StatusBadge, BarChart, StatCard, fmtDateTime } from '../../../components/ui';

const asText = (value) => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);

export default function Live() {
  const { api } = useSession();
  const [mode, setMode] = useState(null);
  const [connector, setConnector] = useState(null);
  const [rows, setRows] = useState([]);
  const [bridge, setBridge] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const [health, app, liveBridge] = await Promise.all([
      api('/api/health'), api('/api/connectors/playbeat-live'), api('/api/admin/playbeat-live'),
    ]);
    if (health?.mode) setMode(health.mode);
    const appStatus = health?.statuses?.find((item) => item.slug === 'playbeat-live');
    if (appStatus) setConnector(appStatus);
    if (Array.isArray(app?.records)) setRows(app.records);
    if (liveBridge?.ok) { setBridge(liveBridge); setCheckedAt(liveBridge.checkedAt); setError(''); }
    else setError(liveBridge?.error || 'Could not read PlayBeat Live workspace status.');
  }, [api]);

  useEffect(() => {
    const run = async () => { if (document.visibilityState === 'visible') await refresh(); };
    run();
    const timer = window.setInterval(run, 60_000);
    const onVisibility = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refresh]);

  const demoMode = mode === 'demo';
  const tableRows = demoMode ? CHANNELS : rows.map((record) => ({
    id: record.sourceId || record.id,
    name: asText(record.name || record.channelName || record.title || record.sourceId),
    category: asText(record.category || record.type),
    playlist: asText(record.playlist || record.playlistName),
    status: asText(record.status || 'unknown'),
    health: asText(record.health || record.playbackHealth || 'unknown'),
    viewers: Number(record.viewers || record.viewerCount || 0),
    syncedAt: record.syncedAt,
  }));
  const viewerTotal = demoMode ? CHANNELS.reduce((sum, channel) => sum + channel.viewers, 0) : null;
  const currentStatus = connector?.status || 'pending';

  return <>
    <PageHeader title="PlayBeat Live Workspace" subtitle="Live operations stay separate from PlayBeat Digital orders and analytics." actions={<div className="d-flex gap-2"><button type="button" className="btn btn-sm btn-outline-secondary" onClick={refresh}>Refresh now</button><Link href="/admin/apps/playbeat-live" className="btn btn-sm btn-outline-primary">Connector settings</Link></div>} />
    {mode && <DataSourceBanner mode={mode} statuses={connector ? [connector] : []} />}
    {error && <div className="alert alert-warning py-2 small" role="status">{error}</div>}

    <div className="row g-3 mb-3">
      <div className="col-sm-6 col-xl-3"><StatCard label="Live API connection" value={<StatusBadge status={currentStatus} />} sub={connector?.reason || 'Status from server connector registry'} /></div>
      <div className="col-sm-6 col-xl-3"><StatCard label="Live dashboard bridge" value={<StatusBadge status={bridge?.source?.status || 'pending'} />} sub={bridge?.source?.connected ? 'Authenticated server-side bridge' : 'Configure LIVE_DASHBOARD_TOKEN in Vercel'} /></div>
      <div className="col-sm-6 col-xl-3"><StatCard label="Stored Live records" value={demoMode ? 'Demo' : rows.length} sub={demoMode ? 'Fixture data, labeled below' : 'Separate from Digital metrics'} /></div>
      <div className="col-sm-6 col-xl-3"><StatCard label="Last bridge check" value={<span className="fs-6 pb-mono">{fmtDateTime(checkedAt)}</span>} sub="Refreshes every 60 seconds while visible" /></div>
    </div>

    <div className="row g-3">
      <div className="col-xl-7">
        <Panel title="Channels, playlists & playback health" pad={false}>
          {tableRows.length ? <DataTable pageSize={10} columns={[
            { key: 'name', label: 'Channel' }, { key: 'category', label: 'Category' }, { key: 'playlist', label: 'Playlist' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'health', label: 'Playback health', render: (row) => <StatusBadge status={row.health} /> },
            { key: 'viewers', label: 'Viewers', render: (row) => row.viewers.toLocaleString() },
          ]} rows={tableRows} /> : <div className="p-3 small" style={{ color: 'var(--bs-secondary-color)' }}>No synchronized Live records are available. Configure the authenticated Live connector and run a sync from Connector settings.</div>}
        </Panel>
      </div>
      <div className="col-xl-5">
        <Panel title={demoMode ? `Demo audience — ${viewerTotal.toLocaleString()} viewers` : 'Live audience analytics'}>
          {demoMode ? <BarChart data={CHANNELS.map((channel) => ({ label: channel.name.split(' ')[0], value: channel.viewers }))} format={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} /> : <p className="small mb-0" style={{ color: 'var(--bs-secondary-color)' }}>Live audience reports are unavailable until the Live analytics feed is connected. Digital traffic and order figures are not substituted.</p>}
        </Panel>
        <Panel title="Live bridge & integration limits" className="mt-3">
          <div className="small d-grid gap-2">
            <div><strong>Source:</strong> {bridge?.source?.connected ? 'Authenticated PlayBeat dashboard bridge' : 'Not connected'}</div>
            <div><strong>Last checked:</strong> {fmtDateTime(checkedAt)} · UTC</div>
            {bridge?.source?.error && <div className="text-warning">{bridge.source.error}</div>}
            {(bridge?.limitations || ['GA4 reports are not connected.', 'AdSense revenue is not connected.', 'Live checkout and inquiry integrations are not connected.']).map((item) => <div key={item} className="text-secondary">{item}</div>)}
          </div>
        </Panel>
      </div>
    </div>
  </>;
}
