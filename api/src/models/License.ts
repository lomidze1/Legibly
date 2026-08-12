import { query } from '../lib/db';

export type Plan = 'free' | 'pro';
export type LicenseStatus = 'active' | 'expired';
export type Duration = 'monthly' | 'yearly';

export interface LicenseRow {
  figmaUserId: string;
  email: string | null;
  plan: Plan;
  status: LicenseStatus;
  cycleStartedAt: Date;
  cycleEndsAt: Date;
  judgeUsed: number;
  flittOrderId: string | null;
  lastDuration: Duration | null;
}

export interface LicenseStore {
  /** Never returns null: a first-time user gets a free row. */
  getOrCreate(figmaUserId: string): Promise<LicenseRow>;
  /** Fills the email only when the row has none — checkout must not be overwritten by a later login. */
  setEmailIfMissing(figmaUserId: string, email: string | undefined): Promise<void>;
  find(figmaUserId: string): Promise<LicenseRow | null>;
}

interface LicenseDbRow {
  figma_user_id: string;
  email: string | null;
  plan: string;
  status: string;
  cycle_started_at: Date;
  cycle_ends_at: Date;
  judge_used: number;
  flitt_order_id: string | null;
  last_duration: string | null;
}

function toLicense(row: LicenseDbRow): LicenseRow {
  return {
    figmaUserId: row.figma_user_id,
    email: row.email,
    plan: row.plan === 'pro' ? 'pro' : 'free',
    status: row.status === 'expired' ? 'expired' : 'active',
    cycleStartedAt: row.cycle_started_at,
    cycleEndsAt: row.cycle_ends_at,
    judgeUsed: row.judge_used,
    flittOrderId: row.flitt_order_id,
    lastDuration: row.last_duration === 'monthly' || row.last_duration === 'yearly' ? row.last_duration : null,
  };
}

const COLUMNS = `figma_user_id, email, plan, status, cycle_started_at, cycle_ends_at,
                 judge_used, flitt_order_id, last_duration`;

export const licenseStore: LicenseStore = {
  async getOrCreate(figmaUserId) {
    // A free row has no cycle, but the column is NOT NULL — an already-ended
    // cycle is the honest value, and it reads correctly everywhere that asks
    // "is this a pro licence that has not run out yet".
    const rows = await query<LicenseDbRow>(
      `INSERT INTO licenses (figma_user_id, cycle_ends_at)
       VALUES ($1, now())
       ON CONFLICT (figma_user_id) DO UPDATE SET updated_at = now()
       RETURNING ${COLUMNS}`,
      [figmaUserId],
    );
    return toLicense(rows[0]!);
  },

  async setEmailIfMissing(figmaUserId, email) {
    if (email === undefined || email === '') return;
    await query(
      `UPDATE licenses SET email = $2, updated_at = now()
       WHERE figma_user_id = $1 AND (email IS NULL OR email = '')`,
      [figmaUserId, email],
    );
  },

  async find(figmaUserId) {
    const rows = await query<LicenseDbRow>(
      `SELECT ${COLUMNS} FROM licenses WHERE figma_user_id = $1`,
      [figmaUserId],
    );
    const row = rows[0];
    return row === undefined ? null : toLicense(row);
  },
};
