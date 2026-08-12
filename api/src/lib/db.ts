/**
 * Postgres access. The pool is created lazily and kept on the module scope so a
 * warm serverless instance reuses its connection instead of opening a new one
 * per request.
 */

import pg from 'pg';

import { env } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool === null) {
    pool = new Pool({
      connectionString: env().databaseUrl,
      // One socket per instance: serverless concurrency is one request per
      // instance, so a bigger pool only wastes connections on the server.
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[]);
  return result.rows;
}

/** `true` when the store answers a trivial query. Never throws. */
export async function pingStore(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/** Tests and scripts only — serverless instances never close their pool. */
export async function closePool(): Promise<void> {
  if (pool !== null) {
    const closing = pool;
    pool = null;
    await closing.end();
  }
}
