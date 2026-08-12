import type { ApiResponse } from '../src/lib/http';
import type { AuthStore, PendingAuth } from '../src/models/authStore';
import type { LicenseRow, LicenseStore } from '../src/models/License';

export interface FakeResponse extends ApiResponse {
  statusCode: number | null;
  body: unknown;
  text: string | null;
  headers: Record<string, string | number | readonly string[]>;
}

export function fakeResponse(): FakeResponse {
  return {
    statusCode: null,
    body: undefined,
    text: null,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return undefined;
    },
    send(body: string) {
      this.text = body;
      return undefined;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      this.headers[name] = value;
      return undefined;
    },
  };
}

/** In-memory stand-ins with the same contract as the Postgres implementations. */
export function fakeAuthStore(now: () => number = Date.now): AuthStore & {
  states: Map<string, { pluginNonce: string; expiresAt: Date }>;
  pending: Map<string, PendingAuth & { expiresAt: Date }>;
} {
  const states = new Map<string, { pluginNonce: string; expiresAt: Date }>();
  const pending = new Map<string, PendingAuth & { expiresAt: Date }>();

  return {
    states,
    pending,
    async saveOAuthState(state, pluginNonce, expiresAt) {
      states.set(state, { pluginNonce, expiresAt });
    },
    async consumeOAuthState(state) {
      const row = states.get(state);
      states.delete(state);
      if (row === undefined || row.expiresAt.getTime() <= now()) return null;
      return { pluginNonce: row.pluginNonce };
    },
    async savePendingAuth(nonce, token, tokenExpiresAt, expiresAt) {
      pending.set(nonce, { token, tokenExpiresAt, expiresAt });
    },
    async consumePendingAuth(nonce) {
      const row = pending.get(nonce);
      pending.delete(nonce);
      if (row === undefined || row.expiresAt.getTime() <= now()) return null;
      return { token: row.token, tokenExpiresAt: row.tokenExpiresAt };
    },
  };
}

export function fakeLicenseStore(seed: LicenseRow[] = []): LicenseStore & { rows: Map<string, LicenseRow> } {
  const rows = new Map<string, LicenseRow>(seed.map((row) => [row.figmaUserId, row]));

  return {
    rows,
    async getOrCreate(figmaUserId) {
      const existing = rows.get(figmaUserId);
      if (existing !== undefined) return existing;

      const created: LicenseRow = {
        figmaUserId,
        email: null,
        plan: 'free',
        status: 'active',
        cycleStartedAt: new Date(0),
        cycleEndsAt: new Date(0),
        judgeUsed: 0,
        flittOrderId: null,
        lastDuration: null,
      };
      rows.set(figmaUserId, created);
      return created;
    },
    async setEmailIfMissing(figmaUserId, email) {
      if (email === undefined || email === '') return;
      const row = rows.get(figmaUserId);
      if (row === undefined || (row.email !== null && row.email !== '')) return;
      rows.set(figmaUserId, { ...row, email });
    },
    async find(figmaUserId) {
      return rows.get(figmaUserId) ?? null;
    },
  };
}

export function proLicense(figmaUserId: string, cycleEndsAt: Date): LicenseRow {
  return {
    figmaUserId,
    email: 'buyer@example.com',
    plan: 'pro',
    status: 'active',
    cycleStartedAt: new Date(cycleEndsAt.getTime() - 365 * 86_400_000),
    cycleEndsAt,
    judgeUsed: 0,
    flittOrderId: 'lgb_pro_u1_1',
    lastDuration: 'yearly',
  };
}

/** A syntactically valid plugin nonce: 64 hex characters. */
export const VALID_NONCE = 'a1b2c3d4'.repeat(8);
