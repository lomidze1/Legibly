import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/config/env';
import {
  FIGMA_ME_URL,
  FIGMA_TOKEN_URL,
  FigmaOAuthError,
  OAuthNotConfiguredError,
  exchangeCodeForToken,
  fetchFigmaUser,
  figmaOAuthConfig,
  type FetchLike,
  type FigmaOAuthConfig,
} from '../src/services/figmaOAuth';

const config: FigmaOAuthConfig = {
  clientId: 'client-123',
  clientSecret: 'secret-456',
  redirectUri: 'https://api.legibly.design/api/auth/figma/callback',
};

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  API_PUBLIC_URL: 'https://api.legibly.design',
  WEBSITE_BASE_URL: 'https://legibly.design',
  AUTH_SECRET: 'a'.repeat(40),
  ADMIN_TOKEN: 'b'.repeat(40),
  DATABASE_URL: 'postgres://user:pass@host/db',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function recordingFetch(response: Response): { fetch: FetchLike; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  return {
    calls,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return response;
    },
  };
}

describe('figmaOAuthConfig', () => {
  it('reads the three OAuth variables', () => {
    const env = loadEnv({
      ...baseEnv,
      FIGMA_CLIENT_ID: 'client-123',
      FIGMA_CLIENT_SECRET: 'secret-456',
      FIGMA_REDIRECT_URI: config.redirectUri,
    });

    expect(figmaOAuthConfig(env)).toEqual(config);
  });

  it('refuses to guess when OAuth is not configured yet', () => {
    expect(() => figmaOAuthConfig(loadEnv(baseEnv))).toThrow(OAuthNotConfiguredError);
    expect(() => figmaOAuthConfig(loadEnv({ ...baseEnv, FIGMA_CLIENT_ID: 'client-123' }))).toThrow(
      OAuthNotConfiguredError,
    );
  });
});

describe('exchangeCodeForToken', () => {
  it('sends the credentials in the Basic header, not the body', async () => {
    const { fetch, calls } = recordingFetch(jsonResponse({ access_token: 'figma-token' }));

    const token = await exchangeCodeForToken(config, 'auth-code', fetch);

    expect(token).toBe('figma-token');
    expect(calls[0]?.url).toBe(FIGMA_TOKEN_URL);

    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('client-123:secret-456').toString('base64')}`);
    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    const body = new URLSearchParams(String(calls[0]?.init?.body));
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('redirect_uri')).toBe(config.redirectUri);
    expect(body.get('client_secret')).toBeNull();
  });

  it('throws on a non-2xx response', async () => {
    const { fetch } = recordingFetch(jsonResponse({ error: 'bad_request' }, 400));
    await expect(exchangeCodeForToken(config, 'auth-code', fetch)).rejects.toThrow(FigmaOAuthError);
  });

  it('throws when the response carries no access token', async () => {
    const { fetch } = recordingFetch(jsonResponse({ token_type: 'bearer' }));
    await expect(exchangeCodeForToken(config, 'auth-code', fetch)).rejects.toThrow(/no access token/);
  });
});

describe('fetchFigmaUser', () => {
  it('reads the id, email and handle', async () => {
    const { fetch, calls } = recordingFetch(
      jsonResponse({ id: 'figma-user-1', email: 'designer@example.com', handle: 'designer' }),
    );

    const user = await fetchFigmaUser('figma-token', fetch);

    expect(user).toEqual({ id: 'figma-user-1', email: 'designer@example.com', handle: 'designer' });
    expect(calls[0]?.url).toBe(FIGMA_ME_URL);
    expect((calls[0]?.init?.headers as Record<string, string>).Authorization).toBe('Bearer figma-token');
  });

  it('leaves email undefined when Figma does not return one', async () => {
    const { fetch } = recordingFetch(jsonResponse({ id: 'figma-user-1' }));
    await expect(fetchFigmaUser('figma-token', fetch)).resolves.toEqual({
      id: 'figma-user-1',
      email: undefined,
      handle: undefined,
    });
  });

  it('throws when the payload has no usable id', async () => {
    for (const body of [{}, { id: 42 }, { id: '' }]) {
      const { fetch } = recordingFetch(jsonResponse(body));
      await expect(fetchFigmaUser('figma-token', fetch)).rejects.toThrow(FigmaOAuthError);
    }
  });

  it('throws on a non-2xx response', async () => {
    const { fetch } = recordingFetch(jsonResponse({}, 403));
    await expect(fetchFigmaUser('figma-token', fetch)).rejects.toThrow(/403/);
  });
});
