import { env } from '../../config/env';
import { CURRENCY, PRICES, isDuration } from '../../config/pricing';
import type { ApiHandler } from '../../lib/http';
import { asAmountCents, asString, asStringMax, isPlainObject } from '../../lib/validators';
import { licenseStore, type LicenseStore } from '../../models/License';
import { webhookEventStore, type WebhookEventStore } from '../../models/WebhookEvent';
import { flittConfig, orderIdBelongsTo, verifyCallback } from '../../services/flittService';
import { computeCycleEnd } from '../../services/licenseService';

const MAX_USER_ID_LENGTH = 64;

export interface FlittWebhookDeps {
  secretKey: string;
  licenses: LicenseStore;
  events: WebhookEventStore;
  now: () => number;
  log?: (message: string) => void;
}

/**
 * 🔴 This endpoint answers 200 to everything, always.
 *
 * Flitt retries on 2s / 60s / 5m / 10m / 1h / 24h. A 4xx for a payload we chose
 * to reject therefore buys a retry storm that also buries the deliveries that
 * genuinely failed. Refusals are logged, not signalled.
 *
 * The order below is the point of the whole handler: every check runs *before*
 * the lease is taken, so a hostile payload cannot burn a dedup key; the state
 * change happens *after* it, so a retry cannot pay twice.
 */
export function createFlittWebhookHandler(deps: FlittWebhookDeps): ApiHandler {
  const log = deps.log ?? ((message: string) => console.warn(`[flitt-webhook] ${message}`));

  return async (req, res) => {
    const payload = req.body;
    const refuse = (reason: string): void => {
      log(reason);
      res.status(200).json({ received: true });
    };

    if (!isPlainObject(payload)) return refuse('body is not an object');
    if (!verifyCallback(payload, deps.secretKey)) return refuse('signature mismatch');

    const orderId = asString(payload.order_id);
    const orderStatus = asString(payload.order_status);
    const merchantDataRaw = asString(payload.merchant_data);
    const amountCents = asAmountCents(payload.amount);
    if (orderId === undefined || orderStatus === undefined || merchantDataRaw === undefined) {
      return refuse('missing required fields');
    }
    if (amountCents === undefined) return refuse('unusable amount');

    let merchantData: unknown;
    try {
      merchantData = JSON.parse(merchantDataRaw);
    } catch {
      return refuse('merchant_data is not JSON');
    }
    if (!isPlainObject(merchantData)) return refuse('merchant_data is not an object');

    const figmaUserId = asStringMax(merchantData.figmaUserId, MAX_USER_ID_LENGTH);
    if (figmaUserId === undefined) return refuse('merchant_data carries no usable figmaUserId');

    // Ties the two halves of the payload together: without this, a valid
    // merchant_data could be paired with someone else's order.
    if (!orderIdBelongsTo(orderId, figmaUserId)) return refuse('order_id does not match merchant_data');

    const currency = asString(payload.currency);
    if (currency === undefined || currency.toUpperCase() !== CURRENCY) return refuse('unexpected currency');

    const duration = merchantData.duration;
    if (!isDuration(duration)) return refuse('merchant_data carries no usable duration');

    if (orderStatus === 'approved' && amountCents !== PRICES[duration]) {
      return refuse(`amount ${amountCents} does not match the ${duration} price`);
    }

    // Flitt's own id when it sends one; otherwise the order plus its status, so
    // an approval and a later reversal of the same order stay distinct.
    const transactionId = asString(payload.payment_id) ?? `${orderId}_${orderStatus}`;

    let heldLease: string | null = null;
    try {
      const acquired = await deps.events.acquire({
        transactionId,
        orderId,
        orderStatus,
        amountCents,
      });
      if (!acquired) {
        // ⚠️ Deliberately not held: the lease belongs to whoever inserted it,
        // and the catch below must not release someone else's.
        res.status(200).json({ received: true, deduped: true });
        return;
      }
      heldLease = transactionId;

      const now = deps.now();
      if (orderStatus === 'approved') {
        const existing = await deps.licenses.find(figmaUserId);
        await deps.licenses.applyPurchase(figmaUserId, {
          cycleStartedAt: new Date(now),
          cycleEndsAt: new Date(computeCycleEnd(existing, duration, now)),
          flittOrderId: orderId,
          duration,
          email: asString(payload.sender_email),
        });
      } else if (orderStatus === 'reversed') {
        await deps.licenses.applyRefund(figmaUserId, orderId, new Date(now));
      }
      // declined and expired change nothing — the record of the attempt is the lease.

      res.status(200).json({ received: true });
    } catch (error) {
      if (heldLease !== null) await deps.events.release(heldLease);
      log(`processing failed, lease released: ${String(error)}`);
      res.status(200).json({ received: true });
    }
  };
}

export const flittWebhookHandler: ApiHandler = (req, res) =>
  createFlittWebhookHandler({
    secretKey: flittConfig(env()).secretKey,
    licenses: licenseStore,
    events: webhookEventStore,
    now: () => Date.now(),
  })(req, res);
