'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel, StatusBadge } from '../../../components/ui';

const GATEWAYS = [
  { id: 'manual', name: 'Manual / bank transfer with proof upload', fields: ['accountTitle', 'accountNumber', 'bankName'] },
  { id: 'stripe', name: 'Stripe', fields: ['publishableKeyRef', 'webhookPath'] },
  { id: 'payfast', name: 'PayFast (Pakistan)', fields: ['merchantId', 'returnUrl'] },
  { id: 'jazzcash', name: 'JazzCash', fields: ['merchantId', 'returnUrl'] },
];

export default function Payments() {
  const { api } = useSession();
  const [value, setValue] = useState({});
  const [canWrite, setCanWrite] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api('/api/admin/settings?group=payments');
    if (res?.ok) { setValue(res.value || {}); setCanWrite(Boolean(res.canWrite)); }
    else setNotice({ tone: 'danger', text: res?.error || res?.reason || 'settings endpoint unavailable' });
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    const res = await api('/api/admin/settings', { method: 'POST', body: { group: 'payments', value } });
    setBusy(false);
    setNotice(res?.ok ? { tone: 'success', text: res.message } : { tone: 'danger', text: res?.error || res?.reason || 'rejected' });
    if (res?.ok) setValue(res.value || value);
  };

  const gw = value.gateways || {};
  const setGw = (id, patch) => setValue({ ...value, gateways: { ...gw, [id]: { ...(gw[id] || {}), ...patch } } });

  return (
    <>
      <PageHeader title="Payment Gateways" icon="bi-credit-card-2-front" subtitle="Gateway enablement and settlement configuration. Secret keys are never stored here or sent to this page — the server reads them from environment variables only." />
      {notice && <div className={`alert alert-${notice.tone === 'danger' ? 'danger' : 'success'} small`}>{notice.text}</div>}
      <div className="row g-3">
        {GATEWAYS.map((g) => {
          const cfg = gw[g.id] || {};
          const enabled = cfg.enabled === true;
          return (
            <div className="col-12 col-xl-6" key={g.id}>
              <Panel pad title={g.name} actions={<StatusBadge status={enabled ? 'active' : 'disabled'} />}>
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id={`gw-${g.id}`} disabled={!canWrite} checked={enabled} onChange={(e) => setGw(g.id, { enabled: e.target.checked })} />
                  <label className="form-check-label small" htmlFor={`gw-${g.id}`}>Enabled for checkout</label>
                </div>
                {g.fields.map((f) => (
                  <div className="mb-2" key={f}>
                    <label className="form-label small mb-1 pb-mono">{f}</label>
                    <input className="form-control form-control-sm" disabled={!canWrite} value={cfg[f] || ''} onChange={(e) => setGw(g.id, { [f]: e.target.value })} />
                  </div>
                ))}
              </Panel>
            </div>
          );
        })}
        <div className="col-12">
          <Panel title="Settlement & traceability">
            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label small">Payout currency</label>
                <input className="form-control form-control-sm" disabled={!canWrite} value={value.payoutCurrency || 'PKR'} onChange={(e) => setValue({ ...value, payoutCurrency: e.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small">Settlement window (days)</label>
                <input type="number" className="form-control form-control-sm" disabled={!canWrite} value={value.settlementWindow ?? 7} onChange={(e) => setValue({ ...value, settlementWindow: Number(e.target.value) })} />
              </div>
              <div className="col-12 col-md-4 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="proof" disabled={!canWrite} checked={value.manualProofReview !== false} onChange={(e) => setValue({ ...value, manualProofReview: e.target.checked })} />
                  <label className="form-check-label small" htmlFor="proof">Require manual review of payment proofs</label>
                </div>
              </div>
            </div>
            {canWrite && <button className="btn btn-sm btn-primary mt-3" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save gateway configuration'}</button>}
            <p className="small mt-3 mb-0" style={{ color: 'var(--pb-text-muted)' }}>
              A gateway marked enabled is shown as configured for checkout only; live settlement figures appear once the gateway's own API reports them and the connector is configured.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
