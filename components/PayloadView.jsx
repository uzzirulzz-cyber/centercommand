'use client';
// Renders whatever an admin endpoint actually returned — numbers as stat cards,
// arrays of objects as a table. It never invents a metric that is not in the payload.
import { StatCard, Panel, DataTable, fmtNumber, EmptyState } from './ui';

export function numericLeaves(obj, prefix = '', out = [], depth = 0) {
  if (obj == null || depth > 3) return out;
  if (typeof obj === 'number') { out.push([prefix || 'value', obj]); return out; }
  if (typeof obj === 'boolean') return out;
  if (Array.isArray(obj)) { out.push([`${prefix || 'items'} · rows`, obj.length]); return out; }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) numericLeaves(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
  }
  return out;
}
export function rowsOf(data) {
  if (!data || typeof data !== 'object') return [];
  const found = Object.values(data).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
  return found || [];
}
export function MiniBars({ items, label }) {
  const max = Math.max(...items.map((i) => Math.abs(i[1])), 1);
  if (!items.length) return null;
  return (
    <Panel title={label}>
      {items.map(([k, v]) => (
        <div key={k} className="mb-2">
          <div className="d-flex justify-content-between small"><span>{k}</span><span className="pb-mono">{fmtNumber(v)}</span></div>
          <div style={{ height: 6, background: 'var(--pb-surface-2, rgba(255,255,255,.06))', borderRadius: 99 }}>
            <div style={{ width: `${Math.min(100, (Math.abs(v) / max) * 100)}%`, height: '100%', borderRadius: 99, background: 'var(--pb-accent, #397BFF)' }} />
          </div>
        </div>
      ))}
    </Panel>
  );
}
export default function PayloadView({ data, label = 'Payload', note, maxStats = 8, maxRows = 8, emptyHint }) {
  if (!data) return <Panel><div className="small" style={{ color: 'var(--pb-text-muted)' }}>Loading server payload…</div></Panel>;
  const stats = numericLeaves(data).slice(0, maxStats);
  const rows = rowsOf(data);
  const cols = rows.length
    ? Object.keys(rows[0])
        .filter((k) => !['app', 'sourceId', 'syncedAt'].includes(k))
        .slice(0, 7)
        .map((k) => ({ key: k, label: k, value: (r) => r?.[k], render: (r) => (r?.[k] === undefined || r?.[k] === null || r?.[k] === '' ? '—' : typeof r[k] === 'number' ? fmtNumber(r[k]) : String(r[k])) }))
    : [];
  return (
    <>
      {stats.length > 0 && (
        <div className="row g-3 mb-3">
          {stats.map(([k, v]) => (
            <div className="col-6 col-lg-3" key={k}><StatCard label={k.split('.').slice(-2).join(' · ')} value={fmtNumber(v)} sub={`${label} · server-computed`} /></div>
          ))}
        </div>
      )}
      {rows.length > 0
        ? <Panel pad={false} title={`${label} — ${rows.length} row(s) returned`}><DataTable columns={cols} rows={rows} pageSize={maxRows} /></Panel>
        : stats.length === 0 && <EmptyState icon="◌" title="No values returned yet" body={emptyHint || `${label} returned no numeric fields or rows for the current configuration. Nothing is shown rather than a placeholder figure.`} />}
      {note && <p className="mt-3 mb-0 small" style={{ color: 'var(--pb-text-muted)' }}>{note}</p>}
    </>
  );
}
