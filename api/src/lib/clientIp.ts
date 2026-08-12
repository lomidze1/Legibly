/**
 * Resolving the caller's IP behind Vercel's proxy.
 *
 * `x-forwarded-for` is client-settable, so trusting it blindly would let a
 * caller both slip past an IP allowlist and share one rate-limit bucket with
 * everyone else. Vercel sets `x-vercel-forwarded-for` itself and strips any
 * inbound copy, so that header is preferred; the rest are fallbacks for local
 * development.
 */

export type HeaderBag = Record<string, string | string[] | undefined>;

const HEADER_PRECEDENCE = ['x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for'] as const;

export const UNKNOWN_IP = 'unknown';

/** Longest legal IPv6 text form, including an IPv4-mapped tail. */
const MAX_IP_LENGTH = 45;
const IP_SHAPE = /^[0-9a-f.:]+$/i;

function firstValue(header: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string') return undefined;
  // A forwarding chain is "client, proxy1, proxy2" — the client is leftmost.
  const first = raw.split(',')[0]?.trim();
  return first === undefined || first === '' ? undefined : first;
}

/**
 * This value becomes a rate-limit primary key, so it has to be bounded and
 * IP-shaped. Without that, a caller sending a fresh multi-kilobyte
 * `x-forwarded-for` on every request would land in a new bucket each time —
 * escaping the limit entirely and writing an unbounded row for each attempt.
 * Anything that is not an address is not trusted to identify a caller.
 */
function asIp(value: string | undefined): string | undefined {
  if (value === undefined || value.length > MAX_IP_LENGTH) return undefined;
  return IP_SHAPE.test(value) ? value : undefined;
}

export function clientIpFrom(headers: HeaderBag): string {
  for (const name of HEADER_PRECEDENCE) {
    const value = asIp(firstValue(headers[name]));
    if (value !== undefined) return value;
  }
  return UNKNOWN_IP;
}
