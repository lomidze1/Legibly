import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { API_BASE } from '../src/ui/apiClient';

const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8')) as {
  networkAccess: { allowedDomains: string[]; devAllowedDomains?: string[]; reasoning: string };
  permissions?: string[];
};

describe('manifest networkAccess', () => {
  it('allows exactly one domain, and it is ours', () => {
    // The trust story rests on this list being readable and short. Analytics,
    // error tracking and CDNs all stay out (launch-stack.md §7).
    expect(manifest.networkAccess.allowedDomains).toEqual([API_BASE]);
  });

  it('no longer claims the plugin makes no network requests', () => {
    // It did until Phase 5, and the claim was true then. Leaving it would make
    // the manifest — the one thing a sceptical user can verify — a lie.
    expect(manifest.networkAccess.reasoning).not.toMatch(/no network requests/i);
    expect(manifest.networkAccess.reasoning).toMatch(/licence/i);
  });

  it('asks for no permissions it does not use', () => {
    // figma.currentUser is never read: the user id comes from Figma's own
    // OAuth /v1/me, which is proof rather than a claim.
    expect(manifest.permissions).toBeUndefined();
  });
});
