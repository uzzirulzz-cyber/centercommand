'use client';

import { useEffect, useState } from 'react';
import { useSession } from './SessionProvider';
import { PageHeader, Panel } from './ui';

const STARTER_SECTIONS = [
  { id: 'header', title: 'Header & navigation', description: 'Storefront branding, primary navigation and account entry points.', visible: true, source: 'src/components/Header.tsx' },
  { id: 'hero', title: 'Hero banner', description: 'Primary PlayBeat Digital storefront introduction.', visible: true, source: 'src/components/HeroBanner.tsx' },
  { id: 'categories', title: 'Product categories', description: 'Browse software, subscriptions, gift cards and digital products.', visible: true, source: 'src/components/CategoryNav.tsx' },
  { id: 'featured', title: 'Featured products', description: 'Selected products and marketplace offers.', visible: true, source: 'src/components/StorefrontShowcaseSections.tsx' },
  { id: 'deals', title: 'Promotional offers', description: 'Limited-time offers, campaign placements and featured deals.', visible: true, source: 'src/components/FlashDealsBanner.tsx' },
  { id: 'cms-blocks', title: 'CMS content blocks', description: 'Reusable homepage content managed by the storefront CMS.', visible: true, source: 'src/components/CmsHomepageSections.tsx' },
  { id: 'call-to-action', title: 'Call to action', description: 'A focused next step for visitors, such as browsing offers or requesting a service.', visible: true, source: 'src/components/CmsHomepageSections.tsx' },
  { id: 'services', title: 'Services marketplace', description: 'Professional digital services and customer requests.', visible: true, source: 'src/components/services/ServicesPage.tsx' },
  { id: 'trust', title: 'Trust & delivery', description: 'Customer confidence, secure checkout and fulfillment information.', visible: true, source: 'src/components/TrustFeatures.tsx' },
  { id: 'app-download', title: 'Mobile app promotion', description: 'PlayBeat app download links and installation guidance.', visible: true, source: 'src/components/app/AppDownloadSection.tsx' },
  { id: 'brand-logos', title: 'Brand showcase', description: 'Brand and partner marks used by the storefront.', visible: true, source: 'src/components/BrandLogos.tsx' },
  { id: 'faq', title: 'Frequently asked questions', description: 'Answers to common marketplace and delivery questions.', visible: true, source: 'src/components/FAQSection.tsx' },
  { id: 'footer', title: 'Footer & company information', description: 'Contact, policies and company links.', visible: true, source: 'src/components/Footer.tsx' },
];

export default function PageBuilder() {
  const { api, can } = useSession();
  const [sections, setSections] = useState(STARTER_SECTIONS);
  const [dragged, setDragged] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading saved storefront layout…');
  const [dirty, setDirty] = useState(false);
  const canManage = can('apps:manage');

  useEffect(() => {
    let alive = true;
    api('/api/admin/config').then((res) => {
      if (!alive) return;
      if (res?.pageDraft?.sections) setSections(res.pageDraft.sections);
      setMessage('Draft editor ready. Changes are stored in this admin database.');
    });
    return () => { alive = false; };
  }, [api]);

  const edit = (id, patch) => {
    setDirty(true);
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  };
  const move = (from, to) => {
    setSections((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDirty(true);
  };
  const addSection = () => {
    if (sections.length >= 20) { setMessage('The builder supports up to 20 sections.'); return; }
    const id = `custom-${Date.now().toString(36)}`;
    setSections((current) => [...current, { id, title: 'New section', description: 'Add a short description for this section.', visible: true, source: 'Custom section' }]);
    setDirty(true);
  };
  const save = async () => {
    setBusy(true);
    const res = await api('/api/admin/config', { method: 'POST', body: { action: 'page:save-draft', pageDraft: { version: 1, sections } } });
    setBusy(false);
    if (res?.ok) { setDirty(false); setMessage('Draft saved to the admin database. The live storefront is unchanged.'); }
    else setMessage(res?.error || 'Could not save this draft.');
  };
  const reset = async () => {
    setBusy(true);
    const res = await api('/api/admin/config', { method: 'POST', body: { action: 'page:reset' } });
    setBusy(false);
    if (res?.ok) { setSections(res.result.sections); setDirty(false); setMessage('Draft restored to the source-based starter layout.'); }
    else setMessage(res?.error || 'Could not reset this draft.');
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, sections }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'playbeat-page-layout.json'; anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Layout JSON exported.');
  };

  return <>
    <PageHeader title="Visual Page Builder" subtitle="Arrange a source-informed storefront layout, edit copy, and save a reviewable draft." actions={
      <>
        <button className="btn btn-sm btn-outline-secondary" onClick={exportJson}>Export layout</button>
        <button className="btn btn-sm btn-outline-secondary" disabled={busy || !canManage} onClick={reset}>Restore starter</button>
        <button className="btn btn-sm btn-primary" disabled={busy || !dirty || !canManage} onClick={save}>Save draft</button>
      </>
    } />
    <div className="alert alert-warning small py-2" role="status">{message} Publishing is unavailable until a storefront CMS publishing connector is configured. This editor does not change playbeat.digital.</div>
    {!canManage && <div className="alert alert-info small py-2">You can view the layout, but only a Super Admin can edit and save storefront drafts.</div>}
    <div className="row g-3 align-items-start">
      <div className="col-xl-7">
        <Panel title="Storefront sections" actions={<button className="btn btn-sm btn-outline-primary" onClick={addSection} disabled={!canManage || sections.length >= 20}>＋ Add section</button>}>
          <p className="small" style={{ color: 'var(--bs-secondary-color)' }}>Drag sections to reorder. Toggle visibility and edit section text. Source links identify the matching PlayBeat code; they do not publish changes to the storefront.</p>
          <div className="pb-builder-list" onDragOver={(e) => e.preventDefault()}>
            {sections.map((section, index) => <article className={`pb-builder-section ${dragged === section.id ? 'dragging' : ''}`} key={section.id} draggable={canManage} onDragStart={() => setDragged(section.id)} onDrop={() => { const from = sections.findIndex((item) => item.id === dragged); if (from >= 0 && from !== index) move(from, index); setDragged(null); }} onDragEnd={() => setDragged(null)}>
              <div className="pb-builder-handle" aria-hidden="true">⠿</div>
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2"><strong className="small">{index + 1}. {section.title}</strong><span className={`badge ${section.visible ? 'text-bg-success' : 'text-bg-secondary'}`}>{section.visible ? 'Visible in draft' : 'Hidden in draft'}</span><a className="small ms-auto" href={`https://github.com/uzzirulzz-cyber/izoko/blob/main/${section.source}`} target="_blank" rel="noreferrer">Source ↗</a></div>
                <label className="form-label small mb-1">Section heading</label><input className="form-control form-control-sm mb-2" disabled={!canManage} maxLength={90} value={section.title} onChange={(e) => edit(section.id, { title: e.target.value })} />
                <label className="form-label small mb-1">Description</label><textarea className="form-control form-control-sm" disabled={!canManage} maxLength={320} rows="2" value={section.description} onChange={(e) => edit(section.id, { description: e.target.value })} />
              </div>
              <div className="d-flex flex-column gap-2 align-items-center">
                <button className="btn btn-sm btn-outline-secondary" disabled={!canManage || !index} aria-label={`Move ${section.title} up`} onClick={() => move(index, index - 1)}>↑</button>
                <input className="form-check-input" type="checkbox" disabled={!canManage} aria-label={`Show ${section.title}`} checked={section.visible} onChange={(e) => edit(section.id, { visible: e.target.checked })} />
                <button className="btn btn-sm btn-outline-secondary" disabled={!canManage || index === sections.length - 1} aria-label={`Move ${section.title} down`} onClick={() => move(index, index + 1)}>↓</button>
              </div>
            </article>)}
          </div>
        </Panel>
      </div>
      <div className="col-xl-5">
        <Panel title="Interactive preview">
          <div className="pb-page-preview">
            <div className="pb-page-preview-head"><strong>PlayBeat Digital</strong><span>Marketplace&nbsp;&nbsp; Services&nbsp;&nbsp; Support</span></div>
            {sections.filter((section) => section.visible).map((section) => <div className={`pb-page-preview-section preview-${section.id}`} key={section.id}><small>{section.title.toUpperCase()}</small><strong>{section.title}</strong><span>{section.description}</span></div>)}
          </div>
          <p className="small mt-3 mb-0" style={{ color: 'var(--bs-secondary-color)' }}>Preview uses this draft's order, visibility and text. It does not fetch or expose storefront customer data.</p>
        </Panel>
        <Panel title="Draft status" className="mt-3">
          <div className="d-flex justify-content-between small"><span>Saved changes</span><strong>{dirty ? 'Unsaved' : 'Up to date'}</strong></div>
          <div className="d-flex justify-content-between small mt-2"><span>Storefront connector</span><strong className="text-warning">Not configured for publishing</strong></div>
          <div className="d-flex justify-content-between small mt-2"><span>Sections</span><strong>{sections.length}</strong></div>
        </Panel>
      </div>
    </div>
  </>;
}
