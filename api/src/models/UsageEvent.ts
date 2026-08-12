/**
 * The activity log behind the admin panel.
 *
 * ⚠️ Metadata only. The plugin's manifest promises that no design data, image
 * or measurement is sent, and this table is where that promise would be broken
 * first if anyone were careless. `detail` exists for a duration, a plan or an
 * error code — it is truncated hard, and nothing derived from a user's file may
 * ever be passed into it.
 */

import { query } from '../lib/db';

export type UsageEventKind =
  | 'checkin'
  | 'checkout_created'
  | 'checkout_paid'
  | 'checkout_refunded'
  | 'checkout_failed'
  | 'judge_call';

export interface UsageEventInput {
  figmaUserId: string;
  kind: UsageEventKind;
  /** False marks an attempt that did not complete — a declined card, a judge outage. */
  ok?: boolean;
  detail?: string | null;
}

const MAX_DETAIL_LENGTH = 64;

export interface UsageEventStore {
  /**
   * Never throws and never rejects. Instrumentation that can fail a payment or
   * a licence check is worse than no instrumentation, so a broken write is
   * logged and swallowed.
   */
  record(event: UsageEventInput, now: Date): Promise<void>;
}

export const usageEventStore: UsageEventStore = {
  async record(event, now) {
    const detail = typeof event.detail === 'string' ? event.detail.slice(0, MAX_DETAIL_LENGTH) : null;
    try {
      await query(
        `INSERT INTO usage_events (figma_user_id, kind, ok, detail, day, at)
         VALUES ($1, $2, $3, $4, $5::date, $5)
         ON CONFLICT DO NOTHING`,
        [event.figmaUserId, event.kind, event.ok ?? true, detail, now],
      );
    } catch (error) {
      console.warn(`[usage-events] ${event.kind} not recorded: ${String(error)}`);
    }
  },
};
