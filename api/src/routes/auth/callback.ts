import { env } from '../../config/env.js';
import { PLUGIN_TOKEN_TTL_SECONDS, signToken } from '../../lib/hmac.js';
import { html, queryParam, type ApiHandler } from '../../lib/http.js';
import { authStore, type AuthStore } from '../../models/authStore.js';
import { licenseStore, type LicenseStore } from '../../models/License.js';
import {
  exchangeCodeForToken,
  fetchFigmaUser,
  figmaOAuthConfigOrNull,
  type FigmaOAuthConfig,
  type FigmaUser,
} from '../../services/figmaOAuth.js';

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

/**
 * The state is spent before Figma is called, and re-spending it would defeat
 * the point of one-shot state — so a failure here costs the user the round
 * trip. Say that plainly instead of letting the platform's default error page
 * answer, which tells them nothing about what to do next.
 */
const FAILED_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Could not connect to Figma</title></head>
<body style="font:16px/1.5 system-ui,sans-serif;padding:3rem;text-align:center">
<h1 style="font-size:1.25rem">Could not connect to Figma</h1>
<p>Sign-in did not finish. Close this tab and press Connect in Legibly to try again.</p>
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
    if (req.method !== undefined && req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

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

    try {
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
    } catch (error) {
      console.error(`[auth-callback] sign-in failed after the state was spent: ${String(error)}`);
      html(res, FAILED_PAGE, 502);
    }
  };
}

export const callbackHandler: ApiHandler = (req, res) => {
  // Figma sent the user here, so this is a browser tab with a person in it.
  // A 500 tells them nothing; the failure page at least says to try again.
  const config = figmaOAuthConfigOrNull(env());
  if (config === null) {
    console.error('[auth-callback] Figma OAuth is not configured');
    html(res, FAILED_PAGE, 503);
    return;
  }

  return createCallbackHandler({
    config,
    store: authStore,
    licenses: licenseStore,
    exchangeCode: exchangeCodeForToken,
    fetchUser: fetchFigmaUser,
    authSecret: env().authSecret,
    now: () => Date.now(),
  })(req, res);
};
