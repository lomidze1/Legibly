import { describe, expect, it } from 'vitest';

/**
 * Buying on legibly.design: sign in with Figma on the website, carry the
 * session in an httpOnly cookie, spend it only from the website's own origin.
 * The plugin's Bearer flow is covered in oauth.test.ts and must not change.
 */

import { signToken, verifyToken } from '../src/lib/hmac.js';
import type { ApiHandler } from '../src/lib/http.js';
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  isValidReturnTo,
  oauthCookieValue,
  readCookie,
  webLoginFrom,
} from '../src/lib/webSession.js';
import { requireAuth } from '../src/middleware/auth.js';
import { withCors } from '../src/middleware/cors.js';
import { createCallbackHandler } from '../src/routes/auth/callback.js';
import { createLoginHandler } from '../src/routes/auth/login.js';
import { createMeHandler } from '../src/routes/auth/session.js';
import { createCheckoutCreateHandler } from '../src/routes/checkout/create.js';
import { createLicenseMeHandler } from '../src/routes/license/me.js';
import type { CheckoutRequest } from '../src/services/flittService.js';
import type { FigmaOAuthConfig } from '../src/services/figmaOAuth.js';
import {
  VALID_NONCE,
  fakeAuthStore,
  fakeLicenseStore,
  fakeResponse,
  fakeUsageEvents,
  type FakeResponse,
} from './helpers.js';

const SECRET = 'k'.repeat(40);
const NOW = 1_700_000_000_000;
const SITE = 'https://legibly.design';
const RETURN_TO = '/checkout?billing=monthly';

const config: FigmaOAuthConfig = {
  clientId: 'client-123',
  clientSecret: 'secret-456',
  redirectUri: 'https://api.legibly.design/api/auth/figma/callback',
};

function setCookies(res: FakeResponse): string[] {
  const value = res.headers['Set-Cookie'];
  if (value === undefined) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function cookieNamed(res: FakeResponse, name: string): string | undefined {
  return setCookies(res).find((cookie) => cookie.startsWith(`${name}=`));
}

function valueOf(cookie: string | undefined): string | undefined {
  return cookie?.split(';')[0]?.split('=').slice(1).join('=');
}

const sessionFor = (userId = '4242') => `${SESSION_COOKIE}=${signToken(userId, SECRET, 3600, NOW)}`;

function kit({ figmaFails = false } = {}) {
  const store = fakeAuthStore(() => NOW);
  const licenses = fakeLicenseStore();
  const login = createLoginHandler({ config, store, makeState: () => 'abc123', now: () => NOW });
  const callback = createCallbackHandler({
    config,
    store,
    licenses,
    exchangeCode: async () => {
      if (figmaFails) throw new Error('figma is down');
      return 'figma-access-token';
    },
    fetchUser: async () => ({ id: '4242', email: 'designer@example.com' }),
    authSecret: SECRET,
    websiteBaseUrl: SITE,
    now: () => NOW,
  });
  return { store, licenses, login, callback };
}

describe('return_to', () => {
  it('accepts a path on the website, query included', () => {
    for (const path of ['/', '/checkout', RETURN_TO]) expect(isValidReturnTo(path)).toBe(true);
  });

  it('refuses anything that could leave the website', () => {
    for (const path of ['', 'checkout', '//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', `/${'a'.repeat(256)}`]) {
      expect(isValidReturnTo(path)).toBe(false);
    }
  });
});

describe('readCookie', () => {
  it('finds one cookie among several', () => {
    expect(readCookie({ headers: { cookie: `a=1; ${SESSION_COOKIE}=tok.sig; b=2` } }, SESSION_COOKIE)).toBe('tok.sig');
  });

  it('returns undefined when it is absent or empty', () => {
    expect(readCookie({ headers: { cookie: 'a=1' } }, SESSION_COOKIE)).toBeUndefined();
    expect(readCookie({ headers: { cookie: `${SESSION_COOKIE}=` } }, SESSION_COOKIE)).toBeUndefined();
    expect(readCookie({ headers: {} }, SESSION_COOKIE)).toBeUndefined();
  });
});

describe('website sign-in — GET /api/auth/figma/login?return_to=', () => {
  it('binds the state to this browser with a cookie and sends it to Figma', async () => {
    const { login, store } = kit();
    const res = fakeResponse();

    await login({ method: 'GET', headers: {}, query: { return_to: RETURN_TO } }, res);

    expect(res.statusCode).toBe(302);
    expect(new URL(String(res.headers.Location)).searchParams.get('state')).toBe('abc123');
    expect(valueOf(cookieNamed(res, OAUTH_COOKIE))).toBe(oauthCookieValue('abc123', RETURN_TO));
    // No row: the cookie is the state's only home in the website flow.
    expect(store.states.size).toBe(0);
  });

  it('sets the state cookie httpOnly, Secure, Lax and host-only', async () => {
    const { login } = kit();
    const res = fakeResponse();

    await login({ method: 'GET', headers: {}, query: { return_to: RETURN_TO } }, res);

    const cookie = cookieNamed(res, OAUTH_COOKIE)!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it('refuses a return_to that points off the website', async () => {
    const { login } = kit();

    for (const returnTo of ['//evil.com', 'https://evil.com/login']) {
      const res = fakeResponse();
      await login({ method: 'GET', headers: {}, query: { return_to: returnTo } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ success: false, error: 'invalid_return_to' });
    }
  });

  it('keeps the plugin flow when a plugin nonce is present', async () => {
    const { login, store } = kit();
    const res = fakeResponse();

    await login({ method: 'GET', headers: {}, query: { plugin_nonce: VALID_NONCE, return_to: RETURN_TO } }, res);

    expect(store.states.has('abc123')).toBe(true);
    expect(cookieNamed(res, OAUTH_COOKIE)).toBeUndefined();
  });
});

describe('website sign-in — GET /api/auth/figma/callback', () => {
  const stateCookie = (returnTo = RETURN_TO) => `${OAUTH_COOKIE}=${oauthCookieValue('abc123', returnTo)}`;

  it('sets the session cookie and sends the browser back to the page that asked', async () => {
    const { callback, store } = kit();
    const res = fakeResponse();

    await callback(
      { method: 'GET', headers: { cookie: stateCookie() }, query: { code: 'auth-code', state: 'abc123' } },
      res,
    );

    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toBe(`${SITE}${RETURN_TO}`);

    const token = valueOf(cookieNamed(res, SESSION_COOKIE))!;
    const verified = verifyToken(token, SECRET, NOW);
    expect(verified.ok && verified.payload.userId).toBe('4242');
    expect(cookieNamed(res, OAUTH_COOKIE)).toContain('Max-Age=0');
    // Nothing is parked for a plugin poll that will never come.
    expect(store.pending.size).toBe(0);
  });

  it('creates the licence row with the Figma email, as the plugin flow does', async () => {
    const { callback, licenses } = kit();

    await callback(
      { method: 'GET', headers: { cookie: stateCookie() }, query: { code: 'auth-code', state: 'abc123' } },
      fakeResponse(),
    );

    expect(licenses.rows.get('4242')).toMatchObject({ plan: 'free', email: 'designer@example.com' });
  });

  it('refuses a callback whose state this browser was never given', async () => {
    const { callback } = kit();
    const res = fakeResponse();

    await callback(
      { method: 'GET', headers: { cookie: stateCookie() }, query: { code: 'auth-code', state: 'someone-else' } },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(cookieNamed(res, SESSION_COOKIE)).toBeUndefined();
  });

  it('does not trust a return path it finds in the cookie', () => {
    const req = { headers: { cookie: stateCookie('//evil.com') } };
    expect(webLoginFrom(req, 'abc123')).toBeNull();
  });

  it('says so, clears the state and sets no session when Figma fails', async () => {
    const { callback } = kit({ figmaFails: true });
    const res = fakeResponse();

    await callback(
      { method: 'GET', headers: { cookie: stateCookie() }, query: { code: 'auth-code', state: 'abc123' } },
      res,
    );

    expect(res.statusCode).toBe(502);
    expect(res.text).toContain('nothing was charged');
    expect(cookieNamed(res, OAUTH_COOKIE)).toContain('Max-Age=0');
    expect(cookieNamed(res, SESSION_COOKIE)).toBeUndefined();
  });
});

describe('the session cookie', () => {
  it('is accepted from the website on a route that opted in', () => {
    const res = fakeResponse();
    const req = { headers: { origin: SITE, cookie: sessionFor() } };

    expect(requireAuth(req, res, SECRET, NOW, SITE)).toBe('4242');
  });

  it('is ignored without the website Origin, from another origin, or on a route that did not opt in', () => {
    const cases = [
      { req: { headers: { cookie: sessionFor() } }, origin: SITE },
      { req: { headers: { origin: 'https://evil.example', cookie: sessionFor() } }, origin: SITE },
      { req: { headers: { origin: SITE, cookie: sessionFor() } }, origin: undefined },
    ];
    for (const { req, origin } of cases) {
      const res = fakeResponse();
      expect(requireAuth(req, res, SECRET, NOW, origin)).toBeNull();
      expect(res.statusCode).toBe(401);
    }
  });

  it('loses to a Bearer token when both arrive', () => {
    const bearer = `Bearer ${signToken('plugin-user', SECRET, 3600, NOW)}`;
    const req = { headers: { origin: SITE, cookie: sessionFor(), authorization: bearer } };

    expect(requireAuth(req, fakeResponse(), SECRET, NOW, SITE)).toBe('plugin-user');
  });
});

describe('CORS with the website configured', () => {
  const reached: ApiHandler = (_req, res) => {
    res.status(200).json({ ok: true });
  };

  it('echoes the website origin, with credentials', async () => {
    const res = fakeResponse();
    await withCors(reached, () => SITE)({ method: 'GET', headers: { origin: SITE } }, res);

    expect(res.headers['Access-Control-Allow-Origin']).toBe(SITE);
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(res.headers.Vary).toBe('Origin');
  });

  it('still gives everyone else the wildcard and no credentials', async () => {
    for (const origin of ['null', 'https://evil.example', 'https://legibly.design.evil.example']) {
      const res = fakeResponse();
      await withCors(reached, () => SITE)({ method: 'GET', headers: { origin } }, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(res.headers['Access-Control-Allow-Credentials']).toBeUndefined();
    }
  });
});

describe('DELETE /api/auth/me — signing out of the website', () => {
  const me = createMeHandler({ authSecret: SECRET, now: () => NOW, websiteOrigin: SITE });

  it('clears the session cookie when the website asks', async () => {
    const res = fakeResponse();
    await me({ method: 'DELETE', headers: { origin: SITE, cookie: sessionFor() } }, res);

    expect(res.statusCode).toBe(200);
    expect(cookieNamed(res, SESSION_COOKIE)).toContain('Max-Age=0');
  });

  it('refuses anyone else', async () => {
    const res = fakeResponse();
    await me({ method: 'DELETE', headers: { origin: 'https://evil.example', cookie: sessionFor() } }, res);

    expect(res.statusCode).toBe(403);
    expect(setCookies(res)).toEqual([]);
  });
});

describe('buying from the website', () => {
  it('reads the licence and the signed-in email through the cookie', async () => {
    const licenses = fakeLicenseStore();
    await licenses.getOrCreate('4242');
    await licenses.setEmailIfMissing('4242', 'designer@example.com');
    const handler = createLicenseMeHandler({
      licenses,
      events: fakeUsageEvents(),
      authSecret: SECRET,
      websiteOrigin: SITE,
      now: () => NOW,
    });
    const res = fakeResponse();

    await handler({ method: 'GET', headers: { origin: SITE, cookie: sessionFor() } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, license: { plan: 'free' }, email: 'designer@example.com' });
  });

  it('opens a checkout for the signed-in Figma user and nobody else', async () => {
    const requests: CheckoutRequest[] = [];
    const handler = createCheckoutCreateHandler({
      config: { merchantId: '1', secretKey: 's', baseUrl: 'https://pay.flitt.com' },
      licenses: fakeLicenseStore(),
      events: fakeUsageEvents(),
      createCheckout: async (_config, request) => {
        requests.push(request);
        return 'https://pay.flitt.com/c/abc';
      },
      authSecret: SECRET,
      apiPublicUrl: 'https://api.legibly.design',
      websiteOrigin: SITE,
      now: () => NOW,
    });
    const res = fakeResponse();

    await handler(
      {
        method: 'POST',
        headers: { origin: SITE, cookie: sessionFor() },
        // A body that names someone else is ignored — the cookie is the caller.
        body: { duration: 'monthly', figmaUserId: 'victim' },
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, checkoutUrl: 'https://pay.flitt.com/c/abc' });
    expect(requests[0]?.figmaUserId).toBe('4242');
    expect(requests[0]?.duration).toBe('monthly');
  });
});
