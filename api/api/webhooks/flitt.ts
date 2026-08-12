import { env } from '../../src/config/env.js';
import type { ApiRequest, ApiResponse } from '../../src/lib/http.js';
import { flittIpAllowlist, withFlittIpAllowlist } from '../../src/middleware/flittIpAllowlist.js';
import { flittWebhookHandler } from '../../src/routes/webhooks/flitt.js';

// Composed per request rather than at module load, so an instance that started
// before the env var was set does not cache the wrong allowlist.
export default async function (req: ApiRequest, res: ApiResponse): Promise<void> {
  await withFlittIpAllowlist(flittWebhookHandler, flittIpAllowlist(env()))(req, res);
}
