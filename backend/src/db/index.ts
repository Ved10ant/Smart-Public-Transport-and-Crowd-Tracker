import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  console.error('[Database Pool Error]:', err.message);
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT 1 as connected');
    return res.rows[0]?.connected === 1;
  } catch (err: any) {
    console.warn(`[DB Connection Notice]: Unable to connect to PostgreSQL at ${config.databaseUrl}. Details: ${err.message}`);
    return false;
  }
}
