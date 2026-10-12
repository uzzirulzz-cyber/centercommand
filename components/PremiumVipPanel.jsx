'use client';

import { useEffect, useState } from 'react';
import { useSession } from './SessionProvider';
import { Panel, ErrorState } from './ui';

// Premium / VIP plan panel. Bound to /api/admin/plan so the active tier and the
// billing receipt read from one server-authoritative source — the topbar chip,
// the theme studio colour presets and the upgrade modal all read the same
// value. Falls back to a clear error state when the endpoint is unreachable.
export default function PremiumVipPanel() {
  const { api, can } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    let alive = true;
    api('/api/admin/plan').then((res) => {
      if (!alive) return;
      if (res?.ok) setData(res);
      else setError(res?.reason || res?.error || 'Unable to read the plan endpoint.');
    });
    return () => { alive = false; };
  }, [api]);

  const change = async (tier) => {
    setBusy(true); setDone(null);
    const res = await api('/api/admin/plan', { method: 'POST', body: { tier } });
    setBusy(false);
    if (res?.ok) { setData((d) => d ? { ...d, active: tier, current: d.tiers[tier] } : d); setDone({ tone: 'success', text: `Plan switched to ${res.current.label}.` }); }
    else setDone({ tone: 'danger', text: res?.reason || res?.error || 'Plan switch rejected.' });
  };

  if (error) return <ErrorState title="Cannot show plan" message={error} onRetry={() => location.reload()} />;
  if (!data) return <Panel title="Premium & VIP"><div className="text-secondary small">Loading plan…</div></Panel>;
  const canManage = can('plan:manage');
  return (
    <Panel title="Premium & VIP"
      actions={<span className="badge text-bg-secondary">Active: {data.current.label}</span>}>
      <p className="mb-3" style={{ color: 'var(--bs-secondary-color)', fontSize: '.9rem' }}>
        The single subscription tier controls theme presets, automation quotas and beta
        feature flags. Switching is logged in the audit trail.
      </p>
      <div className="row g-3">
        {Object.entries(data.tiers).map(([key, tier]) => {
          const isActive = data.active === key;
          return (
            <div className="col-md-4" key={key}>
              <div className={`pb-card h-100 ${isActive ? 'is-active' : ''}`}
                style={isActive ? { outline: `2px solid ${tier.color}`, outlineOffset: 2 } : undefined}>
                <div className="pb-card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong style={{ color: tier.color }}>{tier.label}</strong>
                    {isActive && <span className="badge text-bg-success">Active</span>}
                  </div>
                  <div className="h4 mb-3">{tier.price === 0 ? 'Free' : `$${tier.price}/mo`}</div>
                  <ul className="list-unstyled small mb-3" style={{ color: 'var(--bs-secondary-color)' }}>
                    {tier.features.map((f) => <li key={f} className="mb-1"><i className="bi bi-check2-circle me-1" style={{ color: tier.color }} /> {f}</li>)}
                  </ul>
                  <button className="btn btn-sm mt-auto" disabled={!canManage || isActive || busy}
                    style={canManage && !isActive ? { background: tier.color, color: '#fff' } : undefined}
                    onClick={() => change(key)}>
                    {isActive ? 'Current plan' : (canManage ? `Switch to ${tier.label}` : 'Requires Super Admin')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!canManage && (
        <p className="mt-3 small" style={{ color: 'var(--bs-secondary-color)' }}>
          <i className="bi bi-shield-lock me-1" /> Tier changes require the Super Admin role. Ask the
          current Super Admin to switch before previewing premium features.
        </p>
      )}
      {done && (
        <div className={`alert alert-${done.tone === 'success' ? 'success' : 'danger'} mt-3 mb-0`}>{done.text}</div>
      )}
    </Panel>
  );
}
