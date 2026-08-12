/**
 * Fixed-window, per-caller, in-memory.
 *
 * The site has no store, and the waitlist is one unauthenticated POST that
 * costs a Resend contact write plus an outbound email — a script looping over
 * addresses pollutes the launch audience and spends the mail quota, and the
 * honeypot only catches a bot that fills the field in.
 *
 * ⚠️ A serverless instance holds this map for its own lifetime only. It blunts
 * a burst against a warm instance; it does not bind across instances or
 * survive a cold start. That is the proportionate guard for a pre-launch
 * signup form, not a security boundary — move to a shared store if the
 * waitlist ever guards something that matters.
 */

/** Generous for a human — one person signs up once — and useless to a script. */
export const WAITLIST_LIMIT = 10;
export const WAITLIST_WINDOW_MS = 60 * 60 * 1000;

/** Bounds the map itself: an attacker with fresh addresses must not grow it forever. */
const MAX_TRACKED = 10_000;

interface Bucket {
  hits: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Every bucket is inserted with `resetAt = now + WINDOW`, so insertion order is
 * non-decreasing in expiry and the sweep can stop at the first live entry.
 * Rollover deletes before re-inserting to keep that true.
 */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt > now) break;
    buckets.delete(key);
  }
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** Seconds until the window ends. 0 when allowed. */
  retryAfterSeconds: number;
}

export function rateLimit(key: string, now: number = Date.now()): RateLimitVerdict {
  sweep(now);

  const existing = buckets.get(key);
  if (existing === undefined || existing.resetAt <= now) {
    buckets.delete(key);
    if (buckets.size >= MAX_TRACKED) {
      // Oldest expiry first, so this drops the entry closest to expiring anyway.
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    buckets.set(key, { hits: 1, resetAt: now + WAITLIST_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.hits += 1;
  if (existing.hits <= WAITLIST_LIMIT) return { allowed: true, retryAfterSeconds: 0 };

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Test-only: module state outlives a single test otherwise. */
export function resetRateLimit(): void {
  buckets.clear();
}

const HEADER_PRECEDENCE = ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] as const;

export const UNKNOWN_CALLER = "unknown";

/** Longest legal IPv6 text form, including an IPv4-mapped tail. */
const MAX_IP_LENGTH = 45;
const IP_SHAPE = /^[0-9a-f.:]+$/i;

/**
 * `x-forwarded-for` is client-settable, so Vercel's own header wins. The value
 * becomes a map key, so it also has to be bounded and address-shaped: a caller
 * sending a fresh multi-kilobyte header per request would otherwise land in a
 * new bucket every time and grow the map with each attempt.
 */
export function clientIp(headers: Headers): string {
  for (const name of HEADER_PRECEDENCE) {
    const raw = headers.get(name);
    if (raw === null) continue;
    const first = raw.split(",")[0]?.trim();
    if (first === undefined || first === "" || first.length > MAX_IP_LENGTH) continue;
    if (IP_SHAPE.test(first)) return first;
  }
  return UNKNOWN_CALLER;
}
