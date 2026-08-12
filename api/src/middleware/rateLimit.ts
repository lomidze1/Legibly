/**
 * Fixed-window rate limiting, backed by Postgres.
 *
 * An in-memory counter is worthless here: every serverless invocation may be a
 * fresh instance, so the limit would reset constantly and never actually bind.
 * The counter therefore lives in the store, keyed by scope + caller + window.
 */

import { query } from '../lib/db';

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

/** Drops windows that have already closed. Cheap enough to run opportunistically. */
export async function purgeExpiredBuckets(): Promise<void> {
  await query('DELETE FROM rate_limits WHERE expires_at < now()');
}
