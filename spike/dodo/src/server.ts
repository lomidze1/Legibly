/**
 * Minimal Dodo Payments spike server.
 *
 * Three endpoints, no framework, no database — just enough to answer one
 * question: does Dodo's subscription model fit `figmaUserId → license`?
 *
 * NOT production code. Most obviously, the endpoints here trust the
 * `figmaUserId` in the request. The real thing must put Figma OAuth in
 * front of them — see approach.md D21 for why that is not optional.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import DodoPayments from "dodopayments";
import { handleEvent, type DodoEvent } from "./handle-event.ts";
import {
  alreadyProcessed,
  allLicenses,
  entitlement,
  getLicense,
  markProcessed,
} from "./store.ts";

const PORT = Number(process.env.PORT ?? 4242);
const PRODUCT_ID = process.env.DODO_PRODUCT_ID ?? "";
const RETURN_URL = process.env.RETURN_URL ?? `http://localhost:${PORT}/checkout/success`;

// `environment: "test_mode"` targets https://test.dodopayments.com.
// The SDK reads DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_WEBHOOK_KEY from env.
const dodo = new DodoPayments({ environment: "test_mode" });

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
}

/** Webhook signatures are computed over the exact bytes received, so never re-serialize. */
function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function createCheckout(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = JSON.parse((await readRawBody(req)) || "{}");
  const figmaUserId: string | undefined = body.figmaUserId;

  if (!figmaUserId) return json(res, 400, { error: "figmaUserId required" });
  if (!PRODUCT_ID) return json(res, 500, { error: "DODO_PRODUCT_ID not set" });

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: PRODUCT_ID, quantity: 1 }],
    return_url: RETURN_URL,
    // The whole binding strategy lives on this one line. Dodo echoes metadata
    // back on every subscription webhook, so we never need a licence key,
    // an activation step, or an email the user has to copy anywhere.
    metadata: { figma_user_id: figmaUserId },
  });

  json(res, 200, { checkoutUrl: session.checkout_url, sessionId: session.session_id });
}

async function receiveWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await readRawBody(req);
  const webhookId = String(req.headers["webhook-id"] ?? "");

  let event: DodoEvent;
  try {
    // Verifies the Standard Webhooks signature against DODO_PAYMENTS_WEBHOOK_KEY.
    event = dodo.webhooks.unwrap(raw, {
      headers: req.headers as Record<string, string>,
    }) as unknown as DodoEvent;
  } catch (err) {
    console.error("✗ signature rejected:", (err as Error).message);
    // 400 tells Dodo to retry. A forged request never gets that far anyway.
    return json(res, 400, { error: "invalid signature" });
  }

  if (webhookId && alreadyProcessed(webhookId)) {
    console.log(`↻ ${event.type} (duplicate ${webhookId}) — no-op`);
    return json(res, 200, { ok: true, duplicate: true });
  }

  const outcome = handleEvent(event);
  if (webhookId) markProcessed(webhookId);

  console.log(`${outcome.applied ? "✓" : "·"} ${event.type} — ${outcome.reason}`);
  json(res, 200, { ok: true, ...outcome });
}

function licenseMe(url: URL, res: ServerResponse): void {
  const figmaUserId = url.searchParams.get("figmaUserId");
  if (!figmaUserId) return json(res, 400, { error: "figmaUserId required" });

  const license = getLicense(figmaUserId);
  json(res, 200, {
    plan: entitlement(license),
    status: license.status,
    currentPeriodEnd: license.currentPeriodEnd,
    cancelAtPeriodEnd: license.cancelAtPeriodEnd,
    stored: license,
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  try {
    if (req.method === "POST" && url.pathname === "/api/checkout/create") {
      return await createCheckout(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/webhooks/dodo") {
      return await receiveWebhook(req, res);
    }
    if (req.method === "GET" && url.pathname === "/api/license/me") {
      return licenseMe(url, res);
    }
    if (req.method === "GET" && url.pathname === "/") {
      return json(res, 200, {
        spike: "dodo",
        productConfigured: Boolean(PRODUCT_ID),
        licenses: allLicenses(),
      });
    }
    json(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: (err as Error).message });
  }
});

server.listen(PORT, () => {
  console.log(`dodo spike listening on http://localhost:${PORT}`);
  if (!PRODUCT_ID) console.log("⚠  DODO_PRODUCT_ID unset — /api/checkout/create will 500");
});
