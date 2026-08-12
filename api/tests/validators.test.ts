import { describe, expect, it } from 'vitest';

import { isDuration, PRICES, DURATION_MS, RENEWAL_WINDOW_MS, CURRENCY } from '../src/config/pricing.js';
import { asAmountCents, asString, asStringMax, isPlainObject } from '../src/lib/validators.js';

describe('isPlainObject', () => {
  it('accepts an object literal and a parsed JSON object', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject(JSON.parse('{"figmaUserId":"u1"}'))).toBe(true);
  });

  it('rejects arrays — a JSON array is a valid body and must not read as a payload', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(['u1'])).toBe(false);
  });

  it('rejects null, primitives and undefined', () => {
    for (const value of [null, undefined, 'string', 42, true]) {
      expect(isPlainObject(value)).toBe(false);
    }
  });
});

describe('asString', () => {
  it('accepts a non-empty string only', () => {
    expect(asString('approved')).toBe('approved');
    expect(asString('')).toBeUndefined();
  });

  it('refuses to coerce a number or a boolean into an order status', () => {
    for (const value of [42, true, null, undefined, {}, ['a']]) {
      expect(asString(value)).toBeUndefined();
    }
  });
});

describe('asStringMax', () => {
  it('accepts a string at the limit and refuses the one past it', () => {
    expect(asStringMax('u'.repeat(64), 64)).toBe('u'.repeat(64));
    expect(asStringMax('u'.repeat(65), 64)).toBeUndefined();
  });

  it('refuses rather than truncating — an over-long id is a rejection, not a prefix', () => {
    expect(asStringMax('abcdef', 3)).toBeUndefined();
  });
});

describe('asAmountCents', () => {
  it('accepts the two shapes Flitt actually sends', () => {
    expect(asAmountCents(12000)).toBe(12000);
    expect(asAmountCents('12000')).toBe(12000);
  });

  it('accepts a genuine zero', () => {
    expect(asAmountCents(0)).toBe(0);
  });

  it('refuses a fractional or negative amount', () => {
    expect(asAmountCents(120.5)).toBeUndefined();
    expect(asAmountCents('120.5')).toBeUndefined();
    expect(asAmountCents(-12000)).toBeUndefined();
  });

  it('refuses anything that is not a number or a string', () => {
    for (const value of [true, null, undefined, {}, [12000], NaN, Infinity]) {
      expect(asAmountCents(value)).toBeUndefined();
    }
  });

  it('reads a blank amount as zero, which no price can match', () => {
    // `signParams` drops empty values, so a blank `amount` is not covered by the
    // signature. It must therefore never read as a payable figure — and 0 is
    // compared against PRICES like any other number, so an approval is refused.
    expect(asAmountCents('')).toBe(0);
    expect(Object.values(PRICES)).not.toContain(0);
  });
});

describe('isDuration', () => {
  it('accepts exactly the two durations that are sold', () => {
    expect(isDuration('monthly')).toBe(true);
    expect(isDuration('yearly')).toBe(true);
  });

  it('rejects anything else a client might put in a body', () => {
    for (const value of ['weekly', 'MONTHLY', '', 12, null, undefined, {}, ['yearly']]) {
      expect(isDuration(value)).toBe(false);
    }
  });
});

describe('pricing constants', () => {
  it('keeps every duration priced, timed and given a renewal window', () => {
    for (const duration of ['monthly', 'yearly'] as const) {
      expect(PRICES[duration]).toBeGreaterThan(0);
      expect(DURATION_MS[duration]).toBeGreaterThan(0);
      // The window has to be shorter than the cycle, or a licence would be
      // renewable from the day it was bought.
      expect(RENEWAL_WINDOW_MS[duration]).toBeLessThan(DURATION_MS[duration]);
    }
  });

  it('makes the year cheaper per day than the month, which is what the page claims', () => {
    expect(PRICES.yearly / DURATION_MS.yearly).toBeLessThan(PRICES.monthly / DURATION_MS.monthly);
  });

  it('charges in USD — the webhook refuses every other currency', () => {
    expect(CURRENCY).toBe('USD');
  });
});
