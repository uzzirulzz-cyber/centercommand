'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/ui';
import { useSession } from '../../../components/SessionProvider';

const badge = (status) => ({
  connected: 'text-bg-success',
  limited: 'text-bg-warning',
  ready: 'text-bg-primary',
  pending: 'text-bg-secondary',
}[status] || 'text-bg-secondary');

export default function MetaIntegrationsPage() {
  const { api } = useSession();
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/admin/meta').then((response) => response?.ok && setData(response));
    const query = new URLSearchParams(window.location.search);
    if (query.get('meta_connected') === '1') setNotice('Meta connected. Each product still needs its required assets and approved access.');
    else if (query.has('meta_error')) setNotice(`Meta connection did not finish (${query.get('meta_error')}). Review app setup and try again.`);
  }, [api]);

  const ready = data?.configuration?.ready;
  const products = data?.products || [];

  const syncLeads = async () => {
    setBusy(true);
    const result = await api('/api/admin/meta/leads', { method: 'POST', body: {} });
    setNotice(result?.ok ? `${result.message} ${result.inserted} new · ${result.updated} refreshed · ${result.stored} total.` : result?.error || 'Meta lead sync failed.');
    setBusy(false);
  };

  return (
    <>
      <PageHeader title="Meta Business integrations" icon="bi-meta" subtitle="Facebook Login, lead forms, Instagram, WhatsApp and read-only marketing insights. Every status reflects configuration and granted permissions; no sample metrics are shown as live data." />
      {notice && <div className="alert alert-info" role="status">{notice}</div>}
      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-7">
          <section className="card h-100">
            <div className="card-header fw-semibold">Meta app connection</div>
            <div className="card-body">
              <p className="text-secondary">Use the existing Playbeat Digital Meta app. Tokens are encrypted with AES-256-GCM before they are saved. The browser never receives the app secret or access token.</p>
              {!ready && <div className="alert alert-warning">Add the following Vercel environment variables to enable the secure OAuth connection: <strong>{data?.configuration?.missing?.join(', ') || 'loading status…'}</strong></div>}
              {data?.callbackUri && <div className="mb-3"><small className="text-secondary d-block">Add this exact redirect URI in Meta Login settings</small><code>{data.callbackUri}</code></div>}
              {ready && !data?.connection && <a href="/api/auth/meta/connect" className="btn btn-primary">Connect Meta assets</a>}
              {data?.connection && <div className="d-flex flex-wrap gap-2 align-items-center"><span className="badge text-bg-success">Connected</span><span>{data.connection.name || data.connection.userId}</span>{data.connection.email && <span className="text-secondary">· {data.connection.email}</span>}</div>}
              {data?.connection && <div className="mt-3"><button className="btn btn-sm btn-outline-primary" disabled={busy || !data.connection.grantedScopes?.includes('leads_retrieval')} onClick={syncLeads}>{busy ? 'Syncing leads…' : 'Sync Facebook leads into CRM'}</button>{!data.connection.grantedScopes?.includes('leads_retrieval') && <small className="d-block text-secondary mt-2">Lead access was not granted. Reconnect after enabling the permission in Meta.</small>}</div>}
              {data?.connection?.expiresAt && <small className="d-block text-secondary mt-2">Token expires {new Date(data.connection.expiresAt).toLocaleString()} · reconnect before expiry.</small>}
              <div className="small text-secondary mt-3">Connection requests: {data?.requestedScopes?.join(', ') || 'loading…'}</div>
            </div>
          </section>
        </div>
        <div className="col-12 col-xl-5">
          <section className="card h-100">
            <div className="card-header fw-semibold">What is required for live results</div>
            <div className="card-body">
              <ul className="mb-0">
                <li>Facebook Page for lead forms and page insights.</li>
                <li>Instagram professional account linked to a Page.</li>
                <li>Ad account for marketing reporting. The checked Business portfolio currently has none.</li>
                <li>WhatsApp Business Account, registered phone number and an active token. Billing is set in Meta; this business currently has no payment method.</li>
                <li>Meta App Review/advanced access for permissions used with assets outside app roles.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      <div className="row g-3">
        {products.map((product) => <div className="col-12 col-md-6 col-xxl-4" key={product.id}>
          <section className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between gap-2 align-items-start"><h2 className="h6 mb-2">{product.name}</h2><span className={`badge ${badge(product.status)}`}>{product.status}</span></div>
              <p className="small text-secondary mb-0">{product.detail}</p>
              {product.tokenStatus && <p className="small mb-0 mt-2">WhatsApp token: {product.tokenStatus}</p>}
            </div>
          </section>
        </div>)}
      </div>

      {data?.connection && <section className="card mt-4">
        <div className="card-header fw-semibold">Business assets visible to this connection</div>
        <div className="card-body">
          <div className="row g-4">
            {[
              ['Facebook Pages', data.assets?.pages],
              ['Instagram professional accounts', data.assets?.instagram],
              ['Ad accounts', data.assets?.adAccounts],
              ['Business portfolios', data.assets?.businesses],
              ['WhatsApp Business accounts', data.assets?.whatsAppAccounts],
            ].map(([label, rows]) => <div className="col-12 col-md-6 col-xl-4" key={label}>
              <div className="fw-semibold">{label} <span className="badge text-bg-light">{rows?.length ?? '—'}</span></div>
              {rows?.length ? <ul className="small text-secondary mb-0 mt-2">{rows.slice(0, 10).map((row) => <li key={row.id}>{row.name || row.username || row.accountId || row.id}</li>)}</ul> : <small className="text-secondary">No assets returned for this account and its granted permissions.</small>}
            </div>)}
          </div>
          {Object.keys(data.assets?.errors || {}).length > 0 && <div className="alert alert-warning mt-3 mb-0">Some assets could not be listed: {Object.keys(data.assets.errors).join(', ')}. Check permission review and business access.</div>}
        </div>
      </section>}
    </>
  );
}
