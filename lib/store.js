// ============================================================
// Server-side persistence + the idempotent upsert (README §5).
// Local development uses JSON files; production uses PostgreSQL.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { getPool, postgresEnabled } from './db';

const DIR = process.env.PB_DATA_DIR || path.join(process.cwd(), 'data');

function resolve(name) {
  fs.mkdirSync(DIR, { recursive: true });
  return path.join(DIR, name);
}

export function readJSON(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(resolve(name), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return fallback;
  }
}

export function writeJSON(name, value) {
  const target = resolve(name);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value), 'utf8');
  fs.renameSync(tmp, target); // atomic replace — no half-written file
  return value;
}

/**
 * Idempotent upsert. Running the same sync twice converges on the same state
 * and can never create a duplicate record.
 */
export async function upsertRecords(app, rows, { key = 'sourceId' } = {}) {
  if (postgresEnabled()) {
    const pool = getPool();
    let inserted = 0, updated = 0, rejected = 0;
    const bySourceId = new Map();
    for (const row of rows || []) {
      const sourceId = row?.[key];
      if (!sourceId) { rejected += 1; continue; }
      bySourceId.set(String(sourceId), {
        ...row,
        app,
        sourceId: String(sourceId),
        syncedAt: new Date().toISOString(),
      });
    }
    const records = [...bySourceId.entries()];
    for (let offset = 0; offset < records.length; offset += 500) {
      const batch = records.slice(offset, offset + 500);
      const values = [];
      const placeholders = batch.map(([sourceId, data], index) => {
        const start = index * 3;
        values.push(app, sourceId, data);
        return `($${start + 1}, $${start + 2}, $${start + 3})`;
      });
      const { rows: result } = await pool.query(
        `INSERT INTO pb_records (app, source_id, data)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (app, source_id) DO UPDATE SET data = EXCLUDED.data
         RETURNING (xmax = 0) AS inserted`,
        values
      );
      for (const row of result) {
        if (row.inserted) inserted += 1; else updated += 1;
      }
    }
    const { rows: counts } = await pool.query('SELECT COUNT(*)::int AS stored FROM pb_records WHERE app = $1', [app]);
    return { inserted, updated, rejected, stored: counts[0].stored };
  }

  const db = readJSON('records.json', {});
  db[app] = db[app] || {};
  let inserted = 0, updated = 0, rejected = 0;

  for (const row of rows || []) {
    const sourceId = row?.[key];
    if (!sourceId) { rejected += 1; continue; }        // validation before apply
    if (db[app][sourceId]) updated += 1; else inserted += 1;
    db[app][sourceId] = {
      ...(db[app][sourceId] || {}),
      ...row,
      app,                        // composite key half 1
      sourceId,                   // composite key half 2 — ORIGINAL id, never renumbered
      syncedAt: new Date().toISOString(),
    };
  }

  writeJSON('records.json', db);
  return { inserted, updated, rejected, stored: Object.keys(db[app]).length };
}

export async function allRecords(app) {
  if (postgresEnabled()) {
    const { rows } = await getPool().query('SELECT data FROM pb_records WHERE app = $1 ORDER BY source_id', [app]);
    return rows.map((row) => row.data);
  }
  const db = readJSON('records.json', {});
  return Object.values(db[app] || {});
}

/** Sync bookkeeping shown in the UI (last successful sync per app). */
export async function setSyncState(slug, patch) {
  if (postgresEnabled()) {
    const { rows } = await getPool().query(
      `INSERT INTO pb_sync_state (slug, data)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET data = pb_sync_state.data || EXCLUDED.data
       RETURNING data`,
      [slug, patch]
    );
    return rows[0].data;
  }
  const state = readJSON('sync-state.json', {});
  state[slug] = { ...(state[slug] || {}), ...patch };
  writeJSON('sync-state.json', state);
  return state[slug];
}

export async function getSyncState(slug) {
  if (postgresEnabled()) {
    const { rows } = await getPool().query('SELECT data FROM pb_sync_state WHERE slug = $1', [slug]);
    return rows[0]?.data || null;
  }
  return readJSON('sync-state.json', {})[slug] || null;
}
