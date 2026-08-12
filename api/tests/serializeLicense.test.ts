import { describe, expect, it } from 'vitest';

import { serializeLicense } from '../src/lib/serializeLicense.js';
import type { LicenseRow } from '../src/models/License.js';
import { proLicense } from './helpers.js';

const NOW = 1_700_000_000_000;

const freeRow: LicenseRow = {
  figmaUserId: 'user-1',
  email: null,
  plan: 'free',
  status: 'active',
  cycleStartedAt: new Date(NOW),
  cycleEndsAt: new Date(NOW),
  judgeUsed: 2,
  judgeMonth: null,
  judgeMonthUsed: 0,
  flittOrderId: null,
  lastDuration: null,
};

describe('serializeLicense', () => {
  it('reports a live Pro cycle with the days remaining', () => {
    const license = proLicense('user-1', new Date(NOW + 312 * 86_400_000));

    expect(serializeLicense(license, NOW)).toEqual({
      plan: 'pro',
      status: 'active',
      cycleEndsAt: license.cycleEndsAt.toISOString(),
      daysLeft: 312,
      judgeUsed: 0,
    });
  });

  it('rounds a part-day up, so the last day still reads as one', () => {
    const license = proLicense('user-1', new Date(NOW + 3_600_000));
    expect(serializeLicense(license, NOW).daysLeft).toBe(1);
  });

  it('demotes a Pro row whose cycle has run out', () => {
    const license = proLicense('user-1', new Date(NOW - 1));
    const serialized = serializeLicense(license, NOW);

    expect(serialized.plan).toBe('free');
    expect(serialized.daysLeft).toBe(0);
    expect(serialized.cycleEndsAt).toBeNull();
  });

  it('reports a free row without a cycle', () => {
    expect(serializeLicense(freeRow, NOW)).toEqual({
      plan: 'free',
      status: 'active',
      cycleEndsAt: null,
      daysLeft: 0,
      judgeUsed: 2,
    });
  });
});
