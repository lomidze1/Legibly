/**
 * License store — in-memory stand-in for the real database.
 *
 * The shape mirrors what Legibly actually needs, which is less than
 * web2wireframe needs: Legibly meters nothing. Free is unlimited detection,
 * Pro unlocks fix/batch/report, and every one of those runs inside the
 * plugin. So there is no usage counter here, only entitlement.
 */

export type Plan = "free" | "pro";

/** Mirrors Dodo's SubscriptionStatus, minus `pending` which we never persist. */
export type Status = "active" | "on_hold" | "cancelled" | "failed" | "expired";

export interface License {
  figmaUserId: string;
  email: string | null;
  plan: Plan;
  status: Status;
  subscriptionId: string | null;
  /** Dodo's `next_billing_date` — the moment entitlement lapses if nothing renews. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Timestamp of the last webhook applied, so out-of-order deliveries are ignored. */
  lastEventAt: string | null;
  updatedAt: string;
}

const licenses = new Map<string, License>();

/** webhook-id values already applied. Redelivery is normal, not exceptional. */
const seenEvents = new Set<string>();

export function freeLicense(figmaUserId: string): License {
  return {
    figmaUserId,
    email: null,
    plan: "free",
    status: "active",
    subscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    lastEventAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function getLicense(figmaUserId: string): License {
  return licenses.get(figmaUserId) ?? freeLicense(figmaUserId);
}

export function putLicense(license: License): void {
  licenses.set(license.figmaUserId, { ...license, updatedAt: new Date().toISOString() });
}

export function allLicenses(): License[] {
  return [...licenses.values()];
}

/** Test-only reset so the self-test starts from a known state. */
export function resetStore(): void {
  licenses.clear();
  seenEvents.clear();
}

export function alreadyProcessed(webhookId: string): boolean {
  return seenEvents.has(webhookId);
}

export function markProcessed(webhookId: string): void {
  seenEvents.add(webhookId);
}

/**
 * What the plugin is actually allowed to do right now.
 *
 * Expiry is evaluated lazily on read rather than by a cron job — the same
 * trick web2wireframe uses. A subscription that was cancelled or fell into
 * dunning keeps Pro until the period it was already paid for runs out.
 */
export function entitlement(license: License, now = new Date()): Plan {
  if (license.plan !== "pro") return "free";
  if (license.status === "expired" || license.status === "failed") return "free";
  if (license.currentPeriodEnd && now >= new Date(license.currentPeriodEnd)) return "free";
  return "pro";
}
