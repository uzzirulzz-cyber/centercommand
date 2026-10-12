// ============================================================
// Keyed configuration store (README §5 persistence, extended).
//
// The Theme Studio, layout builder, CMS drafts, marketing campaigns and system
// settings all persist through here. Local development uses the JSON files in
// lib/store.js; production uses a `pb_config` table that this module creates
// lazily with CREATE TABLE IF NOT EXISTS — so no manual migration step is
// required, and the existing pb_records / pb_users / pb_audit tables are
// untouched.
//
// SECRET RULE: nothing in here ever holds provider credentials, API keys or
// session material. Those live in environment variables only.
// ============================================================
import { readJSON, writeJSON } from './store';
import { getPool, postgresEnabled } from './db';

const PREFIX = 'config::';

let tableReady = false;

async function ensureTable() {
  if (tableReady) return true;
  await getPool().query(
    `CREATE TABLE IF NOT EXISTS pb_config (
       key        text PRIMARY KEY,
       data       jsonb NOT NULL,
       updated_at timestamptz NOT NULL DEFAULT now(),
       updated_by text
     )`
  );
  tableReady = true;
  return true;
}

/** Deep clone that never throws on exotic values. */
function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export async function getConfig(key, fallback = null) {
  if (!key) throw new Error('getConfig requires a key');
  if (postgresEnabled()) {
    await ensureTable();
    const { rows } = await getPool().query('SELECT data FROM pb_config WHERE key = $1', [key]);
    return rows[0] ? rows[0].data : clone(fallback) ?? null;
  }
  const all = readJSON('config.json', {});
  const hit = all[key];
  return hit === undefined ? clone(fallback) ?? null : hit;
}

export async function setConfig(key, value, actor = null) {
  if (!key) throw new Error('setConfig requires a key');
  if (postgresEnabled()) {
    await ensureTable();
    await getPool().query(
      `INSERT INTO pb_config (key, data, updated_at, updated_by)
       VALUES ($1, $2, now(), $3)
       ON CONFLICT (key) DO UPDATE
         SET data = EXCLUDED.data, updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [key, value, actor]
    );
    return value;
  }
  const all = readJSON('config.json', {});
  all[key] = value;
  writeJSON('config.json', all);
  return value;
}

/** Atomic read-modify-write. The mutator must be synchronous and pure. */
export async function updateConfig(key, mutator, fallback = {}, actor = null) {
  const current = (await getConfig(key, fallback)) ?? fallback;
  const next = mutator(clone(current) ?? {});
  await setConfig(key, next, actor);
  return next;
}

export async function listConfigKeys() {
  if (postgresEnabled()) {
    await ensureTable();
    const { rows } = await getPool().query('SELECT key FROM pb_config ORDER BY key');
    return rows.map((r) => r.key);
  }
  const all = readJSON('config.json', {});
  return Object.keys(all).sort();
}

export const CONFIG_KEYS = {
  theme: 'admin.theme',
  layout: 'admin.layout',
  cms: 'cms.content',
  marketing: 'marketing.campaigns',
  settings: 'admin.settings',
  pageHistory: 'cms.history',
};

export { PREFIX };
