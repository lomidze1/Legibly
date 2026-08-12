/**
 * The plugin's session token. Deliberately not a JWT: there is no header
 * segment and no `alg` field, so there is nothing for a caller to negotiate
 * down. Two parts, `base64url(payload).base64url(hmac-sha256)`.
 *
 * The signature is checked *before* the payload is decoded — an unverified
 * payload is attacker-controlled input and must never reach JSON.parse.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TokenPayload {
  userId: string;
  /** Issued at, epoch seconds. */
  iat: number;
  /** Expires at, epoch seconds. */
  exp: number;
}

export type VerifyFailure = 'malformed' | 'bad_signature' | 'expired';

export type VerifyResult = { ok: true; payload: TokenPayload } | { ok: false; reason: VerifyFailure };

/**
 * The single message every route returns on any token problem. Telling a caller
 * whether the signature or the expiry failed hands them a probe.
 */
export const TOKEN_ERROR_MESSAGE = 'Invalid or expired token';

export const PLUGIN_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function sign(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function signToken(
  userId: string,
  secret: string,
  expirySeconds: number,
  now: number = Date.now(),
): string {
  const issuedAt = Math.floor(now / 1000);
  const payload: TokenPayload = { userId, iat: issuedAt, exp: issuedAt + expirySeconds };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

function decodePayload(payloadB64: string): TokenPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

  const { userId, iat, exp } = parsed as Record<string, unknown>;
  if (typeof userId !== 'string' || userId === '') return null;
  if (!Number.isFinite(iat) || !Number.isFinite(exp)) return null;

  return { userId, iat: iat as number, exp: exp as number };
}

export function verifyToken(token: string, secret: string, now: number = Date.now()): VerifyResult {
  if (typeof token !== 'string') return { ok: false, reason: 'malformed' };

  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };

  const [payloadB64, signature] = parts as [string, string];
  if (payloadB64 === '' || signature === '') return { ok: false, reason: 'malformed' };

  const expected = sign(payloadB64, secret);
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(signature);
  // timingSafeEqual throws on a length mismatch, so the lengths are compared first.
  if (expectedBytes.length !== actualBytes.length) return { ok: false, reason: 'bad_signature' };
  if (!timingSafeEqual(expectedBytes, actualBytes)) return { ok: false, reason: 'bad_signature' };

  const payload = decodePayload(payloadB64);
  if (payload === null) return { ok: false, reason: 'malformed' };

  if (payload.exp <= Math.floor(now / 1000)) return { ok: false, reason: 'expired' };

  return { ok: true, payload };
}
