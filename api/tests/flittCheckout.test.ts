import { describe, expect, it } from 'vitest';

import { PRICES } from '../src/config/pricing.js';
import {
  FlittError,
  createCheckoutUrl,
  signParams,
  type CheckoutRequest,
  type FetchLike,
  type FlittConfig,
} from '../src/services/flittService.js';

const config: FlittConfig = {
  merchantId: '1396424',
  secretKey: 'test_secret_key',
  baseUrl: 'https://pay.flitt.com',
};

const request: CheckoutRequest = {
  figmaUserId: 'figma-user-1',
  duration: 'yearly',
  orderId: 'lgb_pro_figma-user-1_1700000000000',
  email: 'buyer@example.com',
  serverCallbackUrl: 'https://api.legibly.design/api/webhooks/flitt',
  responseUrl: 'https://api.legibly.design/api/checkout/success',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function recording(response: Response): { fetch: FetchLike; sent: Array<Record<string, unknown>> } {
  const sent: Array<Record<string, unknown>> = [];
  return {
    sent,
    fetch: async (_url, init) => {
      sent.push((JSON.parse(String(init?.body)) as { request: Record<string, unknown> }).request);
      return response;
    },
  };
}

const success = () => jsonResponse({ response: { response_status: 'success', checkout_url: 'https://pay.flitt.com/c/abc' } });

describe('createCheckoutUrl', () => {
  it('returns the hosted checkout URL', async () => {
    const { fetch } = recording(success());
    await expect(createCheckoutUrl(config, request, fetch)).resolves.toBe('https://pay.flitt.com/c/abc');
  });

  it('sends the price in cents for the duration bought', async () => {
    const { fetch, sent } = recording(success());
    await createCheckoutUrl(config, request, fetch);

    expect(sent[0]?.amount).toBe(PRICES.yearly);
    expect(sent[0]?.currency).toBe('USD');
  });

  it('sends merchant_data as a JSON string, not an object', async () => {
    const { fetch, sent } = recording(success());
    await createCheckoutUrl(config, request, fetch);

    expect(typeof sent[0]?.merchant_data).toBe('string');
    expect(JSON.parse(String(sent[0]?.merchant_data))).toEqual({
      figmaUserId: 'figma-user-1',
      plan: 'pro',
      recurring: false,
      duration: 'yearly',
    });
  });

  it('signs exactly what it sends', async () => {
    const { fetch, sent } = recording(success());
    await createCheckoutUrl(config, request, fetch);

    const { signature, ...params } = sent[0]!;
    expect(signature).toBe(signParams(params, config.secretKey));
  });

  it('omits sender_email when there is none', async () => {
    const { fetch, sent } = recording(success());
    await createCheckoutUrl(config, { ...request, email: undefined }, fetch);

    expect(sent[0]).not.toHaveProperty('sender_email');
  });

  it('refuses a response_status that is not success', async () => {
    const { fetch } = recording(
      jsonResponse({ response: { response_status: 'failure', error_message: 'invalid signature' } }),
    );

    await expect(createCheckoutUrl(config, request, fetch)).rejects.toThrow(/invalid signature/);
  });

  it('does not mistake order_status for response_status', async () => {
    // Different fields with different meanings: an approved order in a failed
    // API call must not read as a usable checkout.
    const { fetch } = recording(jsonResponse({ response: { order_status: 'approved', checkout_url: 'https://x' } }));

    await expect(createCheckoutUrl(config, request, fetch)).rejects.toThrow(FlittError);
  });

  it('refuses a success with no URL', async () => {
    const { fetch } = recording(jsonResponse({ response: { response_status: 'success' } }));
    await expect(createCheckoutUrl(config, request, fetch)).rejects.toThrow(/no URL/);
  });

  it('refuses a malformed envelope', async () => {
    const { fetch } = recording(jsonResponse({ checkout_url: 'https://x' }));
    await expect(createCheckoutUrl(config, request, fetch)).rejects.toThrow(/no response object/);
  });

  it('throws on a non-2xx response', async () => {
    const { fetch } = recording(jsonResponse({}, 500));
    await expect(createCheckoutUrl(config, request, fetch)).rejects.toThrow(/500/);
  });
});
