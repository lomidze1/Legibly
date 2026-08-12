import { describe, expect, it } from 'vitest';

import { requireAdmin, verifyAdminToken } from '../src/middleware/adminAuth';
import { fakeResponse } from './helpers';

const TOKEN = 'a'.repeat(40);

describe('admin credential', () => {
  it('accepts the token as a Bearer header', () => {
    expect(verifyAdminToken({ headers: { authorization: `Bearer ${TOKEN}` } }, TOKEN)).toBe(true);
  });

  it('accepts the bespoke X-Admin-Token header', () => {
    expect(verifyAdminToken({ headers: { 'x-admin-token': TOKEN } }, TOKEN)).toBe(true);
  });

  it('refuses a wrong token of the same length', () => {
    expect(verifyAdminToken({ headers: { 'x-admin-token': 'b'.repeat(40) } }, TOKEN)).toBe(false);
  });

  it('refuses a token of a different length without throwing', () => {
    // timingSafeEqual itself throws on unequal lengths — the guard in front of
    // it is what keeps a short guess a 401 rather than a 500.
    expect(verifyAdminToken({ headers: { 'x-admin-token': 'a' } }, TOKEN)).toBe(false);
  });

  it('refuses a request with no credential at all', () => {
    expect(verifyAdminToken({ headers: {} }, TOKEN)).toBe(false);
  });

  it('never opens up when the expected token is empty', () => {
    // A misconfigured deployment must not become an open admin panel.
    expect(verifyAdminToken({ headers: { 'x-admin-token': '' } }, '')).toBe(false);
    expect(verifyAdminToken({ headers: { authorization: 'Bearer ' } }, '')).toBe(false);
  });

  it('writes 401 and stops the caller when the credential fails', () => {
    const res = fakeResponse();
    expect(requireAdmin({ headers: {} }, res, TOKEN)).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ success: false, error: 'unauthorized' });
  });

  it('lets a valid credential through without writing anything', () => {
    const res = fakeResponse();
    expect(requireAdmin({ headers: { authorization: `Bearer ${TOKEN}` } }, res, TOKEN)).toBe(true);
    expect(res.statusCode).toBeNull();
  });
});
