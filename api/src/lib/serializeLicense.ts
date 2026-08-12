import type { LicenseRow } from '../models/License.js';

export interface SerializedLicense {
  plan: 'free' | 'pro';
  status: 'active' | 'expired';
  /** Null on free — a free row has no cycle to report. */
  cycleEndsAt: string | null;
  daysLeft: number;
  judgeUsed: number;
}

const DAY_MS = 86_400_000;

/**
 * The plan is derived, not copied: a `pro` row whose cycle has run out is a free
 * user until it is renewed. Reading the stored column directly would hand a
 * lapsed licence a Pro badge until some background job noticed.
 */
export function serializeLicense(license: LicenseRow, now: number = Date.now()): SerializedLicense {
  const endsAtMs = license.cycleEndsAt.getTime();
  const isPro = license.plan === 'pro' && endsAtMs > now;

  return {
    plan: isPro ? 'pro' : 'free',
    status: license.status,
    cycleEndsAt: isPro ? license.cycleEndsAt.toISOString() : null,
    daysLeft: isPro ? Math.ceil((endsAtMs - now) / DAY_MS) : 0,
    judgeUsed: license.judgeUsed,
  };
}
