'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel, StatusBadge, EmptyState, fmtDateTime, useDebounced } from '../../../components/ui';

const STATES = ['draft', 'scheduled', 'active', 'paused', 'completed'];
const blank = { name: '', channel: 'organic', audience: '', budget: 0, currency: 'PKR', state: 'draft' };

export default function Marketing() {
  const { api, can } = useSession();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(blank);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const writable = can('marketing:write');

  const load = useCallback(async () => {
    const res = await api('/api/admin/marketing');
    if (res?.ok) setData(res); else setNotice({ tone: 'warning', text: res?.error || res?.reason || 'marketing endpoint unavailable' });
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const post = async (payload) => {
    setBusy(true);
    const res = await api('/api/admin/marketing', { method: 'POST', body: payload });
    setBusy(false);
    if (res?.ok) { setNotice({ tone: 'success', text: res.message || 'Saved.' }); load(); }
    else setNotice({ tone: 'danger', text: res?.error || res?.reason || 'The change was rejected.' });
  };

  const campaigns = data?.campaigns || [];
  const provider = data?.provider || data?.meta || null;

  return (
    <>
      <PageHeader title="Marketing" icon="bi-megaphone" subtitle="Campaigns, audiences and attribution. Spend and reach are shown only when a connected provider reports them — never estimated." />
      {notice && <div className={`alert alert-${notice.tone === 'danger' ? 'danger' : notice.tone === 'warning' ? 'warning' : 'success'} small`}>{notice.text}</div>}

      <div className="row g-3">
        <div className="col-12 col-xl-5">
          <Panel title={writable ? 'Create / update campaign' : 'Read-only access'}>
            {!writable && <p className="small mb-0" style={{ color: 'var(--pb-text-muted)' }}>Your role can view campaigns but not change them.</p>}
            {writable && (
              <form onSubmit={(e) => { e.preventDefault(); post({ action: 'upsert', campaign: { ...form, id: form.id || undefined } }); }}>
                <div className="mb-2"><label className="form-label small">Campaign name</label><input required className="form-control form-control-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="mb-2"><label className="form-label small">Channel</label>
                  <select className="form-select form-select-sm" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    {['organic', 'whatsapp', 'facebook', 'instagram', 'search', 'directory', 'email'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="mb-2"><label className="form-label small">Audience</label><input className="form-control form-control-sm" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="storefront buyers · live subscribers" /></div>
                <div className="row g-2 mb-2">
                  <div className="col-8"><label className="form-label small">Budget</label><input type="number" min="0" className="form-control form-control-sm" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></div>
                  <div className="col-4"><label className="form-label small">Currency</label><input className="form-control form-control-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                </div>
                <div className="mb-3"><label className="form-label small">State</label>
                  <select className="form-select form-select-sm" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button className="btn btn-sm btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save campaign'}</button>
              </form>
            )}
          </Panel>
          {provider && <Panel title="Provider status"><pre className="pb-mono small mb-0" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(provider, null, 2)}</pre></Panel>}
        </div>

        <div className="col-12 col-xl-7">
          <Panel pad={false} title="Campaigns" actions={<button className="btn btn-sm btn-outline-secondary" onClick={load}>Refresh</button>}>
            {campaigns.length === 0
              ? <div className="p-3"><EmptyState icon="◌" title="No campaigns yet" body="Campaigns you create here are persisted server-side in the config store and survive restarts." /></div>
              : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Name</th><th>Channel</th><th>Budget</th><th>State</th><th>Updated</th><th /></tr></thead>
                    <tbody>
                      {campaigns.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td><td className="small">{c.channel}</td>
                          <td className="pb-mono">{c.budget ? `${c.currency || 'PKR'} ${c.budget}` : '—'}</td>
                          <td><StatusBadge status={String(c.state || 'draft')} /></td>
                          <td className="small" style={{ color: 'var(--pb-text-muted)' }}>{c.updatedAt ? fmtDateTime(c.updatedAt) : '—'}</td>
                          <td className="text-end">
                            {writable && <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => post({ action: 'set-state', id: c.id, state: c.state === 'active' ? 'paused' : 'active' })}>{c.state === 'active' ? 'Pause' : 'Activate'}</button>}
                            {writable && <button className="btn btn-sm btn-outline-secondary" onClick={() => setForm({ ...blank, ...c })}>Edit</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Panel>
          <p className="small mt-3 mb-0" style={{ color: 'var(--pb-text-muted)' }}>
            Spend, reach and conversions appear only when a real advertising or messaging provider reports them; nothing is estimated on this page.
          </p>
        </div>
      </div>
    </>
  );
}
