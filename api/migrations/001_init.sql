-- Legibly API — initial schema (backend-spec.md §7.2)
-- Apply with:  psql "$DATABASE_URL" -f migrations/001_init.sql
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS licenses (
  figma_user_id     TEXT PRIMARY KEY,
  email             TEXT,
  plan              TEXT NOT NULL DEFAULT 'free',    -- 'free' | 'pro'
  status            TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'expired'
  cycle_started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle_ends_at     TIMESTAMPTZ NOT NULL,
  judge_used        INTEGER NOT NULL DEFAULT 0,      -- free trial counter (D24)
  flitt_order_id    TEXT,
  last_duration     TEXT,                            -- 'monthly' | 'yearly'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS licenses_email_idx ON licenses (email);
CREATE INDEX IF NOT EXISTS licenses_cycle_ends_at_idx ON licenses (cycle_ends_at);

-- Webhook dedup ledger. The primary key is the lease: a second delivery of the
-- same transaction fails to insert, which is how a retry is recognised.
CREATE TABLE IF NOT EXISTS webhook_events (
  transaction_id TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL,
  order_status   TEXT NOT NULL,
  amount_cents   INTEGER,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_events_order_id_idx ON webhook_events (order_id);
CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON webhook_events (order_status, processed_at DESC);

-- OAuth hand-off between the browser callback and the polling plugin.
-- Lives in the store, not in memory: each serverless invocation is its own
-- instance, so an in-process Map would lose the token every time.
CREATE TABLE IF NOT EXISTS pending_auth (
  nonce      TEXT PRIMARY KEY,
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS pending_auth_expires_at_idx ON pending_auth (expires_at);

-- Fixed-window rate limit counters, for the same reason: an in-memory counter
-- would reset on every cold start and never actually bind.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hits       INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expires_at_idx ON rate_limits (expires_at);
