import { describe, expect, it } from 'vitest';

import { DURATION_MS, RENEWAL_WINDOW_MS } from '../src/config/pricing.js';
import type { LicenseRow } from '../src/models/License.js';
import { computeCycleEnd, isLivePro, renewalState } from '../src/services/licenseService.js';
import { proLicense } from './helpers.js';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function freeRow(): LicenseRow {
  return {
    figmaUserId: 'u1',
    email: null,
    plan: 'free',
    status: 'active',
    cycleStartedAt: new Date(NOW),
    cycleEndsAt: new Date(NOW),
    judgeUsed: 0,
    judgeMonth: null,
    judgeMonthUsed: 0,
    flittOrderId: null,
    lastDuration: null,
  };
}

describe('computeCycleEnd', () => {
  it('starts a fresh cycle for a first purchase', () => {
    expect(computeCycleEnd(null, 'yearly', NOW)).toBe(NOW + DURATION_MS.yearly);
    expect(computeCycleEnd(freeRow(), 'monthly', NOW)).toBe(NOW + DURATION_MS.monthly);
  });

  it('stacks onto what is left of a live cycle', () => {
    const existing = proLicense('u1', new Date(NOW + 5 * DAY));
    expect(computeCycleEnd(existing, 'monthly', NOW)).toBe(NOW + 5 * DAY + DURATION_MS.monthly);
  });

  it('ignores a cycle that has already run out', () => {
    const lapsed = proLicense('u1', new Date(NOW - DAY));
    expect(computeCycleEnd(lapsed, 'monthly', NOW)).toBe(NOW + DURATION_MS.monthly);
  });

  it('caps a run of stacked purchases', () => {
    let end = computeCycleEnd(null, 'yearly', NOW);
    for (let i = 0; i < 5; i += 1) {
      end = computeCycleEnd(proLicense('u1', new Date(end)), 'yearly', NOW);
    }

    expect(end).toBeLessThanOrEqual(NOW + RENEWAL_WINDOW_MS.yearly + DURATION_MS.yearly);
  });

  it('never shortens a longer cycle that is already paid for', () => {
    // A monthly top-up on a live yearly licence: the monthly cap is far below
    // the existing end date, and a plain Math.min would cut the year back.
    const existing = proLicense('u1', new Date(NOW + 300 * DAY));
    const end = computeCycleEnd(existing, 'monthly', NOW);

    expect(end).toBeGreaterThanOrEqual(existing.cycleEndsAt.getTime());
    expect(end).toBe(existing.cycleEndsAt.getTime());
  });

  it('lets a renewal inside the window add its full duration', () => {
    const existing = proLicense('u1', new Date(NOW + 6 * DAY));
    expect(computeCycleEnd(existing, 'monthly', NOW)).toBe(NOW + 6 * DAY + DURATION_MS.monthly);
  });
});

describe('renewalState', () => {
  it('lets a free user buy', () => {
    expect(renewalState(null, 'yearly', NOW).canBuy).toBe(true);
    expect(renewalState(freeRow(), 'yearly', NOW).canBuy).toBe(true);
  });

  it('lets a lapsed Pro buy again', () => {
    expect(renewalState(proLicense('u1', new Date(NOW - 1)), 'yearly', NOW).canBuy).toBe(true);
  });

  it('blocks a live Pro that is outside the renewal window', () => {
    const state = renewalState(proLicense('u1', new Date(NOW + 300 * DAY)), 'yearly', NOW);

    expect(state.canBuy).toBe(false);
    expect(state.remainingDays).toBe(300);
    expect(state.renewalOpensInDays).toBe(290);
    expect(state.renewalWindowDays).toBe(10);
  });

  it('opens up once the cycle is inside the window', () => {
    const state = renewalState(proLicense('u1', new Date(NOW + 9 * DAY)), 'yearly', NOW);

    expect(state.canBuy).toBe(true);
    expect(state.renewalOpensInDays).toBe(0);
  });

  it('uses the window of the duration being bought', () => {
    const existing = proLicense('u1', new Date(NOW + 8 * DAY));

    expect(renewalState(existing, 'yearly', NOW).canBuy).toBe(true); // 10-day window
    expect(renewalState(existing, 'monthly', NOW).canBuy).toBe(false); // 7-day window
  });
});

describe('isLivePro', () => {
  it('is true only for a pro row whose cycle is still running', () => {
    expect(isLivePro(proLicense('u1', new Date(NOW + 1)), NOW)).toBe(true);
    expect(isLivePro(proLicense('u1', new Date(NOW)), NOW)).toBe(false);
    expect(isLivePro(freeRow(), NOW)).toBe(false);
    expect(isLivePro(null, NOW)).toBe(false);
  });
});
