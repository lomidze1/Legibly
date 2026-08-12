import { describe, expect, it } from 'vitest';

import { EnvError, loadEnv } from '../src/config/env';

const complete: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  API_PUBLIC_URL: 'https://api.legibly.design',
  WEBSITE_BASE_URL: 'https://legibly.design',
  AUTH_SECRET: 'a'.repeat(40),
  ADMIN_TOKEN: 'b'.repeat(40),
  DATABASE_URL: 'postgres://user:pass@host/db',
};

describe('loadEnv', () => {
  it('reads a complete environment', () => {
    const env = loadEnv(complete);
    expect(env.nodeEnv).toBe('production');
    expect(env.apiPublicUrl).toBe('https://api.legibly.design');
    expect(env.databaseUrl).toBe('postgres://user:pass@host/db');
  });

  it('throws when a required variable is missing', () => {
    const { DATABASE_URL: _omitted, ...incomplete } = complete;
    expect(() => loadEnv(incomplete)).toThrow(EnvError);
    expect(() => loadEnv(incomplete)).toThrow(/DATABASE_URL/);
  });

  it('lists every missing variable at once', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(
      /API_PUBLIC_URL, WEBSITE_BASE_URL, AUTH_SECRET, ADMIN_TOKEN, DATABASE_URL/,
    );
  });

  it('treats blank and whitespace-only values as missing', () => {
    expect(() => loadEnv({ ...complete, AUTH_SECRET: '   ' })).toThrow(/AUTH_SECRET/);
  });

  it('trims surrounding whitespace', () => {
    const env = loadEnv({ ...complete, API_PUBLIC_URL: '  https://api.legibly.design  ' });
    expect(env.apiPublicUrl).toBe('https://api.legibly.design');
  });

  it('falls back to development for an unknown NODE_ENV', () => {
    expect(loadEnv({ ...complete, NODE_ENV: 'staging' }).nodeEnv).toBe('development');
    expect(loadEnv({ ...complete, NODE_ENV: undefined }).nodeEnv).toBe('development');
  });

  it('keeps later-phase variables optional', () => {
    const env = loadEnv(complete);
    expect(env.figmaClientId).toBeUndefined();
    expect(env.flittMerchantId).toBeUndefined();
    expect(env.anthropicApiKey).toBeUndefined();
  });

  it('defaults the Flitt base URL and the judge trial count', () => {
    const env = loadEnv(complete);
    expect(env.flittBaseUrl).toBe('https://pay.flitt.com');
    expect(env.judgeFreeTrials).toBe(3);
  });

  it('rejects a non-integer JUDGE_FREE_TRIALS', () => {
    expect(() => loadEnv({ ...complete, JUDGE_FREE_TRIALS: '3.5' })).toThrow(EnvError);
    expect(() => loadEnv({ ...complete, JUDGE_FREE_TRIALS: 'many' })).toThrow(EnvError);
    expect(() => loadEnv({ ...complete, JUDGE_FREE_TRIALS: '-1' })).toThrow(EnvError);
  });

  it('accepts zero free judge trials', () => {
    expect(loadEnv({ ...complete, JUDGE_FREE_TRIALS: '0' }).judgeFreeTrials).toBe(0);
  });
});
