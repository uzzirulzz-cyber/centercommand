'use client';

import { APPS } from '../../../lib/apps';
import { PageHeader, Panel, StatusBadge, SourceBadge, fmtDateTime, asText } from '../../../components/ui';
import PremiumVipPanel from '../../../components/PremiumVipPanel';
import { useEffect, useState } from 'react';
import { useSession } from '../../../components/SessionProvider';

export default function Settings() {
  const { api, can } = useSession();
  const [env, setEnv] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await api('/api/health');
      if (res?.env) setEnv(res.env);
      if (res?.statuses) setStatuses(res.statuses);
      if (res?.mode) setMode(res.mode);
    })();
  }, [api]);

  const statusFor = (slug) => statuses.find((s) => s.slug === slug) || null;

  return (
    <>
      <PageHeader title="System Settings & Integration Health"
        subtitle="Server-side configuration. Credentials live in environment variables or a secret manager — never in the browser or source control. Presence is reported; values never are." />

      <div className="row g-3">
        <div className="col-lg-6">
          <Panel title="Integration health" pad={false}>
            <div className="pb-table-wrap">
              <table className="table">
                <thead><tr><th>Application</th><th>Status</th><th>Last sync</th><th>Missing</th></tr></thead>
                <tbody>
                  {APPS.map((a) => {
                    const s = statusFor(a.slug);
                    const st = s?.status || 'pending';
                    return (
                      <tr key={a.slug}>
                        <td><SourceBadge slug={a.slug} /></td>
                        <td>
                          <StatusBadge status={st} />
                          {s?.mode === 'demo' && <span className="badge text-bg-info ms-1">demo</span>}
                        </td>
                        <td><small className="pb-mono">{fmtDateTime(s?.lastSync || null)}</small></td>
                        <td>
                          {s?.status === 'pending'
                            ? <small className="pb-mono text-warning">{asText(s.reason)}</small>
                            : <small style={{ color: 'var(--bs-secondary-color)' }}>—</small>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {mode && (
              <div className="px-3 pb-3">
                <small style={{ color: 'var(--bs-secondary-color)' }}>
                  Connector mode: <span className="pb-mono">{mode}</span>
                  {mode === 'demo' && ' — set PB_CONNECTOR_MODE=live for real reads.'}
                </small>
              </div>
            )}
          </Panel>
        </div>

        <div className="col-lg-6">
          <Panel title="Environment checklist" pad={false}>
            <ul className="list-group list-group-flush" style={{ background: 'transparent' }}>
              {env.map((g) => (
                <li key={g.group} className="list-group-item" style={{ background: 'transparent', borderColor: 'var(--pb-line)' }}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className="small">{g.group}</strong>
                    <span className={`badge text-bg-${g.complete ? 'success' : g.required ? 'danger' : 'secondary'}`}>
                      {g.complete ? 'Set' : g.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  {g.vars.map((v) => (
                    <div key={v.name} className="d-flex justify-content-between small">
                      <span className="pb-mono" style={{ color: 'var(--bs-secondary-color)' }}>{v.name}</span>
                      <span className={v.present ? 'text-success' : v.builtIn ? 'text-info' : 'text-secondary'}>
                        {v.present ? 'set' : v.builtIn ? 'built-in' : 'missing'}
                      </span>
                    </div>
                  ))}
                </li>
              ))}
              {env.length === 0 && <li className="list-group-item" style={{ background: 'transparent' }}>Loading…</li>}
            </ul>
          </Panel>
        </div>

        <div className="col-lg-6">
          <Panel title="Synchronization (server-enforced)">
            <ul style={{ fontSize: '.9rem' }} className="mb-0">
              <li>Idempotent upsert keyed by <span className="pb-mono">(app, sourceId)</span> — replay converges, duplicates are impossible.</li>
              <li>Webhook ingestion is signature-verified before a payload is accepted.</li>
              <li>Hard request timeout with exponential backoff plus jitter.</li>
              <li>Per-app rate-limit budget and a circuit breaker that degrades an app instead of hammering it.</li>
              <li>Schema validation before apply; malformed records are rejected, not partially written.</li>
            </ul>
          </Panel>
        </div>

        <div className="col-lg-6">
          <Panel title="Security (implemented)">
            <ul style={{ fontSize: '.9rem' }} className="mb-0">
              <li>Opaque 256-bit server-side sessions — the cookie carries an id only, never role or scope.</li>
              <li><span className="pb-mono">httpOnly; Secure; SameSite=Lax</span>, 30-minute sliding idle timeout, 8-hour absolute lifetime.</li>
              <li>Sign-out revokes the session server-side, so replaying the old cookie fails.</li>
              <li>Role and app scope are enforced in the Route Handler, default-deny — the UI hiding a button is not the control.</li>
              <li>CSRF double-submit token on every state-changing request.</li>
              <li>Argon2id is specified in README §8.3; this build uses bcrypt (cost ≥ 12) for portability — see lib/auth/credentials.js.</li>
            </ul>
          </Panel>
        </div>
      </div>
      <div className="mt-3">
        <PremiumVipPanel />
      </div>
    </>
  );
}
