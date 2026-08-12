import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The deployed surface: the `api/*.ts` files Vercel actually serves, with their
 * middleware wrapped around them. Every other test reaches past this layer by
 * building a handler from injected deps, so nothing else proves that CORS, the
 * rate limit, the IP allowlist and the live env wiring are attached at all.
 *
 * Postgres is mocked at `query`, faithfully enough that the real rate-limit
 * upsert counts. Nothing here opens a socket.
 */

const issued: Array<{ text: string; params: readonly unknown[] }> = [];
const buckets = new Map<string, number>();

const licenseRow = {
  figma_user_id: 'figma-user-1',
  email: null,
  plan: 'free',
  status: 'active',
  cycle_started_at: new Date(0),
  cycle_ends_at: new Date(0),
  judge_used: 0,
  judge_month: null,
  judge_month_used: 0,
  flitt_order_id: null,
  last_duration: null,
};

vi.mock('../src/lib/db', () => ({
  query: vi.fn(async (text: string, params: readonly unknown[] = []) => {
    issued.push({ text, params });

    if (/INSERT INTO rate_limits/.test(text)) {
      const key = String(params[0]);
      const hits = (buckets.get(key) ?? 0) + 1;
      buckets.set(key, hits);
      return [{ hits }];
    }
    if (/INSERT INTO licenses/.test(text)) return [licenseRow];
    if (/FROM licenses/.test(text)) return [];
    if (/INSERT INTO webhook_events/.test(text)) return [{ transaction_id: String(params[0]) }];
    return [];
  }),
  pingStore: vi.fn(async () => true),
  getPool: vi.fn(),
  closePool: vi.fn(async () => undefined),
}));

const AUTH_SECRET = 'a'.repeat(40);
const FLITT_SECRET = 'test_secret_key';

Object.assign(process.env, {
  NODE_ENV: 'test',
  API_PUBLIC_URL: 'https://api.legibly.design',
  WEBSITE_BASE_URL: 'https://legibly.design',
  AUTH_SECRET,
  ADMIN_TOKEN: 'b'.repeat(40),
  DATABASE_URL: 'postgres://user:pass@host/db',
  FIGMA_CLIENT_ID: 'client-123',
  FIGMA_CLIENT_SECRET: 'secret-456',
  FIGMA_REDIRECT_URI: 'https://api.legibly.design/api/auth/figma/callback',
  FLITT_MERCHANT_ID: '1396424',
  FLITT_SECRET_KEY: FLITT_SECRET,
  FLITT_WEBHOOK_IPS: '54.154.216.60',
});

const { signToken } = await import('../src/lib/hmac');
const { PRICES } = await import('../src/config/pricing');
const { signParams } = await import('../src/services/flittService');
const { fakeResponse } = await import('./helpers');

const health = (await import('../api/health')).default;
const authMe = (await import('../api/auth/me')).default;
const licenseMe = (await import('../api/license/me')).default;
const checkoutCreate = (await import('../api/checkout/create')).default;
const checkoutReturn = (await import('../api/checkout/[action]')).default;
const judgeEntry = (await import('../api/judge')).default;
const flittWebhook = (await import('../api/webhooks/flitt')).default;

/** A fresh address per test keeps one bucket from spilling into the next. */
let addressCounter = 0;
const fromAddress = () => ({ 'x-vercel-forwarded-for': `10.0.0.${(addressCounter += 1)}` });

const bearer = () => ({ authorization: `Bearer ${signToken('figma-user-1', AUTH_SECRET, 3600)}` });

beforeEach(() => {
  issued.length = 0;
  buckets.clear();
});

describe('GET /api/health', () => {
  it('reports the store through the real handler', async () => {
    const res = fakeResponse();
    await health({ method: 'GET', headers: fromAddress() }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, store: 'up' });
  });

  it('is not behind the rate limit — a health check must never be throttled', async () => {
    const headers = fromAddress();
    for (let i = 0; i < 5; i += 1) await health({ method: 'GET', headers }, fakeResponse());

    expect(buckets.size).toBe(0);
  });
});

describe('GET /api/auth/me', () => {
  it('carries the CORS headers and refuses an unauthenticated caller', async () => {
    const res = fakeResponse();
    await authMe({ method: 'GET', headers: fromAddress() }, res);

    expect(res.statusCode).toBe(401);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization');
  });

  it('answers a preflight without spending a rate-limit hit', async () => {
    const headers = fromAddress();
    for (let i = 0; i < 3; i += 1) {
      const res = fakeResponse();
      await authMe({ method: 'OPTIONS', headers }, res);
      expect(res.statusCode).toBe(204);
    }

    expect(buckets.size).toBe(0);
  });

  it('answers a real token with the id it carries', async () => {
    const res = fakeResponse();
    await authMe({ method: 'GET', headers: { ...fromAddress(), ...bearer() } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, userId: 'figma-user-1' });
  });

  it('binds at 300 requests in the window and answers 429 with Retry-After', async () => {
    const headers = { ...fromAddress(), ...bearer() };

    for (let i = 0; i < 300; i += 1) {
      const res = fakeResponse();
      await authMe({ method: 'GET', headers }, res);
      expect(res.statusCode).toBe(200);
    }

    const limited = fakeResponse();
    await authMe({ method: 'GET', headers }, limited);

    expect(limited.statusCode).toBe(429);
    expect(limited.body).toEqual({ success: false, error: 'rate_limited' });
    expect(Number(limited.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('keeps two addresses in separate buckets', async () => {
    const first = fromAddress();
    const second = fromAddress();

    await authMe({ method: 'GET', headers: first }, fakeResponse());
    await authMe({ method: 'GET', headers: second }, fakeResponse());

    expect(buckets.size).toBe(2);
  });
});

describe('GET /api/license/me', () => {
  it('refuses an unauthenticated caller without reading a licence', async () => {
    const res = fakeResponse();
    await licenseMe({ method: 'GET', headers: { ...fromAddress(), 'x-forwarded-for': '1.2.3.4' } }, res);

    expect(res.statusCode).toBe(401);
    expect(issued.some(({ text }) => /licenses/.test(text))).toBe(false);
  });

  it('creates and returns a free licence for a genuine token', async () => {
    const res = fakeResponse();
    await licenseMe({ method: 'GET', headers: { ...fromAddress(), ...bearer() }, query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, license: { plan: 'free', daysLeft: 0 } });
    expect(issued.some(({ text }) => /INSERT INTO licenses/.test(text))).toBe(true);
  });
});

describe('POST /api/checkout/create', () => {
  it('refuses an unauthenticated purchase before touching Flitt or the store', async () => {
    const res = fakeResponse();
    await checkoutCreate({ method: 'POST', headers: fromAddress(), body: { duration: 'yearly' } }, res);

    expect(res.statusCode).toBe(401);
    expect(issued.some(({ text }) => /licenses/.test(text))).toBe(false);
  });

  it('refuses anything but POST', async () => {
    const res = fakeResponse();
    await checkoutCreate({ method: 'GET', headers: { ...fromAddress(), ...bearer() } }, res);

    expect(res.statusCode).toBe(405);
  });
});

describe('POST /api/checkout/success and /cancel', () => {
  it('sends the buyer back to the website with a 303', async () => {
    const res = fakeResponse();
    await checkoutReturn({ method: 'POST', headers: {}, query: { action: 'success' } }, res);

    expect(res.statusCode).toBe(303);
    expect(res.headers.Location).toBe('https://legibly.design/checkout/success');
  });

  it('serves the cancel URL from the same function', async () => {
    // One file, both URLs — the merge that kept api/ inside the plan's
    // function budget. Neither URL changed, so Flitt needs no reconfiguring.
    const res = fakeResponse();
    await checkoutReturn({ method: 'POST', headers: {}, query: { action: 'cancel' } }, res);

    expect(res.headers.Location).toBe('https://legibly.design/checkout/cancel');
  });
});

describe('POST /api/judge', () => {
  it('is switched off until its eval passes — D24 gates it, and the deployed route obeys', async () => {
    const res = fakeResponse();
    await judgeEntry(
      { method: 'POST', headers: { ...fromAddress(), ...bearer() }, body: { png: 'AAAA', nodes: [] } },
      res,
    );

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ success: false, error: 'judge_disabled' });
  });

  it('refuses before the token is even looked at, so no quota can be probed', async () => {
    const res = fakeResponse();
    await judgeEntry({ method: 'POST', headers: fromAddress(), body: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(issued.some(({ text }) => /licenses/.test(text))).toBe(false);
  });
});

describe('POST /api/webhooks/flitt', () => {
  function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const params: Record<string, unknown> = {
      merchant_id: '1396424',
      order_id: 'lgb_pro_figma-user-1_1699000000000',
      order_status: 'approved',
      amount: PRICES.yearly,
      currency: 'USD',
      payment_id: 'pay-entry-1',
      merchant_data: JSON.stringify({ figmaUserId: 'figma-user-1', duration: 'yearly' }),
      ...overrides,
    };
    return { ...params, signature: signParams(params, FLITT_SECRET) };
  }

  it('drops a caller that is not on the allowlist, with the same 200 a rejection gets', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = fakeResponse();

    await flittWebhook({ method: 'POST', headers: { 'x-vercel-forwarded-for': '1.2.3.4' }, body: payload() }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(issued.some(({ text }) => /INSERT INTO licenses/.test(text))).toBe(false);
    warn.mockRestore();
  });

  it('ignores a spoofed x-forwarded-for claiming to be Flitt', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = fakeResponse();

    await flittWebhook(
      {
        method: 'POST',
        headers: { 'x-vercel-forwarded-for': '1.2.3.4', 'x-forwarded-for': '54.154.216.60' },
        body: payload(),
      },
      res,
    );

    expect(issued.some(({ text }) => /INSERT INTO licenses/.test(text))).toBe(false);
    warn.mockRestore();
  });

  it('applies a correctly signed purchase from a known Flitt address', async () => {
    const res = fakeResponse();

    await flittWebhook(
      { method: 'POST', headers: { 'x-vercel-forwarded-for': '54.154.216.60' }, body: payload() },
      res,
    );

    expect(res.statusCode).toBe(200);
    const purchase = issued.find(({ text }) => /INSERT INTO licenses/.test(text));
    expect(purchase?.params).toContain('figma-user-1');
    expect(purchase?.params).toContain('yearly');
  });

  it('takes no lease and writes nothing for a tampered payload from a known address', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const body = payload();
    body.amount = 1;
    const res = fakeResponse();

    await flittWebhook(
      { method: 'POST', headers: { 'x-vercel-forwarded-for': '54.154.216.60' }, body },
      res,
    );

    expect(res.body).toEqual({ received: true });
    expect(issued.some(({ text }) => /webhook_events/.test(text))).toBe(false);
    warn.mockRestore();
  });

  it('is not behind the auth rate limit — Flitt retries must never be throttled', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < 5; i += 1) {
      await flittWebhook(
        { method: 'POST', headers: { 'x-vercel-forwarded-for': '1.2.3.4' }, body: payload() },
        fakeResponse(),
      );
    }

    expect(buckets.size).toBe(0);
    warn.mockRestore();
  });
});
