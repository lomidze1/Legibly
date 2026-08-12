import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The pool is module state, so every assertion here has to start from a closed
 * one. `pg` is mocked at the driver seam — no socket is ever opened.
 */

const poolInstances: Array<{ options: unknown; query: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }> = [];

vi.mock('pg', () => {
  class FakePool {
    query = vi.fn(async () => ({ rows: [] as unknown[] }));
    end = vi.fn(async () => undefined);
    constructor(public options: unknown) {
      poolInstances.push(this as unknown as (typeof poolInstances)[number]);
    }
  }
  return { default: { Pool: FakePool } };
});

vi.mock('../src/config/env.js', () => ({
  env: () => ({ databaseUrl: 'postgres://user:pass@host/db' }),
}));

const { closePool, getPool, pingStore, query } = await import('../src/lib/db.js');

beforeEach(() => {
  poolInstances.length = 0;
});

afterEach(async () => {
  await closePool();
});

describe('getPool', () => {
  it('builds the pool from DATABASE_URL, one socket per instance', () => {
    getPool();

    expect(poolInstances).toHaveLength(1);
    expect(poolInstances[0]?.options).toMatchObject({
      connectionString: 'postgres://user:pass@host/db',
      max: 1,
    });
  });

  it('reuses the pool a warm instance already opened', () => {
    expect(getPool()).toBe(getPool());
    expect(poolInstances).toHaveLength(1);
  });

  it('opens a new pool after the old one was closed', async () => {
    const first = getPool();
    await closePool();
    const second = getPool();

    expect(second).not.toBe(first);
    expect(poolInstances).toHaveLength(2);
  });
});

describe('query', () => {
  it('passes the statement and its parameters through, and returns only the rows', async () => {
    const pool = getPool();
    poolInstances[0]!.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

    const rows = await query('SELECT id FROM licenses WHERE figma_user_id = $1', ['u1']);

    expect(rows).toEqual([{ id: 1 }]);
    expect(pool.query).toHaveBeenCalledWith('SELECT id FROM licenses WHERE figma_user_id = $1', ['u1']);
  });

  it('defaults to an empty parameter list rather than undefined', async () => {
    const pool = getPool();
    await query('SELECT 1');

    expect(pool.query).toHaveBeenCalledWith('SELECT 1', []);
  });

  it('lets a store failure propagate — a caller must not read a silent empty result', async () => {
    getPool();
    poolInstances[0]!.query.mockRejectedValueOnce(new Error('connection terminated'));

    await expect(query('SELECT 1')).rejects.toThrow('connection terminated');
  });
});

describe('pingStore', () => {
  it('asks the store a trivial question and reports success', async () => {
    getPool();
    await expect(pingStore()).resolves.toBe(true);
    expect(poolInstances[0]?.query).toHaveBeenCalledWith('SELECT 1', []);
  });

  it('answers false instead of throwing when the store is down', async () => {
    getPool();
    poolInstances[0]!.query.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(pingStore()).resolves.toBe(false);
  });
});

describe('closePool', () => {
  it('ends the pool exactly once, even if called twice', async () => {
    getPool();
    const pool = poolInstances[0]!;

    await closePool();
    await closePool();

    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when no pool was ever opened', async () => {
    await expect(closePool()).resolves.toBeUndefined();
    expect(poolInstances).toHaveLength(0);
  });
});
