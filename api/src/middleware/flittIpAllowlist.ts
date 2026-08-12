import type { Env } from '../config/env.js';
import { clientIpFrom } from '../lib/clientIp.js';
import type { ApiHandler } from '../lib/http.js';

export interface FlittIpAllowlist {
  enabled: boolean;
  ips: Set<string>;
}

export function flittIpAllowlist(env: Env): FlittIpAllowlist {
  const enabled = env.flittIpAllowlistEnabled !== 'false';
  const ips = new Set(
    (env.flittWebhookIps ?? '')
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => ip !== ''),
  );
  // An empty list admits everyone. That is the same deployment as a working one
  // from the outside, so it has to announce itself: turning the allowlist off is
  // a decision, forgetting to set FLITT_WEBHOOK_IPS is an accident.
  if (enabled && ips.size === 0) {
    console.warn(
      '[flitt-webhook] FLITT_WEBHOOK_IPS is empty — every caller is admitted and only the signature stands',
    );
  }
  return { enabled, ips };
}

/**
 * A caller from an unexpected address gets 200 `{received:true}` and nothing
 * else — the same answer a rejected payload gets. A 403 would tell a prober it
 * found the right endpoint, and would make Flitt retry if the allowlist were
 * ever wrong.
 */
export function withFlittIpAllowlist(handler: ApiHandler, allowlist: FlittIpAllowlist): ApiHandler {
  return async (req, res) => {
    if (allowlist.enabled && allowlist.ips.size > 0 && !allowlist.ips.has(clientIpFrom(req.headers))) {
      console.warn('[flitt-webhook] refused: caller is not on the IP allowlist');
      res.status(200).json({ received: true });
      return;
    }
    await handler(req, res);
  };
}
