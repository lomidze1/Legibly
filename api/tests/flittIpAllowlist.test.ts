import { describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../src/config/env.js';
import type { ApiHandler } from '../src/lib/http.js';
import { flittIpAllowlist, withFlittIpAllowlist } from '../src/middleware/flittIpAllowlist.js';
import { fakeResponse } from './helpers.js';

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  API_PUBLIC_URL: 'https://api.legibly.design',
  WEBSITE_BASE_URL: 'https://legibly.design',
  AUTH_SECRET: 'a'.repeat(40),
  ADMIN_TOKEN: 'b'.repeat(40),
  DATABASE_URL: 'postgres://user:pass@host/db',
};

const reached: ApiHandler = (_req, res) => {
  res.status(200).json({ received: true, processed: true });
};

const allowlist = { enabled: true, ips: new Set(['54.154.216.60', '3.75.125.89']) };

describe('flittIpAllowlist', () => {
  it('parses the comma-separated list', () => {
    const config = flittIpAllowlist(loadEnv({ ...baseEnv, FLITT_WEBHOOK_IPS: '54.154.216.60, 3.75.125.89' }));

    expect([...config.ips]).toEqual(['54.154.216.60', '3.75.125.89']);
    expect(config.enabled).toBe(true);
  });

  it('is switched off only by an explicit false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(flittIpAllowlist(loadEnv({ ...baseEnv, FLITT_IP_ALLOWLIST_ENABLED: 'false' })).enabled).toBe(false);
    expect(flittIpAllowlist(loadEnv({ ...baseEnv, FLITT_IP_ALLOWLIST_ENABLED: 'true' })).enabled).toBe(true);
    expect(flittIpAllowlist(loadEnv(baseEnv)).enabled).toBe(true);
    warn.mockRestore();
  });

  /**
   * An enabled-but-empty allowlist admits everyone, and from the outside that
   * deployment looks exactly like a working one. Forgetting FLITT_WEBHOOK_IPS
   * must not be indistinguishable from deciding not to use it.
   */
  it('says so when it is enabled but has nothing to allow', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    flittIpAllowlist(loadEnv(baseEnv));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('FLITT_WEBHOOK_IPS');
    warn.mockRestore();
  });

  it('stays quiet when the list is populated, or deliberately switched off', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    flittIpAllowlist(loadEnv({ ...baseEnv, FLITT_WEBHOOK_IPS: '54.154.216.60' }));
    flittIpAllowlist(loadEnv({ ...baseEnv, FLITT_IP_ALLOWLIST_ENABLED: 'false' }));

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('withFlittIpAllowlist', () => {
  it('lets a known Flitt address through', async () => {
    const res = fakeResponse();
    await withFlittIpAllowlist(reached, allowlist)(
      { method: 'POST', headers: { 'x-vercel-forwarded-for': '54.154.216.60' } },
      res,
    );

    expect(res.body).toEqual({ received: true, processed: true });
  });

  it('answers 200 without processing anything else', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = fakeResponse();

    await withFlittIpAllowlist(reached, allowlist)(
      { method: 'POST', headers: { 'x-vercel-forwarded-for': '1.2.3.4' } },
      res,
    );

    // Not 403: a refusal must not tell a prober it found the endpoint, and must
    // not make Flitt retry if the allowlist is ever wrong.
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    warn.mockRestore();
  });

  it('ignores a spoofed x-forwarded-for', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = fakeResponse();

    await withFlittIpAllowlist(reached, allowlist)(
      {
        method: 'POST',
        headers: { 'x-vercel-forwarded-for': '1.2.3.4', 'x-forwarded-for': '54.154.216.60' },
      },
      res,
    );

    expect(res.body).toEqual({ received: true });
    warn.mockRestore();
  });

  it('passes everything through when the list is empty or disabled', async () => {
    for (const list of [{ enabled: true, ips: new Set<string>() }, { enabled: false, ips: allowlist.ips }]) {
      const res = fakeResponse();
      await withFlittIpAllowlist(reached, list)({ method: 'POST', headers: {} }, res);
      expect(res.body).toEqual({ received: true, processed: true });
    }
  });
});
