import { describe, expect, it } from 'vitest';
import type { License } from '../src/shared/license';
import type { ExchangeResult } from '../src/ui/apiClient';
import {
  CHECKOUT_POLL_INTERVAL_MS,
  CHECKOUT_TIMEOUT_MS,
  CONNECT_POLL_INTERVAL_MS,
  CONNECT_TIMEOUT_MS,
  pollForPro,
  pollForToken,
} from '../src/ui/licenseClient';

const NOW = 1_700_000_000_000;

/** A clock that only moves when the code under test sleeps. */
function fakeClock() {
  let time = NOW;
  const slept: number[] = [];
  return {
    slept,
    now: () => time,
    sleep: async (ms: number) => {
      slept.push(ms);
      time += ms;
    },
  };
}

const freeLicense: License = { plan: 'free', status: 'active', cycleEndsAt: null, daysLeft: 0, judgeUsed: 0 };
const proLicense: License = {
  plan: 'pro',
  status: 'active',
  cycleEndsAt: '2027-08-12T00:00:00.000Z',
  daysLeft: 365,
  judgeUsed: 0,
};

describe('pollForToken', () => {
  it('returns the token as soon as the browser finishes', async () => {
    const clock = fakeClock();
    let calls = 0;
    const exchange = async (): Promise<ExchangeResult> => {
      calls += 1;
      return calls < 3
        ? { pending: true }
        : { pending: false, token: 'abc.def', expiresAt: '2026-09-01T00:00:00.000Z' };
    };

    const token = await pollForToken('nonce', exchange, clock);

    expect(token).toEqual({ token: 'abc.def', expiresAt: Date.parse('2026-09-01T00:00:00.000Z') });
    expect(clock.slept).toEqual([CONNECT_POLL_INTERVAL_MS, CONNECT_POLL_INTERVAL_MS]);
  });

  it('gives up at the deadline instead of waiting forever', async () => {
    const clock = fakeClock();
    const token = await pollForToken('nonce', async () => ({ pending: true }), clock);

    expect(token).toBeNull();
    expect(clock.now()).toBeGreaterThanOrEqual(NOW + CONNECT_TIMEOUT_MS);
  });

  it('waits as long as the server parks the token', () => {
    // Five minutes on both sides. A shorter window here would abandon tokens
    // that the callback had already left waiting.
    expect(CONNECT_TIMEOUT_MS).toBe(300_000);
  });

  it('stops when the panel closes', async () => {
    const clock = fakeClock();
    let calls = 0;

    const token = await pollForToken('nonce', async () => {
      calls += 1;
      return { pending: true };
    }, { ...clock, cancelled: () => calls >= 2 });

    expect(token).toBeNull();
    expect(calls).toBe(2);
  });

  it('treats an unusable expiry as not connected rather than storing it', async () => {
    const clock = fakeClock();
    const token = await pollForToken(
      'nonce',
      async () => ({ pending: false, token: 'abc.def', expiresAt: 'not a date' }),
      clock,
    );

    expect(token).toBeNull();
  });
});

describe('pollForPro', () => {
  it('returns as soon as Pro appears', async () => {
    const clock = fakeClock();
    let calls = 0;
    const fetchLicense = async (): Promise<License> => {
      calls += 1;
      return calls < 3 ? freeLicense : proLicense;
    };

    await expect(pollForPro(fetchLicense, clock)).resolves.toEqual(proLicense);
    expect(clock.slept).toEqual([CHECKOUT_POLL_INTERVAL_MS, CHECKOUT_POLL_INTERVAL_MS]);
  });

  it('returns the last licence it saw when the payment does not land in time', async () => {
    const clock = fakeClock();
    await expect(pollForPro(async () => freeLicense, clock)).resolves.toEqual(freeLicense);
    expect(clock.now()).toBeGreaterThanOrEqual(NOW + CHECKOUT_TIMEOUT_MS);
  });

  it('is bounded — this is the only poll in the plugin', () => {
    expect(CHECKOUT_TIMEOUT_MS).toBe(60_000);
  });
});
