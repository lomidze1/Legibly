import { env } from '../../config/env.js';
import { PLUGIN_TOKEN_TTL_SECONDS, signToken } from '../../lib/hmac.js';
import type { ApiHandler } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';

export interface SessionDeps {
  authSecret: string;
  now: () => number;
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
    if (req.method !== undefined && req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

    const userId = requireAuth(req, res, deps.authSecret, deps.now());
    if (userId === null) return;

    res.status(200).json({ success: true, userId });
  };
}

const liveDeps = (): SessionDeps => ({ authSecret: env().authSecret, now: () => Date.now() });

export const refreshHandler: ApiHandler = (req, res) => createRefreshHandler(liveDeps())(req, res);
export const meHandler: ApiHandler = (req, res) => createMeHandler(liveDeps())(req, res);
