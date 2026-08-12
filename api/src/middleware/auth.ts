import { TOKEN_ERROR_MESSAGE, verifyToken } from '../lib/hmac.js';
import type { ApiRequest, ApiResponse } from '../lib/http.js';

const BEARER_PATTERN = /^Bearer[ ]+(.+)$/i;

function bearerFrom(req: ApiRequest): string | undefined {
  const raw = req.headers.authorization ?? req.headers.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (typeof header !== 'string') return undefined;

  return header.trim().match(BEARER_PATTERN)?.[1];
}

/** The user id from a valid token, or null. Never reads an id from the request body or query. */
export function bearerUserId(req: ApiRequest, secret: string, now: number = Date.now()): string | null {
  const token = bearerFrom(req);
  if (token === undefined) return null;

  const result = verifyToken(token, secret, now);
  return result.ok ? result.payload.userId : null;
}

/**
 * Returns the caller's id, or writes 401 and returns null. The failure message
 * is the same whatever went wrong — see `TOKEN_ERROR_MESSAGE`.
 */
export function requireAuth(
  req: ApiRequest,
  res: ApiResponse,
  secret: string,
  now: number = Date.now(),
): string | null {
  const userId = bearerUserId(req, secret, now);
  if (userId === null) {
    res.status(401).json({ success: false, error: TOKEN_ERROR_MESSAGE });
    return null;
  }
  return userId;
}
