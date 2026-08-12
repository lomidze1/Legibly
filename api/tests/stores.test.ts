import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The three Postgres-backed stores. The database is mocked at the `query` seam
 * — the same boundary every route test avoids by injecting a fake store — so
 * what is asserted here is the half no other test reaches: the statements, the
 * parameters they are given, and how a row is turned into a domain object.
 */

vi.mock('../src/lib/db', () => ({ query: vi.fn(async () => []) }));

const { query } = await import('../src/lib/db');
const { licenseStore } = await import('../src/models/License');
const { webhookEventStore } = await import('../src/models/WebhookEvent');
const { authStore } = await import('../src/models/authStore');

const mockQuery = vi.mocked(query);

/** Collapses the indentation in the SQL literals so fragments can be matched. */
function statement(call = 0): string {
  return String(mockQuery.mock.calls[call]?.[0]).replace(/\s+/g, ' ');
}

function paramsOf(call = 0): readonly unknown[] {
  return (mockQuery.mock.calls[call]?.[1] ?? []) as readonly unknown[];
}

const dbRow = {
  figma_user_id: 'u1',
  email: 'buyer@example.com',
  plan: 'pro',
  status: 'active',
  cycle_started_at: new Date('2026-01-01T00:00:00Z'),
  cycle_ends_at: new Date('2027-01-01T00:00:00Z'),
  judge_used: 2,
  judge_month: '2026-08',
  judge_month_used: 5,
  flitt_order_id: 'lgb_pro_u1_1',
  last_duration: 'yearly',
};

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue([]);
});

describe('licenseStore.getOrCreate', () => {
  it('inserts-or-touches in one statement and returns the mapped row', async () => {
    mockQuery.mockResolvedValueOnce([dbRow]);

    const license = await licenseStore.getOrCreate('u1');

    expect(statement()).toContain('INSERT INTO licenses (figma_user_id, cycle_ends_at)');
    expect(statement()).toContain('ON CONFLICT (figma_user_id) DO UPDATE');
    expect(paramsOf()).toEqual(['u1']);
    expect(license).toEqual({
      figmaUserId: 'u1',
      email: 'buyer@example.com',
      plan: 'pro',
      status: 'active',
      cycleStartedAt: dbRow.cycle_started_at,
      cycleEndsAt: dbRow.cycle_ends_at,
      judgeUsed: 2,
      judgeMonth: '2026-08',
      judgeMonthUsed: 5,
      flittOrderId: 'lgb_pro_u1_1',
      lastDuration: 'yearly',
    });
  });

  it('degrades an unrecognised plan to free rather than trusting the column', async () => {
    mockQuery.mockResolvedValueOnce([{ ...dbRow, plan: 'PRO', last_duration: 'weekly' }]);

    const license = await licenseStore.getOrCreate('u1');

    expect(license.plan).toBe('free');
    expect(license.lastDuration).toBeNull();
  });

  it('degrades an unrecognised status to active', async () => {
    mockQuery.mockResolvedValueOnce([{ ...dbRow, status: 'suspended' }]);
    expect((await licenseStore.getOrCreate('u1')).status).toBe('active');
  });
});

describe('licenseStore.setEmailIfMissing', () => {
  it('only fills a row that has no address, so checkout is not overwritten by a later login', async () => {
    await licenseStore.setEmailIfMissing('u1', 'designer@example.com');

    expect(statement()).toContain("WHERE figma_user_id = $1 AND (email IS NULL OR email = '')");
    expect(paramsOf()).toEqual(['u1', 'designer@example.com']);
  });

  it('does not go to the database at all for a missing or blank address', async () => {
    await licenseStore.setEmailIfMissing('u1', undefined);
    await licenseStore.setEmailIfMissing('u1', '');

    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('licenseStore.find', () => {
  it('returns null for a user who has no row', async () => {
    await expect(licenseStore.find('nobody')).resolves.toBeNull();
    expect(paramsOf()).toEqual(['nobody']);
  });

  it('maps the row when there is one', async () => {
    mockQuery.mockResolvedValueOnce([dbRow]);
    await expect(licenseStore.find('u1')).resolves.toMatchObject({ figmaUserId: 'u1', plan: 'pro' });
  });
});

describe('licenseStore.applyPurchase', () => {
  it('sends the cycle, the order and the duration as parameters, never interpolated', async () => {
    mockQuery.mockResolvedValueOnce([dbRow]);
    const cycleStartedAt = new Date('2026-08-12T00:00:00Z');
    const cycleEndsAt = new Date('2027-08-12T00:00:00Z');

    await licenseStore.applyPurchase('u1', {
      cycleStartedAt,
      cycleEndsAt,
      flittOrderId: 'lgb_pro_u1_2',
      duration: 'yearly',
      email: 'buyer@example.com',
    });

    expect(paramsOf()).toEqual([
      'u1',
      'buyer@example.com',
      cycleStartedAt,
      cycleEndsAt,
      'lgb_pro_u1_2',
      'yearly',
    ]);
    expect(statement()).toContain("SET plan = 'pro'");
    // An address already on the row wins over the one the payment carried.
    expect(statement()).toContain("email = COALESCE(NULLIF(licenses.email, ''), EXCLUDED.email)");
  });

  it('passes a null email when the purchase carried none', async () => {
    mockQuery.mockResolvedValueOnce([dbRow]);

    await licenseStore.applyPurchase('u1', {
      cycleStartedAt: new Date(0),
      cycleEndsAt: new Date(1),
      flittOrderId: 'lgb_pro_u1_2',
      duration: 'monthly',
    });

    expect(paramsOf()[1]).toBeNull();
  });
});

describe('licenseStore.applyRefund', () => {
  it('is scoped to the order in force — a stale reversal matches nothing', async () => {
    const now = new Date('2026-08-12T00:00:00Z');

    await expect(licenseStore.applyRefund('u1', 'lgb_pro_u1_old', now)).resolves.toBe(false);

    expect(statement()).toContain('WHERE figma_user_id = $1 AND flitt_order_id = $2');
    expect(paramsOf()).toEqual(['u1', 'lgb_pro_u1_old', now]);
  });

  it('reports true and demotes the row when the order is the current one', async () => {
    mockQuery.mockResolvedValueOnce([{ figma_user_id: 'u1' }]);

    await expect(licenseStore.applyRefund('u1', 'lgb_pro_u1_1', new Date(0))).resolves.toBe(true);
    expect(statement()).toContain("SET plan = 'free', status = 'expired'");
  });
});

describe('licenseStore.recordJudgeUse', () => {
  it('restarts the Pro counter in a new month instead of continuing the old one', async () => {
    await licenseStore.recordJudgeUse('u1', '2026-08', true);

    expect(statement()).toContain('judge_month IS DISTINCT FROM $2 THEN 1');
    expect(statement()).toContain('ELSE judge_month_used + 1');
    expect(paramsOf()).toEqual(['u1', '2026-08']);
  });

  it('bumps the lifetime counter for a free user and never touches the monthly one', async () => {
    await licenseStore.recordJudgeUse('u1', '2026-08', false);

    expect(statement()).toContain('SET judge_used = judge_used + 1');
    expect(statement()).not.toContain('judge_month');
    expect(paramsOf()).toEqual(['u1']);
  });
});

describe('webhookEventStore', () => {
  it('treats the insert as the lease: a first delivery wins', async () => {
    mockQuery.mockResolvedValueOnce([{ transaction_id: 'pay-1' }]);

    await expect(
      webhookEventStore.acquire({
        transactionId: 'pay-1',
        orderId: 'lgb_pro_u1_1',
        orderStatus: 'approved',
        amountCents: 12000,
      }),
    ).resolves.toBe(true);

    expect(statement()).toContain('ON CONFLICT (transaction_id) DO NOTHING');
    expect(paramsOf()).toEqual(['pay-1', 'lgb_pro_u1_1', 'approved', 12000]);
  });

  it('reports false when the row already exists, which is how a retry is stopped', async () => {
    await expect(
      webhookEventStore.acquire({
        transactionId: 'pay-1',
        orderId: 'lgb_pro_u1_1',
        orderStatus: 'approved',
        amountCents: 12000,
      }),
    ).resolves.toBe(false);
  });

  it('stores a null amount rather than coercing an unusable one', async () => {
    mockQuery.mockResolvedValueOnce([{ transaction_id: 'pay-2' }]);

    await webhookEventStore.acquire({
      transactionId: 'pay-2',
      orderId: 'lgb_pro_u1_1',
      orderStatus: 'declined',
      amountCents: null,
    });

    expect(paramsOf()[3]).toBeNull();
  });

  it('hands the lease back by deleting exactly that transaction', async () => {
    await webhookEventStore.release('pay-1');

    expect(statement()).toBe('DELETE FROM webhook_events WHERE transaction_id = $1');
    expect(paramsOf()).toEqual(['pay-1']);
  });
});

describe('authStore OAuth state', () => {
  it('sweeps expired states before inserting a new one', async () => {
    const expiresAt = new Date(Date.now() + 600_000);
    await authStore.saveOAuthState('state-abc', 'nonce-1', expiresAt);

    expect(statement(0)).toBe('DELETE FROM oauth_states WHERE expires_at < now()');
    expect(statement(1)).toContain('INSERT INTO oauth_states (state, plugin_nonce, expires_at)');
    expect(paramsOf(1)).toEqual(['state-abc', 'nonce-1', expiresAt]);
  });

  it('consumes with a DELETE, so the same state cannot be presented twice', async () => {
    mockQuery.mockResolvedValueOnce([
      { plugin_nonce: 'nonce-1', expires_at: new Date(Date.now() + 60_000) },
    ]);

    await expect(authStore.consumeOAuthState('state-abc')).resolves.toEqual({ pluginNonce: 'nonce-1' });
    expect(statement()).toContain('DELETE FROM oauth_states WHERE state = $1 RETURNING');
  });

  it('refuses a state whose window has closed, even though the row was still there', async () => {
    mockQuery.mockResolvedValueOnce([
      { plugin_nonce: 'nonce-1', expires_at: new Date(Date.now() - 1) },
    ]);

    await expect(authStore.consumeOAuthState('state-abc')).resolves.toBeNull();
  });

  it('refuses a state that was never issued', async () => {
    await expect(authStore.consumeOAuthState('not-ours')).resolves.toBeNull();
  });
});

describe('authStore pending hand-off', () => {
  it('sweeps expired hand-offs, then upserts on the nonce', async () => {
    const tokenExpiresAt = new Date(Date.now() + 2_592_000_000);
    const expiresAt = new Date(Date.now() + 300_000);

    await authStore.savePendingAuth('nonce-1', 'the.token', tokenExpiresAt, expiresAt);

    expect(statement(0)).toBe('DELETE FROM pending_auth WHERE expires_at < now()');
    expect(statement(1)).toContain('ON CONFLICT (nonce) DO UPDATE');
    expect(paramsOf(1)).toEqual(['nonce-1', 'the.token', tokenExpiresAt, expiresAt]);
  });

  it('hands the token over once and deletes it in the same statement', async () => {
    const tokenExpiresAt = new Date(Date.now() + 60_000);
    mockQuery.mockResolvedValueOnce([
      { token: 'the.token', token_expires_at: tokenExpiresAt, expires_at: new Date(Date.now() + 60_000) },
    ]);

    await expect(authStore.consumePendingAuth('nonce-1')).resolves.toEqual({
      token: 'the.token',
      tokenExpiresAt,
    });
    expect(statement()).toContain('DELETE FROM pending_auth WHERE nonce = $1 RETURNING');
  });

  it('withholds a token whose hand-off window has closed', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        token: 'the.token',
        token_expires_at: new Date(Date.now() + 60_000),
        expires_at: new Date(Date.now() - 1),
      },
    ]);

    await expect(authStore.consumePendingAuth('nonce-1')).resolves.toBeNull();
  });

  it('reports nothing waiting for an unknown nonce', async () => {
    await expect(authStore.consumePendingAuth('unknown')).resolves.toBeNull();
  });
});
