/**
 * The only code in the plugin that touches the network.
 *
 * Everything here is called from the UI iframe. `manifest.json` allows exactly
 * one domain, and that domain is this one.
 */

import type { License } from '../shared/license';
import { FREE_LICENSE } from '../shared/license';

export const API_BASE = 'https://api.legibly.design';

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** The token is gone or no longer valid — the UI has to fall back to Connect. */
export class AuthExpiredError extends Error {
  constructor() {
    super('Your Figma connection expired — connect again');
    this.name = 'AuthExpiredError';
  }
}

export class AlreadyProError extends Error {
  constructor(
    readonly remainingDays: number,
    readonly renewalOpensInDays: number,
  ) {
    super(`Pro is already active for ${remainingDays} more days`);
    this.name = 'AlreadyProError';
  }
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function loginUrl(nonce: string): string {
  return `${API_BASE}/api/auth/figma/login?plugin_nonce=${encodeURIComponent(nonce)}`;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export interface ExchangeResult {
  pending: boolean;
  token?: string;
  expiresAt?: string;
}

export async function exchangeNonce(nonce: string, fetchImpl: FetchLike = fetch): Promise<ExchangeResult> {
  const response = await fetchImpl(`${API_BASE}/api/auth/figma-exchange?nonce=${encodeURIComponent(nonce)}`);
  if (!response.ok) throw new ApiError(`Could not finish connecting (${response.status})`);

  const body = await readJson(response);
  if (body.pending === true) return { pending: true };

  const token = typeof body.token === 'string' ? body.token : undefined;
  const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : undefined;
  if (token === undefined || expiresAt === undefined) return { pending: true };

  return { pending: false, token, expiresAt };
}

export async function getLicense(token: string, fetchImpl: FetchLike = fetch): Promise<License> {
  const response = await fetchImpl(`${API_BASE}/api/license/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new AuthExpiredError();
  if (!response.ok) throw new ApiError(`Could not read your licence (${response.status})`);

  const body = await readJson(response);
  const license = body.license;
  if (typeof license !== 'object' || license === null) return FREE_LICENSE;

  const { plan, status, cycleEndsAt, daysLeft, judgeUsed } = license as Record<string, unknown>;
  return {
    plan: plan === 'pro' ? 'pro' : 'free',
    status: status === 'expired' ? 'expired' : 'active',
    cycleEndsAt: typeof cycleEndsAt === 'string' ? cycleEndsAt : null,
    daysLeft: typeof daysLeft === 'number' && Number.isFinite(daysLeft) ? daysLeft : 0,
    judgeUsed: typeof judgeUsed === 'number' && Number.isFinite(judgeUsed) ? judgeUsed : 0,
  };
}

export async function createCheckout(
  token: string,
  duration: 'monthly' | 'yearly',
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const response = await fetchImpl(`${API_BASE}/api/checkout/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration }),
  });

  if (response.status === 401) throw new AuthExpiredError();

  const body = await readJson(response);
  if (body.error === 'already_pro') {
    throw new AlreadyProError(Number(body.remainingDays ?? 0), Number(body.renewalOpensInDays ?? 0));
  }
  if (!response.ok) throw new ApiError('Checkout is unavailable right now — please try again');

  const checkoutUrl = body.checkoutUrl;
  if (typeof checkoutUrl !== 'string' || !checkoutUrl.startsWith('https://')) {
    throw new ApiError('Checkout is unavailable right now — please try again');
  }
  return checkoutUrl;
}
