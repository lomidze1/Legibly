import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/config/env';
import { DEFAULT_JUDGE_MODEL, JudgeDisabledError, judgeConfig, judgeEnabled } from '../src/config/judge';
import { signToken } from '../src/lib/hmac';
import { createJudgeHandler, quotaFor } from '../src/routes/judge/judge';
import { JudgeRefusedError, JudgeUnavailableError, type RunModel } from '../src/services/judgeService';
import { fakeLicenseStore, fakeResponse, proLicense } from './helpers';

const SECRET = 'k'.repeat(40);
const NOW = Date.parse('2026-08-12T12:00:00Z');
const MONTH = '2026-08';
const DAY = 86_400_000;
const USER = 'figma-user-1';

const body = {
  png: Buffer.from('a fake png').toString('base64'),
  nodes: [{ type: 'TEXT', name: 'Title', x: 16, y: 16, w: 288, h: 24, text: 'Get started' }],
};

const verdict = {
  overall: { score: 4, summary: 'Solid; tighten the card padding.' },
  findings: [],
};

const goodModel: RunModel = async () => ({ text: JSON.stringify(verdict), stopReason: 'end_turn' });

function setup(seed: Parameters<typeof fakeLicenseStore>[0] = [], runModel: RunModel = goodModel) {
  const licenses = fakeLicenseStore(seed);
  return {
    licenses,
    handler: createJudgeHandler({
      licenses,
      runModel,
      authSecret: SECRET,
      freeTrials: 3,
      proMonthly: 30,
      now: () => NOW,
    }),
  };
}

function bearer(userId = USER) {
  return { authorization: `Bearer ${signToken(userId, SECRET, 3600, NOW)}` };
}

async function post(
  handler: ReturnType<typeof setup>['handler'],
  payload: unknown = body,
  headers: Record<string, string> = bearer(),
) {
  const res = fakeResponse();
  await handler({ method: 'POST', headers, body: payload }, res);
  return res;
}

describe('POST /api/judge', () => {
  it('returns a verdict for a free user with trials left', async () => {
    const { handler, licenses } = setup();
    const res = await post(handler);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      verdict: { overall: { score: 4 } },
      quota: { used: 1, limit: 3, remaining: 2 },
    });
    expect(licenses.rows.get(USER)?.judgeUsed).toBe(1);
  });

  it('requires a token', async () => {
    const { handler } = setup();
    const res = await post(handler, body, {});

    expect(res.statusCode).toBe(401);
  });

  it('lets a free user through exactly three times, then charges', async () => {
    const { handler, licenses } = setup();

    for (let i = 0; i < 3; i += 1) {
      expect((await post(handler)).statusCode).toBe(200);
    }

    const fourth = await post(handler);
    expect(fourth.statusCode).toBe(402);
    expect(fourth.body).toMatchObject({ error: 'judge_quota_exhausted', plan: 'free', limit: 3 });
    expect(licenses.rows.get(USER)?.judgeUsed).toBe(3);
  });

  it('gives a Pro user a monthly allowance, not the free trials', async () => {
    const { handler, licenses } = setup([proLicense(USER, new Date(NOW + 300 * DAY))]);
    const res = await post(handler);

    expect(res.body).toMatchObject({ quota: { limit: 30, used: 1 } });
    expect(licenses.rows.get(USER)?.judgeMonth).toBe(MONTH);
    expect(licenses.rows.get(USER)?.judgeMonthUsed).toBe(1);
    // The free counter is untouched — a Pro user has not spent a trial.
    expect(licenses.rows.get(USER)?.judgeUsed).toBe(0);
  });

  it('blocks a Pro user who has spent the month', async () => {
    const spent = {
      ...proLicense(USER, new Date(NOW + 300 * DAY)),
      judgeMonth: MONTH,
      judgeMonthUsed: 30,
    };
    const { handler } = setup([spent]);

    const res = await post(handler);
    expect(res.statusCode).toBe(402);
    expect(res.body).toMatchObject({ plan: 'pro', used: 30, limit: 30 });
  });

  it('starts the Pro allowance over in a new month', async () => {
    const lastMonth = {
      ...proLicense(USER, new Date(NOW + 300 * DAY)),
      judgeMonth: '2026-07',
      judgeMonthUsed: 30,
    };
    const { handler, licenses } = setup([lastMonth]);

    const res = await post(handler);
    expect(res.statusCode).toBe(200);
    expect(licenses.rows.get(USER)?.judgeMonthUsed).toBe(1);
    expect(licenses.rows.get(USER)?.judgeMonth).toBe(MONTH);
  });

  it('treats a lapsed Pro licence as free', async () => {
    const lapsed = { ...proLicense(USER, new Date(NOW - 1)), judgeUsed: 3 };
    const { handler } = setup([lapsed]);

    const res = await post(handler);
    expect(res.statusCode).toBe(402);
    expect(res.body).toMatchObject({ plan: 'free' });
  });

  it('does not spend a trial when the model fails', async () => {
    const failing: RunModel = async () => {
      throw new JudgeUnavailableError('overloaded');
    };
    const { handler, licenses } = setup([], failing);

    const res = await post(handler);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ error: 'judge_unavailable' });
    expect(licenses.rows.get(USER)?.judgeUsed).toBe(0);
  });

  it('does not spend a trial when the model refuses', async () => {
    const refusing: RunModel = async () => {
      throw new JudgeRefusedError('declined');
    };
    const { handler, licenses } = setup([], refusing);

    const res = await post(handler);
    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({ error: 'judge_refused' });
    expect(licenses.rows.get(USER)?.judgeUsed).toBe(0);
  });

  it('does not spend a trial on an unusable answer', async () => {
    const rambling: RunModel = async () => ({ text: 'here are my thoughts', stopReason: 'end_turn' });
    const { handler, licenses } = setup([], rambling);

    const res = await post(handler);
    expect(res.statusCode).toBe(503);
    expect(licenses.rows.get(USER)?.judgeUsed).toBe(0);
  });

  it('rejects a malformed frame before calling the model', async () => {
    let called = false;
    const watching: RunModel = async () => {
      called = true;
      return { text: JSON.stringify(verdict), stopReason: 'end_turn' };
    };
    const { handler } = setup([], watching);

    const res = await post(handler, { png: 'not base64!', nodes: [] });
    expect(res.statusCode).toBe(400);
    expect(called).toBe(false);
  });

  it('refuses anything but POST', async () => {
    const { handler } = setup();
    const res = fakeResponse();
    await handler({ method: 'GET', headers: bearer(), body }, res);

    expect(res.statusCode).toBe(405);
  });
});

describe('quotaFor', () => {
  const license = proLicense(USER, new Date(NOW + DAY));

  it('counts a stale month as zero used', () => {
    const stale = { ...license, judgeMonth: '2026-07', judgeMonthUsed: 30 };
    expect(quotaFor(stale, true, MONTH, 3, 30)).toEqual({ used: 0, limit: 30, remaining: 30 });
  });

  it('never reports negative remaining', () => {
    const over = { ...license, judgeMonth: MONTH, judgeMonthUsed: 99 };
    expect(quotaFor(over, true, MONTH, 3, 30).remaining).toBe(0);
  });
});

describe('judge configuration', () => {
  const baseEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    API_PUBLIC_URL: 'https://api.legibly.design',
    WEBSITE_BASE_URL: 'https://legibly.design',
    AUTH_SECRET: 'a'.repeat(40),
    ADMIN_TOKEN: 'b'.repeat(40),
    DATABASE_URL: 'postgres://user:pass@host/db',
  };

  it('is off unless explicitly switched on — D24 gates it on the eval', () => {
    expect(judgeEnabled(loadEnv(baseEnv))).toBe(false);
    expect(judgeEnabled(loadEnv({ ...baseEnv, JUDGE_ENABLED: 'yes' }))).toBe(false);
    expect(judgeEnabled(loadEnv({ ...baseEnv, JUDGE_ENABLED: 'true' }))).toBe(true);
  });

  it('refuses to build a config while disabled, even with a key present', () => {
    expect(() => judgeConfig(loadEnv({ ...baseEnv, ANTHROPIC_API_KEY: 'sk-ant-x' }))).toThrow(
      JudgeDisabledError,
    );
  });

  it('defaults to Opus 5 rather than quietly picking a cheaper model', () => {
    const config = judgeConfig(loadEnv({ ...baseEnv, JUDGE_ENABLED: 'true', ANTHROPIC_API_KEY: 'sk-ant-x' }));
    expect(config.model).toBe(DEFAULT_JUDGE_MODEL);
    expect(config.proMonthly).toBe(30);
    expect(config.freeTrials).toBe(3);
  });

  it('lets both the model and the cap be overridden — they are a business call', () => {
    const config = judgeConfig(
      loadEnv({
        ...baseEnv,
        JUDGE_ENABLED: 'true',
        ANTHROPIC_API_KEY: 'sk-ant-x',
        JUDGE_MODEL: 'claude-haiku-4-5',
        JUDGE_PRO_MONTHLY: '100',
      }),
    );

    expect(config.model).toBe('claude-haiku-4-5');
    expect(config.proMonthly).toBe(100);
  });
});
