/**
 * Production-only guards. A weak or leftover-placeholder `AUTH_SECRET` is the one
 * mistake that quietly turns every signed token into a forgeable one, so it must
 * fail loudly at boot rather than at the first forged request.
 */

import { EnvError, type Env } from './env.js';

const MIN_SECRET_LENGTH = 32;

const PLACEHOLDER_VALUES = new Set(['change-me', 'changeme', 'dev-secret', 'secret', 'test']);
const PLACEHOLDER_PREFIXES = ['dev-', 'test-', 'change-me', 'placeholder'];

function describeWeakSecret(name: string, value: string): string | null {
  if (value.length < MIN_SECRET_LENGTH) {
    return `${name} must be at least ${MIN_SECRET_LENGTH} characters (got ${value.length})`;
  }
  const lower = value.toLowerCase();
  if (PLACEHOLDER_VALUES.has(lower) || PLACEHOLDER_PREFIXES.some((p) => lower.startsWith(p))) {
    return `${name} looks like a placeholder value`;
  }
  return null;
}

function describeBadPublicUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'API_PUBLIC_URL must be a valid absolute URL';
  }
  if (url.protocol !== 'https:') return 'API_PUBLIC_URL must use https in production';
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return 'API_PUBLIC_URL must not point at localhost in production';
  }
  return null;
}

/**
 * Throws in production when a secret is weak or the public URL is not a real
 * https origin. Outside production this is a no-op — local development is
 * allowed to run on http://localhost with throwaway secrets.
 */
export function runStartupChecks(env: Env): void {
  if (env.nodeEnv !== 'production') return;

  const problems = [
    describeWeakSecret('AUTH_SECRET', env.authSecret),
    describeWeakSecret('ADMIN_TOKEN', env.adminToken),
    describeBadPublicUrl(env.apiPublicUrl),
  ].filter((problem): problem is string => problem !== null);

  if (problems.length > 0) {
    throw new EnvError(`Startup checks failed:\n- ${problems.join('\n- ')}`);
  }
}
