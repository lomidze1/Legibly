import { describe, expect, it } from 'vitest';

import { createAdminHandler, segmentsOf } from '../src/routes/admin/router.js';
import type {
  AdminStats,
  AdminStore,
  AdminUserRow,
  FeedQuery,
  UsersQuery,
} from '../src/models/adminStore.js';
import { fakeAuditStore, fakeLicenseStore, fakeResponse, proLicense } from './helpers.js';

const TOKEN = 'a'.repeat(40);
const NOW = Date.parse('2026-08-12T12:00:00Z');

function user(figmaUserId: string, overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    figmaUserId,
    email: `${figmaUserId}@example.com`,
    plan: 'pro',
    status: 'active',
    cycleEndsAt: '2026-09-11T12:00:00.000Z',
    daysLeft: 30,
    lastDuration: 'monthly',
    judgeUsed: 1,
    judgeMonthUsed: 2,
    paid: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    lastSeenAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  };
}

const emptyStats = { generatedAt: '', users: {}, revenue: {}, payments: {}, conversion: {}, judge: {}, daily: [] } as unknown as AdminStats;

function fakeAdminStore(rows: AdminUserRow[] = [user('u1')]) {
  const calls: { users: UsersQuery[]; payments: FeedQuery[]; activity: FeedQuery[] } = {
    users: [],
    payments: [],
    activity: [],
  };

  const store: AdminStore = {
    async stats() {
      return emptyStats;
    },
    async users(request) {
      calls.users.push(request);
      return { rows, total: rows.length, page: request.page, limit: request.limit };
    },
    async user(figmaUserId) {
      const found = rows.find((row) => row.figmaUserId === figmaUserId);
      return found === undefined ? null : { user: found, events: [], payments: [], audit: [] };
    },
    async payments(request) {
      calls.payments.push(request);
      return { rows: [], total: 0, page: request.page, limit: request.limit };
    },
    async activity(request) {
      calls.activity.push(request);
      return { rows: [], total: 0, page: request.page, limit: request.limit };
    },
  };

  return { store, calls };
}

function setup(rows?: AdminUserRow[]) {
  const admin = fakeAdminStore(rows);
  const licenses = fakeLicenseStore([proLicense('u1', new Date(NOW + 10 * 86_400_000))]);
  const audit = fakeAuditStore();

  return {
    ...admin,
    licenses,
    audit,
    handler: createAdminHandler({
      admin: admin.store,
      licenses,
      audit,
      adminToken: TOKEN,
      now: () => NOW,
    }),
  };
}

const auth = { authorization: `Bearer ${TOKEN}` };

describe('admin route dispatch', () => {
  it('reads the catch-all segments in both shapes Vercel produces', () => {
    expect(segmentsOf({ headers: {}, query: { path: ['users'] } })).toEqual(['users']);
    expect(segmentsOf({ headers: {}, query: { path: 'user' } })).toEqual(['user']);
    expect(segmentsOf({ headers: {}, query: {} })).toEqual([]);
  });

  it('falls back to the URL when Vercel fills in no segment at all', () => {
    // Production did exactly this: an empty query on every admin route, which
    // dropped the router onto `panel` and made the panel serve itself.
    expect(segmentsOf({ headers: {}, query: {}, url: '/api/admin/stats' })).toEqual(['stats']);
    expect(segmentsOf({ headers: {}, url: '/api/admin/users.csv?page=2' })).toEqual(['users.csv']);
    expect(segmentsOf({ headers: {}, url: 'https://api.legibly.design/api/admin/payments' })).toEqual([
      'payments',
    ]);
    expect(segmentsOf({ headers: {}, url: '/api/admin' })).toEqual([]);
    expect(segmentsOf({ headers: {}, url: '/api/health' })).toEqual([]);
  });

  it('prefers the query segment over the URL, so the platform still wins', () => {
    expect(segmentsOf({ headers: {}, query: { path: 'stats' }, url: '/api/admin/users' })).toEqual([
      'stats',
    ]);
  });

  it('serves the panel from /api/admin/panel, not from every admin URL', async () => {
    // The regression this whole fallback exists for: `stats` must reach the
    // auth gate, and only `panel` may answer with HTML.
    const { handler } = setup();

    const stats = fakeResponse();
    await handler({ method: 'GET', headers: {}, query: {}, url: '/api/admin/stats' }, stats);
    expect(stats.statusCode).toBe(401);
    expect(stats.text).toBeNull();

    const panel = fakeResponse();
    await handler({ method: 'GET', headers: {}, query: {}, url: '/api/admin/panel' }, panel);
    expect(panel.statusCode).toBe(200);
    expect(panel.text).toContain('<title>Legibly — admin</title>');
  });

  it('serves the panel shell without a token — the fragment never reaches us', async () => {
    const { handler } = setup();
    const res = fakeResponse();
    await handler({ method: 'GET', headers: {}, query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('<title>Legibly — admin</title>');
    expect(res.headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('never puts a secret in the page it serves anonymously', async () => {
    const { handler } = setup();
    const res = fakeResponse();
    await handler({ method: 'GET', headers: {}, query: { path: ['panel'] } }, res);

    expect(res.text).not.toContain(TOKEN);
  });

  it('refuses every data route without a credential', async () => {
    const { handler } = setup();

    for (const route of ['stats', 'users', 'user', 'payments', 'activity', 'users.csv', 'license']) {
      const res = fakeResponse();
      await handler({ method: 'GET', headers: {}, query: { path: [route] } }, res);
      expect(res.statusCode, route).toBe(401);
    }
  });

  it('answers stats, users, payments and activity for an authorised caller', async () => {
    const { handler } = setup();

    for (const route of ['stats', 'users', 'payments', 'activity']) {
      const res = fakeResponse();
      await handler({ method: 'GET', headers: auth, query: { path: [route] } }, res);
      expect(res.statusCode, route).toBe(200);
      expect((res.body as { success: boolean }).success, route).toBe(true);
    }
  });

  it('clamps paging and falls back to a known sort', async () => {
    const { handler, calls } = setup();
    const res = fakeResponse();
    await handler(
      { method: 'GET', headers: auth, query: { path: ['users'], page: '0', limit: '9000', sort: 'sneaky' } },
      res,
    );

    expect(calls.users[0]).toMatchObject({ page: 1, limit: 200, sort: 'recent' });
  });

  it('passes the users filters through', async () => {
    const { handler, calls } = setup();
    const res = fakeResponse();
    await handler(
      { method: 'GET', headers: auth, query: { path: ['users'], search: 'a@b.c', plan: 'pro', paid: 'true' } },
      res,
    );

    expect(calls.users[0]).toMatchObject({ search: 'a@b.c', plan: 'pro', paid: true });
  });

  it('exports CSV with a quoted header and one row per user', async () => {
    const { handler } = setup([user('u1'), user('u2', { email: 'quote"inside@example.com' })]);
    const res = fakeResponse();
    await handler({ method: 'GET', headers: auth, query: { path: ['users.csv'] } }, res);

    const lines = (res.text ?? '').trim().split('\n');
    expect(res.headers['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('figmaUserId,email,plan');
    // A quote in an email must be doubled, not left to break the column.
    expect(lines[2]).toContain('"quote""inside@example.com"');
  });

  it('needs a figmaUserId for the drill-down and 404s an unknown one', async () => {
    const { handler } = setup();

    const missingParam = fakeResponse();
    await handler({ method: 'GET', headers: auth, query: { path: ['user'] } }, missingParam);
    expect(missingParam.statusCode).toBe(400);

    const unknown = fakeResponse();
    await handler({ method: 'GET', headers: auth, query: { path: ['user'], figmaUserId: 'nobody' } }, unknown);
    expect(unknown.statusCode).toBe(404);
  });

  it('refuses a write verb on a read route', async () => {
    const { handler } = setup();
    const res = fakeResponse();
    await handler({ method: 'POST', headers: auth, query: { path: ['stats'] } }, res);

    expect(res.statusCode).toBe(405);
  });

  it('404s a route it does not know', async () => {
    const { handler } = setup();
    const res = fakeResponse();
    await handler({ method: 'GET', headers: auth, query: { path: ['secrets'] } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'unknown_admin_route' });
  });
});
