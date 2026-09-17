import { env } from '../../config/env.js';
import { CURRENCY, PRICES, isDuration } from '../../config/pricing.js';
import type { ApiHandler } from '../../lib/http.js';
import { asAmountCents, asString, asStringMax, isPlainObject } from '../../lib/validators.js';
import { licenseStore, type LicenseStore } from '../../models/License.js';
import { licenseAuditStore, recordAuditQuietly, type LicenseAuditStore } from '../../models/LicenseAudit.js';
import { usageEventStore, type UsageEventStore } from '../../models/UsageEvent.js';
import { webhookEventStore, type WebhookEventStore } from '../../models/WebhookEvent.js';
import { flittConfig, orderIdBelongsTo, verifyCallback } from '../../services/flittService.js';
import { computeCycleEnd } from '../../services/licenseService.js';

const MAX_USER_ID_LENGTH = 64;

export interface FlittWebhookDeps {
  secretKey: string;
  licenses: LicenseStore;
  events: WebhookEventStore;
  usage: UsageEventStore;
  audit: LicenseAuditStore;
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

    // One payment, several deliveries: Flitt reports `processing` (3DS), then the
    // outcome, and later perhaps `reversed` — all under the same payment_id. So
    // the ledger key is the id *and* the status. Keyed on the id alone, the
    // outcome was deduplicated against `processing`: a 3DS approval charged the
    // card and granted nothing, and a refund never revoked. A true retry repeats
    // both parts and is still caught.
    const transactionId = `${asString(payload.payment_id) ?? orderId}_${orderStatus}`;

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
      const at = new Date(now);
      if (orderStatus === 'approved') {
        const existing = await deps.licenses.find(figmaUserId);
        const cycleEndsAt = new Date(computeCycleEnd(existing, duration, now));
        await deps.licenses.applyPurchase(figmaUserId, {
          cycleStartedAt: at,
          cycleEndsAt,
          flittOrderId: orderId,
          duration,
          email: asString(payload.sender_email),
        });
        await deps.usage.record({ figmaUserId, kind: 'checkout_paid', detail: duration }, at);
        await recordAuditQuietly(
          deps.audit,
          {
            figmaUserId,
            action: 'purchase',
            actor: 'webhook',
            detail: `${duration} ${amountCents}c → ends ${cycleEndsAt.toISOString().slice(0, 10)}`,
          },
          at,
        );
      } else if (orderStatus === 'reversed') {
        const applied = await deps.licenses.applyRefund(figmaUserId, orderId, at);
        await deps.usage.record({ figmaUserId, kind: 'checkout_refunded', ok: applied, detail: duration }, at);
        await recordAuditQuietly(
          deps.audit,
          {
            figmaUserId,
            action: 'refund',
            actor: 'webhook',
            // A reversal of an order the user has already superseded revokes
            // nothing — the trail has to say which of the two happened.
            detail: applied ? `${amountCents}c reversed, licence ended` : `${amountCents}c reversed, licence untouched`,
          },
          at,
        );
      } else if (orderStatus === 'declined' || orderStatus === 'expired') {
        // Declined and expired change nothing — the record of the attempt is
        // the lease, and now also a funnel data point.
        await deps.usage.record(
          { figmaUserId, kind: 'checkout_failed', ok: false, detail: orderStatus },
          at,
        );
      }
      // Anything else (`processing`, `created`) is an intermediate step: the
      // ledger row is its record, and it is not a failed checkout.

      res.status(200).json({ received: true });
    } catch (error) {
      if (heldLease !== null) await deps.events.release(heldLease);
      log(`processing failed, lease released: ${String(error)}`);
      res.status(200).json({ received: true });
    }
  };
}

export const flittWebhookHandler: ApiHandler = async (req, res) => {
  // ⚠️ The 200-to-everything rule starts here, not inside the handler.
  //
  // Building the config throws while Flitt's keys are unset — or if one is ever
  // rotated away — and an uncaught throw is a 500. Flitt reads 5xx as "retry":
  // 2s, 60s, 5m, 10m, 1h, 24h, for every delivery. A missing env var would
  // become a retry storm that also buries the deliveries that genuinely failed.
  let secretKey: string;
  try {
    secretKey = flittConfig(env()).secretKey;
  } catch (error) {
    console.warn(`[flitt-webhook] refused: not configured — ${String(error)}`);
    res.status(200).json({ received: true });
    return;
  }

  return createFlittWebhookHandler({
    secretKey,
    licenses: licenseStore,
    events: webhookEventStore,
    usage: usageEventStore,
    audit: licenseAuditStore,
    now: () => Date.now(),
  })(req, res);
};
