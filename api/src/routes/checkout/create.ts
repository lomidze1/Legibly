import { env } from '../../config/env.js';
import { isDuration } from '../../config/pricing.js';
import type { ApiHandler } from '../../lib/http.js';
import { isPlainObject } from '../../lib/validators.js';
import { requireAuth } from '../../middleware/auth.js';
import { licenseStore, type LicenseStore } from '../../models/License.js';
import { usageEventStore, type UsageEventStore } from '../../models/UsageEvent.js';
import {
  buildOrderId,
  createCheckoutUrl,
  flittConfig,
  FlittError,
  isOrderSafeUserId,
  type CheckoutRequest,
  type FlittConfig,
} from '../../services/flittService.js';
import { renewalState } from '../../services/licenseService.js';

const ALLOWED_RETURN_HOSTS = new Set(['legibly.design', 'www.legibly.design']);
const LOOPBACK_RETURN_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Open-redirect guard. A bad value falls back to the default instead of
 * failing the request: a typo in a return URL is not a reason to kill a real
 * payment.
 *
 * Loopback is a development convenience, so it is allowed only outside
 * production — sending a real buyer back to their own machine is a dead end,
 * not a destination.
 */
export function sanitizeReturnUrl(
  candidate: unknown,
  fallback: string,
  allowLoopback = false,
): string {
  if (typeof candidate !== 'string' || candidate === '') return fallback;
  try {
    const url = new URL(candidate);
    const allowed =
      ALLOWED_RETURN_HOSTS.has(url.hostname) ||
      (allowLoopback && LOOPBACK_RETURN_HOSTS.has(url.hostname));
    return allowed ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export interface CheckoutCreateDeps {
  config: FlittConfig;
  licenses: LicenseStore;
  events: UsageEventStore;
  createCheckout: (config: FlittConfig, request: CheckoutRequest) => Promise<string>;
  authSecret: string;
  apiPublicUrl: string;
  /**
   * Loopback return URLs are a local-development convenience only. Optional so
   * that omitting it gives the production answer: a caller that has not thought
   * about this should not be the one that widens the allowlist.
   */
  allowLoopbackReturn?: boolean;
  now: () => number;
}

export function createCheckoutCreateHandler(deps: CheckoutCreateDeps): ApiHandler {
  return async (req, res) => {
    if (req.method !== undefined && req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

    const now = deps.now();
    // ⚠️ Bearer-protected, unlike w2w's public /checkout/create. OAuth already
    // exists here, so there is no reason to carry the weaker version over.
    const userId = requireAuth(req, res, deps.authSecret, now);
    if (userId === null) return;

    const body = isPlainObject(req.body) ? req.body : {};
    const duration = body.duration;
    if (!isDuration(duration)) {
      res.status(400).json({ success: false, error: 'invalid_duration' });
      return;
    }

    const license = await deps.licenses.getOrCreate(userId);
    const renewal = renewalState(license, duration, now);
    if (!renewal.canBuy) {
      res.status(400).json({
        success: false,
        error: 'already_pro',
        remainingDays: renewal.remainingDays,
        renewalOpensInDays: renewal.renewalOpensInDays,
        renewalWindowDays: renewal.renewalWindowDays,
      });
      return;
    }

    // An id that does not survive sanitising cannot own an order id
    // unambiguously — see isOrderSafeUserId. Numeric Figma ids always do.
    if (!isOrderSafeUserId(userId)) {
      res.status(400).json({ success: false, error: 'unsupported_account' });
      return;
    }
    const orderId = buildOrderId(userId, now);

    try {
      const checkoutUrl = await deps.createCheckout(deps.config, {
        figmaUserId: userId,
        duration,
        orderId,
        email: license.email ?? undefined,
        serverCallbackUrl: `${deps.apiPublicUrl}/api/webhooks/flitt`,
        responseUrl: sanitizeReturnUrl(
          body.returnUrl,
          `${deps.apiPublicUrl}/api/checkout/success`,
          deps.allowLoopbackReturn ?? false,
        ),
      });
      await deps.events.record(
        { figmaUserId: userId, kind: 'checkout_created', detail: duration },
        new Date(now),
      );
      res.status(200).json({ success: true, checkoutUrl, orderId });
    } catch (error) {
      if (error instanceof FlittError) {
        // Recorded as a failed attempt, not a started one: the user never saw a
        // payment form, and the funnel should say so.
        await deps.events.record(
          { figmaUserId: userId, kind: 'checkout_created', ok: false, detail: 'checkout_unavailable' },
          new Date(now),
        );
        res.status(502).json({ success: false, error: 'checkout_unavailable' });
        return;
      }
      throw error;
    }
  };
}

export const checkoutCreateHandler: ApiHandler = (req, res) =>
  createCheckoutCreateHandler({
    config: flittConfig(env()),
    licenses: licenseStore,
    events: usageEventStore,
    createCheckout: createCheckoutUrl,
    authSecret: env().authSecret,
    apiPublicUrl: env().apiPublicUrl,
    allowLoopbackReturn: env().nodeEnv !== 'production',
    now: () => Date.now(),
  })(req, res);
