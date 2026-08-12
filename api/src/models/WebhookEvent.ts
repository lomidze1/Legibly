/**
 * The dedup ledger. Inserting the row *is* the lease: the primary key makes a
 * second delivery of the same transaction fail, which is how Flitt's retry
 * schedule (2s / 60s / 5m / 10m / 1h / 24h) is prevented from paying twice.
 */

import { query } from '../lib/db';

export interface WebhookEventRecord {
  transactionId: string;
  orderId: string;
  orderStatus: string;
  amountCents: number | null;
}

export interface WebhookEventStore {
  /** True when this delivery is new and the caller now owns the lease. */
  acquire(event: WebhookEventRecord): Promise<boolean>;
  /** Hands the lease back so a retry can do the work that just failed. */
  release(transactionId: string): Promise<void>;
}

export const webhookEventStore: WebhookEventStore = {
  async acquire(event) {
    const rows = await query<{ transaction_id: string }>(
      `INSERT INTO webhook_events (transaction_id, order_id, order_status, amount_cents)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (transaction_id) DO NOTHING
       RETURNING transaction_id`,
      [event.transactionId, event.orderId, event.orderStatus, event.amountCents],
    );
    return rows.length > 0;
  },

  async release(transactionId) {
    await query('DELETE FROM webhook_events WHERE transaction_id = $1', [transactionId]);
  },
};
