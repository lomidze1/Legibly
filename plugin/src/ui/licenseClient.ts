/**
 * The two waiting loops: for the browser to finish OAuth, and for a payment to
 * land. Both are pure given their dependencies, so their timing rules can be
 * tested without a clock.
 */

import type { License, StoredToken } from '../shared/license';
import { toStoredToken } from '../shared/license';
import type { ExchangeResult } from './apiClient';

export const CONNECT_POLL_INTERVAL_MS = 2_000;

/**
 * Five minutes, matching the server's hand-off window exactly. A shorter one
 * would leave a token parked that nobody ever collects: the user finishes a
 * slow login and the plugin has already given up.
 */
export const CONNECT_TIMEOUT_MS = 300_000;

export const CHECKOUT_POLL_INTERVAL_MS = 2_000;

/** Long enough to cover the webhook arriving while the user reads the receipt. */
export const CHECKOUT_TIMEOUT_MS = 60_000;

export interface PollDeps {
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** Lets the UI stop waiting when the user closes the panel. */
  cancelled?: () => boolean;
}

/** Resolves with the token once the browser side is done, or null on timeout. */
export async function pollForToken(
  nonce: string,
  exchange: (nonce: string) => Promise<ExchangeResult>,
  deps: PollDeps,
): Promise<StoredToken | null> {
  const deadline = deps.now() + CONNECT_TIMEOUT_MS;

  while (deps.now() < deadline) {
    if (deps.cancelled?.() === true) return null;

    const result = await exchange(nonce);
    if (!result.pending) {
      // A malformed pair is treated as "not connected" rather than stored:
      // an unusable token would fail every later call with no way back.
      return toStoredToken(result.token, result.expiresAt);
    }
    await deps.sleep(CONNECT_POLL_INTERVAL_MS);
  }

  return null;
}

/**
 * Waits for Pro to appear after checkout.
 *
 * This is the one place the plugin polls at all. Everywhere else the licence is
 * refreshed on an event — a timer would cost battery and would sit badly next
 * to a plugin whose whole claim is that it barely touches the network.
 */
export async function pollForPro(
  fetchLicense: () => Promise<License>,
  deps: PollDeps,
): Promise<License | null> {
  const deadline = deps.now() + CHECKOUT_TIMEOUT_MS;
  let last: License | null = null;

  while (deps.now() < deadline) {
    if (deps.cancelled?.() === true) return last;

    last = await fetchLicense();
    if (last.plan === 'pro') return last;
    await deps.sleep(CHECKOUT_POLL_INTERVAL_MS);
  }

  return last;
}
