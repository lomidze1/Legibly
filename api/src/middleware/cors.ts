/**
 * CORS for the endpoints the Figma plugin calls.
 *
 * ⚠️ A plugin iframe sends `Origin: null` (or no Origin at all) — it is a
 * sandboxed frame with no real origin of its own. An allowlist of hostnames
 * would therefore block the only client these routes exist for.
 *
 * `*` is safe here precisely because the session is a Bearer token: nothing is
 * carried by the browser automatically, so a page that calls this API from
 * somewhere else gets an unauthenticated answer rather than the user's.
 * Credentialed CORS is never enabled, and must not be.
 */

import type { ApiHandler } from '../lib/http';

const MAX_AGE_SECONDS = 86_400;

export function withCors(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', String(MAX_AGE_SECONDS));

    // The Authorization header makes every call non-simple, so the browser
    // preflights first. It must not reach the route or its rate limit.
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    await handler(req, res);
  };
}
