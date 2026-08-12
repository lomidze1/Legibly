/**
 * Fixed-window rate limiting, backed by Postgres.
 *
 * An in-memory counter is worthless here: every serverless invocation may be a
 * fresh instance, so the limit would reset constantly and never actually bind.
 * The counter therefore lives in the store, keyed by scope + caller + window.
 */

import { clientIpFrom } from '../lib/clientIp.js';
import { query } from '../lib/db.js';
import type { ApiHandler } from '../lib/http.js';

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
  const hits = rows[0]?.hits ?? 1;
  // The first caller into a fresh bucket sweeps the closed windows — nothing
  // else deletes them, and the table would only ever grow. Fire-and-forget: a
  // failed sweep is worth a line in the log, not a failed request.
  if (hits === 1) {
    void purgeExpiredBuckets().catch((error) => {
      console.warn(`[rate-limit] sweep failed: ${String(error)}`);
    });
  }
  return hits;
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

/**
 * The judge gets its own bucket. Sharing the auth one meant a burst of judging
 * could spend the budget that the same user's next login or token refresh needs
 * — locking them out of the product to punish them for using it. Cost is capped
 * by the per-licence quota anyway; this only has to bound the request rate.
 */
export const JUDGE_RATE_LIMIT: RateLimitOptions = { scope: 'judge', limit: 60, windowMs: 600_000 };

/**
 * The admin surface. Loose enough for the panel — one page view is a handful of
 * calls and the founder reloads freely — tight enough that guessing a 32-char
 * token by brute force is not a strategy.
 */
export const ADMIN_RATE_LIMIT: RateLimitOptions = { scope: 'admin', limit: 600, windowMs: 600_000 };

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
