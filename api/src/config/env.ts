/**
 * Every env var the API reads lives here — nowhere else.
 *
 * `loadEnv` is pure so tests can hand it their own source object. Presence of the
 * core vars is checked everywhere (an API without a database cannot run in any
 * environment); the *strength* of the secrets is checked in production only —
 * see `startupChecks.ts`.
 */

// Cyclic by design: startupChecks reads `EnvError` from here, but only from
// inside its function body, so both modules are fully evaluated before either
// binding is touched.
import { runStartupChecks } from './startupChecks';

export type NodeEnvName = 'development' | 'test' | 'production';

export interface Env {
  // --- core (required in every environment) ---
  nodeEnv: NodeEnvName;
  apiPublicUrl: string;
  websiteBaseUrl: string;
  authSecret: string;
  adminToken: string;
  databaseUrl: string;

  // --- Figma OAuth (Phase 2) ---
  figmaClientId?: string;
  figmaClientSecret?: string;
  figmaRedirectUri?: string;

  // --- Flitt (Phase 3) ---
  flittMerchantId?: string;
  flittSecretKey?: string;
  flittBaseUrl: string;
  flittWebhookIps?: string;
  flittIpAllowlistEnabled?: string;

  // --- AI Designer Judge (Phase 4) ---
  anthropicApiKey?: string;
  judgeModel?: string;
  judgeFreeTrials: number;
  judgeProMonthly: number;
  /** Only the literal "true" turns the judge on — see config/judge.ts. */
  judgeEnabled?: string;
}

const REQUIRED = [
  'API_PUBLIC_URL',
  'WEBSITE_BASE_URL',
  'AUTH_SECRET',
  'ADMIN_TOKEN',
  'DATABASE_URL',
] as const;

const DEFAULT_FLITT_BASE_URL = 'https://pay.flitt.com';
const DEFAULT_JUDGE_FREE_TRIALS = 3;
const DEFAULT_JUDGE_PRO_MONTHLY = 30;

export class EnvError extends Error {
  override name = 'EnvError';
}

function trimmed(source: NodeJS.ProcessEnv, key: string): string | undefined {
  const raw = source[key];
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  return value === '' ? undefined : value;
}

function readNodeEnv(source: NodeJS.ProcessEnv): NodeEnvName {
  const value = trimmed(source, 'NODE_ENV');
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

function readCount(source: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const value = trimmed(source, key);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new EnvError(`${key} must be a non-negative integer, got "${value}"`);
  }
  return parsed;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const missing = REQUIRED.filter((key) => trimmed(source, key) === undefined);
  if (missing.length > 0) {
    throw new EnvError(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  return {
    nodeEnv: readNodeEnv(source),
    apiPublicUrl: trimmed(source, 'API_PUBLIC_URL')!,
    websiteBaseUrl: trimmed(source, 'WEBSITE_BASE_URL')!,
    authSecret: trimmed(source, 'AUTH_SECRET')!,
    adminToken: trimmed(source, 'ADMIN_TOKEN')!,
    databaseUrl: trimmed(source, 'DATABASE_URL')!,

    figmaClientId: trimmed(source, 'FIGMA_CLIENT_ID'),
    figmaClientSecret: trimmed(source, 'FIGMA_CLIENT_SECRET'),
    figmaRedirectUri: trimmed(source, 'FIGMA_REDIRECT_URI'),

    flittMerchantId: trimmed(source, 'FLITT_MERCHANT_ID'),
    flittSecretKey: trimmed(source, 'FLITT_SECRET_KEY'),
    flittBaseUrl: trimmed(source, 'FLITT_BASE_URL') ?? DEFAULT_FLITT_BASE_URL,
    flittWebhookIps: trimmed(source, 'FLITT_WEBHOOK_IPS'),
    flittIpAllowlistEnabled: trimmed(source, 'FLITT_IP_ALLOWLIST_ENABLED'),

    anthropicApiKey: trimmed(source, 'ANTHROPIC_API_KEY'),
    judgeModel: trimmed(source, 'JUDGE_MODEL'),
    judgeFreeTrials: readCount(source, 'JUDGE_FREE_TRIALS', DEFAULT_JUDGE_FREE_TRIALS),
    judgeProMonthly: readCount(source, 'JUDGE_PRO_MONTHLY', DEFAULT_JUDGE_PRO_MONTHLY),
    judgeEnabled: trimmed(source, 'JUDGE_ENABLED'),
  };
}

let cached: Env | null = null;

/**
 * Memoised for the lifetime of a serverless instance. The production strength
 * checks run on the cold start that first reads the env — this is the only path
 * every handler shares, so a weak secret fails here rather than at the first
 * forged request.
 */
export function env(): Env {
  if (cached === null) {
    const loaded = loadEnv();
    runStartupChecks(loaded);
    cached = loaded;
  }
  return cached;
}

/** Test-only: drops the memoised value so the next `env()` re-reads process.env. */
export function resetEnvCache(): void {
  cached = null;
}
