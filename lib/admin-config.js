import fs from 'node:fs';
import path from 'node:path';
import { getPool, postgresEnabled } from './db';

const DIR = process.env.PB_DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'admin-config.json');

function readLocal() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

export async function getAdminConfig(key, fallback = null) {
  if (postgresEnabled()) {
    const { rows } = await getPool().query('SELECT value FROM pb_admin_config WHERE config_key = $1', [key]);
    return rows[0]?.value ?? fallback;
  }
  return readLocal()[key] ?? fallback;
}

export async function setAdminConfig(key, value) {
  if (postgresEnabled()) {
    const { rows } = await getPool().query(
      `INSERT INTO pb_admin_config (config_key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (config_key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING value`,
      [key, value]
    );
    return rows[0].value;
  }
  fs.mkdirSync(DIR, { recursive: true });
  const values = readLocal();
  values[key] = value;
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(values), 'utf8');
  fs.renameSync(tmp, FILE);
  return value;
}

export async function deleteAdminConfig(key) {
  if (postgresEnabled()) {
    await getPool().query('DELETE FROM pb_admin_config WHERE config_key = $1', [key]);
    return;
  }
  fs.mkdirSync(DIR, { recursive: true });
  const values = readLocal();
  delete values[key];
  fs.writeFileSync(FILE, JSON.stringify(values), 'utf8');
}
