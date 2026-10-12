// ============================================================
// Append-only audit log (README §8.7). JSON Lines, never rewritten.
// PRODUCTION: ship to durable, tamper-evident storage.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getPool, postgresEnabled } from './db';

const DIR = process.env.PB_DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'audit.jsonl');

export async function audit(entry) {
  const record = { id: crypto.randomUUID(), at: new Date().toISOString(), ...entry };
  if (postgresEnabled()) {
    await getPool().query(
      'INSERT INTO pb_audit (id, at, data) VALUES ($1, $2, $3)',
      [record.id, record.at, record]
    );
    return record;
  }
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.appendFileSync(FILE, JSON.stringify(record) + '\n', 'utf8');
  } catch (error) {
    console.error('[audit] write failed', record);
    throw error;
  }
  return record;
}

export async function readAudit(limit = 200) {
  if (postgresEnabled()) {
    const { rows } = await getPool().query(
      'SELECT data FROM pb_audit ORDER BY at DESC LIMIT $1',
      [limit]
    );
    return rows.map((row) => row.data);
  }
  try {
    const raw = fs.readFileSync(FILE, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').slice(-limit).reverse().map((l) => JSON.parse(l));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    console.error('[audit] read failed', error);
    throw error;
  }
}
