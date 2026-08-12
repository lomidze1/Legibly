/**
 * The two short-lived rows the OAuth round trip needs.
 *
 * Both are consumed exactly once. The CSRF state must survive a redirect that
 * comes back on a different serverless instance, and the plugin's hand-off must
 * survive the gap between the browser finishing and the plugin's next poll —
 * neither can live in memory.
 */

import { query } from '../lib/db';

export interface PendingAuth {
  token: string;
  tokenExpiresAt: Date;
}

export interface AuthStore {
  saveOAuthState(state: string, pluginNonce: string, expiresAt: Date): Promise<void>;
  /** One-shot. Returns null when unknown, already used, or expired. */
  consumeOAuthState(state: string): Promise<{ pluginNonce: string } | null>;
  savePendingAuth(nonce: string, token: string, tokenExpiresAt: Date, expiresAt: Date): Promise<void>;
  /** One-shot. Returns null while the browser has not finished yet. */
  consumePendingAuth(nonce: string): Promise<PendingAuth | null>;
}

export const authStore: AuthStore = {
  async saveOAuthState(state, pluginNonce, expiresAt) {
    await query('DELETE FROM oauth_states WHERE expires_at < now()');
    await query(
      `INSERT INTO oauth_states (state, plugin_nonce, expires_at) VALUES ($1, $2, $3)`,
      [state, pluginNonce, expiresAt],
    );
  },

  async consumeOAuthState(state) {
    const rows = await query<{ plugin_nonce: string; expires_at: Date }>(
      `DELETE FROM oauth_states WHERE state = $1 RETURNING plugin_nonce, expires_at`,
      [state],
    );
    const row = rows[0];
    if (row === undefined || row.expires_at.getTime() <= Date.now()) return null;
    return { pluginNonce: row.plugin_nonce };
  },

  async savePendingAuth(nonce, token, tokenExpiresAt, expiresAt) {
    await query('DELETE FROM pending_auth WHERE expires_at < now()');
    await query(
      `INSERT INTO pending_auth (nonce, token, token_expires_at, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nonce) DO UPDATE
         SET token = EXCLUDED.token,
             token_expires_at = EXCLUDED.token_expires_at,
             expires_at = EXCLUDED.expires_at`,
      [nonce, token, tokenExpiresAt, expiresAt],
    );
  },

  async consumePendingAuth(nonce) {
    const rows = await query<{ token: string; token_expires_at: Date; expires_at: Date }>(
      `DELETE FROM pending_auth WHERE nonce = $1 RETURNING token, token_expires_at, expires_at`,
      [nonce],
    );
    const row = rows[0];
    if (row === undefined || row.expires_at.getTime() <= Date.now()) return null;
    return { token: row.token, tokenExpiresAt: row.token_expires_at };
  },
};
