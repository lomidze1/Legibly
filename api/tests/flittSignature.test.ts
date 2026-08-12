import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  FlittError,
  ORDER_ID_PREFIX,
  buildOrderId,
  isOrderSafeUserId,
  orderIdBelongsTo,
  sanitizeUserId,
  signParams,
  verifyCallback,
} from '../src/services/flittService.js';

const SECRET = 'test_secret_key';

/** Independent reimplementation of the documented rule, used as the oracle. */
function expectedSignature(values: string[]): string {
  return createHash('sha1').update([SECRET, ...values].join('|'), 'utf8').digest('hex');
}

describe('signParams', () => {
  it('matches the canonical vector from docs.flitt.com', () => {
    // The same fixture Web2Wireframe's flitt-service test asserts on, carried
    // over deliberately: it is the one check that does not depend on our own
    // reading of the rule. Concat is
    // "test|1000|GEL|1549901|Test payment|TestOrder2|http://myshop/callback/".
    const params = {
      merchant_id: 1549901,
      order_id: 'TestOrder2',
      amount: 1000,
      currency: 'GEL',
      order_desc: 'Test payment',
      server_callback_url: 'http://myshop/callback/',
    };

    expect(signParams(params, 'test')).toBe('cd0edb710cbbdb6c2a4d965cdb91fdfabc343215');
  });

  it('matches a hand-computed vector', () => {
    const params = {
      merchant_id: '1396424',
      order_id: 'lgb_pro_u1_1700000000000',
      amount: 12000,
      currency: 'USD',
    };

    // Ordered by key: amount, currency, merchant_id, order_id.
    expect(signParams(params, SECRET)).toBe(expectedSignature(['12000', 'USD', '1396424', 'lgb_pro_u1_1700000000000']));
  });

  it('puts the secret first — it is not an HMAC key', () => {
    const signature = signParams({ a: '1' }, SECRET);

    expect(signature).toBe(createHash('sha1').update(`${SECRET}|1`, 'utf8').digest('hex'));
    expect(signature).not.toBe(createHash('sha1').update('1', 'utf8').digest('hex'));
  });

  it('sorts by key but concatenates only values', () => {
    const signature = signParams({ zeta: 'first-alphabetically-last', alpha: 'z-value' }, SECRET);

    // alpha before zeta, even though its value sorts after.
    expect(signature).toBe(expectedSignature(['z-value', 'first-alphabetically-last']));
  });

  it('is stable regardless of the order the keys arrive in', () => {
    const a = signParams({ b: '2', a: '1', c: '3' }, SECRET);
    const b = signParams({ c: '3', b: '2', a: '1' }, SECRET);

    expect(a).toBe(b);
  });

  it('drops empty strings, null and undefined', () => {
    const withBlanks = signParams({ a: '1', b: '', c: null, d: undefined, e: '2' }, SECRET);
    expect(withBlanks).toBe(expectedSignature(['1', '2']));
  });

  it('keeps a zero amount — a truthiness filter would have dropped it', () => {
    expect(signParams({ amount: 0, currency: 'USD' }, SECRET)).toBe(expectedSignature(['0', 'USD']));
  });

  it('keeps false', () => {
    expect(signParams({ flag: false, x: '1' }, SECRET)).toBe(expectedSignature(['false', '1']));
  });

  it('excludes signature and response_signature_string', () => {
    const params = { a: '1', signature: 'deadbeef', response_signature_string: `${SECRET}|1` };
    expect(signParams(params, SECRET)).toBe(expectedSignature(['1']));
  });

  it('signs merchant_data as the JSON string the caller passes', () => {
    const merchantData = JSON.stringify({ figmaUserId: 'u1', duration: 'yearly' });
    const signature = signParams({ merchant_data: merchantData }, SECRET);

    expect(signature).toBe(expectedSignature([merchantData]));
    expect(signature).not.toBe(expectedSignature(['[object Object]']));
  });
});

describe('verifyCallback', () => {
  function signed(params: Record<string, unknown>): Record<string, unknown> {
    return { ...params, signature: signParams(params, SECRET) };
  }

  it('accepts a correctly signed payload', () => {
    expect(verifyCallback(signed({ order_id: 'lgb_pro_u1_1', order_status: 'approved', amount: 12000 }), SECRET)).toBe(
      true,
    );
  });

  it('accepts a payload carrying Flitt response_signature_string echo', () => {
    const payload = signed({ order_id: 'lgb_pro_u1_1', amount: 12000 });
    payload.response_signature_string = `${SECRET}|12000|lgb_pro_u1_1`;

    expect(verifyCallback(payload, SECRET)).toBe(true);
  });

  it('rejects a tampered amount', () => {
    const payload = signed({ order_id: 'lgb_pro_u1_1', amount: 12000 });
    payload.amount = 1;

    expect(verifyCallback(payload, SECRET)).toBe(false);
  });

  it('rejects a payload signed with a different secret', () => {
    expect(verifyCallback(signed({ order_id: 'lgb_pro_u1_1' }), 'another_secret')).toBe(false);
  });

  it('rejects a missing or empty signature', () => {
    expect(verifyCallback({ order_id: 'lgb_pro_u1_1' }, SECRET)).toBe(false);
    expect(verifyCallback({ order_id: 'lgb_pro_u1_1', signature: '' }, SECRET)).toBe(false);
  });

  it('rejects a signature of the wrong length without throwing', () => {
    expect(verifyCallback({ order_id: 'x', signature: 'ab' }, SECRET)).toBe(false);
  });

  it('rejects object and array values before re-signing them', () => {
    const nested = { order_id: 'lgb_pro_u1_1', merchant_data: { figmaUserId: 'u1' } };
    const asArray = { order_id: 'lgb_pro_u1_1', tags: ['a', 'b'] };

    expect(verifyCallback({ ...nested, signature: signParams(nested, SECRET) }, SECRET)).toBe(false);
    expect(verifyCallback({ ...asArray, signature: signParams(asArray, SECRET) }, SECRET)).toBe(false);
  });

  it('rejects a value containing the separator — canonicalisation injection', () => {
    const injected = { order_id: 'lgb_pro_u1_1|extra', amount: 12000 };
    expect(verifyCallback({ ...injected, signature: signParams(injected, SECRET) }, SECRET)).toBe(false);
  });

  it('rejects anything that is not a plain object', () => {
    for (const bad of [null, undefined, 'string', 42, ['a']]) {
      expect(verifyCallback(bad, SECRET)).toBe(false);
    }
  });
});

describe('order ids', () => {
  it('carries the lgb_ prefix that separates us from Web2Wireframe', () => {
    expect(ORDER_ID_PREFIX).toBe('lgb_pro_');
    expect(buildOrderId('user1', 1700000000000)).toBe('lgb_pro_user1_1700000000000');
    expect(buildOrderId('user1', 1700000000000).startsWith('w2w_')).toBe(false);
  });

  /**
   * Sanitising is lossy, so it can no longer be applied silently: `u|ser1` and
   * `user1` collapse to one string and would share an order-id namespace while
   * their licence rows stay keyed on the raw value.
   */
  it('refuses an id that sanitising would change', () => {
    expect(sanitizeUserId('u|ser 1@x')).toBe('user1x');
    expect(isOrderSafeUserId('u|ser 1@x')).toBe(false);
    expect(isOrderSafeUserId('')).toBe(false);
    expect(() => buildOrderId('u|ser 1@x', 1)).toThrow(FlittError);
  });

  it('accepts the ids Figma actually issues', () => {
    expect(isOrderSafeUserId('1234567890')).toBe(true);
    expect(isOrderSafeUserId('user-1_x')).toBe(true);
    expect(buildOrderId('1234567890', 1)).toBe('lgb_pro_1234567890_1');
  });

  it('will not tie a collapsible id to someone else’s order', () => {
    // Before: both sanitise to "user1", so this returned true and one user's
    // reversal could have been accepted against the other's order.
    expect(orderIdBelongsTo('lgb_pro_user1_1', 'u|ser1')).toBe(false);
    expect(orderIdBelongsTo('lgb_pro_user1_1', 'user1')).toBe(true);
  });

  it('matches an order id back to its owner', () => {
    expect(orderIdBelongsTo('lgb_pro_user1_1700000000000', 'user1')).toBe(true);
    expect(orderIdBelongsTo('lgb_pro_user1_1700000000000', 'user2')).toBe(false);
    expect(orderIdBelongsTo('w2w_pro_user1_1700000000000', 'user1')).toBe(false);
  });

  it('does not let a prefix of another id pass as its own', () => {
    // "user1" must not match an order minted for "user10".
    expect(orderIdBelongsTo('lgb_pro_user10_1', 'user1')).toBe(false);
  });
});
