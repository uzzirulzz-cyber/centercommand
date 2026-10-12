'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel, asText } from '../../../components/ui';
import PayloadView from '../../../components/PayloadView';

export default function Security() {
  const { api, session } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    (async () => {
      const res = await api('/api/admin/security');
      if (res?.ok) setData(res); else setError(res?.error || res?.reason || 'security endpoint unavailable');
    })();
  }, [api]);

  return (
    <>
      <PageHeader
        title="Security & Audit"
        icon="bi-shield-lock"
        subtitle="Sessions, login throttling, role matrix and the append-only audit trail of sensitive changes."
        actions={<Link className="btn btn-sm btn-outline-secondary" href="/admin/staff">Staff & Permissions</Link>}
      />
      {error && <div className="alert alert-warning small">{asText(error)}</div>}
      <div className="row g-3">
        <div className="col-12"><PayloadView data={data} label="Security posture" emptyHint="The security endpoint returned no counters for the current session." /></div>
        <div className="col-12 col-xl-6">
          <Panel title="Session policy in force">
            <ul className="small mb-0" style={{ color: 'var(--pb-text-muted)' }}>
              <li>Opaque 256-bit session ids; the cookie carries no user data.</li>
              <li>Idle timeout {session?.policy?.idleMinutes ?? 30} min · absolute expiry {session?.policy?.absoluteHours ?? 8} h.</li>
              <li>Sliding idle refresh happens only in route handlers, never in the browser.</li>
              <li>Role change revokes every live session for that user immediately.</li>
            </ul>
          </Panel>
        </div>
        <div className="col-12 col-xl-6">
          <Panel title="Protections verified on this build">
            <ul className="small mb-0" style={{ color: 'var(--pb-text-muted)' }}>
              <li>Double-submit CSRF token required on every state-changing request.</li>
              <li>Login throttling with exponential backoff after 5 failed attempts.</li>
              <li>No user enumeration: identical response for unknown and known accounts.</li>
              <li>Audit events recorded for theme, CMS, marketing, layout, connector and staff changes.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
