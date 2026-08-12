/**
 * Licence state shared by both threads.
 *
 * Pure on purpose: the token's validity rules are the part that must not be
 * wrong, and they are easier to prove here than through the UI.
 */

/** clientStorage key. The value stored under it is an object, never a string. */
export const AUTH_TOKEN_KEY = 'legibly_auth_token';

/**
 * A token this close to expiry is treated as already gone. There is no
 * clock-skew allowance on the server, so the margin lives here.
 */
export const TOKEN_SAFETY_MARGIN_MS = 60_000;

export interface StoredToken {
  token: string;
  /** Epoch ms. Stored as a number even though the wire format is ISO. */
  expiresAt: number;
}

export interface License {
  plan: 'free' | 'pro';
  status: 'active' | 'expired';
  cycleEndsAt: string | null;
  daysLeft: number;
  judgeUsed: number;
}

export const FREE_LICENSE: License = {
  plan: 'free',
  status: 'active',
  cycleEndsAt: null,
  daysLeft: 0,
  judgeUsed: 0,
};

/**
 * Reads what came back from clientStorage.
 *
 * ⚠️ `Number.isFinite` is not decoration. `new Date("nonsense").getTime()` is
 * `NaN`, `typeof NaN` is `"number"`, and `NaN - 60000 <= Date.now()` is
 * `false` — so without this check a corrupt entry reads as a token that never
 * expires, and every request fails 401 forever with no way back.
 */
export function parseStoredToken(value: unknown, now: number = Date.now()): StoredToken | null {
  if (typeof value !== 'object' || value === null) return null;
  const { token, expiresAt } = value as { token?: unknown; expiresAt?: unknown };
  if (typeof token !== 'string' || token === '') return null;
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return null;
  if (expiresAt - TOKEN_SAFETY_MARGIN_MS <= now) return null;
  return { token, expiresAt };
}

/** Converts the wire pair into what gets stored, rejecting an unparseable date. */
export function toStoredToken(token: unknown, expiresAt: unknown): StoredToken | null {
  if (typeof token !== 'string' || token === '') return null;
  if (typeof expiresAt !== 'string') return null;
  const ms = new Date(expiresAt).getTime();
  if (!Number.isFinite(ms)) return null;
  return { token, expiresAt: ms };
}

export function isPro(license: License | null): boolean {
  return license !== null && license.plan === 'pro';
}

/** The footer pill: "Free" or "Pro · 312 days left". */
export function licenseLabel(license: License | null): string {
  if (!isPro(license)) return 'Free';
  const days = license!.daysLeft;
  return `Pro · ${days} ${days === 1 ? 'day' : 'days'} left`;
}

/**
 * The nonce the plugin mints for the OAuth hand-off. It is a bearer credential
 * for the token that comes back, so it is 32 bytes of real randomness — the
 * server refuses anything shorter than 32 characters.
 */
export function createNonce(randomBytes: (length: number) => Uint8Array): string {
  let hex = '';
  for (const byte of randomBytes(32)) hex += byte.toString(16).padStart(2, '0');
  return hex;
}
