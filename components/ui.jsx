'use client';

import { useEffect, useMemo, useState } from 'react';
import { APP_COLORS, APPS } from '../lib/apps';

/* ---------- Formatting helpers ---------- */
export function fmtMoney(amount, currency = 'PKR') {
  const n = Number(amount || 0).toLocaleString('en-US');
  return currency === 'PKR' ? `PKR ${n}` : `${currency} ${n}`;
}

// Numeric formatter used by the dashboard sections and stat tiles. Kept here so
// every view formats counts identically; a non-finite value renders an em dash
// rather than "NaN" (an unreported figure must never look like a real one).
export function fmtNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/* ---------- Page header with breadcrumbs ---------- */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
      <div>
        <h1 className="h4 mb-1" style={{ color: 'var(--bs-emphasis-color)' }}>{title}</h1>
        {subtitle && <p className="mb-0" style={{ color: 'var(--bs-secondary-color)', fontSize: '.9rem' }}>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/* ---------- Stat card ---------- */
export function StatCard({ label, value, sub, tone }) {
  return (
    <div className="pb-card h-100">
      <div className="pb-card-body py-3">
        <div className="pb-stat-label">{label}</div>
        <div className="pb-stat-value my-1" style={tone ? { color: tone } : undefined}>{value}</div>
        {sub && <div className="pb-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ---------- Status badge ---------- */
const STATUS_MAP = {
  connected: ['success', 'Connected'],
  degraded: ['warning', 'Degraded'],
  pending: ['secondary', 'Not configured'],
  disconnected: ['danger', 'Disconnected'],
  live: ['danger', 'LIVE'],
  healthy: ['success', 'Healthy'],
  ready: ['success', 'Ready'],
  offline: ['secondary', 'Offline'],
  active: ['success', 'Active'],
  archived: ['secondary', 'Archived'],
  paid: ['success', 'Paid'],
  pending_payment: ['warning', 'Pending'],
  refunded: ['secondary', 'Refunded'],
  success: ['success', 'Success'],
  warning: ['warning', 'Warning'],
  verified: ['success', 'Verified'],
};

export function StatusBadge({ status, label }) {
  const [variant, text] = STATUS_MAP[status] || ['secondary', status];
  return <span className={`badge text-bg-${variant}`}>{label || text}</span>;
}

/* ---------- Source application badge ---------- */
export function SourceBadge({ slug }) {
  const app = APPS.find((a) => a.slug === slug);
  if (!app) return null;
  const c = APP_COLORS[slug] || '#4c8dff';
  return (
    <span className="pb-src" style={{ color: c, borderColor: `${c}55`, background: `${c}14` }}>
      <span className="dot" style={{ background: c }} />
      {app.short}
    </span>
  );
}

/* ---------- Generic data table with pagination ---------- */
export function DataTable({ columns, rows, pageSize = 8, empty, onBulkAction, editableKeys = [], onEdit }) {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sort, setSort] = useState({ key: '', direction: 'asc' });
  const [visible, setVisible] = useState(columns.map((column) => column.key));
  const [density, setDensity] = useState('comfortable');
  const [selected, setSelected] = useState([]);
  const [savedViews, setSavedViews] = useState([]);
  const [viewName, setViewName] = useState('');
  const tableKey = columns.map((column) => column.key).join(',');

  useEffect(() => {
    try { setSavedViews(JSON.parse(localStorage.getItem(`pb_table_views:${tableKey}`) || '[]')); } catch { setSavedViews([]); }
  }, [tableKey]);

  const filterOptions = useMemo(() => {
    if (!filterKey) return [];
    return [...new Set(rows.map((row) => String(row[filterKey] ?? '')).filter(Boolean))].sort();
  }, [rows, filterKey]);
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const result = rows.filter((row) => {
      if (filterKey && filterValue && String(row[filterKey] ?? '') !== filterValue) return false;
      if (!needle) return true;
      return columns.some((column) => String(typeof column.value === 'function' ? column.value(row) : row[column.key] ?? '').toLocaleLowerCase().includes(needle));
    });
    if (!sort.key) return result;
    return [...result].sort((a, b) => {
      const av = a[sort.key] ?? '', bv = b[sort.key] ?? '';
      const an = Number(av), bn = Number(bv);
      const comparison = av !== '' && bv !== '' && Number.isFinite(an) && Number.isFinite(bn)
        ? an - bn : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, columns, query, filterKey, filterValue, sort]);
  const pages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const view = filteredRows.slice(page * pageSize, page * pageSize + pageSize);
  const shownColumns = columns.filter((column) => visible.includes(column.key));
  const rowId = (row, index) => String(row.id || row.sku || row.orderNo || row.email || index);
  const toggleSort = (key) => { setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' })); setPage(0); };
  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const next = [...savedViews.filter((item) => item.name !== name), { name, query, filterKey, filterValue, sort, visible, density }].slice(-12);
    setSavedViews(next);
    localStorage.setItem(`pb_table_views:${tableKey}`, JSON.stringify(next));
    setViewName('');
  };
  const applyView = (event) => {
    const saved = savedViews.find((item) => item.name === event.target.value);
    if (!saved) return;
    setQuery(saved.query || ''); setFilterKey(saved.filterKey || ''); setFilterValue(saved.filterValue || ''); setSort(saved.sort || { key: '', direction: 'asc' });
    if (Array.isArray(saved.visible)) setVisible(saved.visible.filter((key) => columns.some((column) => column.key === key)));
    if (['compact', 'comfortable', 'spacious'].includes(saved.density)) setDensity(saved.density);
    setPage(0);
  };
  const exportRows = (kind) => {
    const cells = shownColumns;
    const valueFor = (row, column) => String(typeof column.value === 'function' ? column.value(row) : row[column.key] ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    if (kind === 'excel') {
      const html = `<html><head><meta charset="utf-8" /></head><body><table><thead><tr>${cells.map((column) => `<th>${valueFor({ [column.key]: column.label }, column)}</th>`).join('')}</tr></thead><tbody>${filteredRows.map((row) => `<tr>${cells.map((column) => `<td>${valueFor(row, column)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = 'playbeat-table.xls'; anchor.click(); URL.revokeObjectURL(anchor.href); return;
    }
    const csv = [cells.map((column) => JSON.stringify(column.label)).join(','), ...filteredRows.map((row) => cells.map((column) => JSON.stringify(typeof column.value === 'function' ? column.value(row) : row[column.key] ?? '')).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = 'playbeat-table.csv'; anchor.click(); URL.revokeObjectURL(anchor.href);
  };

  if (!rows.length) {
    return <EmptyState title={empty?.title || 'Nothing here yet'} body={empty?.body} />;
  }

  return (
    <div>
      <div className="pb-table-toolbar">
        <input className="form-control form-control-sm" style={{ maxWidth: 250 }} type="search" placeholder="Search this table…" aria-label="Search table" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
        <select className="form-select form-select-sm" style={{ maxWidth: 145 }} aria-label="Filter by column" value={filterKey} onChange={(e) => { setFilterKey(e.target.value); setFilterValue(''); setPage(0); }}><option value="">No filter</option>{columns.filter((column) => rows.some((row) => row[column.key] !== undefined)).map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select>
        {filterKey && <select className="form-select form-select-sm" style={{ maxWidth: 165 }} aria-label={`Filter ${filterKey}`} value={filterValue} onChange={(e) => { setFilterValue(e.target.value); setPage(0); }}><option value="">All values</option>{filterOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>}
        <details className="pb-column-picker"><summary className="btn btn-sm btn-outline-secondary">Columns</summary><div className="dropdown-menu show p-2">{columns.map((column) => <label key={column.key} className="dropdown-item d-flex gap-2 align-items-center"><input type="checkbox" checked={visible.includes(column.key)} onChange={(e) => setVisible((current) => e.target.checked ? [...current, column.key] : current.filter((key) => key !== column.key))} />{column.label}</label>)}</div></details>
        <select className="form-select form-select-sm" style={{ maxWidth: 132 }} aria-label="Table density" value={density} onChange={(e) => setDensity(e.target.value)}><option value="compact">Compact rows</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious rows</option></select>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => exportRows('csv')}>CSV</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => exportRows('excel')}>Excel</button>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2 px-3 pb-2">
        {selected.length > 0 && <><span className="small" aria-live="polite">{selected.length} selected</span>{onBulkAction && <button className="btn btn-sm btn-outline-primary" onClick={() => onBulkAction(selected)}>Bulk action</button>}</>}
        <select className="form-select form-select-sm ms-auto" style={{ maxWidth: 170 }} aria-label="Saved table views" value="" onChange={applyView}><option value="">Saved views</option>{savedViews.map((saved) => <option key={saved.name} value={saved.name}>{saved.name}</option>)}</select>
        <input className="form-control form-control-sm" style={{ maxWidth: 150 }} aria-label="Saved view name" placeholder="Name current view" value={viewName} onChange={(e) => setViewName(e.target.value)} />
        <button className="btn btn-sm btn-outline-secondary" disabled={!viewName.trim()} onClick={saveView}>Save view</button>
      </div>
      <div className={`pb-table-wrap pb-table-density-${density}`}>
        <table className="table table-hover align-middle pb-data-grid">
          <thead>
            <tr><th className="pb-select-cell"><input type="checkbox" aria-label="Select visible rows" checked={view.length > 0 && view.every((row, i) => selected.includes(rowId(row, page * pageSize + i)))} onChange={(e) => setSelected((current) => e.target.checked ? [...new Set([...current, ...view.map((row, i) => rowId(row, page * pageSize + i))])] : current.filter((id) => !view.some((row, i) => rowId(row, page * pageSize + i) === id)))} /></th>{shownColumns.map((c) => <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="pb-th-sort" onClick={() => toggleSort(c.key)}>{c.label}<span aria-hidden="true">{sort.key === c.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span></button></th>)}</tr>
          </thead>
          <tbody>
            {view.map((row, i) => (
              <tr key={rowId(row, page * pageSize + i)}>
                <td className="pb-select-cell"><input type="checkbox" aria-label={`Select row ${rowId(row, page * pageSize + i)}`} checked={selected.includes(rowId(row, page * pageSize + i))} onChange={(e) => setSelected((current) => e.target.checked ? [...current, rowId(row, page * pageSize + i)] : current.filter((id) => id !== rowId(row, page * pageSize + i)))} /></td>
                {shownColumns.map((c) => (
                  <td key={c.key} onDoubleClick={() => { if (editableKeys.includes(c.key) && onEdit) { const value = window.prompt(`Update ${c.label}`, String(row[c.key] ?? '')); if (value !== null) onEdit(row, c.key, value); } }} title={editableKeys.includes(c.key) && onEdit ? 'Double-click to edit' : undefined}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 && <tr><td colSpan={shownColumns.length + 1}><EmptyState title="No matching rows" body="Change or clear your search and filters." /></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ borderTop: '1px solid var(--pb-line)' }}>
          <small style={{ color: 'var(--bs-secondary-color)' }}>
            Page {page + 1} of {pages} · {filteredRows.length} of {rows.length} records
          </small>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>‹ Prev</button>
            <button className="btn btn-outline-secondary" disabled={page >= pages - 1} onClick={() => setPage((current) => Math.min(pages - 1, current + 1))}>Next ›</button>
          </div>
        </div>
    </div>
  );
}

/* ---------- Card wrapper ---------- */
export function Panel({ title, actions, children, pad = true, className = '' }) {
  return (
    <div className={`pb-card h-100 ${className}`}>
      {title && (
        <div className="pb-card-head">
          <strong style={{ color: 'var(--bs-emphasis-color)', fontSize: '.95rem' }}>{title}</strong>
          {actions}
        </div>
      )}
      {pad ? <div className="pb-card-body">{children}</div> : children}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon = '◌', title, body }) {
  return (
    <div className="pb-empty">
      <span className="ico">{icon}</span>
      <div style={{ color: 'var(--bs-emphasis-color)', fontWeight: 600 }}>{title}</div>
      {body && <div className="mt-1" style={{ fontSize: '.88rem' }}>{body}</div>}
    </div>
  );
}

/* ---------- Lightweight bar chart (CSS-based, no deps) ---------- */
export function BarChart({ data, format = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="pb-bars">
      {data.map((d) => (
        <div className="pb-bar-col" key={d.label}>
          <span className="pb-bar-value">{format(d.value)}</span>
          <div
            className="pb-bar"
            style={{ height: `${Math.max(4, Math.round((d.value / max) * 100))}%`, background: d.color ? `linear-gradient(180deg, ${d.color}, ${d.color}99)` : undefined }}
            title={`${d.label}: ${format(d.value)}`}
          />
          <span className="pb-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- CSV export (works fully client-side) ---------- */
export function ExportCSVButton({ filename, columns, rows, label = 'Export CSV' }) {
  const download = () => {
    const esc = (v) => JSON.stringify(v ?? '');
    const csv = [
      columns.map((c) => esc(c.label)).join(','),
      ...rows.map((r) => columns.map((c) => esc(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <button type="button" className="btn btn-sm btn-outline-primary" onClick={download}>
      ⭳ {label}
    </button>
  );
}

// Safe text coercion: an object passed as a React child is a hard crash (React #31).
export function asText(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

/* ---------- Relative time ---------- */
export function RelativeTime({ iso }) {
  if (!iso) return <span title="">—</span>;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return <span>—</span>;
  const seconds = Math.round((Date.now() - then) / 1000);
  const abs = Math.abs(seconds);
  const label = abs < 45 ? 'just now'
    : abs < 3600 ? `${Math.round(seconds / 60)}m ago`
    : abs < 86400 ? `${Math.round(seconds / 3600)}h ago`
    : `${Math.round(seconds / 86400)}d ago`;
  return <span title={new Date(iso).toISOString()}>{label}</span>;
}

/* ---------- Loading skeletons ---------- */
export function SkeletonRows({ rows = 5, cols = 5 }) {
  return (
    <div className="pb-skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="pb-skeleton-row" key={r}>
          {Array.from({ length: cols }).map((__, c) => <span className="pb-skeleton-cell" key={c} />)}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 200 }) {
  return <div className="pb-card pb-skeleton pb-skeleton-card" style={{ height }} aria-hidden="true" />;
}

/* ---------- Error state with retry ---------- */
export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="pb-empty" role="alert">
      <span className="ico">⚠</span>
      <div style={{ color: 'var(--bs-emphasis-color)', fontWeight: 600 }}>{title}</div>
      {message && <div className="mt-1" style={{ fontSize: '.88rem' }}>{asText(message)}</div>}
      {onRetry && <button type="button" className="btn btn-sm btn-outline-primary mt-3" onClick={onRetry}>Try again</button>}
    </div>
  );
}

/* ---------- Export helpers (client-side only) ---------- */
function cellValue(row, column) {
  if (!column) return '';
  if (typeof column.value === 'function') {
    try { const v = column.value(row); return v === null || v === undefined ? '' : v; } catch { return ''; }
  }
  const v = row ? row[column.key] : '';
  return v === null || v === undefined ? '' : v;
}

export function toCSV(columns = [], rows = []) {
  const esc = (v) => JSON.stringify(v === null || v === undefined ? '' : String(v));
  const head = columns.map((c) => esc(c.label ?? c.key)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(cellValue(r, c))).join(',')).join('\r\n');
  return body ? `${head}\r\n${body}` : head;
}

export function toExcelHTML(columns = [], rows = [], title = 'export') {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const head = columns.map((c) => `<th>${esc(c.label ?? c.key)}</th>`).join('');
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${esc(cellValue(r, c))}</td>`).join('')}</tr>`).join('');
  return `<html><head><meta charset="utf-8" /><title>${esc(title)}</title></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function ExportButtons({ filename = 'export', columns = [], rows = [], label = 'Export' }) {
  return (
    <div className="btn-group btn-group-sm">
      <button type="button" className="btn btn-outline-secondary"
        onClick={() => downloadFile(`${filename}.csv`, toCSV(columns, rows), 'text/csv;charset=utf-8')}>⭳ {label} CSV</button>
      <button type="button" className="btn btn-outline-secondary"
        onClick={() => downloadFile(`${filename}.xls`, toExcelHTML(columns, rows, filename), 'application/vnd.ms-excel')}>⭳ {label} Excel</button>
    </div>
  );
}

/* ---------- Debounce hook ---------- */
export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
