import { env } from '../../config/env.js';
import { PLUGIN_TOKEN_TTL_SECONDS, signToken } from '../../lib/hmac.js';
import type { ApiHandler } from '../../lib/http.js';
import { SESSION_COOKIE, clearedCookieHeader, isFromWebsite, liveWebsiteOrigin } from '../../lib/webSession.js';
import { requireAuth } from '../../middleware/auth.js';

export interface SessionDeps {
  authSecret: string;
  now: () => number;
  /** Opts `me` in to the website's cookie, and lets the website sign out. */
  websiteOrigin?: string;
}

/** Trades a still-valid token for a fresh one. An expired token cannot be refreshed. */
export function createRefreshHandler(deps: SessionDeps): ApiHandler {
  return async (req, res) => {
    if (req.method !== undefined && req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

    const now = deps.now();
    const userId = requireAuth(req, res, deps.authSecret, now);
    if (userId === null) return;

    res.status(200).json({
      success: true,
      token: signToken(userId, deps.authSecret, PLUGIN_TOKEN_TTL_SECONDS, now),
      expiresAt: new Date(now + PLUGIN_TOKEN_TTL_SECONDS * 1000).toISOString(),
    });
  };
}

export function createMeHandler(deps: SessionDeps): ApiHandler {
  return async (req, res) => {
    if (req.method === 'DELETE') {
      // Signing out of the website. Only the website may ask: a page elsewhere
      // that could clear the cookie could sign a buyer out mid-checkout.
      if (deps.websiteOrigin === undefined || !isFromWebsite(req, deps.websiteOrigin)) {
        res.status(403).json({ success: false, error: 'origin_not_allowed' });
        return;
      }
      res.setHeader('Set-Cookie', clearedCookieHeader(SESSION_COOKIE));
      res.status(200).json({ success: true });
      return;
    }

    if (req.method !== undefined && req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

    const userId = requireAuth(req, res, deps.authSecret, deps.now(), deps.websiteOrigin);
    if (userId === null) return;

    res.status(200).json({ success: true, userId });
  };
}

const liveDeps = (): SessionDeps => ({
  authSecret: env().authSecret,
  now: () => Date.now(),
  websiteOrigin: liveWebsiteOrigin(),
});

export const refreshHandler: ApiHandler = (req, res) => createRefreshHandler(liveDeps())(req, res);
export const meHandler: ApiHandler = (req, res) => createMeHandler(liveDeps())(req, res);
