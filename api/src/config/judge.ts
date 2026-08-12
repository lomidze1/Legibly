/**
 * AI Designer Judge — limits and the arithmetic behind them (D24, backend-spec §8.3).
 *
 * ⚠️ THE ECONOMICS ARE THE CONSTRAINT, not the code.
 *
 * Pro costs $120 for 365 days. One judge call sends a 2× PNG of one frame plus a
 * trimmed node tree, so on Claude Opus 5 ($5 / $25 per MTok) it costs roughly:
 *
 *   input   ~8k tokens  (up to 4784 for a high-res image, + tree, + rubric) → $0.040
 *   output  ~1.5k tokens (thinking is on by default on Opus 5, + verdict)   → $0.038
 *   ------------------------------------------------------------------------------
 *   ≈ $0.08 per call
 *
 * That is the number that sets the quota. At 100 calls/month — the figure
 * backend-spec §8.3 floats — a single Pro user would cost ~$94 a year against
 * $120 of revenue, before Flitt's 4% and before VAT. The default below is 30 a
 * month (~$28/year, ~23% of revenue), which leaves the product profitable while
 * still being more judging than a designer plausibly needs.
 *
 * Both the model and the quota are env-overridable because this is a business
 * decision, not a technical one — see docs/judge-eval.md.
 */

import type { Env } from './env';

/** Opus 5 unless overridden. Cheaper models are a deliberate trade, not a default. */
export const DEFAULT_JUDGE_MODEL = 'claude-opus-5';

/** Thinking is on by default on Opus 5 and shares this ceiling with the verdict. */
export const JUDGE_MAX_TOKENS = 8_000;

export const DEFAULT_FREE_TRIALS = 3;
export const DEFAULT_PRO_MONTHLY = 30;

/** A 2× PNG of one frame. Vercel caps a request body at 4.5 MB and base64 adds a third. */
export const MAX_PNG_BYTES = 3_000_000;

/** Enough structure to reason about rhythm and hierarchy; not the document. */
export const MAX_TREE_NODES = 300;

export interface JudgeConfig {
  apiKey: string;
  model: string;
  freeTrials: number;
  proMonthly: number;
}

export class JudgeNotConfiguredError extends Error {
  override name = 'JudgeNotConfiguredError';
}

export class JudgeDisabledError extends Error {
  override name = 'JudgeDisabledError';
}

/**
 * ⚠️ Off unless `JUDGE_ENABLED=true`.
 *
 * D24 is unambiguous: a judge that gives generic feedback is worse than no judge,
 * and the rubric eval is part of the definition of "ready". The eval has not been
 * run (docs/judge-eval.md), so the endpoint refuses rather than shipping an
 * unvalidated opinion to a paying user.
 */
export function judgeEnabled(env: Env): boolean {
  return env.judgeEnabled === 'true';
}

export function judgeConfig(env: Env): JudgeConfig {
  if (!judgeEnabled(env)) {
    throw new JudgeDisabledError('The judge is disabled until its eval passes');
  }
  if (env.anthropicApiKey === undefined) {
    throw new JudgeNotConfiguredError('ANTHROPIC_API_KEY is not set');
  }
  return {
    apiKey: env.anthropicApiKey,
    model: env.judgeModel ?? DEFAULT_JUDGE_MODEL,
    freeTrials: env.judgeFreeTrials,
    proMonthly: env.judgeProMonthly,
  };
}

/** `YYYY-MM` in UTC — the bucket a Pro user's monthly quota resets on. */
export function judgeMonth(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}
