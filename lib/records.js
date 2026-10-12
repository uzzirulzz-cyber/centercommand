// ============================================================
// Record queries for the module workspace and the data grid.
//
// Reads the SAME store the connectors write into (pb_records / records.json),
// so every grid, total and export is derived from synced application data —
// never from a fixture that pretends to be live.
//
// Server-side search, sort and pagination are implemented for PostgreSQL so a
// large dataset never has to travel to the browser.
// ============================================================
import { readJSON } from './store';
import { getPool, postgresEnabled } from './db';

const SORTS = new Set(['asc', 'desc']);

/** Fields we never ship to the grid, whatever the upstream payload contains. */
const REDACTED = new Set(['password', 'passwordHash', 'mfaSecret', 'secret', 'token', 'apiKey', 'accessToken', 'refreshToken']);

function redact(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (REDACTED.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function compareRows(a, b, field) {
  const av = a?.[field];
  const bv = b?.[field];
  if (av === bv) return 0;
  if (av === undefined || av === null) return 1;
  if (bv === undefined || bv === null) return -1;
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
}

function matches(row, needle) {
  if (!needle) return true;
  const n = needle.toLowerCase();
  for (const v of Object.values(row || {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') continue;
    if (String(v).toLowerCase().includes(n)) return true;
  }
  return false;
}

/**
 * Query one or more applications' records.
 * Returns { rows, total, page, perPage, pages, apps, source }.
 */
export async function queryRecords({
  apps = [],
  search = '',
  sort = null,
  dir = 'desc',
  page = 1,
  perPage = 25,
  filters = {},
  maxPerPage = 200,
} = {}) {
  const list = Array.isArray(apps) ? apps.filter(Boolean) : [];
  if (!list.length) {
    return { rows: [], total: 0, page: 1, perPage, pages: 0, apps: [], source: 'none' };
  }
  const safePerPage = Math.min(maxPerPage, Math.max(5, Number(perPage) || 25));
  const safePage = Math.max(1, Number(page) || 1);
  const direction = SORTS.has(String(dir)) ? String(dir) : 'desc';

  if (postgresEnabled()) {
    const pool = getPool();
    const params = [list];
    const where = ['app = ANY($1::text[])'];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(source_id ILIKE $${params.length} OR data::text ILIKE $${params.length})`);
    }
    for (const [key, value] of Object.entries(filters || {})) {
      if (value === undefined || value === null || value === '') continue;
      params.push(String(value));
      where.push(`data ->> $${params.length - 1} = $${params.length}`);
    }
    const orderBy = sort
      ? `data ->> '${String(sort).replace(/[^A-Za-z0-9_]/g, '')}' ${direction.toUpperCase()} NULLS LAST`
      : 'source_id ASC';

    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM pb_records WHERE ${where.join(' AND ')}`, params);
    const total = countRes.rows[0]?.total || 0;
    const offset = (safePage - 1) * safePerPage;
    const rowsRes = await pool.query(
      `SELECT app, source_id, data FROM pb_records
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, safePerPage, offset]
    );
    return {
      rows: rowsRes.rows.map((r) => redact({ ...r.data, app: r.app, sourceId: r.source_id })),
      total,
      page: safePage,
      perPage: safePerPage,
      pages: Math.ceil(total / safePerPage),
      apps: list,
      source: 'postgres',
    };
  }

  // JSON-file fallback (local development).
  const db = readJSON('records.json', {});
  let all = [];
  for (const app of list) {
    const bucket = db[app] || {};
    for (const row of Object.values(bucket)) all.push(redact({ ...row, app }));
  }
  if (search) all = all.filter((r) => matches(r, search));
  for (const [key, value] of Object.entries(filters || {})) {
    if (value === undefined || value === null || value === '') continue;
    all = all.filter((r) => String(r?.[key]) === String(value));
  }
  if (sort) {
    all.sort((a, b) => (direction === 'asc' ? compareRows(a, b, sort) : compareRows(b, a, sort)));
  }
  const total = all.length;
  const start = (safePage - 1) * safePerPage;
  return {
    rows: all.slice(start, start + safePerPage),
    total,
    page: safePage,
    perPage: safePerPage,
    pages: Math.ceil(total / safePerPage),
    apps: list,
    source: 'json',
  };
}

/** Distinct values for a field — used to build real filter dropdowns. */
export async function distinctValues(apps = [], field) {
  const { rows } = await queryRecords({ apps, perPage: 200, maxPerPage: 200 });
  const out = new Set();
  for (const r of rows) {
    const v = r?.[field];
    if (v !== undefined && v !== null && v !== '') out.add(String(v));
  }
  return [...out].sort();
}

/** Every non-empty field name present in a record set, for dynamic columns. */
export function discoverKeys(rows = []) {
  const out = new Set();
  for (const r of rows.slice(0, 50)) {
    for (const k of Object.keys(r || {})) {
      if (REDACTED.has(k)) continue;
      if (k === 'syncedAt') continue;
      out.add(k);
    }
  }
  return [...out];
}

export { REDACTED };
