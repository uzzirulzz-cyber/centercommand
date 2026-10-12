'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from './SessionProvider';
import { Panel, PageHeader } from './ui';
import { applyTheme, contrastRatio, DEFAULT_THEME, THEME_PRESETS } from '../lib/theme';

const AREAS = [
  'Theme Presets', 'Global Colors', 'Typography', 'Backgrounds', 'Navigation', 'Sidebar', 'Cards',
  'Tables', 'Buttons', 'Forms', 'Charts', 'Icons', 'Animations', 'Responsiveness', 'Branding',
  'Custom CSS', 'Import / Export', 'Version History',
];
const NAV_ITEMS = [
  ['/admin', 'Dashboard'], ['/admin/apps', 'Applications'], ['/admin/products', 'Product catalog'],
  ['/admin/orders', 'Sales & orders'], ['/admin/customers', 'Customers & CRM'], ['/admin/page-builder', 'Visual page builder'],
  ['/admin/theme-studio', 'Theme studio'], ['/admin/live', 'PlayBeat Live'], ['/admin/sports', 'MagXTV'],
  ['/admin/deals', 'MakeThisDeal'], ['/admin/reports', 'Analytics & finance'], ['/admin/staff', 'Security & staff'],
  ['/admin/settings', 'System settings'],
];
const COLOR_LABELS = {
  page: 'Content background', sidebar: 'Sidebar', card: 'Cards & surfaces', accent: 'Primary accent',
  secondary: 'Secondary accent', highlight: 'Premium highlight', text: 'Main text', muted: 'Muted text',
  success: 'Success', warning: 'Warning', danger: 'Danger', border: 'Borders',
};
const FONT_CHOICES = [
  'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
  'Manrope, system-ui, -apple-system, Segoe UI, sans-serif',
  'DM Sans, system-ui, -apple-system, Segoe UI, sans-serif',
  'system-ui, -apple-system, Segoe UI, sans-serif',
];

const clone = (value) => JSON.parse(JSON.stringify(value));

export default function ThemeStudio() {
  const { api, can } = useSession();
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [published, setPublished] = useState(DEFAULT_THEME);
  const [history, setHistory] = useState([]);
  const [area, setArea] = useState('Theme Presets');
  const [layout, setLayout] = useState({ sidebarWidth: 264, sidebarSide: 'left', sidebarCollapsed: false, headerPosition: 'sticky', density: 'comfortable', navOrder: NAV_ITEMS.map(([href]) => href), hiddenNav: [], pinnedNav: [] });
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('Loading your saved theme…');
  const [busy, setBusy] = useState(false);
  const [exportText, setExportText] = useState('');
  const canPublish = can('apps:manage');

  useEffect(() => {
    let alive = true;
    api('/api/admin/config').then((res) => {
      if (!alive) return;
      if (!res?.ok) { setMessage(res?.error || 'Could not load saved settings.'); return; }
      const liveTheme = res.publishedTheme || DEFAULT_THEME;
      setPublished(liveTheme);
      setTheme(res.draftTheme || liveTheme);
      setHistory(res.themeHistory || []);
      setLayout((current) => ({ ...current, ...(res.layout || {}) }));
      setSaved(Boolean(res.draftTheme));
      setMessage(res.draftTheme ? 'Saved draft loaded. Previewing your draft.' : 'Previewing the published theme.');
    });
    return () => { alive = false; };
  }, [api]);

  useEffect(() => { applyTheme(theme, theme.appearance); }, [theme]);

  const editTheme = (update) => {
    setSaved(false);
    setTheme((current) => {
      const next = typeof update === 'function' ? update(current) : { ...current, ...update };
      return next;
    });
  };
  const setColor = (key, value) => editTheme((current) => ({ ...current, preset: 'custom', colors: { ...current.colors, [key]: value } }));
  const save = async (action, payload = {}) => {
    setBusy(true);
    const res = await api('/api/admin/config', { method: 'POST', body: { action, ...payload } });
    setBusy(false);
    if (!res?.ok) { setMessage(res?.error || 'Could not save settings.'); return false; }
    return res.result;
  };
  const saveDraft = async () => {
    const ok = await save('theme:save-draft', { theme });
    if (ok) { setSaved(true); setMessage('Draft saved privately to your admin profile.'); }
  };
  const publish = async () => {
    const nextHistory = await save('theme:publish', { theme });
    if (nextHistory) {
      setPublished(clone(theme)); setHistory(nextHistory); setSaved(false);
      setMessage('Theme published for the admin workspace.');
    }
  };
  const revert = async () => {
    const result = await save('theme:revert');
    if (result) { setTheme(result); setSaved(false); applyTheme(result, result.appearance); setMessage('Draft reverted to the published theme.'); }
  };
  const restore = async () => {
    const nextHistory = await save('theme:restore-default');
    if (nextHistory) { setPublished(DEFAULT_THEME); setTheme(DEFAULT_THEME); setHistory(nextHistory); applyTheme(DEFAULT_THEME); setSaved(false); setMessage('Executive Midnight restored and published.'); }
  };
  const saveLayout = async () => {
    const result = await save('layout:save', { layout });
    if (result) {
      setLayout(result);
      window.dispatchEvent(new CustomEvent('pb-layout-updated', { detail: result }));
      setMessage('Navigation and layout preferences saved for your account.');
    }
  };
  const moveNav = (href, direction) => setLayout((current) => {
    const order = [...(current.navOrder || NAV_ITEMS.map(([url]) => url))];
    const index = order.indexOf(href), other = index + direction;
    if (index < 0 || other < 0 || other >= order.length) return current;
    [order[index], order[other]] = [order[other], order[index]];
    return { ...current, navOrder: order };
  });
  const contrast = useMemo(() => contrastRatio(theme.colors.text, theme.colors.page), [theme.colors.text, theme.colors.page]);

  const presetPanel = <div className="row g-2">
    {THEME_PRESETS.map((preset) => (
      <div className="col-6 col-xxl-3" key={preset.preset}>
        <button type="button" onClick={() => editTheme(clone(preset))}
          className={`pb-preset ${theme.preset === preset.preset ? 'selected' : ''}`} aria-pressed={theme.preset === preset.preset}>
          <span className="d-flex gap-1 mb-2">
            {[preset.colors.page, preset.colors.sidebar, preset.colors.accent, preset.colors.highlight].map((color, i) => <i key={i} style={{ background: color }} />)}
          </span>
          <strong>{preset.name}</strong>
          <small>{preset.appearance === 'light' ? 'Light workspace' : 'Dark workspace'}</small>
        </button>
      </div>
    ))}
  </div>;

  return (
    <>
      <PageHeader title="Theme Studio" subtitle="Configure the admin workspace with live preview, private drafts and deliberate publishing. Changes never publish while you experiment." actions={
        <>
          <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={revert}>Revert</button>
          <button className="btn btn-sm btn-outline-secondary" disabled={busy || !canPublish} onClick={restore} title={!canPublish ? 'Super Admin permission required' : undefined}>Restore default</button>
          <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={saveDraft}>Save draft</button>
          {canPublish && <button className="btn btn-sm btn-primary" disabled={busy} onClick={publish}>Publish theme</button>}
        </>
      } />

      <div className="alert alert-secondary py-2 small" role="status">{message}{saved && <span className="ms-2 badge text-bg-success">Draft saved</span>}</div>
      <div className="pb-theme-studio">
        <aside className="pb-card pb-studio-nav" aria-label="Theme settings sections">
          <div className="pb-card-head"><strong>Configuration</strong></div>
          <div className="pb-card-body p-2">
            {AREAS.map((item) => <button key={item} type="button" className={`pb-studio-tab ${area === item ? 'active' : ''}`} onClick={() => setArea(item)}>{item}</button>)}
          </div>
        </aside>

        <section className="pb-card pb-theme-preview">
          <div className="pb-card-head"><strong>Live preview</strong><span className="badge text-bg-info">Unsaved changes stay local</span></div>
          <div className="pb-card-body">
            <div className="pb-preview-window" style={{ fontFamily: theme.fontFamily, fontSize: `${theme.fontSize}px`, borderRadius: `${theme.radius}px` }}>
              <div className="pb-preview-sidebar" style={{ background: theme.colors.sidebar }}>
                <span className="pb-brand-mark" style={{ background: theme.gradient ? `linear-gradient(${theme.gradient.angle}deg, ${theme.gradient.start}, ${theme.gradient.end})` : theme.colors.accent }}>▶</span>
                <strong>PlayBeat</strong>
                <span className="pb-preview-active" style={{ background: `${theme.colors.accent}33`, color: theme.colors.text }}>▦ &nbsp; Dashboard</span>
                <span>◈ &nbsp; Catalog</span><span>⇄ &nbsp; Orders</span><span>◉ &nbsp; Analytics</span>
              </div>
              <div className="pb-preview-content" style={{ background: theme.colors.page, color: theme.colors.text }}>
                <div className="d-flex align-items-center justify-content-between mb-4"><div><small style={{ color: theme.colors.muted }}>PLAYBEAT DIGITAL / OVERVIEW</small><h3 className="h5 mb-0 mt-1">Executive dashboard</h3></div><button className="btn btn-sm btn-primary" style={{ background: theme.colors.accent, borderColor: theme.colors.accent }}>Quick action</button></div>
                <div className="row g-2 mb-3">{['Revenue', 'Orders', 'Customers'].map((label, i) => <div className="col-4" key={label}><div className="pb-preview-card" style={{ background: theme.colors.card, borderColor: theme.colors.border, borderRadius: `${theme.radius}px` }}><small style={{ color: theme.colors.muted }}>{label}</small><strong style={{ color: theme.colors.text }}>{['PKR —', '—', '—'][i]}</strong></div></div>)}</div>
                <div className="pb-preview-card" style={{ background: theme.colors.card, borderColor: theme.colors.border, borderRadius: `${theme.radius}px` }}><small style={{ color: theme.colors.muted }}>Connection health</small><div className="d-flex gap-2 mt-2"><i style={{ background: theme.colors.success }} /><i style={{ background: theme.colors.warning }} /><i style={{ background: theme.colors.danger }} /></div></div>
              </div>
            </div>
            <p className="small mt-3 mb-0" style={{ color: 'var(--bs-secondary-color)' }}>Preview reflects the current token values. Real account figures stay governed by connector status.</p>
          </div>
        </section>

        <aside className="pb-card pb-studio-inspector">
          <div className="pb-card-head"><strong>{area}</strong></div>
          <div className="pb-card-body">
            {area === 'Theme Presets' && <>
              <label className="form-label">Theme name</label><input className="form-control mb-3" maxLength={48} value={theme.name} onChange={(e) => editTheme({ name: e.target.value, preset: 'custom' })} />
              <label className="form-label">Appearance</label><select className="form-select mb-3" value={theme.appearance} onChange={(e) => editTheme({ appearance: e.target.value })}><option value="dark">Dark mode</option><option value="light">Light mode</option><option value="auto">System appearance</option></select>
              {presetPanel}
            </>}
            {(area === 'Global Colors' || area === 'Backgrounds' || area === 'Branding' || area === 'Buttons' || area === 'Forms' || area === 'Charts' || area === 'Tables' || area === 'Icons') && <>
              <p className="small" style={{ color: 'var(--bs-secondary-color)' }}>Edit centralized design tokens. Values apply to matching interface surfaces and components.</p>
              {Object.entries(COLOR_LABELS).map(([key, label]) => <label key={key} className="pb-color-row"><span>{label}</span><input type="color" aria-label={label} value={theme.colors[key]} onChange={(e) => setColor(key, e.target.value)} /><input className="form-control form-control-sm pb-mono" aria-label={`${label} hex value`} value={theme.colors[key]} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && setColor(key, e.target.value)} /></label>)}
              <div className={`alert ${contrast !== null && contrast < 4.5 ? 'alert-warning' : 'alert-success'} py-2 small mt-3 mb-0`} role="status">Text contrast: {contrast?.toFixed(2)}:1 · {contrast !== null && contrast < 4.5 ? 'Below WCAG AA for normal text.' : 'Meets WCAG AA for normal text.'}</div>
              <hr /><h3 className="h6">Accent gradient</h3><div className="row g-2"><div className="col-5"><label className="form-label small">Start</label><input type="color" className="form-control form-control-color w-100" value={theme.gradient.start} onChange={(e) => editTheme((t) => ({ ...t, gradient: { ...t.gradient, start: e.target.value } }))} /></div><div className="col-5"><label className="form-label small">End</label><input type="color" className="form-control form-control-color w-100" value={theme.gradient.end} onChange={(e) => editTheme((t) => ({ ...t, gradient: { ...t.gradient, end: e.target.value } }))} /></div><div className="col-2"><label className="form-label small">°</label><input type="number" min="0" max="360" className="form-control" value={theme.gradient.angle} onChange={(e) => editTheme((t) => ({ ...t, gradient: { ...t.gradient, angle: Number(e.target.value) } }))} /></div></div>
            </>}
            {area === 'Typography' && <>
              <label className="form-label">Body font</label><select className="form-select mb-3" value={theme.fontFamily} onChange={(e) => editTheme({ fontFamily: e.target.value })}>{FONT_CHOICES.map((font) => <option key={font} value={font}>{font.split(',')[0]}</option>)}</select>
              <label className="form-label">Heading font</label><select className="form-select mb-3" value={theme.headingFont} onChange={(e) => editTheme({ headingFont: e.target.value })}>{FONT_CHOICES.map((font) => <option key={font} value={font}>{font.split(',')[0]}</option>)}</select>
              <label className="form-label">Base font size · {theme.fontSize}px</label><input type="range" className="form-range" min="12" max="18" value={theme.fontSize} onChange={(e) => editTheme({ fontSize: Number(e.target.value) })} />
              <p className="small mt-3">Custom font upload is unavailable because this app has no secure font asset storage configured.</p>
            </>}
            {(area === 'Navigation' || area === 'Sidebar' || area === 'Responsiveness') && <>
              <label className="form-label">Sidebar width · {layout.sidebarWidth}px</label><input type="range" className="form-range" min="220" max="340" value={layout.sidebarWidth} onChange={(e) => setLayout({ ...layout, sidebarWidth: Number(e.target.value) })} />
              <label className="form-label">Sidebar position</label><select className="form-select mb-3" value={layout.sidebarSide} onChange={(e) => setLayout({ ...layout, sidebarSide: e.target.value })}><option value="left">Left</option><option value="right">Right</option></select>
              <label className="form-label">Header position</label><select className="form-select mb-3" value={layout.headerPosition} onChange={(e) => setLayout({ ...layout, headerPosition: e.target.value })}><option value="sticky">Sticky</option><option value="static">Static</option></select>
              <label className="form-label">Content density</label><select className="form-select mb-3" value={layout.density} onChange={(e) => setLayout({ ...layout, density: e.target.value })}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select>
              <div className="d-flex align-items-center justify-content-between mb-3"><label className="form-check-label" htmlFor="sidebar-collapsed">Collapsed sidebar</label><input id="sidebar-collapsed" className="form-check-input" type="checkbox" checked={layout.sidebarCollapsed} onChange={(e) => setLayout({ ...layout, sidebarCollapsed: e.target.checked })} /></div>
              <div className="d-flex justify-content-between mb-2"><strong className="small">Menu order and visibility</strong><small className="text-secondary">Personal</small></div>
              {(layout.navOrder?.length ? layout.navOrder : NAV_ITEMS.map(([href]) => href)).map((href, index, order) => {
                const item = NAV_ITEMS.find(([url]) => url === href);
                if (!item) return null;
                const hidden = (layout.hiddenNav || []).includes(href);
                const pinned = (layout.pinnedNav || []).includes(href);
                return <div className="pb-nav-builder-row" key={href} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', href); }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const moving = e.dataTransfer.getData('text/plain'); const from = order.indexOf(moving), to = order.indexOf(href); if (from >= 0 && to >= 0) { setLayout((current) => { const next = [...(current.navOrder || NAV_ITEMS.map(([url]) => url))]; const [itemHref] = next.splice(from, 1); next.splice(to, 0, itemHref); return { ...current, navOrder: next }; }); } }}><span className="small text-truncate" title="Drag to reorder">⠿ {item[1]}</span><button className={`btn btn-sm ${pinned ? 'btn-primary' : 'btn-outline-secondary'}`} aria-label={`${pinned ? 'Unpin' : 'Pin'} ${item[1]}`} onClick={() => setLayout((current) => ({ ...current, pinnedNav: pinned ? (current.pinnedNav || []).filter((x) => x !== href) : [...(current.pinnedNav || []), href] }))}>★</button><button className="btn btn-sm btn-outline-secondary" disabled={!index} aria-label={`Move ${item[1]} up`} onClick={() => moveNav(href, -1)}>↑</button><input type="checkbox" aria-label={`Show ${item[1]}`} checked={!hidden} onChange={(e) => setLayout((current) => ({ ...current, hiddenNav: e.target.checked ? (current.hiddenNav || []).filter((x) => x !== href) : [...(current.hiddenNav || []), href] }))} /></div>;
              })}
              <button className="btn btn-sm btn-primary w-100 mt-3" disabled={busy} onClick={saveLayout}>Save navigation & layout</button>
            </>}
            {area === 'Cards' && <>
              <label className="form-label">Card corner radius · {theme.radius}px</label><input type="range" className="form-range" min="8" max="22" value={theme.radius} onChange={(e) => editTheme({ radius: Number(e.target.value) })} />
              <label className="form-label">Content maximum width · {theme.contentWidth}px</label><input type="range" className="form-range" min="1100" max="1800" value={theme.contentWidth} onChange={(e) => editTheme({ contentWidth: Number(e.target.value) })} />
              <p className="small">Card shadow and surface tokens are applied consistently across the admin shell.</p>
            </>}
            {(area === 'Animations' || area === 'Custom CSS') && <p className="small mb-0">Custom CSS injection is disabled. It is not persisted or executed because arbitrary styles can bypass accessibility and security controls. Motion respects the operating system reduced-motion preference.</p>}
            {area === 'Import / Export' && <>
              <p className="small">Export or import the current token set as JSON. Imports are validated by the server before save or publish.</p>
              <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setExportText(JSON.stringify(theme, null, 2))}>Prepare export</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { try { const parsed = JSON.parse(exportText); if (!parsed.colors || !parsed.name) throw new Error('Theme JSON needs a name and colors.'); editTheme(parsed); setMessage('Theme imported into the live preview.'); } catch (error) { setMessage(error.message || 'Invalid theme JSON.'); } }}>Import JSON</button>
              <textarea className="form-control font-monospace mt-3" rows="10" aria-label="Theme JSON" value={exportText} onChange={(e) => setExportText(e.target.value)} />
            </>}
            {area === 'Version History' && <>
              <p className="small">Published themes are versioned. Restore by selecting a saved version, then publish it deliberately.</p>
              {history.length === 0 && <p className="small text-secondary">No published theme versions yet.</p>}
              {history.map((entry) => <div className="pb-history-row" key={entry.id}><div><strong className="small">{entry.name}</strong><small>{entry.actor} · {new Date(entry.at).toLocaleString()}</small></div><button className="btn btn-sm btn-outline-secondary" onClick={() => editTheme(clone(entry.theme))}>Preview</button></div>)}
            </>}
          </div>
        </aside>
      </div>
    </>
  );
}
