import { describe, expect, it } from 'vitest';

import { TOKEN_ERROR_MESSAGE, signToken } from '../src/lib/hmac.js';
import type { ApiRequest } from '../src/lib/http.js';
import { bearerUserId, requireAuth } from '../src/middleware/auth.js';
import { fakeResponse } from './helpers.js';

const SECRET = 'k'.repeat(40);
const NOW = 1_700_000_000_000;

const token = (userId = 'user-1', ttl = 3600) => signToken(userId, SECRET, ttl, NOW);

describe('bearerUserId', () => {
  it('reads the id out of a valid token', () => {
    expect(bearerUserId({ headers: { authorization: `Bearer ${token()}` } }, SECRET, NOW)).toBe('user-1');
  });

  it('accepts the header under either casing', () => {
    const req = { headers: { Authorization: `Bearer ${token()}` } } as ApiRequest;
    expect(bearerUserId(req, SECRET, NOW)).toBe('user-1');
  });

  it('takes the first value when the header arrives repeated as an array', () => {
    const req = { headers: { authorization: [`Bearer ${token()}`, 'Bearer forged'] } } as ApiRequest;
    expect(bearerUserId(req, SECRET, NOW)).toBe('user-1');
  });

  it('tolerates surrounding whitespace and extra spaces after the scheme', () => {
    expect(bearerUserId({ headers: { authorization: `  Bearer   ${token()}  ` } }, SECRET, NOW)).toBe('user-1');
  });

  it('returns null for a missing header, another scheme, or a bare scheme', () => {
    for (const authorization of [undefined, 'Basic abc', 'Bearer', 'Bearer ', 'token-without-scheme']) {
      expect(bearerUserId({ headers: { authorization } }, SECRET, NOW)).toBeNull();
    }
  });

  it('returns null for a token signed with another secret', () => {
    const foreign = signToken('user-1', 'a-different-secret-that-is-long-enough', 3600, NOW);
    expect(bearerUserId({ headers: { authorization: `Bearer ${foreign}` } }, SECRET, NOW)).toBeNull();
  });

  it('returns null once the token has expired', () => {
    const req = { headers: { authorization: `Bearer ${token('user-1', 60)}` } };
    expect(bearerUserId(req, SECRET, NOW + 59_000)).toBe('user-1');
    expect(bearerUserId(req, SECRET, NOW + 60_000)).toBeNull();
  });

  it('never takes an id from the body or the query', () => {
    // The IDOR guard: with no Authorization header there is no caller, whatever
    // the request claims about itself.
    const req: ApiRequest = {
      headers: {},
      query: { figmaUserId: 'victim' },
      body: { userId: 'victim', figmaUserId: 'victim' },
    };
    expect(bearerUserId(req, SECRET, NOW)).toBeNull();
  });

  it('ignores a header that is not a string at all', () => {
    const req = { headers: { authorization: 42 } } as unknown as ApiRequest;
    expect(bearerUserId(req, SECRET, NOW)).toBeNull();
  });
});

describe('requireAuth', () => {
  it('returns the id and leaves the response untouched', () => {
    const res = fakeResponse();
    const userId = requireAuth({ headers: { authorization: `Bearer ${token()}` } }, res, SECRET, NOW);

    expect(userId).toBe('user-1');
    expect(res.statusCode).toBeNull();
    expect(res.body).toBeUndefined();
  });

  it('writes 401 and returns null when there is no usable token', () => {
    const res = fakeResponse();
    const userId = requireAuth({ headers: {} }, res, SECRET, NOW);

    expect(userId).toBeNull();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ success: false, error: TOKEN_ERROR_MESSAGE });
  });

  it('says the same thing for an expired token as for a forged one', () => {
    const expired = fakeResponse();
    requireAuth({ headers: { authorization: `Bearer ${token('user-1', 60)}` } }, expired, SECRET, NOW + 61_000);

    const forged = fakeResponse();
    requireAuth({ headers: { authorization: 'Bearer not.a.token' } }, forged, SECRET, NOW);

    expect(expired.body).toEqual(forged.body);
    expect(expired.statusCode).toBe(forged.statusCode);
  });
});
