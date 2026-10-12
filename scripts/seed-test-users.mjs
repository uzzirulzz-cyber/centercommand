import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  console.error('Refusing to seed test accounts in a production environment.');
  process.exit(1);
}

const dataDir = process.env.PB_DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });
const usersFile = path.join(dataDir, 'users.json');
const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];

const adminEmail = (process.env.ADMIN_EMAIL || 'admin@playbeat.digital').toLowerCase();
const rounds = Math.min(15, Math.max(10, Number(process.env.BCRYPT_ROUNDS || 12)));

const admin = {
  id: crypto.randomUUID(),
  email: adminEmail,
  name: 'Super Admin',
  role: 'Super Admin',
  apps: ['*'],
  passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Password1234!', rounds),
  mfaSecret: process.env.ADMIN_TOTP_SECRET || null,
  disabled: false,
  createdAt: new Date().toISOString(),
};

const readonly = {
  id: crypto.randomUUID(),
  email: 'readonly@playbeat.digital',
  name: 'Read Only User',
  role: 'Read-only',
  apps: ['*'],
  passwordHash: await bcrypt.hash(process.env.SECOND_PASSWORD || 'ReadOnlyPass123!', rounds),
  mfaSecret: null,
  disabled: false,
  createdAt: new Date().toISOString(),
};

for (const u of [admin, readonly]) {
  const i = users.findIndex((x) => x.email === u.email);
  if (i === -1) users.push(u); else users[i] = { ...users[i], ...u };
}

fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
console.log(`test users seeded: ${users.length}`);
