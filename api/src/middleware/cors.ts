/**
 * CORS for the endpoints the Figma plugin and the website call.
 *
 * ⚠️ A plugin iframe sends `Origin: null` (or no Origin at all) — it is a
 * sandboxed frame with no real origin of its own. An allowlist of hostnames
 * would therefore block the client these routes were first built for.
 *
 * Two answers, never mixed:
 *  - anyone: `*` and no credentials. Safe because the plugin's session is a
 *    Bearer token — nothing is carried by the browser automatically, so a page
 *    elsewhere gets an unauthenticated answer rather than the user's.
 *  - the website, and only the website: its own origin echoed back with
 *    credentials, so its session cookie rides along on its own fetches.
 *
 * ⚠️ Credentials are never paired with `*`, and no Origin but the website's is
 * ever echoed — echoing whatever arrives is the credentialed-CORS trap.
 */

import type { ApiHandler } from '../lib/http.js';

const MAX_AGE_SECONDS = 86_400;

export function withCors(handler: ApiHandler, websiteOrigin?: () => string | undefined): ApiHandler {
  return async (req, res) => {
    const website = websiteOrigin?.();
    if (website !== undefined && req.headers.origin === website) {
      res.setHeader('Access-Control-Allow-Origin', website);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    // The answer now depends on Origin, so a cache must not hand one caller's to another.
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
