import type { Duration } from '../config/pricing';
import { query } from '../lib/db';

export type Plan = 'free' | 'pro';
export type LicenseStatus = 'active' | 'expired';
export type { Duration };

export interface LicenseRow {
  figmaUserId: string;
  email: string | null;
  plan: Plan;
  status: LicenseStatus;
  cycleStartedAt: Date;
  cycleEndsAt: Date;
  /** Lifetime free-trial counter. Never resets. */
  judgeUsed: number;
  /** `YYYY-MM` the Pro monthly counter belongs to; null before the first Pro use. */
  judgeMonth: string | null;
  judgeMonthUsed: number;
  flittOrderId: string | null;
  lastDuration: Duration | null;
}

export interface Purchase {
  cycleStartedAt: Date;
  cycleEndsAt: Date;
  flittOrderId: string;
  duration: Duration;
  email?: string;
}

/**
 * A licence handed out from the admin panel rather than bought. `orderId`
 * carries the `adm_` prefix so revenue and conversion never count it, and
 * `duration` is null when the grant was an arbitrary number of days.
 */
export interface AdminGrant {
  cycleStartedAt: Date;
  cycleEndsAt: Date;
  orderId: string;
  duration: Duration | null;
}

export interface LicenseStore {
  /** Never returns null: a first-time user gets a free row. */
  getOrCreate(figmaUserId: string): Promise<LicenseRow>;
  /** Fills the email only when the row has none — checkout must not be overwritten by a later login. */
  setEmailIfMissing(figmaUserId: string, email: string | undefined): Promise<void>;
  find(figmaUserId: string): Promise<LicenseRow | null>;
  applyPurchase(figmaUserId: string, purchase: Purchase): Promise<LicenseRow>;
  /** Reverses a refund or chargeback, but only for the order that is currently in force. */
  applyRefund(figmaUserId: string, flittOrderId: string, now: Date): Promise<boolean>;
  /**
   * Books one judge call. Called *after* the model answers, never before — a
   * failed call must not cost the user a trial.
   */
  recordJudgeUse(figmaUserId: string, month: string, isPro: boolean): Promise<void>;
  /** Comps a licence from the admin panel. Creates the row if the user has never connected. */
  adminGrant(figmaUserId: string, grant: AdminGrant): Promise<LicenseRow>;
  /** Ends a licence now. Null when there is no such user — the panel reports that rather than inventing one. */
  adminRevoke(figmaUserId: string, now: Date): Promise<LicenseRow | null>;
}

interface LicenseDbRow {
  figma_user_id: string;
  email: string | null;
  plan: string;
  status: string;
  cycle_started_at: Date;
  cycle_ends_at: Date;
  judge_used: number;
  judge_month: string | null;
  judge_month_used: number;
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
    judgeMonth: row.judge_month,
    judgeMonthUsed: row.judge_month_used,
    flittOrderId: row.flitt_order_id,
    lastDuration: row.last_duration === 'monthly' || row.last_duration === 'yearly' ? row.last_duration : null,
  };
}

const COLUMNS = `figma_user_id, email, plan, status, cycle_started_at, cycle_ends_at,
                 judge_used, judge_month, judge_month_used, flitt_order_id, last_duration`;

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

  async applyPurchase(figmaUserId, purchase) {
    const rows = await query<LicenseDbRow>(
      `INSERT INTO licenses (figma_user_id, email, plan, status, cycle_started_at, cycle_ends_at,
                             flitt_order_id, last_duration)
       VALUES ($1, $2, 'pro', 'active', $3, $4, $5, $6)
       ON CONFLICT (figma_user_id) DO UPDATE
         SET plan = 'pro',
             status = 'active',
             cycle_started_at = EXCLUDED.cycle_started_at,
             cycle_ends_at = EXCLUDED.cycle_ends_at,
             flitt_order_id = EXCLUDED.flitt_order_id,
             last_duration = EXCLUDED.last_duration,
             email = COALESCE(NULLIF(licenses.email, ''), EXCLUDED.email),
             updated_at = now()
       RETURNING ${COLUMNS}`,
      [
        figmaUserId,
        purchase.email ?? null,
        purchase.cycleStartedAt,
        purchase.cycleEndsAt,
        purchase.flittOrderId,
        purchase.duration,
      ],
    );
    return toLicense(rows[0]!);
  },

  async applyRefund(figmaUserId, flittOrderId, now) {
    // Scoped to the order in force: a refund of an older, already-superseded
    // purchase must not cancel the licence the user has since paid for again.
    const rows = await query<{ figma_user_id: string }>(
      `UPDATE licenses
          SET plan = 'free', status = 'expired', cycle_ends_at = $3, updated_at = now()
        WHERE figma_user_id = $1 AND flitt_order_id = $2
        RETURNING figma_user_id`,
      [figmaUserId, flittOrderId, now],
    );
    return rows.length > 0;
  },

  async recordJudgeUse(figmaUserId, month, isPro) {
    if (isPro) {
      // A new month resets the counter to this call rather than continuing the
      // old one — that is what makes the Pro cap a monthly cap.
      await query(
        `UPDATE licenses
            SET judge_month = $2,
                judge_month_used = CASE WHEN judge_month IS DISTINCT FROM $2 THEN 1
                                        ELSE judge_month_used + 1 END,
                updated_at = now()
          WHERE figma_user_id = $1`,
        [figmaUserId, month],
      );
      return;
    }

    await query(
      `UPDATE licenses SET judge_used = judge_used + 1, updated_at = now()
        WHERE figma_user_id = $1`,
      [figmaUserId],
    );
  },

  async adminGrant(figmaUserId, grant) {
    const rows = await query<LicenseDbRow>(
      `INSERT INTO licenses (figma_user_id, plan, status, cycle_started_at, cycle_ends_at,
                             flitt_order_id, last_duration)
       VALUES ($1, 'pro', 'active', $2, $3, $4, $5)
       ON CONFLICT (figma_user_id) DO UPDATE
         SET plan = 'pro',
             status = 'active',
             cycle_started_at = EXCLUDED.cycle_started_at,
             cycle_ends_at = EXCLUDED.cycle_ends_at,
             flitt_order_id = EXCLUDED.flitt_order_id,
             -- A grant of N days keeps whatever duration was last bought: the
             -- column records what the user paid for, and a comp is not that.
             last_duration = COALESCE(EXCLUDED.last_duration, licenses.last_duration),
             updated_at = now()
       RETURNING ${COLUMNS}`,
      [figmaUserId, grant.cycleStartedAt, grant.cycleEndsAt, grant.orderId, grant.duration],
    );
    return toLicense(rows[0]!);
  },

  async adminRevoke(figmaUserId, now) {
    const rows = await query<LicenseDbRow>(
      `UPDATE licenses
          SET plan = 'free', status = 'expired', cycle_ends_at = $2, updated_at = now()
        WHERE figma_user_id = $1
        RETURNING ${COLUMNS}`,
      [figmaUserId, now],
    );
    const row = rows[0];
    return row === undefined ? null : toLicense(row);
  },
};
