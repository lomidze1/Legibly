/**
 * The only piece of business logic in this spike: a Dodo subscription event
 * in, a license row out.
 *
 * Kept free of HTTP and free of the SDK so the self-test can drive it
 * directly and so it ports unchanged into whatever runtime we settle on.
 */

import { getLicense, putLicense, type License, type Status } from "./store.ts";

/** The subset of Dodo's Subscription payload this logic reads. */
export interface SubscriptionPayload {
  payload_type: "Subscription";
  subscription_id: string;
  status: "pending" | "active" | "on_hold" | "cancelled" | "failed" | "expired";
  metadata: Record<string, string>;
  next_billing_date: string;
  cancel_at_next_billing_date: boolean;
  customer: { email?: string | null; name?: string | null; customer_id?: string };
  product_id: string;
}

export interface DodoEvent {
  type: string;
  timestamp: string;
  data: SubscriptionPayload | { payload_type: string; [k: string]: unknown };
}

export type Outcome =
  | { applied: true; license: License; reason: string }
  | { applied: false; reason: string };

/** Events that carry a subscription payload we care about. */
const HANDLED = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.on_hold",
  "subscription.plan_changed",
  "subscription.updated",
  "subscription.cancelled",
  "subscription.failed",
  "subscription.expired",
]);

export function handleEvent(event: DodoEvent): Outcome {
  if (!event.type.startsWith("subscription.")) {
    return { applied: false, reason: `ignored non-subscription event ${event.type}` };
  }
  if (!HANDLED.has(event.type)) {
    return { applied: false, reason: `no handler for ${event.type}` };
  }

  const data = event.data as SubscriptionPayload;
  if (data.payload_type !== "Subscription") {
    return { applied: false, reason: `unexpected payload_type ${data.payload_type}` };
  }

  // This is the whole reason metadata matters: it is the only thing tying a
  // Dodo subscription back to a Figma identity. No metadata, no license.
  const figmaUserId = data.metadata?.figma_user_id;
  if (!figmaUserId) {
    return { applied: false, reason: "metadata.figma_user_id missing — cannot bind" };
  }

  const current = getLicense(figmaUserId);

  // Dodo retries and can deliver out of order. An older event must never
  // overwrite a newer state — a late `on_hold` after a successful `renewed`
  // would otherwise downgrade a paying customer.
  if (current.lastEventAt && new Date(event.timestamp) < new Date(current.lastEventAt)) {
    return { applied: false, reason: "stale event, newer state already stored" };
  }

  const next: License = {
    ...current,
    email: data.customer?.email ?? current.email,
    subscriptionId: data.subscription_id,
    currentPeriodEnd: data.next_billing_date,
    cancelAtPeriodEnd: data.cancel_at_next_billing_date,
    lastEventAt: event.timestamp,
    plan: data.status === "expired" || data.status === "failed" ? "free" : "pro",
    status: data.status === "pending" ? "active" : (data.status as Status),
    updatedAt: new Date().toISOString(),
  };

  putLicense(next);
  return { applied: true, license: next, reason: `${event.type} → ${next.plan}/${next.status}` };
}
