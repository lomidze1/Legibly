-- Legibly API — Phase 4 (AI Designer Judge).
-- Apply with:  psql "$DATABASE_URL" -f migrations/003_judge.sql
-- Idempotent: safe to re-run.

-- `judge_used` (001) is the lifetime free-trial counter and never resets — three
-- trials means three, not three a month. A Pro licence needs a different shape:
-- a cap that refills, so the year's cost is bounded rather than the licence's.
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS judge_month TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS judge_month_used INTEGER NOT NULL DEFAULT 0;
