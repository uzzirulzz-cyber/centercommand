'use client';

import Link from 'next/link';
import { APP_COLORS } from '../lib/apps';
import { PageHeader, StatusBadge, Panel, StatCard, fmtDateTime } from './ui';
import { AppControls } from './AppControls';
import { useAppData } from './DataSourceBanner';
import { useSession } from './SessionProvider';

// Where each app's modules live inside the shared dashboard.
const MODULE_LINKS = {
  'playbeat-digital': [
    ['Products & digital licenses', '/admin/products'],
    ['Orders, subscriptions & payment proofs', '/admin/orders'],
    ['Customers', '/admin/customers'],
  ],
  'playbeat-live': [['Channels & playlists', '/admin/live'], ['Audience analytics', '/admin/live']],
  magxtv: [['Schedules & results', '/admin/sports'], ['Broadcast health', '/admin/sports']],
  makethisdeal: [['Listings & enquiries', '/admin/deals']],
  'pulse-crm': [['Pipelines & leads', '/admin/customers'], ['Messaging integrations', '/admin/customers']],
};

export default function AppDetail({ app }) {
  const { api } = useSession();
  // Live server-side status. The static registry value is only a fallback and
  // is never presented as a live health result.
  const live = useAppData(app.slug, api);
  const status = live.status?.status || 'pending';
  const lastSync = live.syncState?.lastSync || null;

  return (
    <>
      <PageHeader
        title={
          <span className="d-inline-flex align-items-center gap-2">
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: APP_COLORS[app.slug] }} />
            {app.name}
          </span>
        }
        subtitle={`${app.domain} · Connector: ${app.connector}`}
        actions={<div className="d-flex flex-wrap gap-2">
          {app.sourceRepository && (
            <a className="btn btn-sm btn-outline-secondary" href={app.sourceRepository.url} target="_blank" rel="noreferrer">
              GitHub source ↗
            </a>
          )}
          <Link href="/admin/apps" className="btn btn-sm btn-outline-secondary">← App Registry</Link>
        </div>}
      />

      {status === 'pending' && (
        <div className="alert alert-warning d-flex gap-2 align-items-start">
          <span>⚠️</span>
          <div>
            <strong>Configuration required.</strong> {live.status?.reason || 'This application has not passed a health check.'}
            {' '}It is intentionally <em>not</em> shown as connected and no metrics are displayed for it. Add its server-side
            credentials or complete its upstream setup, then run <em>Test Connection</em>.
          </div>
        </div>
      )}
      {status === 'degraded' && (
        <div className="alert alert-warning">
          <strong>Feed needs attention:</strong> {live.status?.reason || 'The upstream health check is failing.'}
          {' '}Last successful sync: {fmtDateTime(lastSync)}.
        </div>
      )}

      <div className="pb-card mb-4"><div className="pb-card-body">
        <AppControls slug={app.slug} initial={live.status} />
      </div></div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3"><StatCard label="Status" value={<StatusBadge status={status} />} sub="From last authenticated health check" /></div>
        <div className="col-6 col-xl-3"><StatCard label="Last sync" value={<span className="fs-6 pb-mono">{fmtDateTime(lastSync)}</span>} sub="Idempotent upsert by (app, source id)" /></div>
        <div className="col-6 col-xl-3"><StatCard label="Enabled modules" value={app.modules.length} sub={app.modules.join(' · ')} /></div>
        <div className="col-6 col-xl-3"><StatCard label="Sync mode" value={<span className="fs-6">Webhook + 15 min</span>} sub="Signature-verified webhooks, scheduled fallback" /></div>
      </div>

      <h2 className="h6 mb-3" style={{ color: 'var(--bs-emphasis-color)' }}>Management modules</h2>
      <div className="row g-3">
        {(MODULE_LINKS[app.slug] || []).map(([label, href]) => (
          <div className="col-md-6 col-xl-4" key={label}>
            <Link href={href} style={{ display: 'block' }}>
              <div className="pb-card hoverable"><div className="pb-card-body d-flex justify-content-between align-items-center">
                <span style={{ color: 'var(--bs-emphasis-color)', fontWeight: 600 }}>{label}</span>
                <span style={{ color: 'var(--pb-accent)' }}>Open →</span>
              </div></div>
            </Link>
          </div>
        ))}
      </div>

      {app.sourceRepository && app.sourceModules?.length > 0 && (
        <section className="mt-4" aria-labelledby="source-modules-heading">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
            <div>
              <h2 id="source-modules-heading" className="h6 mb-1" style={{ color: 'var(--bs-emphasis-color)' }}>
                Features in the GitHub source
              </h2>
              <p className="small mb-0" style={{ color: 'var(--bs-secondary-color)' }}>
                Inventory from <a href={app.sourceRepository.url} target="_blank" rel="noreferrer">{app.sourceRepository.name}</a> ({app.sourceRepository.branch}).
                {' '}This code inventory does not indicate a live API connection.
              </p>
            </div>
          </div>
          <div className="row g-3">
            {app.sourceModules.map((module) => (
              <div className="col-md-6 col-xl-4" key={module.name}>
                <div className="pb-card h-100">
                  <div className="pb-card-body h-100 d-flex flex-column">
                    <h3 className="h6 mb-2" style={{ color: 'var(--bs-emphasis-color)' }}>{module.name}</h3>
                    <p className="small mb-3" style={{ color: 'var(--bs-secondary-color)' }}>{module.description}</p>
                    <a
                      className="small mt-auto"
                      href={`${app.sourceRepository.url}/blob/${app.sourceRepository.branch}/${module.path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View source file ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-4" style={{ color: 'var(--bs-secondary-color)', fontSize: '.88rem' }}>
        {app.summary} Records from {app.name} always keep their original IDs and source label wherever they
        appear in combined views.
      </p>
    </>
  );
}
