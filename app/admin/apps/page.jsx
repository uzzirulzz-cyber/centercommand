'use client';

import Link from 'next/link';
import { APPS, APP_COLORS } from '../../../lib/apps';
import { PageHeader, StatusBadge, Panel, fmtDateTime } from '../../../components/ui';
import { AppControls } from '../../../components/AppControls';

export default function AppRegistry() {
  return (
    <>
      <PageHeader
        title="App Registry"
        subtitle="Every connected application with its connector, enabled modules, status and sync settings. An app may be marked healthy only after a successful authenticated server-side check."
        actions={<button className="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#addAppModal">✚ Add Application</button>}
      />

      <div className="row g-3">
        {APPS.map((a) => (
          <div className="col-12" key={a.slug}>
            <Panel pad>
              <div className="d-flex flex-wrap align-items-center gap-3">
                <span style={{ width: 40, height: 40, borderRadius: 10, background: `${APP_COLORS[a.slug]}22`, border: `1px solid ${APP_COLORS[a.slug]}55`, display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>▶</span>
                <div className="me-auto">
                  <Link href={`/admin/apps/${a.slug}`} style={{ color: 'var(--bs-emphasis-color)', fontWeight: 700 }}>{a.name}</Link>
                  <div style={{ fontSize: '.82rem', color: 'var(--bs-secondary-color)' }}>
                    {a.domain} · {a.connector}
                  </div>
                </div>
                <AppControls slug={a.slug} />
              </div>
              <hr style={{ borderColor: 'var(--pb-line)' }} />
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <small style={{ color: 'var(--bs-secondary-color)' }}>Modules:</small>
                {a.modules.map((m) => <span key={m} className="badge text-bg-secondary">{m}</span>)}
                {a.status === 'pending' && (
                  <span className="badge text-bg-warning ms-2">Requires configuration before it can connect</span>
                )}
              </div>
            </Panel>
          </div>
        ))}
      </div>

      {/* Add Application modal */}
      <div className="modal fade" id="addAppModal" tabIndex="-1" aria-labelledby="addAppLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-6" id="addAppLabel">Add Application</h2>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Application name</label><input className="form-control" placeholder="e.g. NewApp.io" /></div>
              <div className="mb-3"><label className="form-label">Domain</label><input className="form-control" placeholder="app.example.com" /></div>
              <div className="mb-3">
                <label className="form-label">Connector type</label>
                <select className="form-select">
                  <option>REST API (native)</option>
                  <option>Webhook + scheduled sync</option>
                  <option>Pulse CRM module (from repo)</option>
                  <option>Read-only mirror</option>
                </select>
              </div>
              <div className="alert alert-secondary small mb-0">
                API keys and secrets are stored server-side only (environment
                variables / secret manager) — never in the browser or the registry row.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button className="btn btn-primary" data-bs-dismiss="modal">Register (pending connection test)</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
