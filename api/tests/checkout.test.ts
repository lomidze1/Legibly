import { describe, expect, it } from 'vitest';

import { PRICES } from '../src/config/pricing';
import { signToken } from '../src/lib/hmac';
import { createCheckoutCreateHandler, sanitizeReturnUrl } from '../src/routes/checkout/create';
import { createReturnHandler } from '../src/routes/checkout/return';
import { FlittError, signParams, type CheckoutRequest, type FlittConfig } from '../src/services/flittService';
import { fakeLicenseStore, fakeResponse, proLicense } from './helpers';

const SECRET = 'k'.repeat(40);
const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const USER = 'figma-user-1';

const config: FlittConfig = {
  merchantId: '1396424',
  secretKey: 'test_secret_key',
  baseUrl: 'https://pay.flitt.com',
};

function setup(seed: Parameters<typeof fakeLicenseStore>[0] = [], checkoutUrl = 'https://pay.flitt.com/c/abc') {
  const licenses = fakeLicenseStore(seed);
  const requests: CheckoutRequest[] = [];

  return {
    licenses,
    requests,
    handler: createCheckoutCreateHandler({
      config,
      licenses,
      createCheckout: async (_config, request) => {
        requests.push(request);
        return checkoutUrl;
      },
      authSecret: SECRET,
      apiPublicUrl: 'https://api.legibly.design',
      now: () => NOW,
    }),
  };
}

function bearer(userId = USER) {
  return { authorization: `Bearer ${signToken(userId, SECRET, 3600, NOW)}` };
}

describe('POST /api/checkout/create', () => {
  it('returns a checkout URL and the order id', async () => {
    const { handler, requests } = setup();
    const res = fakeResponse();

    await handler({ method: 'POST', headers: bearer(), body: { duration: 'yearly' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      checkoutUrl: 'https://pay.flitt.com/c/abc',
      orderId: `lgb_pro_${USER}_${NOW}`,
    });
    expect(requests[0]?.serverCallbackUrl).toBe('https://api.legibly.design/api/webhooks/flitt');
  });

  it('requires a token — the id never comes from the body', async () => {
    const { handler, requests } = setup();
    const res = fakeResponse();

    await handler({ method: 'POST', headers: {}, body: { duration: 'yearly', figmaUserId: USER } }, res);

    expect(res.statusCode).toBe(401);
    expect(requests).toHaveLength(0);
  });

  it('rejects a missing or unknown duration', async () => {
    const { handler } = setup();

    for (const body of [{}, { duration: 'weekly' }, { duration: 12 }]) {
      const res = fakeResponse();
      await handler({ method: 'POST', headers: bearer(), body }, res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({ error: 'invalid_duration' });
    }
  });

  it('refuses to sell to a live Pro outside the renewal window', async () => {
    const { handler, requests } = setup([proLicense(USER, new Date(NOW + 300 * DAY))]);
    const res = fakeResponse();

    await handler({ method: 'POST', headers: bearer(), body: { duration: 'yearly' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: 'already_pro',
      remainingDays: 300,
      renewalOpensInDays: 290,
      renewalWindowDays: 10,
    });
    expect(requests).toHaveLength(0);
  });

  it('sells to a Pro who is inside the renewal window', async () => {
    const { handler } = setup([proLicense(USER, new Date(NOW + 5 * DAY))]);
    const res = fakeResponse();

    await handler({ method: 'POST', headers: bearer(), body: { duration: 'yearly' } }, res);

    expect(res.statusCode).toBe(200);
  });

  it('passes a known email to Flitt for the receipt', async () => {
    const { handler, requests } = setup([proLicense(USER, new Date(NOW - 1))]);
    const res = fakeResponse();

    await handler({ method: 'POST', headers: bearer(), body: { duration: 'monthly' } }, res);

    expect(requests[0]?.email).toBe('buyer@example.com');
  });

  it('answers 502 when Flitt is unavailable', async () => {
    const licenses = fakeLicenseStore();
    const handler = createCheckoutCreateHandler({
      config,
      licenses,
      createCheckout: async () => {
        throw new FlittError('Flitt checkout failed with status 500');
      },
      authSecret: SECRET,
      apiPublicUrl: 'https://api.legibly.design',
      now: () => NOW,
    });

    const res = fakeResponse();
    await handler({ method: 'POST', headers: bearer(), body: { duration: 'yearly' } }, res);

    expect(res.statusCode).toBe(502);
    expect(res.body).toMatchObject({ error: 'checkout_unavailable' });
  });

  it('refuses anything but POST', async () => {
    const { handler } = setup();
    const res = fakeResponse();

    await handler({ method: 'GET', headers: bearer(), body: { duration: 'yearly' } }, res);

    expect(res.statusCode).toBe(405);
  });

  it('signs the price the buyer is actually charged', () => {
    // Guards the constants the webhook compares against.
    expect(PRICES).toEqual({ monthly: 1200, yearly: 12000 });
    expect(signParams({ amount: PRICES.yearly }, config.secretKey)).not.toBe(
      signParams({ amount: PRICES.monthly }, config.secretKey),
    );
  });
});

describe('sanitizeReturnUrl', () => {
  const fallback = 'https://api.legibly.design/api/checkout/success';

  it('keeps our own hosts', () => {
    expect(sanitizeReturnUrl('https://legibly.design/thanks', fallback)).toBe('https://legibly.design/thanks');
    expect(sanitizeReturnUrl('https://www.legibly.design/thanks', fallback)).toBe(
      'https://www.legibly.design/thanks',
    );
    expect(sanitizeReturnUrl('http://localhost:3000/thanks', fallback)).toBe('http://localhost:3000/thanks');
  });

  it('falls back on a foreign host instead of failing the payment', () => {
    expect(sanitizeReturnUrl('https://evil.example/steal', fallback)).toBe(fallback);
    expect(sanitizeReturnUrl('https://legibly.design.evil.example/', fallback)).toBe(fallback);
  });

  it('falls back on anything unparseable', () => {
    for (const bad of ['not a url', '', undefined, null, 42, '//legibly.design']) {
      expect(sanitizeReturnUrl(bad, fallback)).toBe(fallback);
    }
  });
});

describe('checkout return', () => {
  it('redirects with 303 so the browser follows a POST with GET', async () => {
    const res = fakeResponse();
    await createReturnHandler('https://legibly.design', '/checkout/success')({ method: 'POST', headers: {} }, res);

    expect(res.statusCode).toBe(303);
    expect(res.headers.Location).toBe('https://legibly.design/checkout/success');
  });

  it('sends the cancel path to the website too', async () => {
    const res = fakeResponse();
    await createReturnHandler('https://legibly.design', '/checkout/cancel')({ method: 'GET', headers: {} }, res);

    expect(res.headers.Location).toBe('https://legibly.design/checkout/cancel');
  });
});
