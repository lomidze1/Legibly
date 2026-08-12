import { describe, expect, it } from 'vitest';
import {
  AUTH_TOKEN_KEY,
  TOKEN_SAFETY_MARGIN_MS,
  createNonce,
  isPro,
  licenseLabel,
  parseStoredToken,
  toStoredToken,
  type License,
} from '../src/shared/license';

const NOW = 1_700_000_000_000;

function pro(daysLeft: number): License {
  return { plan: 'pro', status: 'active', cycleEndsAt: new Date(NOW).toISOString(), daysLeft, judgeUsed: 0 };
}

describe('parseStoredToken', () => {
  it('accepts a token with time left on it', () => {
    const stored = { token: 'abc.def', expiresAt: NOW + 86_400_000 };
    expect(parseStoredToken(stored, NOW)).toEqual(stored);
  });

  it('rejects a token inside the safety margin', () => {
    expect(parseStoredToken({ token: 'abc.def', expiresAt: NOW + TOKEN_SAFETY_MARGIN_MS }, NOW)).toBeNull();
    expect(parseStoredToken({ token: 'abc.def', expiresAt: NOW + TOKEN_SAFETY_MARGIN_MS + 1 }, NOW)).not.toBeNull();
  });

  it('rejects an expired token', () => {
    expect(parseStoredToken({ token: 'abc.def', expiresAt: NOW - 1 }, NOW)).toBeNull();
  });

  it('rejects a NaN expiry — typeof NaN is "number"', () => {
    // Without Number.isFinite this passes: NaN - 60000 <= now is false, so the
    // token would read as valid forever and every call would 401.
    expect(parseStoredToken({ token: 'abc.def', expiresAt: NaN }, NOW)).toBeNull();
    expect(parseStoredToken({ token: 'abc.def', expiresAt: Infinity }, NOW)).toBeNull();
  });

  it('rejects anything that is not the stored shape', () => {
    const cases: unknown[] = [
      null,
      undefined,
      'a-bare-string',
      42,
      {},
      { token: 'abc.def' },
      { expiresAt: NOW + 1000 },
      { token: '', expiresAt: NOW + 86_400_000 },
      { token: 'abc.def', expiresAt: '2026-09-01T00:00:00.000Z' },
    ];

    for (const value of cases) expect(parseStoredToken(value, NOW)).toBeNull();
  });

  it('uses the documented storage key', () => {
    expect(AUTH_TOKEN_KEY).toBe('legibly_auth_token');
  });
});

describe('toStoredToken', () => {
  it('converts the ISO expiry the API sends into epoch ms', () => {
    expect(toStoredToken('abc.def', '2026-09-01T00:00:00.000Z')).toEqual({
      token: 'abc.def',
      expiresAt: Date.parse('2026-09-01T00:00:00.000Z'),
    });
  });

  it('refuses an unparseable date rather than storing NaN', () => {
    expect(toStoredToken('abc.def', 'not a date')).toBeNull();
    expect(toStoredToken('abc.def', '')).toBeNull();
    expect(toStoredToken('abc.def', undefined)).toBeNull();
    expect(toStoredToken('abc.def', 1_700_000_000_000)).toBeNull();
  });

  it('refuses a missing token', () => {
    expect(toStoredToken(undefined, '2026-09-01T00:00:00.000Z')).toBeNull();
    expect(toStoredToken('', '2026-09-01T00:00:00.000Z')).toBeNull();
  });
});

describe('licenseLabel', () => {
  it('reads Free when there is no Pro', () => {
    expect(licenseLabel(null)).toBe('Free');
    expect(licenseLabel({ ...pro(10), plan: 'free' })).toBe('Free');
  });

  it('counts the days left on Pro', () => {
    expect(licenseLabel(pro(312))).toBe('Pro · 312 days left');
  });

  it('says day, not days, on the last one', () => {
    expect(licenseLabel(pro(1))).toBe('Pro · 1 day left');
  });
});

describe('isPro', () => {
  it('is false without a licence', () => {
    expect(isPro(null)).toBe(false);
    expect(isPro({ ...pro(5), plan: 'free' })).toBe(false);
    expect(isPro(pro(5))).toBe(true);
  });
});

describe('createNonce', () => {
  it('produces 64 hex characters the server will accept', () => {
    const nonce = createNonce((length) => new Uint8Array(length).fill(0xab));

    expect(nonce).toHaveLength(64);
    expect(/^[A-Za-z0-9_-]{32,128}$/.test(nonce)).toBe(true);
    expect(nonce).toBe('ab'.repeat(32));
  });

  it('pads a byte below 0x10 instead of dropping a digit', () => {
    const nonce = createNonce((length) => new Uint8Array(length).fill(0x05));

    expect(nonce).toHaveLength(64);
    expect(nonce.startsWith('0505')).toBe(true);
  });
});
