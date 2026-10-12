'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '../../../components/SessionProvider';
import { PageHeader, Panel, fmtDateTime } from '../../../components/ui';

export default function Cms() {
  const { api, can } = useSession();
  const [state, setState] = useState(null);
  const [doc, setDoc] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const writable = can('cms:write');

  const load = useCallback(async () => {
    const res = await api('/api/admin/cms');
    if (res?.ok) { setState(res); setDoc(res.draft?.document || res.published?.document || res.document || null); }
    else setNotice({ tone: 'danger', text: res?.error || res?.reason || 'cms endpoint unavailable' });
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const post = async (payload, okMsg) => {
    setBusy(true);
    const res = await api('/api/admin/cms', { method: 'POST', body: payload });
    setBusy(false);
    if (res?.ok || res?.message) { setNotice({ tone: 'success', text: res.message || okMsg }); if (res.draft?.document) setDoc(res.draft.document); setState((p) => (p ? { ...p, ...res } : p)); }
    else setNotice({ tone: 'danger', text: res?.error || res?.reason || 'rejected' });
  };

  const sections = doc?.sections || [];
  return (
    <>
      <PageHeader title="Website CMS" icon="bi-window-stack" subtitle="Storefront pages, navigation, home sections and metadata. Draft changes are saved server-side and only reach visitors when published."
        actions={<Link className="btn btn-sm btn-outline-secondary" href="/admin/page-builder">Visual Page Builder</Link>} />
      {notice && <div className={`alert alert-${notice.tone === 'danger' ? 'danger' : 'success'} small`}>{notice.text}</div>}
      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <Panel pad={false} title={`Home sections (${sections.length})`}>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead><tr><th>#</th><th>Section</th><th>Enabled</th><th>Content</th></tr></thead>
                <tbody>
                  {sections.length === 0 && <tr><td colSpan="4" className="text-center small" style={{ color: 'var(--pb-text-muted)' }}>The document returned by the CMS store has no sections yet.</td></tr>}
                  {sections.map((s, i) => (
                    <tr key={s.id || i}>
                      <td className="pb-mono">{i + 1}</td>
                      <td>{s.title || s.id || `section-${i + 1}`}</td>
                      <td>{s.enabled === false ? 'no' : 'yes'}</td>
                      <td className="small pb-mono" style={{ color: 'var(--pb-text-muted)', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel pad={false} title="Raw document (server-normalized)">
            <pre className="pb-mono small p-3 mb-0" style={{ maxHeight: 320, overflow: 'auto' }}>{JSON.stringify(doc, null, 2)}</pre>
          </Panel>
        </div>
        <div className="col-12 col-xl-4">
          <Panel title="Publishing">
            {writable && (
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => post({ action: 'publish', document: doc, label: 'CMS publish' }, 'Published.')}>Publish document</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => post({ action: 'save-draft', document: doc }, 'Draft saved.')}>Save draft</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => post({ action: 'discard-draft' }, 'Draft discarded.')}>Discard draft</button>
                <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => post({ action: 'restore-default' }, 'Default content restored.')}>Restore default</button>
              </div>
            )}
            {!writable && <p className="small mb-0" style={{ color: 'var(--pb-text-muted)' }}>Your role can read the CMS document but not publish it.</p>}
          </Panel>
          <Panel title="State">
            <div className="d-flex justify-content-between small mb-1"><span>Published version</span><span className="pb-mono">{state?.published?.version ?? '—'}</span></div>
            <div className="d-flex justify-content-between small mb-1"><span>Published at</span><span className="pb-mono">{state?.published?.updatedAt ? fmtDateTime(state.published.updatedAt) : '—'}</span></div>
            <div className="d-flex justify-content-between small mb-1"><span>Draft saved</span><span className="pb-mono">{state?.draft?.updatedAt ? fmtDateTime(state.draft.updatedAt) : 'none'}</span></div>
            <div className="d-flex justify-content-between small"><span>Versions</span><span className="pb-mono">{state?.versions?.length ?? 0}</span></div>
          </Panel>
        </div>
      </div>
    </>
  );
}
