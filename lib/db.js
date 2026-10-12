import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let pool;

export function postgresEnabled() {
  if (!DATABASE_URL && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL or POSTGRES_URL must be configured in production');
  }
  return Boolean(DATABASE_URL);
}

export function getPool() {
  if (!DATABASE_URL) {
    postgresEnabled();
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
      allowExitOnIdle: true,
    });
  }
  return pool;
}

export async function withTransaction(operation) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[database] transaction rollback failed', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
