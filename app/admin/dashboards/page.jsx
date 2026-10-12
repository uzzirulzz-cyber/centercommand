
'use client';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Panel, asText } from '../../../components/ui';
import { SECTIONS } from '../../../components/DashboardSections';
import { applyTheme, THEME_PRESETS } from '../../../lib/theme';

const PREMIUM_SETUPS = [
  { key: 'rixzo', label: 'Rixzo Atelier', section: 'rixzo', layout: 'rixzo-art', theme: 'rixzo-atelier' },
  { key: 'superieur', label: 'Superieur', section: 'superieur', layout: 'superieur-dark', theme: 'superieur-violet' },
  { key: 'proui', label: 'ProUI', section: 'proui', layout: 'proui-light', theme: 'proui-cyan' },
].map((s) => ({ ...s, preset: THEME_PRESETS.find((p) => p.preset === s.theme) }));

function csrf() {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|; )pb_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export default function DashboardsPage() {
  const [prefs, setPrefs] = useState({ section: 'analytics', layout: 'executive', layouts: [] });
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [p, o, a, f] = await Promise.all([
        fetch('/api/admin/dashboards', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/overview', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/admin/analytics', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/admin/finance', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
      ]);
      setPrefs({ section: p.section || 'analytics', layout: p.layout || 'executive', layouts: p.layouts || [] });
      applyLayout(p.layout || 'executive');
      setData({ overview: o, analytics: a, finance: f });
      setError(null);
    } catch (e) { setError(String(e && e.message ? e.message : e)); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function applyLayout(id) {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.pbLayout = id;
      try { window.localStorage.setItem('pb_layout', id); } catch { /* storage blocked */ }
    }
  }

  const save = useCallback(async (patch) => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch('/api/admin/dashboards', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({}));
      setNotice(j.message || asText(j.error || `HTTP ${res.status}`));
      if (res.ok) { setPrefs((s) => ({ ...s, section: j.section || s.section, layout: j.layout || s.layout })); applyLayout(j.layout || prefs.layout); }
    } catch (e) { setNotice(String(e && e.message ? e.message : e)); }
    setBusy(false);
  }, [prefs.layout]);

  const current = SECTIONS.find((s) => s.id === prefs.section) || SECTIONS[0];
  const Section = current.Component;

  // One click wires the three parts of a premium set together: its dashboard
  // section, its layout, and the matching theme published to the workspace.
  async function applyPremium(setup) {
    if (!setup || !setup.preset) { setNotice('That premium set is unavailable in this build.'); return; }
    setBusy(true); setNotice(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify({ action: 'theme:publish', theme: setup.preset }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(asText(j.error || `HTTP ${res.status}`)); setBusy(false); return; }
      applyTheme(setup.preset, setup.preset.appearance);
      try { window.localStorage.setItem('pb_theme_mode', setup.preset.appearance); } catch { /* storage blocked */ }
      await save({ section: setup.section, layout: setup.layout });
      setNotice(`${setup.label} applied — section, layout and theme set together.`);
    } catch (e) { setNotice(String(e && e.message ? e.message : e)); }
    setBusy(false);
  }

  return (
    <div className="pb-dash">
      <PageHeader
        title="Dashboards"
        subtitle="Eight dashboard sections restyled with this admin's own Bootstrap 5 markup — layout patterns only, no third-party template code. Every figure is read from the existing endpoints."
        actions={
          <div className="d-flex gap-2">
            {PREMIUM_SETUPS.map((s) => (
              <button key={s.key} type="button" className="btn btn-sm btn-primary" onClick={() => applyPremium(s)} disabled={busy}>
                {s.label}
              </button>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={load} disabled={busy}>{busy ? 'Working…' : 'Refresh'}</button>
          </div>
        }
      />

      <div className="pb-hbar mb-3">
        {SECTIONS.map((s) => (
          <a key={s.id} href="#section" className={s.id === prefs.section ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); save({ section: s.id }); }}>{s.label}</a>
        ))}
      </div>

      <Panel title="Theme layout" className="mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-5">
            <label className="form-label small mb-1" htmlFor="pb-layout">Layout skin</label>
            <select id="pb-layout" className="form-select form-select-sm" value={prefs.layout}
              disabled={busy} onChange={(e) => save({ layout: e.target.value })}>
              {(prefs.layouts || []).map((l) => <option key={l.id} value={l.id}>{l.label} · {l.nav} · {l.mode}</option>)}
            </select>
          </div>
          <div className="col-md-7">
            <div className="small" style={{ color: 'var(--bs-secondary-color)' }}>
              {(prefs.layouts || []).find((l) => l.id === prefs.layout)?.note || 'Select a layout.'} Saved server-side and reapplied on load.
            </div>
          </div>
        </div>
        <div className="small mt-2" style={{ color: 'var(--bs-secondary-color)' }}>
          {current.note}
        </div>
      </Panel>

      {notice && <div className="alert alert-info small">{asText(notice)}</div>}
      {error && <div className="alert alert-danger small">{asText(error)}</div>}

      <Section overview={data.overview} analytics={data.analytics} finance={data.finance} />
    </div>
  );
}
