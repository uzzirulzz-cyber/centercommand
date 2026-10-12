import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('Set DATABASE_URL or POSTGRES_URL before running npm run db:migrate.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 8000 });
try {
  const schema = fs.readFileSync(path.join(__dirname, 'postgres-schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('PostgreSQL schema is ready.');
} catch (error) {
  console.error('PostgreSQL schema migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
