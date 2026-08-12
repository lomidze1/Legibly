import { describe, expect, it } from 'vitest';

import { loadEnv, type Env } from '../src/config/env';
import { runStartupChecks } from '../src/config/startupChecks';

function envWith(overrides: NodeJS.ProcessEnv = {}): Env {
  return loadEnv({
    NODE_ENV: 'production',
    API_PUBLIC_URL: 'https://api.legibly.design',
    WEBSITE_BASE_URL: 'https://legibly.design',
    AUTH_SECRET: 'a'.repeat(40),
    ADMIN_TOKEN: 'b'.repeat(40),
    DATABASE_URL: 'postgres://user:pass@host/db',
    ...overrides,
  });
}

describe('runStartupChecks', () => {
  it('passes on a sound production environment', () => {
    expect(() => runStartupChecks(envWith())).not.toThrow();
  });

  it('rejects a secret shorter than 32 characters', () => {
    expect(() => runStartupChecks(envWith({ AUTH_SECRET: 'a'.repeat(31) }))).toThrow(/AUTH_SECRET/);
    expect(() => runStartupChecks(envWith({ ADMIN_TOKEN: 'b'.repeat(8) }))).toThrow(/ADMIN_TOKEN/);
  });

  it('rejects placeholder secrets even when they are long enough', () => {
    expect(() => runStartupChecks(envWith({ AUTH_SECRET: 'dev-secret-but-long-enough-to-pass-length' }))).toThrow(
      /placeholder/,
    );
    expect(() => runStartupChecks(envWith({ ADMIN_TOKEN: 'change-me-change-me-change-me-change-me' }))).toThrow(
      /placeholder/,
    );
  });

  it('is case-insensitive about placeholders', () => {
    expect(() => runStartupChecks(envWith({ AUTH_SECRET: 'DEV-abcdefghijklmnopqrstuvwxyz012345' }))).toThrow(
      /placeholder/,
    );
  });

  it('requires https for API_PUBLIC_URL', () => {
    expect(() => runStartupChecks(envWith({ API_PUBLIC_URL: 'http://api.legibly.design' }))).toThrow(/https/);
  });

  it('rejects localhost for API_PUBLIC_URL', () => {
    expect(() => runStartupChecks(envWith({ API_PUBLIC_URL: 'https://localhost:3000' }))).toThrow(/localhost/);
    expect(() => runStartupChecks(envWith({ API_PUBLIC_URL: 'https://127.0.0.1:3000' }))).toThrow(/localhost/);
  });

  it('rejects an unparseable API_PUBLIC_URL', () => {
    expect(() => runStartupChecks(envWith({ API_PUBLIC_URL: 'api.legibly.design' }))).toThrow(/valid absolute URL/);
  });

  it('reports every problem in one throw', () => {
    const message = (() => {
      try {
        runStartupChecks(envWith({ AUTH_SECRET: 'short', ADMIN_TOKEN: 'short', API_PUBLIC_URL: 'http://localhost' }));
        return '';
      } catch (error) {
        return (error as Error).message;
      }
    })();

    expect(message).toContain('AUTH_SECRET');
    expect(message).toContain('ADMIN_TOKEN');
    expect(message).toContain('API_PUBLIC_URL');
  });

  it('stays out of the way outside production', () => {
    const dev = envWith({ NODE_ENV: 'development', AUTH_SECRET: 'dev', ADMIN_TOKEN: 'dev', API_PUBLIC_URL: 'http://localhost:3000' });
    expect(() => runStartupChecks(dev)).not.toThrow();
  });
});
