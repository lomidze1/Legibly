import type { Env } from '../config/env';
import { clientIpFrom } from '../lib/clientIp';
import type { ApiHandler } from '../lib/http';

export interface FlittIpAllowlist {
  enabled: boolean;
  ips: Set<string>;
}

export function flittIpAllowlist(env: Env): FlittIpAllowlist {
  return {
    enabled: env.flittIpAllowlistEnabled !== 'false',
    ips: new Set(
      (env.flittWebhookIps ?? '')
        .split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip !== ''),
    ),
  };
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
