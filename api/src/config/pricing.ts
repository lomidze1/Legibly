/**
 * One-time purchases, no auto-renewal (D23). Buying again stacks days onto
 * whatever is left rather than starting a new cycle.
 */

export type Duration = 'monthly' | 'yearly';

export function isDuration(value: unknown): value is Duration {
  return value === 'monthly' || value === 'yearly';
}

/** ⚠️ Cents. $12 and $120 — the webhook compares against these exactly. */
export const PRICES: Record<Duration, number> = { monthly: 1200, yearly: 12000 };

export const DURATION_MS: Record<Duration, number> = {
  monthly: 30 * 86_400_000,
  yearly: 365 * 86_400_000,
};

/** How early a live licence may be topped up. Outside it, checkout says already_pro. */
export const RENEWAL_WINDOW_MS: Record<Duration, number> = {
  monthly: 7 * 86_400_000,
  yearly: 10 * 86_400_000,
};

export const CURRENCY = 'USD';
