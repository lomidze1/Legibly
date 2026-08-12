/**
 * The gate on every admin endpoint.
 *
 * `ADMIN_TOKEN` is required in every environment (see config/env.ts), so unlike
 * w2w's version there is no "open in dev" path — a missing token is a closed
 * door, not an unlocked one.
 */

import { timingSafeEqual } from 'node:crypto';

import type { ApiRequest, ApiResponse } from '../lib/http';

const BEARER_PATTERN = /^Bearer[ ]+(.+)$/i;

function headerValue(req: ApiRequest, name: string): string | undefined {
  const raw = req.headers[name] ?? req.headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function presentedToken(req: ApiRequest): string | undefined {
  // `X-Admin-Token` for curl one-liners, `Authorization: Bearer` for everything
  // that already speaks it — the panel, Postman, a monitoring agent.
  const bespoke = headerValue(req, 'x-admin-token');
  if (bespoke !== undefined) return bespoke;
  return headerValue(req, 'authorization')?.trim().match(BEARER_PATTERN)?.[1];
}

/**
 * A plain `===` leaks how many leading bytes matched through response latency,
 * which is enough to recover a token byte by byte at scale. The length check
 * before `timingSafeEqual` only compares the *caller's* length, which they
 * already know.
 */
export function verifyAdminToken(req: ApiRequest, expected: string): boolean {
  const provided = presentedToken(req);
  if (provided === undefined || expected === '') return false;

  const providedBytes = Buffer.from(provided, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  if (providedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(providedBytes, expectedBytes);
}

/** True when the caller may proceed; otherwise 401 has already been written. */
export function requireAdmin(req: ApiRequest, res: ApiResponse, expected: string): boolean {
  if (verifyAdminToken(req, expected)) return true;
  res.status(401).json({ success: false, error: 'unauthorized' });
  return false;
}
