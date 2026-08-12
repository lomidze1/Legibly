import { describe, expect, it } from 'vitest';

import type { ApiHandler } from '../src/lib/http';
import {
  AUTH_RATE_LIMIT,
  bucketKeyFor,
  checkRateLimit,
  withRateLimit,
  type BumpBucket,
} from '../src/middleware/rateLimit';
import { fakeResponse } from './helpers';

const WINDOW_MS = 600_000; // 10 minutes
const options = { scope: 'auth', limit: 3, windowMs: WINDOW_MS };

/** Stands in for the Postgres counter: same contract, no database. */
function fakeStore(): { bump: BumpBucket; buckets: Map<string, { hits: number; expiresAt: Date }> } {
  const buckets = new Map<string, { hits: number; expiresAt: Date }>();
  const bump: BumpBucket = async (bucketKey, expiresAt) => {
    const existing = buckets.get(bucketKey);
    const hits = (existing?.hits ?? 0) + 1;
    buckets.set(bucketKey, { hits, expiresAt });
    return hits;
  };
  return { bump, buckets };
}

describe('checkRateLimit', () => {
  it('allows calls up to the limit and blocks the one after', async () => {
    const { bump } = fakeStore();
    const now = 1_000_000;

    for (let i = 1; i <= options.limit; i += 1) {
      const result = await checkRateLimit('1.2.3.4', options, bump, now);
      expect(result.allowed).toBe(true);
      expect(result.hits).toBe(i);
    }

    const blocked = await checkRateLimit('1.2.3.4', options, bump, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.hits).toBe(options.limit + 1);
  });

  it('keeps separate callers in separate buckets', async () => {
    const { bump } = fakeStore();
    const now = 1_000_000;

    await checkRateLimit('1.2.3.4', options, bump, now);
    await checkRateLimit('1.2.3.4', options, bump, now);
    const other = await checkRateLimit('5.6.7.8', options, bump, now);

    expect(other.hits).toBe(1);
    expect(other.allowed).toBe(true);
  });

  it('keeps separate scopes in separate buckets', async () => {
    const { bump } = fakeStore();
    const now = 1_000_000;

    await checkRateLimit('1.2.3.4', options, bump, now);
    const judge = await checkRateLimit('1.2.3.4', { ...options, scope: 'judge' }, bump, now);

    expect(judge.hits).toBe(1);
  });

  it('starts a fresh count in the next window', async () => {
    const { bump } = fakeStore();
    const now = 1_000_000;
    const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;

    for (let i = 0; i <= options.limit; i += 1) {
      await checkRateLimit('1.2.3.4', options, bump, now);
    }

    const nextWindow = await checkRateLimit('1.2.3.4', options, bump, windowStart + WINDOW_MS);
    expect(nextWindow.hits).toBe(1);
    expect(nextWindow.allowed).toBe(true);
  });

  it('reports when the window closes', async () => {
    const { bump } = fakeStore();
    const windowStart = 1_200_000; // an exact multiple of WINDOW_MS
    const now = windowStart + 30_000;

    const result = await checkRateLimit('1.2.3.4', options, bump, now);
    expect(result.resetAt).toBe(windowStart + WINDOW_MS);
    expect(result.retryAfterSeconds).toBe((WINDOW_MS - 30_000) / 1000);
  });

  it('never asks the caller to retry in zero seconds', async () => {
    const { bump } = fakeStore();
    const now = 1_200_000 + WINDOW_MS - 1;

    const result = await checkRateLimit('1.2.3.4', options, bump, now);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('gives the stored bucket the window end as its expiry', async () => {
    const { bump, buckets } = fakeStore();
    const windowStart = 1_200_000;

    await checkRateLimit('1.2.3.4', options, bump, windowStart + 5);

    const stored = buckets.get(bucketKeyFor('auth', '1.2.3.4', windowStart));
    expect(stored?.expiresAt.getTime()).toBe(windowStart + WINDOW_MS);
  });

  it('treats a missing hit count from the store as the first hit', async () => {
    const noRows: BumpBucket = async () => 1;
    const result = await checkRateLimit('1.2.3.4', options, noRows, 1_000_000);
    expect(result.hits).toBe(1);
    expect(result.allowed).toBe(true);
  });
});

describe('withRateLimit', () => {
  const ok: ApiHandler = (_req, res) => {
    res.status(200).json({ ok: true });
  };

  it('passes the request through while under the limit', async () => {
    const { bump } = fakeStore();
    const res = fakeResponse();

    await withRateLimit(ok, options, bump)({ method: 'GET', headers: { 'x-real-ip': '1.2.3.4' } }, res);

    expect(res.statusCode).toBe(200);
  });

  it('answers 429 with Retry-After once the limit is passed', async () => {
    const { bump } = fakeStore();
    const req = { method: 'GET', headers: { 'x-real-ip': '1.2.3.4' } };
    const limited = withRateLimit(ok, options, bump);

    for (let i = 0; i < options.limit; i += 1) {
      await limited(req, fakeResponse());
    }

    const res = fakeResponse();
    await limited(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ success: false, error: 'rate_limited' });
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('does not run the handler once a caller is limited', async () => {
    const { bump } = fakeStore();
    let ran = 0;
    const counting: ApiHandler = (_req, res) => {
      ran += 1;
      res.status(200).json({ ok: true });
    };
    const req = { method: 'GET', headers: { 'x-real-ip': '1.2.3.4' } };
    const limited = withRateLimit(counting, options, bump);

    for (let i = 0; i < options.limit + 2; i += 1) {
      await limited(req, fakeResponse());
    }

    expect(ran).toBe(options.limit);
  });

  it('buckets by the address the proxy vouches for, not the one the caller sent', async () => {
    const { bump, buckets } = fakeStore();
    const res = fakeResponse();

    await withRateLimit(ok, options, bump)(
      { method: 'GET', headers: { 'x-vercel-forwarded-for': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' } },
      res,
    );

    expect([...buckets.keys()].some((key) => key.includes('9.9.9.9'))).toBe(true);
    expect([...buckets.keys()].some((key) => key.includes('1.1.1.1'))).toBe(false);
  });

  it('leaves the plugin room to poll for three minutes and still bites a script', () => {
    // 2-second poll for 3 minutes is ~90 requests; the ceiling is well above it.
    expect(AUTH_RATE_LIMIT.limit).toBe(300);
    expect(AUTH_RATE_LIMIT.windowMs).toBe(600_000);
  });
});
