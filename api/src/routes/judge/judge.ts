import { env } from '../../config/env';
import { JudgeDisabledError, judgeConfig, judgeMonth } from '../../config/judge';
import type { ApiHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { licenseStore, type LicenseRow, type LicenseStore } from '../../models/License';
import {
  JudgeInputError,
  JudgeRefusedError,
  JudgeUnavailableError,
  anthropicRunner,
  judge,
  parseJudgeInput,
  type RunModel,
} from '../../services/judgeService';
import { isLivePro } from '../../services/licenseService';

export interface JudgeQuota {
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Free trials are a lifetime allowance; Pro is a monthly one. Two counters,
 * because they answer different questions: "have you tried it?" and "is one
 * licence about to cost more than it earns?"
 */
export function quotaFor(
  license: LicenseRow,
  isPro: boolean,
  month: string,
  freeTrials: number,
  proMonthly: number,
): JudgeQuota {
  if (!isPro) {
    return {
      used: license.judgeUsed,
      limit: freeTrials,
      remaining: Math.max(0, freeTrials - license.judgeUsed),
    };
  }

  const used = license.judgeMonth === month ? license.judgeMonthUsed : 0;
  return { used, limit: proMonthly, remaining: Math.max(0, proMonthly - used) };
}

export interface JudgeDeps {
  licenses: LicenseStore;
  runModel: RunModel;
  authSecret: string;
  freeTrials: number;
  proMonthly: number;
  now: () => number;
}

export function createJudgeHandler(deps: JudgeDeps): ApiHandler {
  return async (req, res) => {
    if (req.method !== undefined && req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

    const now = deps.now();
    const userId = requireAuth(req, res, deps.authSecret, now);
    if (userId === null) return;

    let input;
    try {
      input = parseJudgeInput(req.body);
    } catch (error) {
      if (error instanceof JudgeInputError) {
        res.status(400).json({ success: false, error: 'invalid_input', message: error.message });
        return;
      }
      throw error;
    }

    const license = await deps.licenses.getOrCreate(userId);
    const pro = isLivePro(license, now);
    const month = judgeMonth(now);
    const quota = quotaFor(license, pro, month, deps.freeTrials, deps.proMonthly);

    if (quota.remaining <= 0) {
      res.status(402).json({
        success: false,
        error: 'judge_quota_exhausted',
        plan: pro ? 'pro' : 'free',
        used: quota.used,
        limit: quota.limit,
      });
      return;
    }

    let verdict;
    try {
      verdict = await judge(input, deps.runModel);
    } catch (error) {
      // The quota is untouched on every path here — a failed call costs nothing.
      if (error instanceof JudgeRefusedError) {
        res.status(422).json({ success: false, error: 'judge_refused' });
        return;
      }
      if (error instanceof JudgeUnavailableError) {
        res.status(503).json({ success: false, error: 'judge_unavailable' });
        return;
      }
      throw error;
    }

    // Booked only now, after a verdict exists.
    await deps.licenses.recordJudgeUse(userId, month, pro);

    res.status(200).json({
      success: true,
      verdict,
      quota: { used: quota.used + 1, limit: quota.limit, remaining: quota.remaining - 1 },
    });
  };
}

export const judgeHandler: ApiHandler = async (req, res) => {
  const current = env();
  let config;
  try {
    config = judgeConfig(current);
  } catch (error) {
    if (error instanceof JudgeDisabledError) {
      res.status(503).json({ success: false, error: 'judge_disabled' });
      return;
    }
    throw error;
  }

  return createJudgeHandler({
    licenses: licenseStore,
    runModel: anthropicRunner(config),
    authSecret: current.authSecret,
    freeTrials: config.freeTrials,
    proMonthly: config.proMonthly,
    now: () => Date.now(),
  })(req, res);
};
