import { describe, expect, it } from 'vitest';
import {
  AlreadyProError,
  ApiError,
  API_BASE,
  AuthExpiredError,
  createCheckout,
  exchangeNonce,
  getLicense,
  loginUrl,
  type FetchLike,
} from '../src/ui/apiClient';

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function recording(response: Response): { fetch: FetchLike; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  return {
    calls,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return response;
    },
  };
}

describe('loginUrl', () => {
  it('points at our API and carries the nonce', () => {
    expect(loginUrl('abc123')).toBe(`${API_BASE}/api/auth/figma/login?plugin_nonce=abc123`);
  });

  it('encodes a nonce so it cannot inject another parameter', () => {
    expect(loginUrl('a&b=c')).toBe(`${API_BASE}/api/auth/figma/login?plugin_nonce=a%26b%3Dc`);
  });

  it('only ever talks to the domain the manifest allows', () => {
    expect(API_BASE).toBe('https://api.legibly.design');
  });
});

describe('exchangeNonce', () => {
  it('reports pending while the browser is not finished', async () => {
    const { fetch } = recording(respond({ success: true, pending: true }));
    await expect(exchangeNonce('nonce', fetch)).resolves.toEqual({ pending: true });
  });

  it('returns the token once it is ready', async () => {
    const { fetch } = recording(
      respond({ success: true, pending: false, token: 'abc.def', expiresAt: '2026-09-01T00:00:00.000Z' }),
    );

    await expect(exchangeNonce('nonce', fetch)).resolves.toEqual({
      pending: false,
      token: 'abc.def',
      expiresAt: '2026-09-01T00:00:00.000Z',
    });
  });

  it('treats a half-filled answer as still pending', async () => {
    const { fetch } = recording(respond({ success: true, pending: false, token: 'abc.def' }));
    await expect(exchangeNonce('nonce', fetch)).resolves.toEqual({ pending: true });
  });

  it('throws on a server error', async () => {
    const { fetch } = recording(respond({}, 500));
    await expect(exchangeNonce('nonce', fetch)).rejects.toThrow(ApiError);
  });
});

describe('getLicense', () => {
  it('sends the token as a Bearer credential', async () => {
    const { fetch, calls } = recording(respond({ success: true, license: { plan: 'free' } }));
    await getLicense('abc.def', fetch);

    expect(calls[0]?.url).toBe(`${API_BASE}/api/license/me`);
    expect((calls[0]?.init?.headers as Record<string, string>).Authorization).toBe('Bearer abc.def');
  });

  it('reads a Pro licence', async () => {
    const { fetch } = recording(
      respond({
        success: true,
        license: {
          plan: 'pro',
          status: 'active',
          cycleEndsAt: '2027-08-12T00:00:00.000Z',
          daysLeft: 312,
          judgeUsed: 2,
        },
      }),
    );

    await expect(getLicense('abc.def', fetch)).resolves.toEqual({
      plan: 'pro',
      status: 'active',
      cycleEndsAt: '2027-08-12T00:00:00.000Z',
      daysLeft: 312,
      judgeUsed: 2,
    });
  });

  it('falls back to free rather than trusting a malformed payload', async () => {
    const { fetch } = recording(respond({ success: true, license: { plan: 'pro', daysLeft: 'lots' } }));
    await expect(getLicense('abc.def', fetch)).resolves.toMatchObject({ plan: 'pro', daysLeft: 0 });

    const missing = recording(respond({ success: true }));
    await expect(getLicense('abc.def', missing.fetch)).resolves.toMatchObject({ plan: 'free' });
  });

  it('raises AuthExpiredError on 401 so the UI can go back to Connect', async () => {
    const { fetch } = recording(respond({ success: false }, 401));
    await expect(getLicense('abc.def', fetch)).rejects.toThrow(AuthExpiredError);
  });
});

describe('createCheckout', () => {
  it('asks for the duration and returns the hosted URL', async () => {
    const { fetch, calls } = recording(
      respond({ success: true, checkoutUrl: 'https://pay.flitt.com/c/abc', orderId: 'lgb_pro_u1_1' }),
    );

    await expect(createCheckout('abc.def', 'yearly', fetch)).resolves.toBe('https://pay.flitt.com/c/abc');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ duration: 'yearly' });
  });

  it('surfaces already_pro with the numbers the user needs', async () => {
    const { fetch } = recording(
      respond({ success: false, error: 'already_pro', remainingDays: 300, renewalOpensInDays: 290 }, 400),
    );

    const error = await createCheckout('abc.def', 'yearly', fetch).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AlreadyProError);
    expect((error as AlreadyProError).remainingDays).toBe(300);
    expect((error as AlreadyProError).renewalOpensInDays).toBe(290);
  });

  it('raises AuthExpiredError on 401', async () => {
    const { fetch } = recording(respond({}, 401));
    await expect(createCheckout('abc.def', 'yearly', fetch)).rejects.toThrow(AuthExpiredError);
  });

  it('refuses a checkout URL that is not https', async () => {
    const { fetch } = recording(respond({ success: true, checkoutUrl: 'javascript:alert(1)' }));
    await expect(createCheckout('abc.def', 'yearly', fetch)).rejects.toThrow(ApiError);
  });

  it('reports a Flitt outage as a retryable message', async () => {
    const { fetch } = recording(respond({ success: false, error: 'checkout_unavailable' }, 502));
    await expect(createCheckout('abc.def', 'yearly', fetch)).rejects.toThrow(/try again/);
  });
});
