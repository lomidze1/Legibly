import { queryParam, type ApiHandler } from '../../lib/http.js';
import { authStore, type AuthStore } from '../../models/authStore.js';
import { PLUGIN_NONCE_PATTERN } from './login.js';

/**
 * Public by design. The nonce *is* the credential: 32 bytes of entropy, minted
 * by the plugin, single-use, and alive for five minutes. There is no session to
 * authenticate against yet — this endpoint is how one is obtained.
 */
export interface ExchangeDeps {
  store: AuthStore;
}

export function createExchangeHandler(deps: ExchangeDeps): ApiHandler {
  return async (req, res) => {
    if (req.method !== undefined && req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

    const nonce = queryParam(req, 'nonce');
    if (nonce === undefined || !PLUGIN_NONCE_PATTERN.test(nonce)) {
      res.status(400).json({ success: false, error: 'invalid_nonce' });
      return;
    }

    const pending = await deps.store.consumePendingAuth(nonce);
    if (pending === null) {
      // Either the browser has not finished yet, or this nonce was already
      // spent. Both look the same from here, and should.
      res.status(200).json({ success: true, pending: true });
      return;
    }

    res.status(200).json({
      success: true,
      pending: false,
      token: pending.token,
      expiresAt: pending.tokenExpiresAt.toISOString(),
    });
  };
}

export const exchangeHandler: ApiHandler = (req, res) =>
  createExchangeHandler({ store: authStore })(req, res);
