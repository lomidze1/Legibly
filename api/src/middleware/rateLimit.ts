/**
 * Fixed-window rate limiting, backed by Postgres.
 *
 * An in-memory counter is worthless here: every serverless invocation may be a
 * fresh instance, so the limit would reset constantly and never actually bind.
 * The counter therefore lives in the store, keyed by scope + caller + window.
 */

import { clientIpFrom } from '../lib/clientIp';
import { query } from '../lib/db';
import type { ApiHandler } from '../lib/http';

export interface RateLimitOptions {
  /** Route family the limit applies to, e.g. "auth". Keeps buckets separate. */
  scope: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  hits: number;
  limit: number;
  /** Epoch ms at which the current window ends. */
  resetAt: number;
  retryAfterSeconds: number;
}

/** Increments a bucket and returns its new hit count. */
export type BumpBucket = (bucketKey: string, expiresAt: Date) => Promise<number>;

export function bucketKeyFor(scope: string, caller: string, windowStart: number): string {
  return `${scope}:${caller}:${windowStart}`;
}

const bumpInStore: BumpBucket = async (bucketKey, expiresAt) => {
  const rows = await query<{ hits: number }>(
    `INSERT INTO rate_limits (bucket_key, hits, expires_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (bucket_key)
     DO UPDATE SET hits = rate_limits.hits + 1
     RETURNING hits`,
    [bucketKey, expiresAt],
  );
  return rows[0]?.hits ?? 1;
};

export async function checkRateLimit(
  caller: string,
  options: RateLimitOptions,
  bump: BumpBucket = bumpInStore,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
  const resetAt = windowStart + options.windowMs;
  const hits = await bump(bucketKeyFor(options.scope, caller, windowStart), new Date(resetAt));

  return {
    allowed: hits <= options.limit,
    hits,
    limit: options.limit,
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

/**
 * 300 per 10 minutes per IP across every auth route. The plugin polls the
 * exchange endpoint every 2 seconds for up to 3 minutes — about 90 requests —
 * so the ceiling has to leave that room and still bite a scripted caller.
 */
export const AUTH_RATE_LIMIT: RateLimitOptions = { scope: 'auth', limit: 300, windowMs: 600_000 };

export function withRateLimit(
  handler: ApiHandler,
  options: RateLimitOptions,
  bump?: BumpBucket,
): ApiHandler {
  return async (req, res) => {
    const result = await checkRateLimit(clientIpFrom(req.headers), options, bump);
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds);
      res.status(429).json({ success: false, error: 'rate_limited' });
      return;
    }
    await handler(req, res);
  };
}

/** Drops windows that have already closed. Cheap enough to run opportunistically. */
export async function purgeExpiredBuckets(): Promise<void> {
  await query('DELETE FROM rate_limits WHERE expires_at < now()');
}
