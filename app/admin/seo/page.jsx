'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel } from '../../../components/ui';

const FIELDS = [
  ['siteTitle', 'Site title template', 'text', 'PlayBeat Digital — %s'],
  ['metaDescription', 'Default meta description', 'text', ''],
  ['canonicalHost', 'Canonical host', 'text', 'playbeat.digital'],
  ['robotsPolicy', 'Robots policy', 'text', 'index, follow'],
  ['sitemapEnabled', 'Sitemap generation enabled', 'bool', true],
  ['sitemapPath', 'Sitemap path', 'text', '/sitemap.xml'],
  ['indexNowEnabled', 'Instant index submission (IndexNow)', 'bool', false],
  ['analyticsId', 'GA4 measurement id', 'text', ''],
  ['searchConsoleProperty', 'Search Console property', 'text', ''],
  ['structuredData', 'JSON-LD structured data enabled', 'bool', true],
];

export default function Seo() {
  const { api } = useSession();
  const [group, setGroup] = useState('seo');
  const [value, setValue] = useState({});
  const [canWrite, setCanWrite] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api(`/api/admin/settings?group=${group}`);
    if (res?.ok) { setValue(res.value || {}); setCanWrite(Boolean(res.canWrite)); }
    else setNotice({ tone: 'danger', text: res?.error || res?.reason || 'settings endpoint unavailable' });
  }, [api, group]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    const res = await api('/api/admin/settings', { method: 'POST', body: { group, value } });
    setBusy(false);
    setNotice(res?.ok ? { tone: 'success', text: res.message } : { tone: 'danger', text: res?.error || res?.reason || 'rejected' });
    if (res?.ok) setValue(res.value || value);
  };

  const rows = group === 'seo' ? FIELDS : [['payoutCurrency', 'Payout currency', 'text', 'PKR'], ['settlementWindow', 'Settlement window (days)', 'number', 7], ['manualProofReview', 'Manual payment-proof review required', 'bool', true]];
  return (
    <>
      <PageHeader title="SEO & Discovery" icon="bi-search-heart" subtitle="Per-site metadata, sitemap and indexation controls, persisted server-side. Nothing here claims a search-engine outcome it cannot observe." />
      {notice && <div className={`alert alert-${notice.tone === 'danger' ? 'danger' : 'success'} small`}>{notice.text}</div>}
      <div className="row g-3">
        <div className="col-12 col-xl-3">
          <Panel title="Configuration group">
            <div className="d-flex flex-column gap-1">
              {['seo', 'payments', 'general'].map((g) => (
                <button key={g} className={`btn btn-sm text-start ${group === g ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setGroup(g)}>{g === 'seo' ? 'SEO & Discovery' : g === 'payments' ? 'Payment Gateways' : 'System Settings'}</button>
              ))}
            </div>
            <Link className="small d-block mt-3" href="/admin/settings">Open full System Settings</Link>
          </Panel>
        </div>
        <div className="col-12 col-xl-9">
          <Panel title={`${group} settings`} actions={<span className="small pb-mono">{canWrite ? 'writable' : 'read-only'}</span>}>
            {rows.map(([key, label, type, dflt]) => (
              <div className="row align-items-center mb-2" key={key}>
                <label className="col-12 col-md-5 form-label small mb-0">{label}</label>
                <div className="col-12 col-md-7">
                  {type === 'bool' ? (
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" disabled={!canWrite} checked={value[key] ?? dflt ?? false} onChange={(e) => setValue({ ...value, [key]: e.target.checked })} />
                    </div>
                  ) : (
                    <input className="form-control form-control-sm" type={type} disabled={!canWrite} value={value[key] ?? ''} placeholder={String(dflt ?? '')} onChange={(e) => setValue({ ...value, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} />
                  )}
                </div>
              </div>
            ))}
            {canWrite && <button className="btn btn-sm btn-primary mt-3" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>}
            <p className="small mt-3 mb-0" style={{ color: 'var(--pb-text-muted)' }}>
              Saved values are read back from the server store before this page reports success. Indexation, ranking and ad revenue are only ever shown when the search provider itself reports them.
            </p>
          </Panel>
          <Panel title="Where the real signals come from">
            <ul className="small mb-0" style={{ color: 'var(--pb-text-muted)' }}>
              <li>Traffic and indexation: the Search Console / GA4 property once it is connected with its own credentials.</li>
              <li>Storefront analytics: recorded unique browser sessions — not verified people.</li>
              <li>An unconnected property is shown as not connected, never as zero traffic.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
