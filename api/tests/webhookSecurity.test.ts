import { describe, expect, it } from 'vitest';

import { PRICES } from '../src/config/pricing.js';
import { createFlittWebhookHandler } from '../src/routes/webhooks/flitt.js';
import { signParams } from '../src/services/flittService.js';
import { fakeAuditStore, fakeLicenseStore, fakeResponse, fakeUsageEvents, fakeWebhookEventStore, proLicense } from './helpers.js';

/**
 * The negative half of the webhook: tampering, replay, and the status
 * transitions a licence has to survive. Every case must end in 200 — Flitt
 * retries on anything else — so the assertion is always what the *store* did.
 */

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

describe('signature tampering', () => {
  it('refuses a signature that is absent, blank, or not a string', async () => {
    const { handler, licenses, logs } = setup();

    for (const signature of [undefined, '', 12345, null, ['a']]) {
      const body = payload();
      body.signature = signature;
      const res = await post(handler, body);
      expect(res.statusCode).toBe(200);
    }

    expect(licenses.rows.has(USER)).toBe(false);
    expect(logs.every((line) => line === 'signature mismatch')).toBe(true);
  });

  it('refuses a signature that is right but the wrong length', async () => {
    const { handler, licenses } = setup();
    const body = payload();
    const correct = String(body.signature);

    // One character short, and one character long: timingSafeEqual throws on a
    // length mismatch, so the length has to be checked before it is called.
    for (const signature of [correct.slice(0, -1), `${correct}0`]) {
      body.signature = signature;
      await expect(post(handler, body)).resolves.toMatchObject({ statusCode: 200 });
    }

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('refuses the correct digest in the wrong case — the comparison is over bytes', async () => {
    const { handler, licenses } = setup();
    const body = payload();
    body.signature = String(body.signature).toUpperCase();

    await post(handler, body);

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('refuses a payload signed for a different order', async () => {
    const { handler, licenses } = setup();
    const genuine = payload();
    const forged = payload({ amount: 1 });
    // The attacker keeps the signature of the real purchase and swaps the body.
    forged.signature = genuine.signature;

    await post(handler, forged);

    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('grants nothing when a field is added after signing', async () => {
    const { handler, licenses } = setup();
    const body = payload({ order_status: 'declined', payment_id: 'pay-declined' });
    body.order_status = 'approved';

    await post(handler, body);

    expect(licenses.rows.has(USER)).toBe(false);
  });
});

describe('missing and unusable fields', () => {
  const cases: Array<[string, Record<string, unknown>, RegExp]> = [
    ['no order_id', { order_id: undefined }, /missing required fields/],
    ['no order_status', { order_status: undefined }, /missing required fields/],
    ['no merchant_data', { merchant_data: undefined }, /missing required fields/],
    ['no currency', { currency: undefined }, /unexpected currency/],
    ['no amount', { amount: undefined }, /unusable amount/],
    ['a fractional amount', { amount: 120.5 }, /unusable amount/],
    ['a negative amount', { amount: -12000 }, /unusable amount/],
    ['an amount that is not a number', { amount: true }, /unusable amount/],
  ];

  it.each(cases)('refuses a callback with %s', async (_name, overrides, reason) => {
    const { handler, licenses, logs } = setup();

    const res = await post(handler, payload(overrides));

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.has(USER)).toBe(false);
    expect(logs.join('\n')).toMatch(reason);
  });

  it('refuses merchant_data whose figmaUserId is not a usable string', async () => {
    const { handler, licenses } = setup();

    for (const figmaUserId of [42, '', null, { id: 'u1' }]) {
      await post(handler, payload({ merchant_data: JSON.stringify({ figmaUserId, duration: 'yearly' }) }));
    }

    expect(licenses.rows.size).toBe(0);
  });

  it('refuses merchant_data with no usable duration, so no cycle length can be inferred', async () => {
    const { handler, licenses, logs } = setup();

    await post(handler, payload({ merchant_data: JSON.stringify({ figmaUserId: USER, duration: 'weekly' }) }));

    expect(licenses.rows.has(USER)).toBe(false);
    expect(logs.join('\n')).toMatch(/no usable duration/);
  });

  it('accepts an amount sent as a string, which Flitt is documented to do', async () => {
    const { handler, licenses } = setup();

    await post(handler, payload({ amount: String(PRICES.yearly) }));

    expect(licenses.rows.get(USER)?.plan).toBe('pro');
  });
});

describe('replay and idempotency', () => {
  it('does not take a lease for a payload that fails the signature check', async () => {
    const { handler, events } = setup();
    const body = payload();
    body.signature = 'f'.repeat(40);

    await post(handler, body);

    expect(events.seen.size).toBe(0);
  });

  it('deduplicates a retried delivery that carries no payment_id', async () => {
    const { handler, licenses } = setup();
    const body = payload({ payment_id: undefined });

    await post(handler, body);
    const firstEnd = licenses.rows.get(USER)?.cycleEndsAt.getTime();
    const res = await post(handler, body);

    expect(res.body).toEqual({ received: true, deduped: true });
    expect(licenses.rows.get(USER)?.cycleEndsAt.getTime()).toBe(firstEnd);
  });

  it('deduplicates a replayed reversal, leaving the licence free rather than re-revoking', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload());

    const reversal = payload({ order_status: 'reversed', payment_id: 'pay-reversal' });
    await post(handler, reversal);
    const res = await post(handler, reversal);

    expect(res.body).toEqual({ received: true, deduped: true });
    expect(licenses.rows.get(USER)?.plan).toBe('free');
  });

  it('hands the lease back when a refund fails, so Flitt can retry it', async () => {
    const { handler, events, licenses } = setup();
    await post(handler, payload());
    licenses.applyRefund = async () => {
      throw new Error('store unavailable');
    };

    const res = await post(handler, payload({ order_status: 'reversed', payment_id: 'pay-reversal' }));

    expect(res.statusCode).toBe(200);
    expect(events.seen.has('pay-reversal')).toBe(false);
  });

  it('does not release a lease it does not hold when a duplicate arrives', async () => {
    const { handler, events, licenses } = setup();
    await post(handler, payload());
    licenses.applyPurchase = async () => {
      throw new Error('store unavailable');
    };

    await post(handler, payload());

    // The retry was deduped before any work started, so the original lease
    // must still be there — releasing someone else's would open the door to
    // paying twice.
    expect(events.seen.has('pay-1_approved')).toBe(true);
  });

  /*
   * Flitt's reversal reports on the payment it reverses, so it arrives under
   * the approval's payment_id. Once the ledger key was the id alone, this was
   * deduplicated and the refunded user kept Pro. The key is now id + status.
   */
  it('revokes on a reversal that reuses the payment id of the approval it reverses', async () => {
    const { handler, licenses } = setup();

    await post(handler, payload({ payment_id: 'pay-1' }));
    expect(licenses.rows.get(USER)?.plan).toBe('pro');

    const res = await post(handler, payload({ order_status: 'reversed', payment_id: 'pay-1' }));

    expect(res.body).toEqual({ received: true });
    expect(licenses.rows.get(USER)?.plan).toBe('free');
    expect(licenses.rows.get(USER)?.status).toBe('expired');
  });
});

describe('status transitions', () => {
  it('lets a user buy again after a reversal', async () => {
    const { handler, licenses } = setup();

    await post(handler, payload());
    await post(handler, payload({ order_status: 'reversed', payment_id: 'pay-reversal' }));
    expect(licenses.rows.get(USER)?.plan).toBe('free');

    await post(handler, payload({ order_id: `lgb_pro_${USER}_1699000000002`, payment_id: 'pay-2' }));

    expect(licenses.rows.get(USER)?.plan).toBe('pro');
    expect(licenses.rows.get(USER)?.cycleEndsAt.getTime()).toBeGreaterThan(NOW);
  });

  it('revokes on a reversal whose amount differs — a partial refund still ends the licence', async () => {
    const { handler, licenses } = setup();
    await post(handler, payload());

    await post(handler, payload({ order_status: 'reversed', amount: 600, payment_id: 'pay-partial' }));

    // The amount is only checked against the price list on an approval. A
    // reversal is Flitt telling us the money went back, whatever the figure.
    expect(licenses.rows.get(USER)?.plan).toBe('free');
  });

  it('grants Pro when a 3DS payment reports processing first and approved after, under one payment id', async () => {
    // Seen live on 2026-09-17: Flitt sent `processing` for a 3DS card, then the
    // outcome under the same payment_id. Keyed on the id alone, the approval
    // was a "duplicate" — the card was charged and nothing was granted.
    const { handler, licenses } = setup();

    await post(handler, payload({ order_status: 'processing', payment_id: 'pay-3ds' }));
    expect(licenses.rows.get(USER)?.plan ?? 'free').toBe('free');

    const res = await post(handler, payload({ order_status: 'approved', payment_id: 'pay-3ds' }));

    expect(res.body).toEqual({ received: true });
    expect(licenses.rows.get(USER)?.plan).toBe('pro');
  });

  it('still deduplicates a true retry — same payment id, same status', async () => {
    const { handler } = setup();

    await post(handler, payload({ order_status: 'processing', payment_id: 'pay-3ds' }));
    const res = await post(handler, payload({ order_status: 'processing', payment_id: 'pay-3ds' }));

    expect(res.body).toEqual({ received: true, deduped: true });
  });

  it('leaves an unrecognised order status alone but still records the delivery', async () => {
    const { handler, licenses, events } = setup([proLicense(USER, new Date(NOW + 300 * DAY))]);

    const res = await post(handler, payload({ order_status: 'processing', payment_id: 'pay-processing' }));

    expect(res.body).toEqual({ received: true });
    expect(licenses.rows.get(USER)?.plan).toBe('pro');
    expect(events.seen.has('pay-processing_processing')).toBe(true);
  });

  it('ignores a reversal aimed at a user who has no licence row', async () => {
    const { handler, licenses } = setup();

    const res = await post(handler, payload({ order_status: 'reversed', payment_id: 'pay-orphan' }));

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.has(USER)).toBe(false);
  });

  it('does not let a declined attempt block the approval that follows it', async () => {
    const { handler, licenses } = setup();

    await post(handler, payload({ order_status: 'declined', payment_id: 'pay-declined' }));
    await post(handler, payload({ payment_id: 'pay-approved' }));

    expect(licenses.rows.get(USER)?.plan).toBe('pro');
  });
});
