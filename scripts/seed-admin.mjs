// ============================================================
// Create (or update) the first admin account.
//   npm run seed:admin
// Reads bootstrap settings from .env.local; stores the admin in PostgreSQL
// when DATABASE_URL is configured, otherwise in the local JSON store.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

// Minimal .env.local loader (no dependency).
const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const email = (process.env.ADMIN_EMAIL || 'admin@playbeat.digital').toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const rounds = Math.min(15, Math.max(10, Number(process.env.BCRYPT_ROUNDS || 12)));

if (!password || password.length < 12) {
  console.error('ADMIN_PASSWORD must be set in .env.local and be at least 12 characters.');
  process.exit(1);
}

const dataDir = process.env.PB_DATA_DIR || path.join(process.cwd(), 'data');
const hash = await bcrypt.hash(password, rounds);

const record = {
  id: crypto.randomUUID(),
  email,
  name: process.env.ADMIN_NAME || 'Super Admin',
  role: process.env.ADMIN_ROLE || 'Super Admin',
  apps: ['*'],
  passwordHash: hash,
  mfaSecret: process.env.ADMIN_TOTP_SECRET || null,
  disabled: false,
  createdAt: new Date().toISOString(),
};

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (connectionString) {
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 8000 });
  try {
    await pool.query(
      `INSERT INTO pb_users (id, email, data) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, data = EXCLUDED.data`,
      [record.id, record.email, record]
    );
    console.log(`Seeded ${email} (role: ${record.role}) into PostgreSQL.`);
  } finally {
    await pool.end();
  }
} else {
  fs.mkdirSync(dataDir, { recursive: true });
  const usersFile = path.join(dataDir, 'users.json');
  const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];
  const i = users.findIndex((u) => u.email === email);
  if (i === -1) users.push(record); else users[i] = { ...users[i], ...record };
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  console.log(`Seeded ${email} (role: ${record.role}) into ${usersFile}`);
}
console.log('Now remove ADMIN_PASSWORD from .env.local.');
