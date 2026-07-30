/**
 * Offline self-test — runs with no Dodo account and no network.
 *
 * It signs webhook payloads with the same Standard Webhooks scheme Dodo
 * uses, feeds them through the real SDK verifier, and asserts the licence
 * ends up where it should. That covers everything except whether Dodo will
 * accept a Georgian seller, which no amount of local code can answer.
 *
 *   node src/selftest.ts
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Webhook } from "standardwebhooks";
import DodoPayments from "dodopayments";
import { handleEvent, type DodoEvent, type SubscriptionPayload } from "./handle-event.ts";
import { entitlement, getLicense, resetStore, alreadyProcessed, markProcessed } from "./store.ts";

const SECRET = `whsec_${randomBytes(24).toString("base64")}`;
const signer = new Webhook(SECRET);
const dodo = new DodoPayments({ bearerToken: "unused-for-verification", webhookKey: SECRET });

const FIGMA_USER = "1234567890:9876543210";
const DAY = 86_400_000;

let msgSeq = 0;

function subscriptionEvent(
  type: string,
  status: SubscriptionPayload["status"],
  opts: { at?: Date; periodEnd?: Date; cancelAtEnd?: boolean; metadata?: Record<string, string> } = {},
): { body: string; headers: Record<string, string>; event: DodoEvent } {
  const at = opts.at ?? new Date();
  const event: DodoEvent = {
    type,
    timestamp: at.toISOString(),
    data: {
      payload_type: "Subscription",
      subscription_id: "sub_spike_0001",
      status,
      metadata: opts.metadata ?? { figma_user_id: FIGMA_USER },
      next_billing_date: (opts.periodEnd ?? new Date(at.getTime() + 30 * DAY)).toISOString(),
      cancel_at_next_billing_date: opts.cancelAtEnd ?? false,
      customer: { email: "designer@example.com", name: "Test Designer", customer_id: "cus_1" },
      product_id: "prod_legibly_pro",
    } satisfies SubscriptionPayload,
  };

  const body = JSON.stringify(event);
  const id = `msg_${++msgSeq}`;
  const stamp = new Date();
  const signature = signer.sign(id, stamp, body);

  return {
    body,
    event,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(stamp.getTime() / 1000)),
      "webhook-signature": signature,
    },
  };
}

/** Mirrors the server's receive path so the test exercises verification too. */
function deliver(msg: ReturnType<typeof subscriptionEvent>) {
  const verified = dodo.webhooks.unwrap(msg.body, { headers: msg.headers }) as unknown as DodoEvent;
  const webhookId = msg.headers["webhook-id"];
  if (alreadyProcessed(webhookId)) return { applied: false as const, reason: "duplicate" };
  const outcome = handleEvent(verified);
  markProcessed(webhookId);
  return outcome;
}

const checks: Array<[string, () => void]> = [
  [
    "a forged body is rejected by the SDK verifier",
    () => {
      const msg = subscriptionEvent("subscription.active", "active");
      const tampered = msg.body.replace(FIGMA_USER, "attacker-figma-id");
      assert.throws(() => dodo.webhooks.unwrap(tampered, { headers: msg.headers }));
    },
  ],
  [
    "subscription.active grants Pro and records the period end",
    () => {
      const periodEnd = new Date(Date.now() + 30 * DAY);
      const out = deliver(subscriptionEvent("subscription.active", "active", { periodEnd }));
      assert.equal(out.applied, true);
      const license = getLicense(FIGMA_USER);
      assert.equal(entitlement(license), "pro");
      assert.equal(license.email, "designer@example.com");
      assert.equal(license.currentPeriodEnd, periodEnd.toISOString());
    },
  ],
  [
    "a redelivered webhook is a no-op",
    () => {
      const msg = subscriptionEvent("subscription.active", "active");
      assert.equal(deliver(msg).applied, true);
      assert.equal(deliver(msg).applied, false, "second delivery must not re-apply");
    },
  ],
  [
    "renewal pushes the period end forward",
    () => {
      const periodEnd = new Date(Date.now() + 60 * DAY);
      deliver(subscriptionEvent("subscription.renewed", "active", { periodEnd }));
      assert.equal(getLicense(FIGMA_USER).currentPeriodEnd, periodEnd.toISOString());
      assert.equal(entitlement(getLicense(FIGMA_USER)), "pro");
    },
  ],
  [
    "a failed charge (on_hold) keeps Pro while dunning runs",
    () => {
      const out = deliver(subscriptionEvent("subscription.on_hold", "on_hold"));
      assert.equal(out.applied, true);
      const license = getLicense(FIGMA_USER);
      assert.equal(license.status, "on_hold");
      assert.equal(entitlement(license), "pro", "dunning must not lock the user out mid-period");
    },
  ],
  [
    "a late-arriving stale event cannot downgrade newer state",
    () => {
      const before = getLicense(FIGMA_USER);
      const out = deliver(
        subscriptionEvent("subscription.expired", "expired", { at: new Date(Date.now() - 10 * DAY) }),
      );
      assert.equal(out.applied, false);
      assert.equal(getLicense(FIGMA_USER).status, before.status);
    },
  ],
  [
    "cancellation keeps Pro until the paid period ends, then lapses on read",
    () => {
      const periodEnd = new Date(Date.now() + 5 * DAY);
      deliver(subscriptionEvent("subscription.cancelled", "cancelled", { periodEnd, cancelAtEnd: true }));
      const license = getLicense(FIGMA_USER);
      assert.equal(entitlement(license), "pro", "still paid for — keep access");
      assert.equal(
        entitlement(license, new Date(Date.now() + 6 * DAY)),
        "free",
        "lazy expiry, no cron needed",
      );
    },
  ],
  [
    "expiry drops the plan to free",
    () => {
      deliver(subscriptionEvent("subscription.expired", "expired"));
      assert.equal(entitlement(getLicense(FIGMA_USER)), "free");
    },
  ],
  [
    "a subscription with no figma_user_id is refused, not half-applied",
    () => {
      const out = deliver(subscriptionEvent("subscription.active", "active", { metadata: {} }));
      assert.equal(out.applied, false);
      assert.match(out.reason, /figma_user_id/);
    },
  ],
  [
    "an unknown Figma user reads as free without a stored row",
    () => {
      assert.equal(entitlement(getLicense("never-seen-before")), "free");
    },
  ],
];

resetStore();
let failed = 0;
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n      ${(err as Error).message.split("\n")[0]}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
