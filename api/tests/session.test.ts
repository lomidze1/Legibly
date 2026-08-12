import { describe, expect, it } from 'vitest';

import { PLUGIN_TOKEN_TTL_SECONDS, TOKEN_ERROR_MESSAGE, signToken, verifyToken } from '../src/lib/hmac';
import { createMeHandler, createRefreshHandler } from '../src/routes/auth/session';
import { fakeResponse } from './helpers';

const SECRET = 'k'.repeat(40);
const NOW = 1_700_000_000_000;

const deps = { authSecret: SECRET, now: () => NOW };
const refresh = createRefreshHandler(deps);
const me = createMeHandler(deps);

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

describe('POST /api/auth/refresh', () => {
  it('issues a fresh 30-day token for a valid one', async () => {
    const res = fakeResponse();
    await refresh({ method: 'POST', headers: bearer(signToken('user-1', SECRET, 60, NOW)) }, res);

    const body = res.body as { success: boolean; token: string; expiresAt: string };
    expect(res.statusCode).toBe(200);

    const verified = verifyToken(body.token, SECRET, NOW);
    expect(verified.ok && verified.payload.userId).toBe('user-1');
    expect(verified.ok && verified.payload.exp).toBe(NOW / 1000 + PLUGIN_TOKEN_TTL_SECONDS);
    expect(body.expiresAt).toBe(new Date(NOW + PLUGIN_TOKEN_TTL_SECONDS * 1000).toISOString());
  });

  it('refuses an expired token — a lapsed session must start over', async () => {
    const res = fakeResponse();
    await refresh({ method: 'POST', headers: bearer(signToken('user-1', SECRET, 60, NOW - 120_000)) }, res);

    expect(res.statusCode).toBe(401);
  });

  it('refuses anything but POST', async () => {
    const res = fakeResponse();
    await refresh({ method: 'GET', headers: bearer(signToken('user-1', SECRET, 60, NOW)) }, res);

    expect(res.statusCode).toBe(405);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the id carried by the token', async () => {
    const res = fakeResponse();
    await me({ method: 'GET', headers: bearer(signToken('user-42', SECRET, 60, NOW)) }, res);

    expect(res.body).toEqual({ success: true, userId: 'user-42' });
  });

  it('rejects a missing, malformed or foreign token', async () => {
    const cases = [
      {},
      { authorization: 'Bearer' },
      { authorization: 'Basic abc' },
      { authorization: `Bearer ${signToken('user-1', 'a-different-secret-that-is-long', 60, NOW)}` },
    ];

    for (const headers of cases) {
      const res = fakeResponse();
      await me({ method: 'GET', headers }, res);
      expect(res.statusCode).toBe(401);
    }
  });

  it('says the same thing whatever went wrong', async () => {
    const expired = fakeResponse();
    await me({ method: 'GET', headers: bearer(signToken('user-1', SECRET, 60, NOW - 120_000)) }, expired);

    const forged = fakeResponse();
    await me({ method: 'GET', headers: bearer('not.atoken') }, forged);

    expect(expired.body).toEqual({ success: false, error: TOKEN_ERROR_MESSAGE });
    expect(forged.body).toEqual(expired.body);
  });

  it('accepts the scheme case-insensitively', async () => {
    const res = fakeResponse();
    await me({ method: 'GET', headers: { authorization: `bearer ${signToken('user-1', SECRET, 60, NOW)}` } }, res);

    expect(res.statusCode).toBe(200);
  });
});
