import { env } from '../../config/env';
import { isDuration } from '../../config/pricing';
import type { ApiHandler } from '../../lib/http';
import { isPlainObject } from '../../lib/validators';
import { requireAuth } from '../../middleware/auth';
import { licenseStore, type LicenseStore } from '../../models/License';
import {
  buildOrderId,
  createCheckoutUrl,
  flittConfig,
  FlittError,
  type CheckoutRequest,
  type FlittConfig,
} from '../../services/flittService';
import { renewalState } from '../../services/licenseService';

const ALLOWED_RETURN_HOSTS = new Set(['legibly.design', 'www.legibly.design', 'localhost', '127.0.0.1']);

/**
 * Open-redirect guard. A bad value falls back to the default instead of
 * failing the request: a typo in a return URL is not a reason to kill a real
 * payment.
 */
export function sanitizeReturnUrl(candidate: unknown, fallback: string): string {
  if (typeof candidate !== 'string' || candidate === '') return fallback;
  try {
    const url = new URL(candidate);
    return ALLOWED_RETURN_HOSTS.has(url.hostname) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export interface CheckoutCreateDeps {
  config: FlittConfig;
  licenses: LicenseStore;
  createCheckout: (config: FlittConfig, request: CheckoutRequest) => Promise<string>;
  authSecret: string;
  apiPublicUrl: string;
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

    const orderId = buildOrderId(userId, now);

    try {
      const checkoutUrl = await deps.createCheckout(deps.config, {
        figmaUserId: userId,
        duration,
        orderId,
        email: license.email ?? undefined,
        serverCallbackUrl: `${deps.apiPublicUrl}/api/webhooks/flitt`,
        responseUrl: sanitizeReturnUrl(body.returnUrl, `${deps.apiPublicUrl}/api/checkout/success`),
      });
      res.status(200).json({ success: true, checkoutUrl, orderId });
    } catch (error) {
      if (error instanceof FlittError) {
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
    createCheckout: createCheckoutUrl,
    authSecret: env().authSecret,
    apiPublicUrl: env().apiPublicUrl,
    now: () => Date.now(),
  })(req, res);
