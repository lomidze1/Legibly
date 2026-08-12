import { describe, expect, it } from 'vitest';

import { DURATION_MS, PRICES, RENEWAL_WINDOW_MS } from '../src/config/pricing';
import { signParams } from '../src/services/flittService';
import { createFlittWebhookHandler } from '../src/routes/webhooks/flitt';
import { fakeAuditStore, fakeLicenseStore, fakeResponse, fakeUsageEvents, fakeWebhookEventStore, proLicense } from './helpers';

const SECRET = 'test_secret_key';
const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const USER = 'figma-user-1';

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const params: Record<string, unknown> = {
    merchant_id: '1396424',
    order_id: `lgb_pro_${USER}_1699000000000`,
    order_status: 'approved',
    amount: PRICES.yearly,
    currency: 'USD',
    payment_id: 'pay-1',
    merchant_data: JSON.stringify({ figmaUserId: USER, plan: 'pro', recurring: false, duration: 'yearly' }),
    ...overrides,
  };
  return { ...params, signature: signParams(params, SECRET) };
}

function setup(seed: Parameters<typeof fakeLicenseStore>[0] = []) {
  const licenses = fakeLicenseStore(seed);
  const events = fakeWebhookEventStore();
  const usage = fakeUsageEvents();
  const audit = fakeAuditStore();
  const logs: string[] = [];

  return {
    licenses,
    events,
    usage,
    audit,
    logs,
    handler: createFlittWebhookHandler({
      secretKey: SECRET,
      licenses,
      events,
      usage,
      audit,
      now: () => NOW,
      log: (message) => logs.push(message),
    }),
  };
}

async function post(handler: ReturnType<typeof setup>['handler'], body: unknown) {
  const res = fakeResponse();
  await handler({ method: 'POST', headers: {}, body }, res);
  return res;
}

describe('POST /api/webhooks/flitt', () => {
  it('grants Pro on an approved payment', async () => {
    const { handler, licenses } = setup();

    const res = await post(handler, payload());

    expect(res.statusCode).toBe(200);
    const license = licenses.rows.get(USER);
    expect(license?.plan).toBe('pro');
    expect(license?.cycleEndsAt.getTime()).toBe(NOW + DURATION_MS.yearly);
    expect(license?.lastDuration).toBe('yearly');
    expect(license?.flittOrderId).toBe(`lgb_pro_${USER}_1699000000000`);
  });

  it('changes nothing on a declined payment', async () => {
    const { handler, licenses } = setup();

    const res = await post(handler, payload({ order_status: 'declined', payment_id: 'pay-declined' }));

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('changes nothing on an expired payment', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload({ order_status: 'expired', payment_id: 'pay-expired' }));

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('revokes on a reversal of the order in force', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload());

    const res = await post(handler, payload({ order_status: 'reversed', payment_id: 'pay-reversal' }));

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.get(USER)?.plan).toBe('free');
    expect(licenses.rows.get(USER)?.status).toBe('expired');
  });

  it('ignores a reversal of an order that is no longer the current one', async () => {
    const { handler, licenses } = setup([proLicense(USER, new Date(NOW + 300 * DAY))]);

    await post(handler, payload({ order_status: 'reversed', payment_id: 'pay-old' }));

    // proLicense carries a different flitt_order_id, so the live licence stands.
    expect(licenses.rows.get(USER)?.plan).toBe('pro');
  });

  it('deduplicates a retried delivery', async () => {
    const { handler, licenses } = setup();
    const body = payload();

    await post(handler, body);
    const first = licenses.rows.get(USER)?.cycleEndsAt.getTime();
    const res = await post(handler, body);

    expect(res.body).toEqual({ received: true, deduped: true });
    expect(licenses.rows.get(USER)?.cycleEndsAt.getTime()).toBe(first);
  });

  it('keeps an approval and a later reversal of one order apart when there is no payment_id', async () => {
    const { handler, licenses } = setup();

    await post(handler, payload({ payment_id: undefined }));
    await post(handler, payload({ order_status: 'reversed', payment_id: undefined }));

    // Falling back to `${orderId}_${status}` keeps the two distinct.
    expect(licenses.rows.get(USER)?.plan).toBe('free');
  });

  it('refuses a wrong amount and grants nothing', async () => {
    const { handler, licenses, logs } = setup();

    const res = await post(handler, payload({ amount: 100 }));

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.has(USER)).toBe(false);
    expect(logs.join()).toContain('does not match');
  });

  it('refuses a monthly amount claimed as a yearly purchase', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload({ amount: PRICES.monthly }));

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('refuses a currency other than USD', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload({ currency: 'EUR' }));

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('accepts a lowercase usd', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload({ currency: 'usd' }));

    expect(licenses.rows.get(USER)?.plan).toBe('pro');
  });

  it('refuses an order id belonging to someone else', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload({ order_id: 'lgb_pro_other-user_1699000000000' }));

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('refuses an order id from the sibling product on the same merchant account', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload({ order_id: `w2w_pro_${USER}_1699000000000` }));

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('refuses a bad signature', async () => {
    const { handler, licenses, logs } = setup();
    const body = payload();
    body.signature = 'f'.repeat(40);

    const res = await post(handler, body);

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.has(USER)).toBe(false);
    expect(logs).toContain('signature mismatch');
  });

  it('refuses merchant_data that is not an object', async () => {
    const { handler, licenses } = setup();

    await post(handler, payload({ merchant_data: '["u1"]' }));
    await post(handler, payload({ merchant_data: 'not json' }));

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('refuses an over-long figmaUserId', async () => {
    const long = 'u'.repeat(65);
    const { handler, licenses } = setup();

    await post(
      handler,
      payload({
        order_id: `lgb_pro_${long}_1`,
        merchant_data: JSON.stringify({ figmaUserId: long, duration: 'yearly' }),
      }),
    );

    expect(licenses.rows.has(long)).toBe(false);
  });

  it('refuses a body that is not an object', async () => {
    const { handler } = setup();

    for (const body of [undefined, 'string', ['a'], 42]) {
      const res = await post(handler, body);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ received: true });
    }
  });

  it('does not spend a dedup key on a payload it rejects', async () => {
    const { handler, licenses, events } = setup();

    await post(handler, payload({ amount: 1 })); // rejected, same payment_id
    expect(events.seen.size).toBe(0);

    await post(handler, payload()); // the genuine delivery still lands
    expect(licenses.rows.get(USER)?.plan).toBe('pro');
  });

  it('hands the lease back when the state change fails, so a retry can work', async () => {
    const { handler, events, licenses } = setup();
    licenses.applyPurchase = async () => {
      throw new Error('store unavailable');
    };

    const res = await post(handler, payload());

    expect(res.statusCode).toBe(200);
    expect(events.seen.size).toBe(0);
  });

  it('stacks a second purchase without passing the ceiling', async () => {
    const { handler, licenses } = setup();

    await post(handler, payload({ payment_id: 'pay-1' }));
    await post(handler, payload({ payment_id: 'pay-2', order_id: `lgb_pro_${USER}_1699000000001` }));

    const end = licenses.rows.get(USER)!.cycleEndsAt.getTime();
    expect(end).toBeLessThanOrEqual(NOW + RENEWAL_WINDOW_MS.yearly + DURATION_MS.yearly);
    expect(end).toBeGreaterThan(NOW + DURATION_MS.yearly);
  });

  it('does not shorten a live yearly cycle when a monthly is bought on top', async () => {
    const { handler, licenses } = setup([proLicense(USER, new Date(NOW + 300 * DAY))]);
    const before = licenses.rows.get(USER)!.cycleEndsAt.getTime();

    await post(
      handler,
      payload({
        amount: PRICES.monthly,
        merchant_data: JSON.stringify({ figmaUserId: USER, duration: 'monthly' }),
      }),
    );

    expect(licenses.rows.get(USER)!.cycleEndsAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('answers 200 to everything, so Flitt never enters a retry storm', async () => {
    const { handler } = setup();
    const bodies = [
      null,
      { nonsense: true },
      payload({ currency: 'GEL' }),
      payload({ order_status: 'unknown-status', payment_id: 'pay-unknown' }),
    ];

    for (const body of bodies) {
      const res = await post(handler, body);
      expect(res.statusCode).toBe(200);
    }
  });
});
