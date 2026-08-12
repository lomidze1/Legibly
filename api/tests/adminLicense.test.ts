import { describe, expect, it } from 'vitest';

import { DURATION_MS } from '../src/config/pricing.js';
import { grantCycleEnd, handleLicenseMutation, parseMutation } from '../src/routes/admin/license.js';
import type { LicenseAuditStore } from '../src/models/LicenseAudit.js';
import { fakeAuditStore, fakeLicenseStore, fakeResponse, proLicense } from './helpers.js';

const NOW = Date.parse('2026-08-12T12:00:00Z');
const DAY = 86_400_000;

function setup(seed: Parameters<typeof fakeLicenseStore>[0] = [], audit: LicenseAuditStore = fakeAuditStore()) {
  const licenses = fakeLicenseStore(seed);
  return { licenses, audit, deps: { licenses, audit, now: () => NOW } };
}

function post(body: unknown) {
  return { method: 'POST', headers: {}, body } as const;
}

describe('admin mutation input', () => {
  it('demands a reason — the audit row is the point of the endpoint', () => {
    expect(parseMutation({ action: 'revoke', figmaUserId: 'u1' })).toEqual({ error: 'reason_required' });
    expect(parseMutation({ action: 'revoke', figmaUserId: 'u1', reason: 'ok' })).toEqual({ error: 'reason_required' });
  });

  it('refuses a grant that names both a duration and a day count', () => {
    expect(
      parseMutation({ action: 'grant', figmaUserId: 'u1', reason: 'comp', duration: 'monthly', days: 5 }),
    ).toEqual({ error: 'grant_needs_duration_or_days' });
  });

  it('refuses a grant that names neither', () => {
    expect(parseMutation({ action: 'grant', figmaUserId: 'u1', reason: 'comp' })).toEqual({
      error: 'grant_needs_duration_or_days',
    });
  });

  it('refuses day counts outside 1…3650', () => {
    for (const days of [0, -5, 3651, 1.5]) {
      expect(parseMutation({ action: 'grant', figmaUserId: 'u1', reason: 'comp', days })).toEqual({
        error: 'invalid_days',
      });
    }
  });

  it('refuses an unknown action and an unusable id', () => {
    expect(parseMutation({ action: 'delete', figmaUserId: 'u1', reason: 'because' })).toEqual({
      error: 'unknown_action',
    });
    expect(parseMutation({ action: 'revoke', figmaUserId: 'x'.repeat(65), reason: 'because' })).toEqual({
      error: 'invalid_figma_user_id',
    });
  });
});

describe('grant arithmetic', () => {
  it('gives a duration grant the same ceiling a purchase has', () => {
    // 20 days left + a monthly grant would naively be 50 days; the purchase
    // ceiling (renewal window + duration) caps it at 37, and a grant inherits
    // that rather than becoming a way around it.
    const live = proLicense('u1', new Date(NOW + 20 * DAY));
    const end = grantCycleEnd(live, { figmaUserId: 'u1', reason: 'r', duration: 'monthly' }, NOW);

    expect(end).toBe(NOW + 37 * DAY);
  });

  it('gives a duration grant its full length to a user with nothing left', () => {
    expect(grantCycleEnd(null, { figmaUserId: 'u1', reason: 'r', duration: 'monthly' }, NOW)).toBe(
      NOW + DURATION_MS.monthly,
    );
  });

  it('takes a day grant literally on top of what is left', () => {
    const live = proLicense('u1', new Date(NOW + 20 * DAY));
    const end = grantCycleEnd(live, { figmaUserId: 'u1', reason: 'r', days: 5 }, NOW);

    expect(end).toBe(NOW + 25 * DAY);
  });

  it('starts from now for a user who has no live licence', () => {
    expect(grantCycleEnd(null, { figmaUserId: 'u1', reason: 'r', days: 7 }, NOW)).toBe(NOW + 7 * DAY);
  });
});

describe('POST /api/admin/license', () => {
  it('grants Pro to a user who has never connected, and records why', async () => {
    const { deps, licenses, audit } = setup();
    const res = fakeResponse();

    await handleLicenseMutation(
      post({ action: 'grant', figmaUserId: 'new', duration: 'yearly', reason: 'conference comp' }),
      res,
      deps,
    );

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.get('new')?.plan).toBe('pro');
    expect((audit as ReturnType<typeof fakeAuditStore>).entries[0]).toMatchObject({
      action: 'admin_grant',
      actor: 'admin',
      reason: 'conference comp',
    });
  });

  it('marks a granted licence with the admin order prefix so revenue ignores it', async () => {
    const { deps, licenses } = setup();
    await handleLicenseMutation(
      post({ action: 'grant', figmaUserId: 'u1', days: 14, reason: 'goodwill' }),
      fakeResponse(),
      deps,
    );

    expect(licenses.rows.get('u1')?.flittOrderId).toMatch(/^adm_/);
  });

  it('revokes a live licence and says what it was', async () => {
    const { deps, licenses, audit } = setup([proLicense('u1', new Date(NOW + 100 * DAY))]);
    const res = fakeResponse();

    await handleLicenseMutation(post({ action: 'revoke', figmaUserId: 'u1', reason: 'chargeback' }), res, deps);

    expect(res.statusCode).toBe(200);
    expect(licenses.rows.get('u1')?.plan).toBe('free');
    expect(licenses.rows.get('u1')?.cycleEndsAt.getTime()).toBe(NOW);
    expect((audit as ReturnType<typeof fakeAuditStore>).entries[0]?.action).toBe('admin_revoke');
  });

  it('404s a revoke of a user who does not exist, and writes no audit row', async () => {
    const { deps, audit } = setup();
    const res = fakeResponse();

    await handleLicenseMutation(post({ action: 'revoke', figmaUserId: 'ghost', reason: 'cleanup' }), res, deps);

    expect(res.statusCode).toBe(404);
    expect((audit as ReturnType<typeof fakeAuditStore>).entries).toHaveLength(0);
  });

  it('does not touch the licence when the audit row cannot be written', async () => {
    // Non-repudiation: a change nobody can account for must not happen at all.
    const failing: LicenseAuditStore = {
      async record() {
        throw new Error('audit store down');
      },
    };
    const { deps, licenses } = setup([proLicense('u1', new Date(NOW + 100 * DAY))], failing);

    await expect(
      handleLicenseMutation(post({ action: 'revoke', figmaUserId: 'u1', reason: 'chargeback' }), fakeResponse(), deps),
    ).rejects.toThrow('audit store down');
    expect(licenses.rows.get('u1')?.plan).toBe('pro');
  });

  it('refuses anything but POST', async () => {
    const { deps } = setup();
    const res = fakeResponse();

    await handleLicenseMutation({ method: 'GET', headers: {} }, res, deps);

    expect(res.statusCode).toBe(405);
  });
});
