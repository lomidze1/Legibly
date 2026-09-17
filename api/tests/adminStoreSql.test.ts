import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The admin store's SQL against the one rule the fakes cannot catch: Postgres
 * rejects a statement that binds a parameter it never references ("could not
 * determine data type of parameter $1"). The router tests use a fake store, so
 * an always-bound `now` shipped and took the Users tab down with an HTTP 500.
 */

const calls: Array<{ text: string; params: readonly unknown[] }> = [];

vi.mock('../src/lib/db.js', () => ({
  query: vi.fn(async (text: string, params: readonly unknown[] = []) => {
    calls.push({ text, params });
    return [];
  }),
}));

const { adminStore } = await import('../src/models/adminStore.js');

function expectEveryParamReferenced(): void {
  expect(calls.length).toBeGreaterThan(0);
  for (const { text, params } of calls) {
    for (let i = 1; i <= params.length; i += 1) {
      expect(text, `$${i} is bound but unused in:\n${text}`).toMatch(new RegExp(`\\$${i}(?!\\d)`));
    }
    const highest = Math.max(0, ...[...text.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));
    expect(highest, 'SQL references a parameter that was never bound').toBeLessThanOrEqual(params.length);
  }
}

beforeEach(() => {
  calls.length = 0;
});

describe('adminStore.users', () => {
  const base = { sort: 'recent', page: 1, limit: 50 } as const;

  it.each([
    ['no filters — the Users tab as it first opens', {}],
    ['search', { search: 'designer' }],
    ['pro', { plan: 'pro' }],
    ['free', { plan: 'free' }],
    ['paid', { paid: true }],
    ['everything at once', { search: 'x', plan: 'pro', paid: true }],
  ] as const)('binds only what the SQL uses: %s', async (_label, filters) => {
    await adminStore.users({ ...base, ...filters });
    expectEveryParamReferenced();
  });
});

describe('adminStore.user', () => {
  it('binds only what each of its queries uses', async () => {
    await adminStore.user('4242', new Date());
    expectEveryParamReferenced();
  });
});
