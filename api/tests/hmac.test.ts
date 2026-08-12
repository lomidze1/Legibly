import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { PLUGIN_TOKEN_TTL_SECONDS, signToken, verifyToken } from '../src/lib/hmac.js';

const SECRET = 'k'.repeat(40);
const NOW = 1_700_000_000_000;

describe('signToken / verifyToken', () => {
  it('round-trips a user id', () => {
    const token = signToken('user-1', SECRET, 3600, NOW);
    const result = verifyToken(token, SECRET, NOW);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.userId).toBe('user-1');
      expect(result.payload.iat).toBe(NOW / 1000);
      expect(result.payload.exp).toBe(NOW / 1000 + 3600);
    }
  });

  it('produces exactly two dot-separated segments and no JWT header', () => {
    const token = signToken('user-1', SECRET, 3600, NOW);
    const parts = token.split('.');

    expect(parts).toHaveLength(2);
    const payload = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8'));
    expect(payload).not.toHaveProperty('alg');
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'userId']);
  });

  it('rejects a forged signature', () => {
    const token = signToken('user-1', SECRET, 3600, NOW);
    const forged = `${token.split('.')[0]}.${'x'.repeat(43)}`;

    expect(verifyToken(forged, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a signature of the wrong length without throwing', () => {
    const token = signToken('user-1', SECRET, 3600, NOW);
    expect(verifyToken(`${token.split('.')[0]}.short`, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects a tampered payload', () => {
    const token = signToken('user-1', SECRET, 3600, NOW);
    const tampered = Buffer.from(JSON.stringify({ userId: 'user-2', iat: 1, exp: 9_999_999_999 })).toString(
      'base64url',
    );

    expect(verifyToken(`${tampered}.${token.split('.')[1]}`, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects a token signed with another secret', () => {
    const token = signToken('user-1', 'other-secret-other-secret-other!', 3600, NOW);
    expect(verifyToken(token, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects an expired token', () => {
    const token = signToken('user-1', SECRET, 3600, NOW);
    expect(verifyToken(token, SECRET, NOW + 3600_001)).toEqual({ ok: false, reason: 'expired' });
  });

  it('treats the expiry second itself as expired', () => {
    const token = signToken('user-1', SECRET, 60, NOW);
    expect(verifyToken(token, SECRET, NOW + 60_000)).toEqual({ ok: false, reason: 'expired' });
    expect(verifyToken(token, SECRET, NOW + 59_000).ok).toBe(true);
  });

  it('rejects malformed shapes', () => {
    for (const bad of ['', '.', 'onlyonepart', 'a.b.c', '.signature', 'payload.']) {
      expect(verifyToken(bad, SECRET, NOW).ok).toBe(false);
    }
  });

  it('rejects a correctly signed payload that is not a token payload', () => {
    const cases = ['null', '[]', '"a string"', '{"userId":"","iat":1,"exp":9999999999}', '{"iat":1,"exp":2}'];

    for (const json of cases) {
      const payloadB64 = Buffer.from(json).toString('base64url');
      // Signed properly, so only the shape check can reject it.
      const signature = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

      expect(verifyToken(`${payloadB64}.${signature}`, SECRET, NOW)).toEqual({
        ok: false,
        reason: 'malformed',
      });
    }
  });

  it('uses a 30-day life for the plugin token', () => {
    expect(PLUGIN_TOKEN_TTL_SECONDS).toBe(2_592_000);
  });
});
