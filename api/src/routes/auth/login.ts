import { env } from '../../config/env.js';
import { queryParam, redirect, type ApiHandler } from '../../lib/http.js';
import { authStore, type AuthStore } from '../../models/authStore.js';
import {
  buildAuthorizeUrl,
  figmaOAuthConfigOrNull,
  type FigmaOAuthConfig,
} from '../../services/figmaOAuth.js';
import { randomBytes } from 'node:crypto';

/**
 * The plugin's nonce is a bearer credential for the token hand-off, so a short
 * or guessable one is the whole flow's weak point. 32 characters is the floor.
 */
export const PLUGIN_NONCE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

/** Long enough to cover a user reading Figma's consent screen. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface LoginDeps {
  config: FigmaOAuthConfig;
  store: AuthStore;
  makeState: () => string;
  now: () => number;
}

export function createLoginHandler(deps: LoginDeps): ApiHandler {
  return async (req, res) => {
    if (req.method !== undefined && req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

    const nonce = queryParam(req, 'plugin_nonce');
    if (nonce === undefined || !PLUGIN_NONCE_PATTERN.test(nonce)) {
      res.status(400).json({ success: false, error: 'invalid_plugin_nonce' });
      return;
    }

    const state = deps.makeState();
    // Saved *before* the redirect: Figma sends an already-authorised user
    // straight back, and a callback can outrun a write that was not awaited.
    await deps.store.saveOAuthState(state, nonce, new Date(deps.now() + OAUTH_STATE_TTL_MS));

    redirect(res, buildAuthorizeUrl(deps.config, state));
  };
}

export const loginHandler: ApiHandler = (req, res) => {
  // Until Figma's client id and secret are set there is nothing to redirect to.
  // Say so plainly — an uncaught throw here is an opaque 500 in the one place a
  // user has just pressed Connect and is waiting on an explanation.
  const config = figmaOAuthConfigOrNull(env());
  if (config === null) {
    res.status(503).json({ success: false, error: 'oauth_not_configured' });
    return;
  }

  return createLoginHandler({
    config,
    store: authStore,
    makeState: () => randomBytes(16).toString('hex'),
    now: () => Date.now(),
  })(req, res);
};
