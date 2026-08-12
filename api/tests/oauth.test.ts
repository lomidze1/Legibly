import { describe, expect, it } from 'vitest';

import { verifyToken } from '../src/lib/hmac';
import { createCallbackHandler, PENDING_AUTH_TTL_MS } from '../src/routes/auth/callback';
import { createExchangeHandler } from '../src/routes/auth/exchange';
import { createLoginHandler, OAUTH_STATE_TTL_MS } from '../src/routes/auth/login';
import type { FigmaOAuthConfig, FigmaUser } from '../src/services/figmaOAuth';
import { VALID_NONCE, fakeAuthStore, fakeLicenseStore, fakeResponse } from './helpers';

const SECRET = 'k'.repeat(40);
const NOW = 1_700_000_000_000;

const config: FigmaOAuthConfig = {
  clientId: 'client-123',
  clientSecret: 'secret-456',
  redirectUri: 'https://api.legibly.design/api/auth/figma/callback',
};

function setup(user: FigmaUser = { id: 'figma-user-1', email: 'designer@example.com' }, now = () => NOW) {
  const store = fakeAuthStore(now);
  const licenses = fakeLicenseStore();
  const calls: string[] = [];

  const login = createLoginHandler({ config, store, makeState: () => 'state-abc', now });
  const callback = createCallbackHandler({
    config,
    store,
    licenses,
    exchangeCode: async () => {
      calls.push('exchange');
      return 'figma-access-token';
    },
    fetchUser: async () => {
      calls.push('me');
      return user;
    },
    authSecret: SECRET,
    now,
  });
  const exchange = createExchangeHandler({ store });

  return { store, licenses, calls, login, callback, exchange };
}

describe('GET /api/auth/figma/login', () => {
  it('redirects to Figma with the right parameters', async () => {
    const { login } = setup();
    const res = fakeResponse();

    await login({ method: 'GET', headers: {}, query: { plugin_nonce: VALID_NONCE } }, res);

    expect(res.statusCode).toBe(302);
    const url = new URL(String(res.headers.Location));
    expect(url.origin + url.pathname).toBe('https://www.figma.com/oauth');
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-abc');
  });

  it('asks for current_user:read and nothing else', async () => {
    const { login } = setup();
    const res = fakeResponse();

    await login({ method: 'GET', headers: {}, query: { plugin_nonce: VALID_NONCE } }, res);

    expect(new URL(String(res.headers.Location)).searchParams.get('scope')).toBe('current_user:read');
  });

  it('stores the state before redirecting', async () => {
    const { login, store } = setup();
    const res = fakeResponse();

    await login({ method: 'GET', headers: {}, query: { plugin_nonce: VALID_NONCE } }, res);

    expect(store.states.get('state-abc')).toEqual({
      pluginNonce: VALID_NONCE,
      expiresAt: new Date(NOW + OAUTH_STATE_TTL_MS),
    });
  });

  it('rejects a missing or too-short nonce', async () => {
    const { login } = setup();

    for (const query of [{}, { plugin_nonce: 'abc' }, { plugin_nonce: 'a'.repeat(31) }]) {
      const res = fakeResponse();
      await login({ method: 'GET', headers: {}, query }, res);
      expect(res.statusCode).toBe(400);
    }
  });

  it('rejects a nonce with characters outside the allowed set', async () => {
    const { login } = setup();
    const res = fakeResponse();

    await login({ method: 'GET', headers: {}, query: { plugin_nonce: `${'a'.repeat(40)}<script>` } }, res);

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/auth/figma/callback', () => {
  async function runLogin(login: ReturnType<typeof setup>['login']): Promise<void> {
    await login({ method: 'GET', headers: {}, query: { plugin_nonce: VALID_NONCE } }, fakeResponse());
  }

  it('parks a token for the plugin and shows a closing page', async () => {
    const { login, callback, store } = setup();
    await runLogin(login);

    const res = fakeResponse();
    await callback({ method: 'GET', headers: {}, query: { code: 'auth-code', state: 'state-abc' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(res.text).toContain('Connected to Figma');

    const parked = store.pending.get(VALID_NONCE);
    expect(parked?.expiresAt).toEqual(new Date(NOW + PENDING_AUTH_TTL_MS));
    const verified = verifyToken(parked!.token, SECRET, NOW);
    expect(verified.ok && verified.payload.userId).toBe('figma-user-1');
  });

  it('rejects a state that was never issued', async () => {
    const { callback } = setup();
    const res = fakeResponse();

    await callback({ method: 'GET', headers: {}, query: { code: 'auth-code', state: 'not-ours' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid state' });
  });

  it('rejects a replayed state — it is consumed on first use', async () => {
    const { login, callback } = setup();
    await runLogin(login);

    await callback({ method: 'GET', headers: {}, query: { code: 'auth-code', state: 'state-abc' } }, fakeResponse());

    const res = fakeResponse();
    await callback({ method: 'GET', headers: {}, query: { code: 'auth-code', state: 'state-abc' } }, res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects an expired state', async () => {
    let clock = NOW;
    const { login, callback } = setup(undefined, () => clock);
    await runLogin(login);

    clock = NOW + OAUTH_STATE_TTL_MS + 1;
    const res = fakeResponse();
    await callback({ method: 'GET', headers: {}, query: { code: 'auth-code', state: 'state-abc' } }, res);

    expect(res.statusCode).toBe(400);
  });

  it('rejects a callback with no code, without spending the state', async () => {
    const { login, callback, store, calls } = setup();
    await runLogin(login);

    const res = fakeResponse();
    await callback({ method: 'GET', headers: {}, query: { state: 'state-abc' } }, res);

    expect(res.statusCode).toBe(400);
    expect(calls).toEqual([]);
    expect(store.states.has('state-abc')).toBe(true);
  });

  it('creates the licence row and records the email before issuing the token', async () => {
    const { login, callback, licenses } = setup();
    await runLogin(login);

    await callback({ method: 'GET', headers: {}, query: { code: 'auth-code', state: 'state-abc' } }, fakeResponse());

    expect(licenses.rows.get('figma-user-1')).toMatchObject({
      figmaUserId: 'figma-user-1',
      email: 'designer@example.com',
      plan: 'free',
    });
  });

  it('copes with a Figma account that exposes no email', async () => {
    const { login, callback, licenses } = setup({ id: 'figma-user-2' });
    await runLogin(login);

    await callback({ method: 'GET', headers: {}, query: { code: 'auth-code', state: 'state-abc' } }, fakeResponse());

    expect(licenses.rows.get('figma-user-2')?.email).toBeNull();
  });
});

describe('GET /api/auth/figma-exchange', () => {
  async function completeLogin(kit: ReturnType<typeof setup>): Promise<void> {
    await kit.login({ method: 'GET', headers: {}, query: { plugin_nonce: VALID_NONCE } }, fakeResponse());
    await kit.callback(
      { method: 'GET', headers: {}, query: { code: 'auth-code', state: 'state-abc' } },
      fakeResponse(),
    );
  }

  it('reports pending while the browser has not finished', async () => {
    const kit = setup();
    const res = fakeResponse();

    await kit.exchange({ method: 'GET', headers: {}, query: { nonce: VALID_NONCE } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, pending: true });
  });

  it('hands over the token once the callback has run', async () => {
    const kit = setup();
    await completeLogin(kit);

    const res = fakeResponse();
    await kit.exchange({ method: 'GET', headers: {}, query: { nonce: VALID_NONCE } }, res);

    const body = res.body as { pending: boolean; token: string; expiresAt: string };
    expect(body.pending).toBe(false);
    expect(verifyToken(body.token, SECRET, NOW).ok).toBe(true);
    // ISO on the wire — the plugin parses it into epoch ms.
    expect(new Date(body.expiresAt).toISOString()).toBe(body.expiresAt);
  });

  it('spends the nonce: a second call goes back to pending', async () => {
    const kit = setup();
    await completeLogin(kit);

    await kit.exchange({ method: 'GET', headers: {}, query: { nonce: VALID_NONCE } }, fakeResponse());

    const res = fakeResponse();
    await kit.exchange({ method: 'GET', headers: {}, query: { nonce: VALID_NONCE } }, res);
    expect(res.body).toEqual({ success: true, pending: true });
  });

  it('will not hand over a token whose hand-off window has closed', async () => {
    let clock = NOW;
    const kit = setup(undefined, () => clock);
    await completeLogin(kit);

    clock = NOW + PENDING_AUTH_TTL_MS + 1;
    const res = fakeResponse();
    await kit.exchange({ method: 'GET', headers: {}, query: { nonce: VALID_NONCE } }, res);

    expect(res.body).toEqual({ success: true, pending: true });
  });

  it('rejects a malformed nonce instead of looking it up', async () => {
    const kit = setup();
    const res = fakeResponse();

    await kit.exchange({ method: 'GET', headers: {}, query: { nonce: 'short' } }, res);

    expect(res.statusCode).toBe(400);
  });
});

/**
 * The callback is the one route that spends its state before it calls Figma.
 * That makes both of these worth pinning: a wrong verb must not reach the
 * exchange at all, and a Figma outage must not surface as the platform's
 * default error page after the user's one-shot state is already gone.
 */
describe('GET /api/auth/figma/callback — the unhappy paths', () => {
  function failing(error: Error) {
    const store = fakeAuthStore(() => NOW);
    const reached: string[] = [];
    const handler = createCallbackHandler({
      config,
      store,
      licenses: fakeLicenseStore(),
      exchangeCode: async () => {
        reached.push('exchange');
        throw error;
      },
      fetchUser: async (_accessToken: string): Promise<FigmaUser> => {
        reached.push('me');
        return { id: 'figma-user-1' };
      },
      authSecret: SECRET,
      now: () => NOW,
    });
    return { store, handler, reached };
  }

  it('refuses a verb it does not serve', async () => {
    const { handler, reached } = failing(new Error('never reached'));

    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = fakeResponse();
      await handler({ method, headers: {}, query: { code: 'c', state: 's' } }, res);
      expect(res.statusCode).toBe(405);
      expect(res.body).toEqual({ success: false, error: 'method_not_allowed' });
    }
    expect(reached).toEqual([]);
  });

  it('answers a Figma outage with a page that says what to do next', async () => {
    const { store, handler } = failing(new Error('figma timed out'));
    await store.saveOAuthState('state-xyz', VALID_NONCE, new Date(NOW + 60_000));

    const res = fakeResponse();
    await handler({ method: 'GET', headers: {}, query: { code: 'auth-code', state: 'state-xyz' } }, res);

    expect(res.statusCode).toBe(502);
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(res.text).toContain('Could not connect to Figma');
    expect(res.text).toContain('press Connect in Legibly');
    // The state stays spent — a retry has to start a fresh round trip — and
    // nothing was parked for the plugin to collect.
    expect(await store.consumeOAuthState('state-xyz')).toBeNull();
    expect(store.pending.get(VALID_NONCE)).toBeUndefined();
    expect(store.pending.size).toBe(0);
  });
});
