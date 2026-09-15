/**
 * The website's session: the same HMAC token the plugin keeps in
 * `figma.clientStorage`, held instead in an httpOnly cookie on the API host.
 *
 * Host-only on purpose — no `Domain` attribute. w2w once shipped a parent-domain
 * cookie beside a host-only one of the same name; the browser sent both, and
 * sign-in failed with "Invalid state" for whoever's stale copy parsed first.
 *
 * The session cookie is honoured only on a request whose `Origin` is the
 * website. A cross-origin fetch always carries `Origin`; a link, an image or a
 * form on some other site never carries ours. So the cookie can be spent by the
 * page that set up the session and by nothing else.
 */

import { timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';
import type { ApiRequest } from './http.js';

export const SESSION_COOKIE = 'lgb_session';

/** Proves that the sign-in arriving at the callback was started in this browser. */
export const OAUTH_COOKIE = 'lgb_oauth';

/** A day: long enough to sign in and pay, short enough that a shared machine forgets. */
export const WEB_SESSION_TTL_SECONDS = 24 * 60 * 60;

export function webOrigin(websiteBaseUrl: string): string {
  return new URL(websiteBaseUrl).origin;
}

/**
 * The website origin from live config, or undefined when config cannot be read
 * — the cookie path then stays closed and the plugin's Bearer path carries on.
 */
export function liveWebsiteOrigin(): string | undefined {
  try {
    return webOrigin(env().websiteBaseUrl);
  } catch {
    return undefined;
  }
}

function header(req: ApiRequest, name: string): string | undefined {
  const raw = req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value : undefined;
}

export function isFromWebsite(req: ApiRequest, origin: string): boolean {
  return header(req, 'origin') === origin;
}

export function readCookie(req: ApiRequest, name: string): string | undefined {
  const raw = header(req, 'cookie');
  if (raw === undefined) return undefined;

  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1 || part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    return value === '' ? undefined : value;
  }
  return undefined;
}

/** `Path=/api` covers every route that reads it; `SameSite=Lax` survives Figma's redirect back. */
export function cookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Path=/api; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearedCookieHeader(name: string): string {
  return cookieHeader(name, '', 0);
}

/**
 * Where the callback may send the browser afterwards: a path on the website,
 * never a host. The rules are w2w's, each for a known bypass —
 * `//evil.com` is protocol-relative, `:` catches `javascript:` and `https:`,
 * and a backslash is normalised to `/` by browsers after the redirect.
 */
export function isValidReturnTo(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 256) return false;
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('\\') || value.includes(':')) return false;
  return true;
}

/** The state is hex, so the first dot is an unambiguous separator. */
export function oauthCookieValue(state: string, returnTo: string): string {
  return `${state}.${encodeURIComponent(returnTo)}`;
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * A website sign-in coming back: the state Figma returned matches the one this
 * browser was given at login. Null means the callback belongs to the plugin
 * flow — or to nobody.
 *
 * The return path is validated again here, not trusted because we wrote it: a
 * cookie is only as trustworthy as the least careful page on the host.
 */
export function webLoginFrom(req: ApiRequest, state: string): { returnTo: string } | null {
  const raw = readCookie(req, OAUTH_COOKIE);
  if (raw === undefined) return null;

  const dot = raw.indexOf('.');
  if (dot <= 0 || !sameString(raw.slice(0, dot), state)) return null;

  let returnTo: string;
  try {
    returnTo = decodeURIComponent(raw.slice(dot + 1));
  } catch {
    return null;
  }
  return isValidReturnTo(returnTo) ? { returnTo } : null;
}
