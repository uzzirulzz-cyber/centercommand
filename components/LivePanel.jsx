
'use client';
// Reusable live panel: binds a page to ONE real server route (GET to read, POST to
// act) through the admin session + CSRF. Renders loading, not-configured, degraded,
// empty and error states explicitly and never fabricates a row.
import { useCallback, useEffect, useState } from 'react';
import { Panel, asText } from './ui';

function csrf() {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|; )pb_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export default function LivePanel({ title, subtitle, endpoint, columns = [], actions = [], fields = [], emptyNote }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(true);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(endpoint, { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      setData(j);
      setError(res.ok ? null : asText(j.error || `HTTP ${res.status}`));
    } catch (e) { setError(String(e && e.message ? e.message : e)); }
    setBusy(false);
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const run = useCallback(async (action, payload = {}) => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify({ action, ...form, ...payload }),
      });
      const j = await res.json().catch(() => ({}));
      setNotice(j.message || asText(j.error || `HTTP ${res.status}`));
      await load();
    } catch (e) { setNotice(String(e && e.message ? e.message : e)); }
    setBusy(false);
  }, [endpoint, form, load]);

  const rows = Array.isArray(data && data.rows) ? data.rows : [];
  const items = Array.isArray(data && data.items) ? data.items : [];

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="h4 mb-1">{title}</h1>
          {subtitle && <p className="mb-0 small" style={{ color: 'var(--bs-secondary-color)' }}>{subtitle}</p>}
        </div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={load} disabled={busy}>
          {busy ? 'Working…' : 'Refresh'}
        </button>
      </div>

      {data && data.configured === false && (
        <div className="alert alert-warning small">
          Not configured — no data is shown because none exists yet. Missing:{' '}
          <span className="pb-mono">{asText((data.missingVars || []).join(', ') || data.reason)}</span>
        </div>
      )}
      {data && data.degraded === true && (
        <div className="alert alert-secondary small">Source degraded{data.reason ? ` — ${asText(data.reason)}` : ''}</div>
      )}
      {notice && <div className="alert alert-info small">{asText(notice)}</div>}
      {error && <div className="alert alert-danger small">{asText(error)}</div>}

      {fields.length > 0 && (
        <Panel title="Parameters" className="mb-3">
          <div className="row g-2">
            {fields.map((f) => (
              <div className={f.wide ? 'col-12' : 'col-md-4'} key={f.name}>
                <label className="form-label small mb-1" htmlFor={`lp-${f.name}`}>{f.label}</label>
                {f.type === 'select' ? (
                  <select id={`lp-${f.name}`} className="form-select form-select-sm"
                    value={form[f.name] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}>
                    <option value="">—</option>
                    {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input id={`lp-${f.name}`} className="form-control form-control-sm" placeholder={f.placeholder || ''}
                    value={form[f.name] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {actions.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {actions.map((a) => (
            <button key={a.action} type="button" className={`btn btn-sm ${a.variant || 'btn-outline-primary'}`}
              disabled={busy} onClick={() => run(a.action, a.payload || {})}>{a.label}</button>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <Panel title="Current state (read back from the server store)" className="mb-3">
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 pb-grid">
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}><th scope="row" style={{ width: '280px' }} className="pb-mono small">{asText(it.label)}</th>
                    <td className="small">{asText(it.detail)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {rows.length > 0 && (
        <Panel title={`${rows.length} record${rows.length === 1 ? '' : 's'}`}>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 pb-grid">
              <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={(r && (r.id || r._id || r.sid)) || i}>
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(r) : asText(r ? r[c.key] : '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!busy && !error && rows.length === 0 && items.length === 0 && (
        <div className="alert alert-secondary small mb-0">
          {emptyNote || 'Nothing to show yet — the source application returned no records and the local store holds none. No placeholder rows are generated.'}
        </div>
      )}
    </>
  );
}
