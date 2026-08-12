import { describe, expect, it } from 'vitest';

import { signToken } from '../src/lib/hmac';
import { createLicenseMeHandler } from '../src/routes/license/me';
import { fakeLicenseStore, fakeResponse, fakeUsageEvents, proLicense } from './helpers';

const SECRET = 'k'.repeat(40);
const NOW = 1_700_000_000_000;

function setup(seed = [proLicense('victim', new Date(NOW + 300 * 86_400_000))]) {
  const licenses = fakeLicenseStore(seed);
  const usage = fakeUsageEvents();
  return {
    licenses,
    usage,
    handler: createLicenseMeHandler({ licenses, events: usage, authSecret: SECRET, now: () => NOW }),
  };
}

function bearer(userId: string) {
  return { authorization: `Bearer ${signToken(userId, SECRET, 3600, NOW)}` };
}

describe('GET /api/license/me', () => {
  it('returns the caller own licence', async () => {
    const { handler } = setup();
    const res = fakeResponse();

    await handler({ method: 'GET', headers: bearer('victim'), query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      license: { plan: 'pro', status: 'active', cycleEndsAt: expect.any(String), daysLeft: 300, judgeUsed: 0 },
    });
  });

  it('ignores a figmaUserId in the query — the token is the only subject', async () => {
    const { handler } = setup();
    const res = fakeResponse();

    await handler({ method: 'GET', headers: bearer('attacker'), query: { figmaUserId: 'victim' } }, res);

    const body = res.body as { license: { plan: string; daysLeft: number } };
    expect(body.license.plan).toBe('free');
    expect(body.license.daysLeft).toBe(0);
  });

  it('creates a free row for a first-time caller', async () => {
    const { handler, licenses } = setup([]);
    const res = fakeResponse();

    await handler({ method: 'GET', headers: bearer('newcomer'), query: {} }, res);

    expect(licenses.rows.has('newcomer')).toBe(true);
    expect((res.body as { license: { plan: string } }).license.plan).toBe('free');
  });

  it('requires a token', async () => {
    const { handler } = setup();
    const res = fakeResponse();

    await handler({ method: 'GET', headers: {}, query: { figmaUserId: 'victim' } }, res);

    expect(res.statusCode).toBe(401);
  });
});
