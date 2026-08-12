-- Legibly API — Phase 7 (admin panel + stats).
-- Apply with:  psql "$DATABASE_URL" -f migrations/004_admin.sql
-- Idempotent: safe to re-run.

-- Metadata-only activity log. Nothing from a design is ever written here — the
-- columns cannot hold it: a kind, a flag, and a short label chosen from a fixed
-- vocabulary (a duration, an error code, a plan).
CREATE TABLE IF NOT EXISTS usage_events (
  id            BIGSERIAL PRIMARY KEY,
  figma_user_id TEXT NOT NULL,
  kind          TEXT NOT NULL,   -- checkin | checkout_created | checkout_paid | checkout_refunded | checkout_failed | judge_call
  ok            BOOLEAN NOT NULL DEFAULT TRUE,
  detail        TEXT,            -- short, non-personal: 'monthly', 'pro', 'judge_unavailable'
  day           DATE NOT NULL,
  at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_events_at_idx ON usage_events (at DESC);
CREATE INDEX IF NOT EXISTS usage_events_user_at_idx ON usage_events (figma_user_id, at DESC);
CREATE INDEX IF NOT EXISTS usage_events_kind_day_idx ON usage_events (kind, day);

-- A check-in is written on every licence poll — the plugin asks on open, so the
-- raw stream would be mostly duplicates and would grow without bound. One row
-- per user per day is what a daily-active count actually needs, and this index
-- is what makes the `ON CONFLICT DO NOTHING` in the store collapse the rest.
CREATE UNIQUE INDEX IF NOT EXISTS usage_events_checkin_daily_idx
  ON usage_events (figma_user_id, day) WHERE kind = 'checkin';

-- Non-repudiation trail for everything that moves a licence. Admin mutations
-- write here *before* the licence changes, so an action can never be denied on
-- the grounds that no record of it exists.
CREATE TABLE IF NOT EXISTS license_audit (
  id            BIGSERIAL PRIMARY KEY,
  figma_user_id TEXT NOT NULL,
  action        TEXT NOT NULL,   -- purchase | refund | admin_grant | admin_revoke
  actor         TEXT NOT NULL,   -- webhook | admin
  reason        TEXT,            -- required for admin actions, null for webhook-driven ones
  detail        TEXT,            -- what changed, e.g. 'yearly, ends 2027-08-12'
  at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS license_audit_user_at_idx ON license_audit (figma_user_id, at DESC);
CREATE INDEX IF NOT EXISTS license_audit_at_idx ON license_audit (at DESC);

-- The users table sorts by "joined" and filters by "created in the last 30d".
CREATE INDEX IF NOT EXISTS licenses_created_at_idx ON licenses (created_at DESC);
