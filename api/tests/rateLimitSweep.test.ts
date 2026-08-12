/**
 * Nothing deleted a closed window, so `rate_limits` only ever grew — one row per
 * scope + caller + window, forever. The sweep now rides along on the first hit
 * into a fresh bucket, which is the one moment a window is known to have just
 * turned over.
 *
 * This is the only test that reaches the *store-backed* bump; everywhere else
 * injects a fake, which is exactly why the sweep lives there and not in
 * withRateLimit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const issued: string[] = [];
let hits = 0;
let deleteFails = false;

vi.mock('../src/lib/db', () => ({
  query: vi.fn(async (text: string) => {
    issued.push(text);
    if (/DELETE FROM rate_limits/.test(text)) {
      if (deleteFails) throw new Error('connection reset');
      return [];
    }
    if (/INSERT INTO rate_limits/.test(text)) {
      hits += 1;
      return [{ hits }];
    }
    return [];
  }),
}));

const { AUTH_RATE_LIMIT, withRateLimit } = await import('../src/middleware/rateLimit');
const { fakeResponse } = await import('./helpers');

const reached = vi.fn(async (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(200).json({ ok: true });
});

const call = async (ip: string) => {
  const res = fakeResponse();
  await withRateLimit(reached as never, AUTH_RATE_LIMIT)({ method: 'GET', headers: { 'x-real-ip': ip } }, res);
  await Promise.resolve(); // let the fire-and-forget sweep settle
  return res;
};

const deletes = () => issued.filter((t) => /DELETE FROM rate_limits/.test(t));

beforeEach(() => {
  issued.length = 0;
  hits = 0;
  deleteFails = false;
  reached.mockClear();
});

describe('the expired-bucket sweep', () => {
  it('runs on the first hit into a bucket', async () => {
    await call('203.0.113.7');

    expect(deletes()).toHaveLength(1);
    expect(deletes()[0]).toContain('expires_at < now()');
  });

  it('does not run again for the rest of that window', async () => {
    await call('203.0.113.7');
    await call('203.0.113.7');
    await call('203.0.113.7');

    expect(deletes()).toHaveLength(1);
  });

  it('costs the caller nothing when it fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    deleteFails = true;

    const res = await call('203.0.113.7');

    expect(res.statusCode).toBe(200);
    expect(reached).toHaveBeenCalledTimes(1);
    // Not silent, though — a table that never gets swept has to be findable.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('sweep failed');
    warn.mockRestore();
  });
});
