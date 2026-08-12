import { pingStore } from '../lib/db.js';
import type { ApiHandler } from '../lib/http.js';

export function createHealthHandler(ping: () => Promise<boolean>): ApiHandler {
  return async (req, res) => {
    if (req.method !== undefined && req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).json({ ok: false, error: 'method_not_allowed' });
      return;
    }

    const up = await ping();
    res.status(up ? 200 : 503).json({ ok: up, store: up ? 'up' : 'down' });
  };
}

export const healthHandler = createHealthHandler(pingStore);
