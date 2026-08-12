/**
 * Flitt (ex-Fondy) — hosted checkout and callback verification.
 *
 * The signature rules below look arbitrary and are not: each one corresponds to
 * a failure that is silent. A wrong signature comes back as a bare 400 from
 * Flitt with no hint, and a wrongly *accepted* callback is a free Pro licence.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import type { Env } from '../config/env';
import { CURRENCY, PRICES, type Duration } from '../config/pricing';
import { isPlainObject } from '../lib/validators';

/** ⚠️ Shares a Flitt merchant account with Web2Wireframe — the prefix is what separates them. */
export const ORDER_ID_PREFIX = 'lgb_pro_';

const CHECKOUT_PATH = '/api/checkout/url';

export interface FlittConfig {
  merchantId: string;
  secretKey: string;
  baseUrl: string;
}

export class FlittNotConfiguredError extends Error {
  override name = 'FlittNotConfiguredError';
}

export class FlittError extends Error {
  override name = 'FlittError';
}

export function flittConfig(env: Env): FlittConfig {
  if (env.flittMerchantId === undefined || env.flittSecretKey === undefined) {
    throw new FlittNotConfiguredError('Flitt is not configured');
  }
  return { merchantId: env.flittMerchantId, secretKey: env.flittSecretKey, baseUrl: env.flittBaseUrl };
}

const EXCLUDED_KEYS = new Set(['signature', 'response_signature_string']);

function isSigned(key: string, value: unknown): boolean {
  if (EXCLUDED_KEYS.has(key)) return false;
  // `0` and `false` stay in — a truthiness filter here would drop `amount: 0`.
  return value !== '' && value !== null && value !== undefined;
}

/**
 * `sha1(secret | v1 | v2 | …)` where the values are ordered by their *key*.
 *
 * The secret is the first element of the string, not an HMAC key. Sorting is
 * ordinal, which is what Flitt documents ("alphabetically by parameter name");
 * `localeCompare` agrees on today's lowercase-ASCII field names but is not the
 * same function, so the ordinal comparison is the one written down.
 */
export function signParams(params: Record<string, unknown>, secretKey: string): string {
  const values = Object.entries(params)
    .filter(([key, value]) => isSigned(key, value))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, value]) => String(value));

  return createHash('sha1').update([secretKey, ...values].join('|'), 'utf8').digest('hex');
}

/**
 * Verifies a callback. Rejects before re-signing when a value is an object or
 * array (two different payloads could hash alike once stringified) or contains
 * the `|` separator (the same, by injection into the canonical string).
 */
export function verifyCallback(payload: unknown, secretKey: string): boolean {
  if (!isPlainObject(payload)) return false;

  const provided = payload.signature;
  if (typeof provided !== 'string' || provided === '') return false;

  for (const [key, value] of Object.entries(payload)) {
    if (!isSigned(key, value)) continue;
    if (typeof value === 'object') return false;
    if (String(value).includes('|')) return false;
  }

  const expected = Buffer.from(signParams(payload, secretKey));
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function sanitizeUserId(figmaUserId: string): string {
  return figmaUserId.replace(/[^A-Za-z0-9_-]/g, '');
}

/**
 * Sanitising is lossy: `u|ser1` and `user1` collapse to the same string, so
 * they would share an order-id namespace while their licence rows stay keyed on
 * the raw value — and `orderIdBelongsTo` would tie one user's order to the
 * other. Figma user ids are numeric in practice, so an id that does not survive
 * sanitising unchanged is refused rather than quietly collapsed.
 */
export function isOrderSafeUserId(figmaUserId: string): boolean {
  return figmaUserId !== '' && figmaUserId === sanitizeUserId(figmaUserId);
}

export function buildOrderId(figmaUserId: string, now: number = Date.now()): string {
  if (!isOrderSafeUserId(figmaUserId)) throw new FlittError('unsupported figma user id');
  return `${ORDER_ID_PREFIX}${figmaUserId}_${now}`;
}

export function orderIdBelongsTo(orderId: string, figmaUserId: string): boolean {
  if (!isOrderSafeUserId(figmaUserId)) return false;
  return orderId.startsWith(`${ORDER_ID_PREFIX}${figmaUserId}_`);
}

export interface CheckoutRequest {
  figmaUserId: string;
  duration: Duration;
  orderId: string;
  email?: string;
  serverCallbackUrl: string;
  responseUrl: string;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function createCheckoutUrl(
  config: FlittConfig,
  request: CheckoutRequest,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<string> {
  const params: Record<string, unknown> = {
    merchant_id: config.merchantId,
    order_id: request.orderId,
    amount: PRICES[request.duration],
    currency: CURRENCY,
    // ⚠️ A signed value: any drift in this string (an em dash, a different
    // encoding) changes the signature.
    order_desc: request.duration === 'yearly' ? 'Legibly Pro - 365 days' : 'Legibly Pro - 30 days',
    lang: 'en',
    server_callback_url: request.serverCallbackUrl,
    response_url: request.responseUrl,
    // Nested objects must be stringified by the caller: String({}) is "[object Object]".
    merchant_data: JSON.stringify({
      figmaUserId: request.figmaUserId,
      plan: 'pro',
      recurring: false,
      duration: request.duration,
    }),
  };
  if (request.email !== undefined) params.sender_email = request.email;

  const response = await fetchImpl(`${config.baseUrl}${CHECKOUT_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request: { ...params, signature: signParams(params, config.secretKey) } }),
  });

  if (!response.ok) throw new FlittError(`Flitt checkout failed with status ${response.status}`);

  const body = (await response.json()) as unknown;
  const inner = isPlainObject(body) ? body.response : undefined;
  if (!isPlainObject(inner)) throw new FlittError('Flitt checkout returned no response object');

  // `response_status` is the API call's outcome — not `order_status`, which is
  // the payment's. They are different fields and mean different things.
  if (inner.response_status !== 'success') {
    throw new FlittError(`Flitt checkout refused: ${String(inner.error_message ?? inner.response_status)}`);
  }
  if (typeof inner.checkout_url !== 'string' || inner.checkout_url === '') {
    throw new FlittError('Flitt checkout returned no URL');
  }

  return inner.checkout_url;
}
