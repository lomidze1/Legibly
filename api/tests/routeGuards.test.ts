import { describe, expect, it } from 'vitest';

import { signToken } from '../src/lib/hmac';
import type { ApiHandler } from '../src/lib/http';
import { withCors } from '../src/middleware/cors';
import { withRateLimit, type BumpBucket } from '../src/middleware/rateLimit';
import { createExchangeHandler } from '../src/routes/auth/exchange';
import { createLoginHandler } from '../src/routes/auth/login';
import { createCheckoutCreateHandler } from '../src/routes/checkout/create';
import { createJudgeHandler } from '../src/routes/judge/judge';
import { createLicenseMeHandler } from '../src/routes/license/me';
import type { FlittConfig } from '../src/services/flittService';
import type { RunModel } from '../src/services/judgeService';
import { VALID_NONCE, fakeAuthStore, fakeLicenseStore, fakeResponse, fakeUsageEvents } from './helpers';

/**
 * What every route does with a request that is shaped wrong: the wrong verb, a
 * body the platform could not parse, a body of the wrong type, and no token at
 * all. None of these may reach a store, a payment provider, or the model.
 */

const SECRET = 'k'.repeat(40);
const NOW = 1_700_000_000_000;
const USER = 'figma-user-1';

const bearer = (userId = USER) => ({ authorization: `Bearer ${signToken(userId, SECRET, 3600, NOW)}` });

/** A body the platform hands over when the content-type was not JSON. */
const NON_JSON_BODIES = [undefined, '', 'duration=yearly', ['yearly'], 42, null, true];

describe('method guards', () => {
  it('the login endpoint answers 405 to anything but GET, without minting a state', async () => {
    const store = fakeAuthStore(() => NOW);
    const login = createLoginHandler({
      config: { clientId: 'c', clientSecret: 's', redirectUri: 'https://api.legibly.design/cb' },
      store,
      makeState: () => 'state-abc',
      now: () => NOW,
    });

    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = fakeResponse();
      await login({ method, headers: {}, query: { plugin_nonce: VALID_NONCE } }, res);

      expect(res.statusCode).toBe(405);
      expect(res.body).toEqual({ success: false, error: 'method_not_allowed' });
      // No state may be minted by a request that was refused.
      expect(store.states.size).toBe(0);
    }
  });

  it('the exchange endpoint refuses anything but GET, without consuming the nonce', async () => {
    const store = fakeAuthStore(() => NOW);
    await store.savePendingAuth(VALID_NONCE, 'the.token', new Date(NOW + 1000), new Date(NOW + 1000));
    const exchange = createExchangeHandler({ store });

    const res = fakeResponse();
    await exchange({ method: 'POST', headers: {}, query: { nonce: VALID_NONCE } }, res);

    expect(res.statusCode).toBe(405);
    expect(store.pending.has(VALID_NONCE)).toBe(true);
  });

  it('license/me refuses anything but GET, without reaching the store', async () => {
    const licenses = fakeLicenseStore();
    const handler = createLicenseMeHandler({ licenses, events: fakeUsageEvents(), authSecret: SECRET, now: () => NOW });

    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = fakeResponse();
      await handler({ method, headers: bearer(), query: {} }, res);

      expect(res.statusCode).toBe(405);
    }
    expect(licenses.rows.size).toBe(0);
  });

  it('checks the verb before the token, so an unauthenticated probe learns nothing new', async () => {
    const licenses = fakeLicenseStore();
    const handler = createLicenseMeHandler({ licenses, events: fakeUsageEvents(), authSecret: SECRET, now: () => NOW });

    const res = fakeResponse();
    await handler({ method: 'DELETE', headers: {}, query: {} }, res);

    expect(res.statusCode).toBe(405);
  });

  it('treats an absent method as the route default rather than refusing it', async () => {
    // The fake platform objects in these tests omit `method`; the real one
    // always sets it. An absent verb must not become a 405.
    const licenses = fakeLicenseStore();
    const res = fakeResponse();

    await createLicenseMeHandler({ licenses, events: fakeUsageEvents(), authSecret: SECRET, now: () => NOW })(
      { headers: bearer(), query: {} },
      res,
    );

    expect(res.statusCode).toBe(200);
  });
});

describe('POST /api/checkout/create — bodies that are not a purchase', () => {
  function setup() {
    const licenses = fakeLicenseStore();
    const requests: unknown[] = [];
    const config: FlittConfig = { merchantId: '1', secretKey: 's', baseUrl: 'https://pay.flitt.com' };

    return {
      licenses,
      requests,
      handler: createCheckoutCreateHandler({
        config,
        licenses,
        events: fakeUsageEvents(),
        createCheckout: async (_config, request) => {
          requests.push(request);
          return 'https://pay.flitt.com/c/abc';
        },
        authSecret: SECRET,
        apiPublicUrl: 'https://api.legibly.design',
        now: () => NOW,
      }),
    };
  }

  it.each(NON_JSON_BODIES.map((body) => [JSON.stringify(body) ?? 'undefined', body] as const))(
    'answers 400 for a body of %s instead of throwing',
    async (_label, body) => {
      const { handler, requests } = setup();
      const res = fakeResponse();

      await handler({ method: 'POST', headers: bearer(), body }, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({ error: 'invalid_duration' });
      expect(requests).toHaveLength(0);
    },
  );

  it('never lets the body name the buyer', async () => {
    const { handler, requests } = setup();
    const res = fakeResponse();

    await handler(
      { method: 'POST', headers: bearer('attacker'), body: { duration: 'yearly', figmaUserId: 'victim' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(requests[0]).toMatchObject({ figmaUserId: 'attacker' });
  });

  it('never lets the body name the price', async () => {
    const { handler, requests } = setup();
    const res = fakeResponse();

    await handler(
      { method: 'POST', headers: bearer(), body: { duration: 'yearly', amount: 1, price: 1, currency: 'GEL' } },
      res,
    );

    // The request handed to Flitt carries a duration; the amount is looked up
    // server-side from PRICES and is not a field the caller can set.
    expect(requests[0]).not.toHaveProperty('amount');
    expect(requests[0]).toMatchObject({ duration: 'yearly' });
  });

  it('refuses an unauthenticated call before it touches the licence store', async () => {
    const { handler, licenses } = setup();
    const res = fakeResponse();

    await handler({ method: 'POST', headers: {}, body: { duration: 'yearly' } }, res);

    expect(res.statusCode).toBe(401);
    expect(licenses.rows.size).toBe(0);
  });
});

describe('POST /api/judge — bodies that are not a frame', () => {
  const verdict = { overall: { score: 4, summary: 'Solid.' }, findings: [] };

  function setup() {
    const licenses = fakeLicenseStore();
    let calls = 0;
    const runModel: RunModel = async () => {
      calls += 1;
      return { text: JSON.stringify(verdict), stopReason: 'end_turn' };
    };

    return {
      licenses,
      modelCalls: () => calls,
      handler: createJudgeHandler({
        licenses,
        events: fakeUsageEvents(),
        runModel,
        authSecret: SECRET,
        freeTrials: 3,
        proMonthly: 30,
        now: () => NOW,
      }),
    };
  }

  it.each(NON_JSON_BODIES.map((body) => [JSON.stringify(body) ?? 'undefined', body] as const))(
    'answers 400 for a body of %s and never calls the model',
    async (_label, body) => {
      const { handler, modelCalls, licenses } = setup();
      const res = fakeResponse();

      await handler({ method: 'POST', headers: bearer(), body }, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({ error: 'invalid_input' });
      expect(modelCalls()).toBe(0);
      // A rejected body must not cost the caller a trial.
      expect(licenses.rows.get(USER)?.judgeUsed ?? 0).toBe(0);
    },
  );

  it('rejects a payload with layers but no frame', async () => {
    const { handler, modelCalls } = setup();
    const res = fakeResponse();

    await handler({ method: 'POST', headers: bearer(), body: { nodes: [] } }, res);

    expect(res.statusCode).toBe(400);
    expect(modelCalls()).toBe(0);
  });

  it('rejects a frame with no layer listing', async () => {
    const { handler } = setup();
    const res = fakeResponse();

    await handler(
      { method: 'POST', headers: bearer(), body: { png: Buffer.from('png').toString('base64') } },
      res,
    );

    expect(res.statusCode).toBe(400);
  });

  it('refuses an unauthenticated call before parsing the body or reading a licence', async () => {
    const { handler, licenses, modelCalls } = setup();
    const res = fakeResponse();

    await handler({ method: 'POST', headers: {}, body: { png: 'not base64!', nodes: [] } }, res);

    expect(res.statusCode).toBe(401);
    expect(licenses.rows.size).toBe(0);
    expect(modelCalls()).toBe(0);
  });
});

describe('CORS against a forged Origin', () => {
  const reached: ApiHandler = (_req, res) => {
    res.status(200).json({ secret: 'the caller own data' });
  };

  it('answers a hostile origin with the wildcard and no credentials', async () => {
    const res = fakeResponse();
    await withCors(reached)({ method: 'GET', headers: { origin: 'https://evil.example' } }, res);

    // The wildcard is only safe because nothing is carried automatically: a
    // page on evil.example gets an unauthenticated answer, not the user's.
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(res.headers['Access-Control-Allow-Credentials']).toBeUndefined();
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('https://evil.example');
  });

  it('does not echo the Origin back, which would be the credentialed-CORS trap', async () => {
    for (const origin of ['null', 'https://evil.example', 'http://localhost:3000']) {
      const res = fakeResponse();
      await withCors(reached)({ method: 'GET', headers: { origin } }, res);
      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    }
  });

  it('answers a preflight before the rate limit can be spent on it', async () => {
    const bumps: string[] = [];
    const bump: BumpBucket = async (key) => {
      bumps.push(key);
      return bumps.length;
    };
    const composed = withCors(withRateLimit(reached, { scope: 'auth', limit: 2, windowMs: 600_000 }, bump));

    for (let i = 0; i < 10; i += 1) {
      const res = fakeResponse();
      await composed({ method: 'OPTIONS', headers: { origin: 'https://evil.example' } }, res);
      expect(res.statusCode).toBe(204);
    }

    expect(bumps).toEqual([]);
  });
});

describe('rate-limit bucketing', () => {
  const ok: ApiHandler = (_req, res) => {
    res.status(200).json({ ok: true });
  };

  function fakeStore() {
    const buckets = new Map<string, number>();
    const bump: BumpBucket = async (key) => {
      const hits = (buckets.get(key) ?? 0) + 1;
      buckets.set(key, hits);
      return hits;
    };
    return { bump, buckets };
  }

  it('cannot be escaped by varying the header Vercel controls the value of', async () => {
    const { bump, buckets } = fakeStore();
    const options = { scope: 'auth', limit: 2, windowMs: 600_000 };
    const limited = withRateLimit(ok, options, bump);

    // Same real address, three different spoofed chains behind it.
    for (const forged of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) {
      await limited(
        { method: 'GET', headers: { 'x-vercel-forwarded-for': '9.9.9.9', 'x-forwarded-for': forged } },
        fakeResponse(),
      );
    }

    expect(buckets.size).toBe(1);
    const res = fakeResponse();
    await limited({ method: 'GET', headers: { 'x-vercel-forwarded-for': '9.9.9.9' } }, res);
    expect(res.statusCode).toBe(429);
  });

  it('puts every caller with no resolvable address into one shared bucket', async () => {
    const { bump, buckets } = fakeStore();
    const limited = withRateLimit(ok, { scope: 'auth', limit: 1, windowMs: 600_000 }, bump);

    await limited({ method: 'GET', headers: {} }, fakeResponse());
    const second = fakeResponse();
    await limited({ method: 'GET', headers: {} }, second);

    // `clientIpFrom` returns a stable placeholder, so unaddressed callers share
    // a limit. Behind Vercel that header is always present; anywhere else this
    // is one bucket for everyone.
    expect(buckets.size).toBe(1);
    expect(second.statusCode).toBe(429);
  });
});
