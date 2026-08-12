/**
 * The trail every licence change leaves behind.
 *
 * Unlike `usage_events`, a failed write here is fatal to the caller: an admin
 * mutation writes its audit row *first* and only then touches the licence, so
 * that no change can exist without a record of who made it and why.
 */

import { query } from '../lib/db.js';

export type AuditAction = 'purchase' | 'refund' | 'admin_grant' | 'admin_revoke';
export type AuditActor = 'webhook' | 'admin';

export interface LicenseAuditInput {
  figmaUserId: string;
  action: AuditAction;
  actor: AuditActor;
  /** Mandatory for admin actions — the panel refuses to submit without one. */
  reason?: string | null;
  detail?: string | null;
}

const MAX_REASON_LENGTH = 280;
const MAX_DETAIL_LENGTH = 280;

export interface LicenseAuditStore {
  record(entry: LicenseAuditInput, now: Date): Promise<void>;
}

export const licenseAuditStore: LicenseAuditStore = {
  async record(entry, now) {
    await query(
      `INSERT INTO license_audit (figma_user_id, action, actor, reason, detail, at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.figmaUserId,
        entry.action,
        entry.actor,
        entry.reason?.slice(0, MAX_REASON_LENGTH) ?? null,
        entry.detail?.slice(0, MAX_DETAIL_LENGTH) ?? null,
        now,
      ],
    );
  },
};

/** The webhook's audit rows are written on a best-effort basis — a payment must not fail over a log. */
export async function recordAuditQuietly(
  store: LicenseAuditStore,
  entry: LicenseAuditInput,
  now: Date,
): Promise<void> {
  try {
    await store.record(entry, now);
  } catch (error) {
    console.warn(`[license-audit] ${entry.action} not recorded: ${String(error)}`);
  }
}
