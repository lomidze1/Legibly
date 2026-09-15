import { TOKEN_ERROR_MESSAGE, verifyToken } from '../lib/hmac.js';
import type { ApiRequest, ApiResponse } from '../lib/http.js';
import { SESSION_COOKIE, isFromWebsite, readCookie } from '../lib/webSession.js';

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
 * The website's session cookie, honoured only on a request from the website
 * itself — see lib/webSession.ts for why `Origin` is the gate.
 */
export function websiteUserId(req: ApiRequest, secret: string, now: number, websiteOrigin: string): string | null {
  if (!isFromWebsite(req, websiteOrigin)) return null;
  const token = readCookie(req, SESSION_COOKIE);
  if (token === undefined) return null;

  const result = verifyToken(token, secret, now);
  return result.ok ? result.payload.userId : null;
}

/**
 * Returns the caller's id, or writes 401 and returns null. The failure message
 * is the same whatever went wrong — see `TOKEN_ERROR_MESSAGE`.
 *
 * `websiteOrigin` opts a route in to the website's cookie. A route that leaves
 * it out accepts the plugin's Bearer token and nothing else.
 */
export function requireAuth(
  req: ApiRequest,
  res: ApiResponse,
  secret: string,
  now: number = Date.now(),
  websiteOrigin?: string,
): string | null {
  const userId =
    bearerUserId(req, secret, now) ??
    (websiteOrigin === undefined ? null : websiteUserId(req, secret, now, websiteOrigin));
  if (userId === null) {
    res.status(401).json({ success: false, error: TOKEN_ERROR_MESSAGE });
    return null;
  }
  return userId;
}
