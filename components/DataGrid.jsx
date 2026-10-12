'use client';

// ============================================================
// Enterprise data grid.
//
// Real functionality, no decorative controls:
//   column resize · reorder · visibility · sort · per-column filter
//   global search · server-side pagination · saved views · row selection
//   bulk actions · inline edit (writes through to the source application)
//   CSV + Excel export · density · sticky header · responsive card mode
//
// Data comes in from a loader function so the grid works against either a
// server-paginated endpoint or an already-loaded array.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState, ErrorState, SkeletonRows, downloadFile, toCSV, toExcelHTML, useDebounced } from './ui';

const DENSITY = { compact: '0.3rem', normal: '0.6rem', relaxed: '0.95rem' };

/* ------------------------------ default cell ------------------------------ */
function defaultCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 60);
  return String(value);
}

export default function DataGrid({
  columns: columnDefs = [],
  rows: staticRows = null,
  loader = null,                 // async ({ page, perPage, search, sort, dir, filters }) => { rows, total, pages }
  rowKey = (r, i) => r.sourceId || r.id || r.sku || i,
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 25,
  searchable = true,
  searchPlaceholder = 'Search…',
  selectable = false,
  bulkActions = [],
  onInlineEdit = null,           // async (row, field, value) => { ok, error }
  editableFields = [],
  emptyTitle = 'No records',
  emptyBody = null,
  errorTitle = 'Could not load records',
  storageKey = null,             // remembers visibility/density/columns locally
  toolbarExtra = null,
  title = null,
  serverSide = false,
  filters: filterDefs = [],
  onRowClick = null,
  autoHeight = false,
}) {
  const [rows, setRows] = useState(staticRows || []);
  const [total, setTotal] = useState(staticRows ? staticRows.length : 0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(null);
  const [dir, setDir] = useState('asc');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(Boolean(loader));
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [density, setDensity] = useState('normal');
  const [hidden, setHidden] = useState(() => new Set());
  const [order, setOrder] = useState(null);
  const [savedViews, setSavedViews] = useState([]);
  const [editing, setEditing] = useState(null);      // { key, field, value }
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState(null);
  const widths = useRef({});

  const debouncedSearch = useDebounced(search, 250);

  /* ---------- persisted preferences ---------- */
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`pb_grid_${storageKey}`);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.hidden)) setHidden(new Set(saved.hidden));
      if (Array.isArray(saved.order)) setOrder(saved.order);
      if (saved.density) setDensity(saved.density);
      if (Array.isArray(saved.views)) setSavedViews(saved.views);
      if (Number.isFinite(saved.perPage)) setPerPage(saved.perPage);
    } catch { /* a corrupt preference must never break the grid */ }
  }, [storageKey]);

  const persist = useCallback((patch) => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`pb_grid_${storageKey}`);
      const cur = raw ? JSON.parse(raw) : {};
      localStorage.setItem(`pb_grid_${storageKey}`, JSON.stringify({ ...cur, ...patch }));
    } catch { /* ignore */ }
  }, [storageKey]);

  /* ---------- column model ---------- */
  const allColumns = useMemo(
    () => columnDefs.map((c) => ({
      ...c,
      key: String(c.key),
      label: c.label || c.key,
      minWidth: c.minWidth || 90,
      align: c.align || 'left',
      editable: editableFields.includes(c.key),
    })),
    [columnDefs, editableFields]
  );

  const orderedColumns = useMemo(() => {
    if (!order) return allColumns;
    const byKey = new Map(allColumns.map((c) => [c.key, c]));
    const out = order.map((k) => byKey.get(k)).filter(Boolean);
    for (const c of allColumns) if (!out.some((o) => o.key === c.key)) out.push(c);
    return out;
  }, [allColumns, order]);

  const visibleColumns = useMemo(() => orderedColumns.filter((c) => !hidden.has(c.key)), [orderedColumns, hidden]);

  /* ---------- data loading ---------- */
  const load = useCallback(async () => {
    if (!loader) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loader({
        page: page + 1,
        perPage,
        search: debouncedSearch,
        sort,
        dir,
        filters,
      });
      setRows(res?.rows || []);
      setTotal(res?.total ?? (res?.rows || []).length);
      setPages(res?.pages || 1);
    } catch (e) {
      setError(e?.message || 'Request failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [loader, page, perPage, debouncedSearch, sort, dir, filters]);

  useEffect(() => { load(); }, [load]);

  /* ---------- client-side pipeline (when no loader is supplied) ---------- */
  const clientRows = useMemo(() => {
    if (loader || !staticRows) return [];
    let out = [...staticRows];
    if (debouncedSearch) {
      const n = debouncedSearch.toLowerCase();
      out = out.filter((r) => visibleColumns.some((c) => defaultCell(r[c.key]).toLowerCase().includes(n)));
    }
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue;
      out = out.filter((r) => String(r[k]) === String(v));
    }
    if (sort) {
      out.sort((a, b) => {
        const av = a[sort], bv = b[sort];
        if (av === bv) return 0;
        if (av === undefined || av === null) return 1;
        if (bv === undefined || bv === null) return -1;
        const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return dir === 'asc' ? c : -c;
      });
    }
    return out;
  }, [loader, staticRows, debouncedSearch, filters, sort, dir, visibleColumns]);

  const displayRows = loader ? rows : (serverSide ? rows : clientRows);
  const displayTotal = loader || serverSide ? total : clientRows.length;
  const displayPages = loader || serverSide ? pages : Math.max(1, Math.ceil(clientRows.length / perPage));
  const pagedRows = loader || serverSide ? displayRows : clientRows.slice(page * perPage, page * perPage + perPage);

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [debouncedSearch, filters, perPage, sort, dir]);

  /* ---------- selection ---------- */
  const selectedRows = useMemo(
    () => pagedRows.filter((r, i) => selected.has(String(rowKey(r, i)))),
    [pagedRows, selected, rowKey]
  );
  const allSelected = pagedRows.length > 0 && selectedRows.length === pagedRows.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(pagedRows.map((r, i) => String(rowKey(r, i)))));
  };

  /* ---------- export ---------- */
  const exportColumns = () => visibleColumns.map((c) => ({
    key: c.key,
    label: c.label,
    value: (row) => (typeof c.value === 'function' ? c.value(row) : defaultCell(row[c.key])),
  }));
  const exportRows = selectedRows.length ? selectedRows : pagedRows;

  /* ---------- saved views ---------- */
  const saveView = () => {
    const name = window.prompt('Name this view');
    if (!name) return;
    const views = [...savedViews.filter((v) => v.name !== name), {
      name: name.slice(0, 40),
      hidden: [...hidden],
      order: orderedColumns.map((c) => c.key),
      density,
      filters,
      perPage,
    }].slice(-10);
    setSavedViews(views);
    persist({ views });
  };

  const applyView = (view) => {
    setHidden(new Set(view.hidden || []));
    setOrder(view.order || null);
    setDensity(view.density || 'normal');
    setFilters(view.filters || {});
    if (Number.isFinite(view.perPage)) setPerPage(view.perPage);
  };

  const removeView = (name) => {
    const views = savedViews.filter((v) => v.name !== name);
    setSavedViews(views);
    persist({ views });
  };

  /* ---------- column resize / reorder ---------- */
  const startResize = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.currentTarget.parentElement;
    const startX = e.clientX;
    const startW = th.getBoundingClientRect().width;
    const onMove = (ev) => {
      const w = Math.max(60, startW + (ev.clientX - startX));
      widths.current[key] = w;
      th.style.width = `${w}px`;
      th.style.minWidth = `${w}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const moveColumn = (key, delta) => {
    const keys = orderedColumns.map((c) => c.key);
    const i = keys.indexOf(key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    setOrder(keys);
    persist({ order: keys });
  };

  const toggleSort = (key) => {
    if (sort === key) setDir(dir === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setDir('asc'); }
  };

  /* ---------- inline edit ---------- */
  const commitEdit = async () => {
    if (!editing || !onInlineEdit) return;
    const row = pagedRows.find((r, i) => String(rowKey(r, i)) === editing.key);
    if (!row) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await onInlineEdit(row, editing.field, editing.value);
      if (res && res.ok === false) {
        setEditError(res.error || 'The source application rejected the change.');
      } else {
        setRows((prev) => prev.map((r) => (r === row ? { ...r, [editing.field]: editing.value } : r)));
        setEditing(null);
      }
    } catch (e) {
      setEditError(e?.message || 'Write failed');
    } finally {
      setEditBusy(false);
    }
  };

  /* ---------- render ---------- */
  const style = { '--pb-row-pad': DENSITY[density] };

  return (
    <div className="pb-grid" data-mobile="cards" style={style}>
      {/* toolbar */}
      <div className="pb-grid-toolbar">
        {title && <strong className="me-2" style={{ fontSize: '.9rem' }}>{title}</strong>}

        {searchable && (
          <div className="pb-search" style={{ maxWidth: 280 }}>
            <input
              className="form-control form-control-sm"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search records"
            />
          </div>
        )}

        {filterDefs.map((f) => (
          <select
            key={f.key}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={filters[f.key] || ''}
            aria-label={`Filter by ${f.label}`}
            onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
          >
            <option value="">{f.label}: all</option>
            {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        {toolbarExtra}

        <div className="spacer" />

        {selectedRows.length > 0 && (
          <span className="pb-chip pb-chip-primary">{selectedRows.length} selected</span>
        )}
        {bulkActions.map((a) => (
          <button
            key={a.label}
            className={`btn btn-sm ${a.tone ? `btn-${a.tone}` : 'btn-outline-secondary'}`}
            disabled={!selectedRows.length}
            onClick={() => a.run(selectedRows, () => { setSelected(new Set()); load(); })}
          >
            {a.icon && <i className={`bi ${a.icon} me-1`} aria-hidden="true" />}
            {a.label}
          </button>
        ))}

        {/* density */}
        <div className="dropdown">
          <button className="pb-icon-btn" data-bs-toggle="dropdown" aria-label="Row density" title="Row density">
            <i className="bi bi-list-ul" aria-hidden="true" />
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            {Object.keys(DENSITY).map((d) => (
              <li key={d}>
                <button className={`dropdown-item ${density === d ? 'active' : ''}`}
                  onClick={() => { setDensity(d); persist({ density: d }); }}>
                  {d}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* saved views */}
        <div className="dropdown">
          <button className="pb-icon-btn" data-bs-toggle="dropdown" aria-label="Saved views" title="Saved views">
            <i className="bi bi-bookmark" aria-hidden="true" />
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li><h6 className="dropdown-header">Saved views</h6></li>
            {savedViews.length === 0 && <li><span className="dropdown-item-text small text-muted">None yet</span></li>}
            {savedViews.map((v) => (
              <li key={v.name} className="d-flex align-items-center">
                <button className="dropdown-item" onClick={() => applyView(v)}>{v.name}</button>
                <button className="pb-icon-btn me-2" style={{ width: 22, height: 22 }} aria-label={`Delete view ${v.name}`}
                  onClick={() => removeView(v.name)}>✕</button>
              </li>
            ))}
            <li><hr className="dropdown-divider" /></li>
            <li><button className="dropdown-item" onClick={saveView}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />Save current view
            </button></li>
          </ul>
        </div>

        {/* column picker */}
        <div className="dropdown">
          <button className="pb-icon-btn" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-label="Choose columns" title="Choose columns">
            <i className="bi bi-layout-three-columns" aria-hidden="true" />
          </button>
          <div className="dropdown-menu dropdown-menu-end pb-col-picker">
            <h6 className="dropdown-header">Columns</h6>
            {orderedColumns.map((c, i) => (
              <div className="d-flex align-items-center gap-1" key={c.key}>
                <label className="flex-grow-1 mb-0">
                  <input
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={!hidden.has(c.key)}
                    onChange={() => {
                      const next = new Set(hidden);
                      if (next.has(c.key)) next.delete(c.key); else next.add(c.key);
                      setHidden(next);
                      persist({ hidden: [...next] });
                    }}
                  />
                  {c.label}
                </label>
                <button className="pb-icon-btn" style={{ width: 22, height: 22 }} disabled={i === 0}
                  aria-label={`Move ${c.label} left`} onClick={() => moveColumn(c.key, -1)}>‹</button>
                <button className="pb-icon-btn" style={{ width: 22, height: 22 }} disabled={i === orderedColumns.length - 1}
                  aria-label={`Move ${c.label} right`} onClick={() => moveColumn(c.key, 1)}>›</button>
              </div>
            ))}
          </div>
        </div>

        {/* export */}
        <div className="dropdown">
          <button className="pb-icon-btn" data-bs-toggle="dropdown" aria-label="Export" title="Export">
            <i className="bi bi-download" aria-hidden="true" />
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li><h6 className="dropdown-header">
              {selectedRows.length ? `${selectedRows.length} selected` : `${exportRows.length} on this page`}
            </h6></li>
            <li><button className="dropdown-item" onClick={() => downloadFile(toCSV(exportColumns(), exportRows), `${storageKey || 'export'}.csv`, 'text/csv;charset=utf-8')}>
              <i className="bi bi-filetype-csv me-2" aria-hidden="true" />Export CSV
            </button></li>
            <li><button className="dropdown-item" onClick={() => downloadFile(toExcelHTML(exportColumns(), exportRows, storageKey || 'export'), `${storageKey || 'export'}.xls`, 'application/vnd.ms-excel')}>
              <i className="bi bi-filetype-xls me-2" aria-hidden="true" />Export Excel
            </button></li>
          </ul>
        </div>

        <button className="pb-icon-btn" onClick={load} aria-label="Refresh" title="Refresh">
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
        </button>
      </div>

      {/* body */}
      {loading ? (
        <div className="p-3"><SkeletonRows rows={6} /></div>
      ) : error ? (
        <ErrorState title={errorTitle} message={error} onRetry={load} />
      ) : pagedRows.length === 0 ? (
        <EmptyState icon="◌" title={emptyTitle} body={emptyBody} />
      ) : (
        <>
          <div className="pb-grid-scroll" style={autoHeight ? undefined : { maxHeight: '68vh' }}>
            <table className="table table-hover align-middle" style={{ '--pb-row-pad': DENSITY[density] }}>
              <thead>
                <tr>
                  {selectable && (
                    <th style={{ width: 38 }} className="sticky">
                      <input type="checkbox" className="form-check-input" checked={allSelected}
                        onChange={toggleAll} aria-label="Select all rows" />
                    </th>
                  )}
                  {visibleColumns.map((c) => (
                    <th key={c.key} className="sticky"
                      style={{ minWidth: c.minWidth, textAlign: c.align }}>
                      <button className="pb-sort" onClick={() => toggleSort(c.key)}>
                        {c.label}
                        {sort === c.key && <i className={`bi ${dir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`} aria-hidden="true" />}
                      </button>
                      <span className="pb-col-resize" role="separator" aria-hidden="true"
                        onMouseDown={(e) => startResize(e, c.key)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, i) => {
                  const key = String(rowKey(row, i));
                  return (
                    <tr key={key} onClick={onRowClick ? () => onRowClick(row) : undefined}
                      style={onRowClick ? { cursor: 'pointer' } : undefined}>
                      {selectable && (
                        <td data-label="Select">
                          <input type="checkbox" className="form-check-input" checked={selected.has(key)}
                            aria-label="Select row"
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => {
                              const next = new Set(selected);
                              if (next.has(key)) next.delete(key); else next.add(key);
                              setSelected(next);
                            }} />
                        </td>
                      )}
                      {visibleColumns.map((c) => {
                        const isEditing = editing && editing.key === key && editing.field === c.key;
                        return (
                          <td key={c.key} data-label={c.label} style={{ textAlign: c.align }} className={isEditing ? 'pb-editing' : undefined}>
                            {isEditing ? (
                              <input autoFocus value={editing.value}
                                aria-label={`Edit ${c.label}`}
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit();
                                  if (e.key === 'Escape') { setEditing(null); setEditError(null); }
                                }} />
                            ) : (
                              <span
                                role={c.editable ? 'button' : undefined}
                                tabIndex={c.editable ? 0 : undefined}
                                title={c.editable ? 'Click to edit (writes through to the source application)' : undefined}
                                onClick={c.editable ? (e) => {
                                  e.stopPropagation();
                                  setEditing({ key, field: c.key, value: row[c.key] ?? '' });
                                  setEditError(null);
                                } : undefined}
                                onKeyDown={c.editable ? (e) => {
                                  if (e.key === 'Enter') { setEditing({ key, field: c.key, value: row[c.key] ?? '' }); }
                                } : undefined}
                                style={c.editable ? { borderBottom: '1px dashed var(--pb-line-strong)', cursor: 'text' } : undefined}
                              >
                                {c.render ? c.render(row) : defaultCell(row[c.key])}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pb-grid-foot">
            <span>
              {displayTotal === 0 ? 'No records' : (
                <>
                  {page * perPage + 1}–{Math.min((page + 1) * perPage, displayTotal)} of {displayTotal}
                </>
              )}
            </span>
            <div className="d-flex align-items-center gap-2">
              <select className="form-select form-select-sm" style={{ width: 'auto' }} value={perPage}
                aria-label="Rows per page"
                onChange={(e) => { const v = Number(e.target.value); setPerPage(v); persist({ perPage: v }); }}>
                {pageSizeOptions.map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-outline-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
                <button className="btn btn-outline-secondary" disabled>Page {page + 1} / {displayPages}</button>
                <button className="btn btn-outline-secondary" disabled={page >= displayPages - 1} onClick={() => setPage(page + 1)}>›</button>
              </div>
            </div>
          </div>
        </>
      )}

      {editError && (
        <div className="px-3 pb-2">
          <div className="alert alert-danger py-1 px-2 mb-0 small d-flex justify-content-between align-items-center">
            <span>{editError}</span>
            <button className="btn-close btn-sm" aria-label="Dismiss" onClick={() => setEditError(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
