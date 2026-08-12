/**
 * The read side of the admin panel: every number and every table it shows.
 *
 * Deliberately computed live, with no cache and no rollup table. At the scale
 * this is built for — the first few thousand licences — each query below runs
 * in milliseconds against the indexes that already exist, and a cache would buy
 * nothing but a class of bug where the founder is looking at yesterday.
 *
 * ⚠️ Timestamps are grouped by UTC day. Vercel and the database both run UTC,
 * so "today" in the panel is the UTC day, not the viewer's.
 */

import { CURRENCY, PRICES } from '../config/pricing.js';
import { query } from '../lib/db.js';

const DAY_MS = 86_400_000;

/**
 * The user id inside a Flitt order id. `buildOrderId` makes
 * `lgb_pro_<sanitised id>_<epoch ms>`, and a sanitised id may itself contain
 * underscores — so the timestamp is peeled off the end rather than the id split
 * off the front.
 */
const ORDER_USER_ID = `regexp_replace(w.order_id, '^lgb_pro_(.*)_[0-9]+$', '\\1')`;

/** Admin grants get their own order-id prefix so they never count as revenue. */
export const ADMIN_ORDER_PREFIX = 'adm_';

export interface AdminUserRow {
  figmaUserId: string;
  email: string | null;
  /** Derived, not stored: a `pro` row whose cycle has run out is a free user. */
  plan: 'free' | 'pro';
  status: string;
  cycleEndsAt: string | null;
  daysLeft: number;
  lastDuration: string | null;
  judgeUsed: number;
  judgeMonthUsed: number;
  /** True when the licence has ever been paid for (admin grants do not count). */
  paid: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface AdminActivityRow {
  at: string;
  figmaUserId: string;
  email: string | null;
  kind: string;
  ok: boolean;
  detail: string | null;
}

export interface AdminPaymentRow {
  at: string;
  figmaUserId: string;
  email: string | null;
  orderId: string;
  transactionId: string;
  status: string;
  amountCents: number | null;
}

export interface AdminAuditRow {
  at: string;
  figmaUserId: string;
  action: string;
  actor: string;
  reason: string | null;
  detail: string | null;
}

export interface AdminDailyPoint {
  day: string;
  newUsers: number;
  activeUsers: number;
  grossCents: number;
}

export interface AdminStats {
  generatedAt: string;
  users: {
    total: number;
    pro: number;
    free: number;
    lapsed: number;
    new7d: number;
    new30d: number;
    active7d: number;
    active30d: number;
  };
  revenue: {
    currency: string;
    gross7dCents: number;
    gross30dCents: number;
    refunded30dCents: number;
    net30dCents: number;
    lifetimeGrossCents: number;
    approved7d: number;
    approved30d: number;
    reversed30d: number;
  };
  payments: {
    declined30d: number;
    monthly30d: number;
    yearly30d: number;
    /** Approved ÷ (approved + declined) over 30 days, as a percentage. */
    successRate30dPercent: number;
  };
  conversion: {
    payingNow: number;
    paidEver: number;
    rate30dPercent: number;
    lifetimeRatePercent: number;
  };
  judge: {
    calls30d: number;
    failed30d: number;
    users30d: number;
    trialsUsedTotal: number;
    proCallsThisMonth: number;
  };
  daily: AdminDailyPoint[];
}

export interface UsersQuery {
  search?: string;
  plan?: 'free' | 'pro';
  paid?: boolean;
  sort: 'recent' | 'seen' | 'ends' | 'judge';
  page: number;
  limit: number;
}

export interface FeedQuery {
  /** Payments: an order status. Activity: a usage-event kind. */
  filter?: string;
  page: number;
  limit: number;
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserDetail {
  user: AdminUserRow;
  events: AdminActivityRow[];
  payments: AdminPaymentRow[];
  audit: AdminAuditRow[];
}

export interface AdminStore {
  stats(now: Date): Promise<AdminStats>;
  users(request: UsersQuery): Promise<Paged<AdminUserRow>>;
  user(figmaUserId: string, now: Date): Promise<AdminUserDetail | null>;
  payments(request: FeedQuery): Promise<Paged<AdminPaymentRow>>;
  activity(request: FeedQuery): Promise<Paged<AdminActivityRow>>;
}

// ----------------------------------------------------------------------------
// Row mapping
// ----------------------------------------------------------------------------

interface UserDbRow {
  figma_user_id: string;
  email: string | null;
  plan: string;
  status: string;
  cycle_ends_at: Date;
  last_duration: string | null;
  judge_used: number;
  judge_month_used: number;
  paid: boolean;
  created_at: Date;
  last_seen_at: Date | null;
  total?: string;
}

function toUserRow(row: UserDbRow, now: Date): AdminUserRow {
  const endsAtMs = row.cycle_ends_at.getTime();
  const live = row.plan === 'pro' && endsAtMs > now.getTime();

  return {
    figmaUserId: row.figma_user_id,
    email: row.email,
    plan: live ? 'pro' : 'free',
    status: row.status,
    cycleEndsAt: live ? row.cycle_ends_at.toISOString() : null,
    daysLeft: live ? Math.ceil((endsAtMs - now.getTime()) / DAY_MS) : 0,
    lastDuration: row.last_duration,
    judgeUsed: row.judge_used,
    judgeMonthUsed: row.judge_month_used,
    paid: row.paid,
    createdAt: row.created_at.toISOString(),
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
  };
}

interface ActivityDbRow {
  at: Date;
  figma_user_id: string;
  email: string | null;
  kind: string;
  ok: boolean;
  detail: string | null;
  total?: string;
}

function toActivityRow(row: ActivityDbRow): AdminActivityRow {
  return {
    at: row.at.toISOString(),
    figmaUserId: row.figma_user_id,
    email: row.email,
    kind: row.kind,
    ok: row.ok,
    detail: row.detail,
  };
}

interface PaymentDbRow {
  processed_at: Date;
  figma_user_id: string;
  email: string | null;
  order_id: string;
  transaction_id: string;
  order_status: string;
  amount_cents: number | null;
  total?: string;
}

function toPaymentRow(row: PaymentDbRow): AdminPaymentRow {
  return {
    at: row.processed_at.toISOString(),
    figmaUserId: row.figma_user_id,
    email: row.email,
    orderId: row.order_id,
    transactionId: row.transaction_id,
    status: row.order_status,
    amountCents: row.amount_cents,
  };
}

interface AuditDbRow {
  at: Date;
  figma_user_id: string;
  action: string;
  actor: string;
  reason: string | null;
  detail: string | null;
}

function toAuditRow(row: AuditDbRow): AdminAuditRow {
  return {
    at: row.at.toISOString(),
    figmaUserId: row.figma_user_id,
    action: row.action,
    actor: row.actor,
    reason: row.reason,
    detail: row.detail,
  };
}

/** `count(*) OVER ()` comes back as a string from pg — one window, no second round trip. */
function totalOf(rows: { total?: string }[]): number {
  const raw = rows[0]?.total;
  return raw === undefined ? 0 : Number(raw);
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

const USER_COLUMNS = `l.figma_user_id, l.email, l.plan, l.status, l.cycle_ends_at, l.last_duration,
                      l.judge_used, l.judge_month_used, l.created_at,
                      (l.flitt_order_id IS NOT NULL AND l.flitt_order_id NOT LIKE '${ADMIN_ORDER_PREFIX}%') AS paid,
                      (SELECT max(u.at) FROM usage_events u
                        WHERE u.figma_user_id = l.figma_user_id AND u.kind = 'checkin') AS last_seen_at`;

const USER_SORTS: Record<UsersQuery['sort'], string> = {
  recent: 'l.created_at DESC',
  seen: 'last_seen_at DESC NULLS LAST',
  ends: 'l.cycle_ends_at DESC',
  judge: '(l.judge_used + l.judge_month_used) DESC',
};

// ----------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------

export const adminStore: AdminStore = {
  async stats(now) {
    const since7d = new Date(now.getTime() - 7 * DAY_MS);
    const since30d = new Date(now.getTime() - 30 * DAY_MS);
    const month = now.toISOString().slice(0, 7);
    const firstDay = new Date(now.getTime() - 29 * DAY_MS);

    // Four aggregates over three tables, plus the series. Run together: they do
    // not depend on each other, and the panel wants one number for latency.
    const [userRows, revenueRows, judgeRows, dailyRows] = await Promise.all([
      query<{
        total: string;
        pro: string;
        lapsed: string;
        new7d: string;
        new30d: string;
        new30d_paid: string;
        paid_ever: string;
        active7d: string;
        active30d: string;
      }>(
        `SELECT
           count(*)::text AS total,
           count(*) FILTER (WHERE plan = 'pro' AND cycle_ends_at > $1)::text AS pro,
           count(*) FILTER (WHERE plan = 'pro' AND cycle_ends_at <= $1)::text AS lapsed,
           count(*) FILTER (WHERE created_at >= $2)::text AS new7d,
           count(*) FILTER (WHERE created_at >= $3)::text AS new30d,
           count(*) FILTER (WHERE created_at >= $3 AND flitt_order_id IS NOT NULL
                              AND flitt_order_id NOT LIKE '${ADMIN_ORDER_PREFIX}%')::text AS new30d_paid,
           count(*) FILTER (WHERE flitt_order_id IS NOT NULL
                              AND flitt_order_id NOT LIKE '${ADMIN_ORDER_PREFIX}%')::text AS paid_ever,
           (SELECT count(DISTINCT figma_user_id) FROM usage_events
             WHERE kind = 'checkin' AND at >= $2)::text AS active7d,
           (SELECT count(DISTINCT figma_user_id) FROM usage_events
             WHERE kind = 'checkin' AND at >= $3)::text AS active30d
         FROM licenses`,
        [now, since7d, since30d],
      ),
      query<{
        gross7d: string;
        gross30d: string;
        refunded30d: string;
        lifetime: string;
        approved7d: string;
        approved30d: string;
        reversed30d: string;
        declined30d: string;
        monthly30d: string;
        yearly30d: string;
      }>(
        `SELECT
           coalesce(sum(amount_cents) FILTER (WHERE order_status = 'approved' AND processed_at >= $1), 0)::text AS gross7d,
           coalesce(sum(amount_cents) FILTER (WHERE order_status = 'approved' AND processed_at >= $2), 0)::text AS gross30d,
           coalesce(sum(amount_cents) FILTER (WHERE order_status = 'reversed' AND processed_at >= $2), 0)::text AS refunded30d,
           coalesce(sum(amount_cents) FILTER (WHERE order_status = 'approved'), 0)::text AS lifetime,
           count(*) FILTER (WHERE order_status = 'approved' AND processed_at >= $1)::text AS approved7d,
           count(*) FILTER (WHERE order_status = 'approved' AND processed_at >= $2)::text AS approved30d,
           count(*) FILTER (WHERE order_status = 'reversed' AND processed_at >= $2)::text AS reversed30d,
           count(*) FILTER (WHERE order_status IN ('declined', 'expired') AND processed_at >= $2)::text AS declined30d,
           count(*) FILTER (WHERE order_status = 'approved' AND processed_at >= $2 AND amount_cents = $3)::text AS monthly30d,
           count(*) FILTER (WHERE order_status = 'approved' AND processed_at >= $2 AND amount_cents = $4)::text AS yearly30d
         FROM webhook_events`,
        [since7d, since30d, PRICES.monthly, PRICES.yearly],
      ),
      query<{
        calls30d: string;
        failed30d: string;
        users30d: string;
        trials_total: string;
        pro_month: string;
      }>(
        `SELECT
           count(*) FILTER (WHERE at >= $1)::text AS calls30d,
           count(*) FILTER (WHERE at >= $1 AND NOT ok)::text AS failed30d,
           count(DISTINCT figma_user_id) FILTER (WHERE at >= $1)::text AS users30d,
           (SELECT coalesce(sum(judge_used), 0) FROM licenses)::text AS trials_total,
           (SELECT coalesce(sum(judge_month_used), 0) FROM licenses WHERE judge_month = $2)::text AS pro_month
         FROM usage_events
         WHERE kind = 'judge_call'`,
        [since30d, month],
      ),
      query<{ day: Date; new_users: string; active_users: string; gross_cents: string }>(
        `SELECT d::date AS day,
                (SELECT count(*) FROM licenses l WHERE l.created_at >= d AND l.created_at < d + interval '1 day')::text AS new_users,
                (SELECT count(DISTINCT u.figma_user_id) FROM usage_events u
                  WHERE u.kind = 'checkin' AND u.day = d::date)::text AS active_users,
                (SELECT coalesce(sum(w.amount_cents), 0) FROM webhook_events w
                  WHERE w.order_status = 'approved'
                    AND w.processed_at >= d AND w.processed_at < d + interval '1 day')::text AS gross_cents
           FROM generate_series(date_trunc('day', $1::timestamptz), date_trunc('day', $2::timestamptz), interval '1 day') d
          ORDER BY day`,
        [firstDay, now],
      ),
    ]);

    const u = userRows[0]!;
    const r = revenueRows[0]!;
    const j = judgeRows[0]!;

    const total = Number(u.total);
    const pro = Number(u.pro);
    const new30d = Number(u.new30d);
    const approved30d = Number(r.approved30d);
    const declined30d = Number(r.declined30d);
    const gross30d = Number(r.gross30d);
    const refunded30d = Number(r.refunded30d);
    const paidEver = Number(u.paid_ever);

    return {
      generatedAt: now.toISOString(),
      users: {
        total,
        pro,
        free: total - pro,
        lapsed: Number(u.lapsed),
        new7d: Number(u.new7d),
        new30d,
        active7d: Number(u.active7d),
        active30d: Number(u.active30d),
      },
      revenue: {
        currency: CURRENCY,
        gross7dCents: Number(r.gross7d),
        gross30dCents: gross30d,
        refunded30dCents: refunded30d,
        net30dCents: gross30d - refunded30d,
        lifetimeGrossCents: Number(r.lifetime),
        approved7d: Number(r.approved7d),
        approved30d,
        reversed30d: Number(r.reversed30d),
      },
      payments: {
        declined30d,
        monthly30d: Number(r.monthly30d),
        yearly30d: Number(r.yearly30d),
        successRate30dPercent: percent(approved30d, approved30d + declined30d),
      },
      conversion: {
        payingNow: pro,
        paidEver,
        rate30dPercent: percent(Number(u.new30d_paid), new30d),
        lifetimeRatePercent: percent(paidEver, total),
      },
      judge: {
        calls30d: Number(j.calls30d),
        failed30d: Number(j.failed30d),
        users30d: Number(j.users30d),
        trialsUsedTotal: Number(j.trials_total),
        proCallsThisMonth: Number(j.pro_month),
      },
      daily: dailyRows.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        newUsers: Number(row.new_users),
        activeUsers: Number(row.active_users),
        grossCents: Number(row.gross_cents),
      })),
    };
  },

  async users(request) {
    const now = new Date();
    const conditions: string[] = [];
    const params: unknown[] = [now];

    if (request.search !== undefined) {
      params.push(`%${request.search}%`, request.search);
      conditions.push(`(l.email ILIKE $${params.length - 1} OR l.figma_user_id = $${params.length})`);
    }
    if (request.plan === 'pro') conditions.push(`(l.plan = 'pro' AND l.cycle_ends_at > $1)`);
    if (request.plan === 'free') conditions.push(`NOT (l.plan = 'pro' AND l.cycle_ends_at > $1)`);
    if (request.paid === true) {
      conditions.push(`(l.flitt_order_id IS NOT NULL AND l.flitt_order_id NOT LIKE '${ADMIN_ORDER_PREFIX}%')`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(request.limit, (request.page - 1) * request.limit);

    const rows = await query<UserDbRow>(
      `SELECT ${USER_COLUMNS}, count(*) OVER ()::text AS total
         FROM licenses l
         ${where}
        ORDER BY ${USER_SORTS[request.sort]}
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rows.map((row) => toUserRow(row, now)), total: totalOf(rows), page: request.page, limit: request.limit };
  },

  async user(figmaUserId, now) {
    const [userRows, eventRows, paymentRows, auditRows] = await Promise.all([
      query<UserDbRow>(
        `SELECT ${USER_COLUMNS} FROM licenses l WHERE l.figma_user_id = $2`,
        [now, figmaUserId],
      ),
      query<ActivityDbRow>(
        `SELECT u.at, u.figma_user_id, l.email, u.kind, u.ok, u.detail
           FROM usage_events u
           LEFT JOIN licenses l ON l.figma_user_id = u.figma_user_id
          WHERE u.figma_user_id = $1
          ORDER BY u.at DESC
          LIMIT 100`,
        [figmaUserId],
      ),
      query<PaymentDbRow>(
        `SELECT w.processed_at, ${ORDER_USER_ID} AS figma_user_id, l.email, w.order_id,
                w.transaction_id, w.order_status, w.amount_cents
           FROM webhook_events w
           LEFT JOIN licenses l ON l.figma_user_id = ${ORDER_USER_ID}
          WHERE ${ORDER_USER_ID} = $1
          ORDER BY w.processed_at DESC
          LIMIT 50`,
        [figmaUserId],
      ),
      query<AuditDbRow>(
        `SELECT at, figma_user_id, action, actor, reason, detail
           FROM license_audit
          WHERE figma_user_id = $1
          ORDER BY at DESC
          LIMIT 50`,
        [figmaUserId],
      ),
    ]);

    const row = userRows[0];
    if (row === undefined) return null;

    return {
      user: toUserRow(row, now),
      events: eventRows.map(toActivityRow),
      payments: paymentRows.map(toPaymentRow),
      audit: auditRows.map(toAuditRow),
    };
  },

  async payments(request) {
    const params: unknown[] = [];
    let where = '';
    if (request.filter !== undefined) {
      params.push(request.filter);
      where = `WHERE w.order_status = $1`;
    }
    params.push(request.limit, (request.page - 1) * request.limit);

    const rows = await query<PaymentDbRow>(
      `SELECT w.processed_at, ${ORDER_USER_ID} AS figma_user_id, l.email, w.order_id,
              w.transaction_id, w.order_status, w.amount_cents, count(*) OVER ()::text AS total
         FROM webhook_events w
         LEFT JOIN licenses l ON l.figma_user_id = ${ORDER_USER_ID}
         ${where}
        ORDER BY w.processed_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rows.map(toPaymentRow), total: totalOf(rows), page: request.page, limit: request.limit };
  },

  async activity(request) {
    const params: unknown[] = [];
    let where = '';
    if (request.filter !== undefined) {
      params.push(request.filter);
      where = `WHERE u.kind = $1`;
    }
    params.push(request.limit, (request.page - 1) * request.limit);

    const rows = await query<ActivityDbRow>(
      `SELECT u.at, u.figma_user_id, l.email, u.kind, u.ok, u.detail, count(*) OVER ()::text AS total
         FROM usage_events u
         LEFT JOIN licenses l ON l.figma_user_id = u.figma_user_id
         ${where}
        ORDER BY u.at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rows.map(toActivityRow), total: totalOf(rows), page: request.page, limit: request.limit };
  },
};
