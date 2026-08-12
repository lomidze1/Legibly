/**
 * What a purchase does to a licence.
 *
 * Pure functions on purpose: this is the arithmetic that decides how much
 * access someone paid for, and it has to be provable without a database.
 */

import { DURATION_MS, RENEWAL_WINDOW_MS, type Duration } from '../config/pricing';
import type { LicenseRow } from '../models/License';

const DAY_MS = 86_400_000;

export function isLivePro(license: LicenseRow | null, now: number): boolean {
  return license !== null && license.plan === 'pro' && license.cycleEndsAt.getTime() > now;
}

/**
 * Days stack onto whatever is left, with a ceiling — otherwise a run of
 * chargebacks could pile up years of access before the refunds landed.
 *
 * The `Math.max` floor is not decoration. A plain `Math.min(naive, cap)` would
 * *shorten* an existing long cycle when a short one is bought on top of it:
 * the cap is computed from the new duration, so a monthly top-up on a live
 * yearly licence would cut it back to about a month.
 */
export function computeCycleEnd(existing: LicenseRow | null, duration: Duration, now: number): number {
  const durationMs = DURATION_MS[duration];
  const stillActivePro = isLivePro(existing, now);

  const maxCycleEndMs = now + RENEWAL_WINDOW_MS[duration] + durationMs;
  const existingEndMs = stillActivePro ? existing!.cycleEndsAt.getTime() : 0;
  const naiveCycleEnd = (stillActivePro ? existingEndMs : now) + durationMs;
  const effectiveCapMs = Math.max(maxCycleEndMs, existingEndMs);

  return Math.min(naiveCycleEnd, effectiveCapMs);
}

export interface RenewalState {
  canBuy: boolean;
  remainingDays: number;
  renewalOpensInDays: number;
  renewalWindowDays: number;
}

/**
 * The checkout-side half of the same protection. Both halves are needed: this
 * one stops the purchase, the ceiling in `computeCycleEnd` stops a webhook that
 * arrives anyway.
 */
export function renewalState(existing: LicenseRow | null, duration: Duration, now: number): RenewalState {
  const windowMs = RENEWAL_WINDOW_MS[duration];
  const renewalWindowDays = Math.round(windowMs / DAY_MS);

  if (!isLivePro(existing, now)) {
    return { canBuy: true, remainingDays: 0, renewalOpensInDays: 0, renewalWindowDays };
  }

  const remainingMs = existing!.cycleEndsAt.getTime() - now;
  return {
    canBuy: remainingMs <= windowMs,
    remainingDays: Math.ceil(remainingMs / DAY_MS),
    renewalOpensInDays: Math.max(0, Math.ceil((remainingMs - windowMs) / DAY_MS)),
    renewalWindowDays,
  };
}
