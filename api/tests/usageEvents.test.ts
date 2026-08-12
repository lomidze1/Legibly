import { describe, expect, it } from 'vitest';

import { PRICES } from '../src/config/pricing.js';
import { signToken } from '../src/lib/hmac.js';
import { createCheckoutCreateHandler } from '../src/routes/checkout/create.js';
import { createJudgeHandler } from '../src/routes/judge/judge.js';
import { createLicenseMeHandler } from '../src/routes/license/me.js';
import { createFlittWebhookHandler } from '../src/routes/webhooks/flitt.js';
import { FlittError, signParams, type FlittConfig } from '../src/services/flittService.js';
import { JudgeUnavailableError, type RunModel } from '../src/services/judgeService.js';
import {
  fakeAuditStore,
  fakeLicenseStore,
  fakeResponse,
  fakeUsageEvents,
  fakeWebhookEventStore,
  proLicense,
} from './helpers.js';

/**
 * What the admin panel is allowed to know. Each route records the fact that
 * something happened and nothing about what was in it — these tests are the
 * place that stays true when someone later reaches for "just one more field".
 */

const SECRET = 'k'.repeat(40);
const FLITT_SECRET = 'test_secret_key';
const NOW = Date.parse('2026-08-12T12:00:00Z');
const config: FlittConfig = { merchantId: '1396424', secretKey: FLITT_SECRET, baseUrl: 'https://pay.flitt.com' };

function bearer(userId: string) {
  return { authorization: `Bearer ${signToken(userId, SECRET, 3600, NOW)}` };
}

function callback(fields: Record<string, string | number>) {
  const payload = { ...fields } as Record<string, unknown>;
  payload.signature = signParams(payload, FLITT_SECRET);
  return payload;
}

describe('licence check-in', () => {
  it('records one check-in per licence poll, tagged with the plan', async () => {
    const licenses = fakeLicenseStore([proLicense('u1', new Date(NOW + 100 * 86_400_000))]);
    const usage = fakeUsageEvents();
    const handler = createLicenseMeHandler({ licenses, events: usage, authSecret: SECRET, now: () => NOW });

    await handler({ method: 'GET', headers: bearer('u1') }, fakeResponse());

    expect(usage.recorded).toEqual([
      { figmaUserId: 'u1', kind: 'checkin', detail: 'pro', at: new Date(NOW) },
    ]);
  });

  it('records nothing for a caller who never authenticated', async () => {
    const usage = fakeUsageEvents();
    const handler = createLicenseMeHandler({
      licenses: fakeLicenseStore(),
      events: usage,
      authSecret: SECRET,
      now: () => NOW,
    });

    await handler({ method: 'GET', headers: {} }, fakeResponse());

    expect(usage.recorded).toHaveLength(0);
  });
});

describe('checkout funnel', () => {
  it('records a started checkout with the duration and nothing else', async () => {
    const usage = fakeUsageEvents();
    const handler = createCheckoutCreateHandler({
      config,
      licenses: fakeLicenseStore(),
      events: usage,
      createCheckout: async () => 'https://pay.flitt.com/c/abc',
      authSecret: SECRET,
      apiPublicUrl: 'https://api.legibly.design',
      now: () => NOW,
    });

    await handler({ method: 'POST', headers: bearer('u1'), body: { duration: 'yearly' } }, fakeResponse());

    expect(usage.recorded).toEqual([
      { figmaUserId: 'u1', kind: 'checkout_created', detail: 'yearly', at: new Date(NOW) },
    ]);
  });

  it('marks a checkout the user never saw as a failed attempt', async () => {
    const usage = fakeUsageEvents();
    const handler = createCheckoutCreateHandler({
      config,
      licenses: fakeLicenseStore(),
      events: usage,
      createCheckout: async () => {
        throw new FlittError('Flitt checkout failed with status 500');
      },
      authSecret: SECRET,
      apiPublicUrl: 'https://api.legibly.design',
      now: () => NOW,
    });

    await handler({ method: 'POST', headers: bearer('u1'), body: { duration: 'monthly' } }, fakeResponse());

    expect(usage.recorded[0]).toMatchObject({ kind: 'checkout_created', ok: false, detail: 'checkout_unavailable' });
  });
});

describe('webhook instrumentation', () => {
  function setup(seed: Parameters<typeof fakeLicenseStore>[0] = []) {
    const licenses = fakeLicenseStore(seed);
    const usage = fakeUsageEvents();
    const audit = fakeAuditStore();
    return {
      licenses,
      usage,
      audit,
      handler: createFlittWebhookHandler({
        secretKey: FLITT_SECRET,
        licenses,
        events: fakeWebhookEventStore(),
        usage,
        audit,
        now: () => NOW,
        log: () => undefined,
      }),
    };
  }

  const approved = callback({
    order_id: 'lgb_pro_u1_1',
    order_status: 'approved',
    currency: 'USD',
    amount: PRICES.monthly,
    payment_id: 'p1',
    merchant_data: JSON.stringify({ figmaUserId: 'u1', duration: 'monthly' }),
  });

  it('records a paid checkout and an audit row for an approved charge', async () => {
    const { handler, usage, audit } = setup();
    await handler({ method: 'POST', headers: {}, body: approved }, fakeResponse());

    expect(usage.recorded[0]).toMatchObject({ kind: 'checkout_paid', detail: 'monthly' });
    expect(audit.entries[0]).toMatchObject({ action: 'purchase', actor: 'webhook' });
    expect(audit.entries[0]?.detail).toContain('monthly');
  });

  it('records a declined charge as a failed attempt with no audit row', async () => {
    const { handler, usage, audit } = setup();
    const declined = callback({
      order_id: 'lgb_pro_u1_2',
      order_status: 'declined',
      currency: 'USD',
      amount: PRICES.monthly,
      payment_id: 'p2',
      merchant_data: JSON.stringify({ figmaUserId: 'u1', duration: 'monthly' }),
    });

    await handler({ method: 'POST', headers: {}, body: declined }, fakeResponse());

    expect(usage.recorded[0]).toMatchObject({ kind: 'checkout_failed', ok: false, detail: 'declined' });
    expect(audit.entries).toHaveLength(0);
  });

  it('separates a reversal that ended a licence from one that did not', async () => {
    const live = proLicense('u1', new Date(NOW + 100 * 86_400_000));
    const { handler, usage, audit } = setup([{ ...live, flittOrderId: 'lgb_pro_u1_9' }]);
    const reversed = callback({
      order_id: 'lgb_pro_u1_1',
      order_status: 'reversed',
      currency: 'USD',
      amount: PRICES.monthly,
      payment_id: 'p3',
      merchant_data: JSON.stringify({ figmaUserId: 'u1', duration: 'monthly' }),
    });

    await handler({ method: 'POST', headers: {}, body: reversed }, fakeResponse());

    // The order being reversed is not the one in force, so the licence stands.
    expect(usage.recorded[0]).toMatchObject({ kind: 'checkout_refunded', ok: false });
    expect(audit.entries[0]?.detail).toContain('licence untouched');
  });

  it('never lets a broken audit store fail a payment', async () => {
    const licenses = fakeLicenseStore();
    const handler = createFlittWebhookHandler({
      secretKey: FLITT_SECRET,
      licenses,
      events: fakeWebhookEventStore(),
      usage: fakeUsageEvents(),
      audit: {
        async record() {
          throw new Error('audit store down');
        },
      },
      now: () => NOW,
      log: () => undefined,
    });

    const res = fakeResponse();
    await handler({ method: 'POST', headers: {}, body: approved }, res);

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.get('u1')?.plan).toBe('pro');
  });
});

describe('judge instrumentation', () => {
  const verdict = { overall: { score: 4, summary: 'Solid; tighten the card padding.' }, findings: [] };
  const input = {
    png: Buffer.from('a fake png').toString('base64'),
    nodes: [{ type: 'TEXT', name: 'Title', x: 16, y: 16, w: 288, h: 24, text: 'Get started' }],
  };

  function setup(runModel: RunModel) {
    const licenses = fakeLicenseStore([proLicense('u1', new Date(NOW + 100 * 86_400_000))]);
    const usage = fakeUsageEvents();
    return {
      usage,
      handler: createJudgeHandler({
        licenses,
        events: usage,
        runModel,
        authSecret: SECRET,
        freeTrials: 3,
        proMonthly: 30,
        now: () => NOW,
      }),
    };
  }

  it('records a successful call with the plan that paid for it', async () => {
    const { handler, usage } = setup(async () => ({ text: JSON.stringify(verdict), stopReason: 'end_turn' }));

    await handler({ method: 'POST', headers: bearer('u1'), body: input }, fakeResponse());

    expect(usage.recorded[0]).toMatchObject({ kind: 'judge_call', detail: 'pro' });
  });

  it('records an outage the founder would otherwise never see', async () => {
    const { handler, usage } = setup(async () => {
      throw new JudgeUnavailableError('upstream 500');
    });

    const res = fakeResponse();
    await handler({ method: 'POST', headers: bearer('u1'), body: input }, res);

    expect(res.statusCode).toBe(503);
    expect(usage.recorded[0]).toMatchObject({ kind: 'judge_call', ok: false, detail: 'judge_unavailable' });
  });
});
