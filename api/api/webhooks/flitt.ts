import { env } from '../../src/config/env';
import type { ApiRequest, ApiResponse } from '../../src/lib/http';
import { flittIpAllowlist, withFlittIpAllowlist } from '../../src/middleware/flittIpAllowlist';
import { flittWebhookHandler } from '../../src/routes/webhooks/flitt';

// Composed per request rather than at module load, so an instance that started
// before the env var was set does not cache the wrong allowlist.
export default async function (req: ApiRequest, res: ApiResponse): Promise<void> {
  await withFlittIpAllowlist(flittWebhookHandler, flittIpAllowlist(env()))(req, res);
}
