import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../src/config/env.js';
import { signToken } from '../src/lib/hmac.js';
import { callbackHandler } from '../src/routes/auth/callback.js';
import { loginHandler } from '../src/routes/auth/login.js';
import { checkoutCreateHandler } from '../src/routes/checkout/create.js';
import { flittWebhookHandler } from '../src/routes/webhooks/flitt.js';
import { fakeResponse } from './helpers.js';

/**
 * The half-configured deployment.
 *
 * The core five env vars are set, but Figma's and Flitt's are not — exactly the
 * state a real deployment sits in between going live and finishing setup. The
 * first production smoke test hit it and got two opaque 500s, one of them on the
 * webhook, where a 5xx is the thing the whole route was written to avoid.
 */
const CORE: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  API_PUBLIC_URL: 'https://api.legibly.design',
  WEBSITE_BASE_URL: 'https://legibly.design',
  AUTH_SECRET: 'a'.repeat(40),
  ADMIN_TOKEN: 'b'.repeat(40),
  DATABASE_URL: 'postgres://user:pass@127.0.0.1:1/db',
};

const OPTIONAL = [
  'FIGMA_CLIENT_ID',
  'FIGMA_CLIENT_SECRET',
  'FIGMA_REDIRECT_URI',
  'FLITT_MERCHANT_ID',
  'FLITT_SECRET_KEY',
] as const;

let saved: NodeJS.ProcessEnv;

beforeEach(() => {
  saved = { ...process.env };
  for (const key of [...Object.keys(CORE), ...OPTIONAL]) delete process.env[key];
  Object.assign(process.env, CORE);
  resetEnvCache();
});

afterEach(() => {
  process.env = saved;
  resetEnvCache();
});

describe('routes whose vendor is not configured yet', () => {
  it('tells the plugin OAuth is unavailable instead of crashing', async () => {
    const res = fakeResponse();
    await loginHandler({ method: 'GET', headers: {}, query: { plugin_nonce: 'a'.repeat(64) } }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ error: 'oauth_not_configured' });
  });

  it('shows the browser a page rather than a platform error on the callback', async () => {
    const res = fakeResponse();
    await callbackHandler({ method: 'GET', headers: {}, query: { code: 'x', state: 'y' } }, res);

    expect(res.statusCode).toBe(503);
    expect(res.text).toContain('Could not connect to Figma');
  });

  it('still answers checkout 401 before it answers 503', async () => {
    // Order matters: an anonymous caller should be turned away as anonymous,
    // not told which vendor we have finished wiring up.
    const res = fakeResponse();
    await checkoutCreateHandler({ method: 'POST', headers: {}, body: { duration: 'yearly' } }, res);

    expect(res.statusCode).toBe(401);
  });

  it('tells a signed-in user that checkout is unavailable', async () => {
    const token = signToken('figma-user-1', CORE.AUTH_SECRET!, 3600);
    const res = fakeResponse();
    await checkoutCreateHandler(
      { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: { duration: 'yearly' } },
      res,
    );

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ error: 'checkout_unavailable' });
  });

  it('answers the Flitt webhook 200, even with no secret to verify against', async () => {
    // A 5xx here is read by Flitt as "retry": 2s, 60s, 5m, 10m, 1h, 24h — for
    // every delivery, until someone notices. A missing key must never start that.
    const res = fakeResponse();
    await flittWebhookHandler({ method: 'POST', headers: {}, body: { order_id: 'x' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
