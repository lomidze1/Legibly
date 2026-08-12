import { env } from '../../config/env';
import { PLUGIN_TOKEN_TTL_SECONDS, signToken } from '../../lib/hmac';
import { html, queryParam, type ApiHandler } from '../../lib/http';
import { authStore, type AuthStore } from '../../models/authStore';
import { licenseStore, type LicenseStore } from '../../models/License';
import {
  exchangeCodeForToken,
  fetchFigmaUser,
  figmaOAuthConfig,
  type FigmaOAuthConfig,
  type FigmaUser,
} from '../../services/figmaOAuth';

/**
 * How long the finished token waits for the plugin to collect it.
 *
 * ⚠️ The plugin polls for 3 minutes (backend-spec §6.1 step 5), so a login that
 * drags past that parks a token nobody claims. It expires harmlessly, but the
 * user has to press Connect again — Phase 5 should widen the plugin's window to
 * match this one rather than shorten this one.
 */
export const PENDING_AUTH_TTL_MS = 5 * 60 * 1000;

const CONNECTED_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Connected to Figma</title></head>
<body style="font:16px/1.5 system-ui,sans-serif;padding:3rem;text-align:center">
<h1 style="font-size:1.25rem">Connected to Figma</h1>
<p>You can close this tab and go back to Legibly.</p>
<script>setTimeout(function(){window.close()},1000)</script>
</body>
</html>`;

export interface CallbackDeps {
  config: FigmaOAuthConfig;
  store: AuthStore;
  licenses: LicenseStore;
  exchangeCode: (config: FigmaOAuthConfig, code: string) => Promise<string>;
  fetchUser: (accessToken: string) => Promise<FigmaUser>;
  authSecret: string;
  now: () => number;
}

export function createCallbackHandler(deps: CallbackDeps): ApiHandler {
  return async (req, res) => {
    const code = queryParam(req, 'code');
    if (code === undefined) {
      res.status(400).json({ success: false, error: 'missing_code' });
      return;
    }

    const state = queryParam(req, 'state');
    const pending = state === undefined ? null : await deps.store.consumeOAuthState(state);
    if (pending === null) {
      res.status(400).json({ success: false, error: 'Invalid state' });
      return;
    }

    // The Figma access token is used once and dropped — it is never stored.
    const accessToken = await deps.exchangeCode(deps.config, code);
    const user = await deps.fetchUser(accessToken);

    // Before the token is handed out: the plugin asks for the licence the moment
    // it connects, and would otherwise read a row that does not exist yet.
    await deps.licenses.getOrCreate(user.id);
    await deps.licenses.setEmailIfMissing(user.id, user.email);

    const now = deps.now();
    const token = signToken(user.id, deps.authSecret, PLUGIN_TOKEN_TTL_SECONDS, now);
    await deps.store.savePendingAuth(
      pending.pluginNonce,
      token,
      new Date(now + PLUGIN_TOKEN_TTL_SECONDS * 1000),
      new Date(now + PENDING_AUTH_TTL_MS),
    );

    html(res, CONNECTED_PAGE);
  };
}

export const callbackHandler: ApiHandler = (req, res) =>
  createCallbackHandler({
    config: figmaOAuthConfig(env()),
    store: authStore,
    licenses: licenseStore,
    exchangeCode: exchangeCodeForToken,
    fetchUser: fetchFigmaUser,
    authSecret: env().authSecret,
    now: () => Date.now(),
  })(req, res);
