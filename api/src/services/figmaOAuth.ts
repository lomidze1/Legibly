/**
 * Figma OAuth, scope `current_user:read` only.
 *
 * The design file scope is deliberately absent: the plugin draws through the
 * Plugin API, so all this flow needs is proof of who the caller is. The Figma
 * access token is used once, for /v1/me, and then dropped — it is never stored.
 */

import type { Env } from '../config/env';

export const FIGMA_AUTHORIZE_URL = 'https://www.figma.com/oauth';
export const FIGMA_TOKEN_URL = 'https://api.figma.com/v1/oauth/token';
export const FIGMA_ME_URL = 'https://api.figma.com/v1/me';
export const FIGMA_SCOPE = 'current_user:read';

export interface FigmaOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface FigmaUser {
  id: string;
  email?: string;
  handle?: string;
}

export class OAuthNotConfiguredError extends Error {
  override name = 'OAuthNotConfiguredError';
}

export class FigmaOAuthError extends Error {
  override name = 'FigmaOAuthError';
}

export function figmaOAuthConfig(env: Env): FigmaOAuthConfig {
  const { figmaClientId, figmaClientSecret, figmaRedirectUri } = env;
  if (figmaClientId === undefined || figmaClientSecret === undefined || figmaRedirectUri === undefined) {
    throw new OAuthNotConfiguredError('Figma OAuth is not configured');
  }
  return { clientId: figmaClientId, clientSecret: figmaClientSecret, redirectUri: figmaRedirectUri };
}

export function buildAuthorizeUrl(config: FigmaOAuthConfig, state: string): string {
  const url = new URL(FIGMA_AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', FIGMA_SCOPE);
  url.searchParams.set('state', state);
  return url.toString();
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Credentials go in the HTTP Basic header, not the form body. */
export async function exchangeCodeForToken(
  config: FigmaOAuthConfig,
  code: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<string> {
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await fetchImpl(FIGMA_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      redirect_uri: config.redirectUri,
      code,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!response.ok) {
    throw new FigmaOAuthError(`Figma token exchange failed with status ${response.status}`);
  }

  const body = (await response.json()) as unknown;
  const accessToken = (body as { access_token?: unknown }).access_token;
  if (typeof accessToken !== 'string' || accessToken === '') {
    throw new FigmaOAuthError('Figma token exchange returned no access token');
  }
  return accessToken;
}

export async function fetchFigmaUser(
  accessToken: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<FigmaUser> {
  const response = await fetchImpl(FIGMA_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new FigmaOAuthError(`Figma /v1/me failed with status ${response.status}`);
  }

  const body = (await response.json()) as { id?: unknown; email?: unknown; handle?: unknown };
  if (typeof body.id !== 'string' || body.id === '') {
    throw new FigmaOAuthError('Figma /v1/me returned no user id');
  }

  return {
    id: body.id,
    email: typeof body.email === 'string' ? body.email : undefined,
    handle: typeof body.handle === 'string' ? body.handle : undefined,
  };
}
