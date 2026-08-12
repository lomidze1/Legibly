/**
 * The slice of the Vercel request/response objects the routes actually use.
 * Narrow on purpose: handlers stay testable with plain objects, and the real
 * `VercelRequest`/`VercelResponse` satisfy these structurally.
 */

import type { HeaderBag } from './clientIp';

export type QueryBag = Record<string, string | string[] | undefined>;

export interface ApiRequest {
  method?: string;
  headers: HeaderBag;
  query?: QueryBag;
  /** Parsed by the platform. Always `unknown` — never trusted without a shape check. */
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
  send(body: string): unknown;
  setHeader(name: string, value: string | number | readonly string[]): unknown;
}

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<void> | void;

/** A repeated query parameter arrives as an array; only the first value counts. */
export function queryParam(req: ApiRequest, name: string): string | undefined {
  const raw = req.query?.[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export function redirect(res: ApiResponse, url: string, code = 302): void {
  res.setHeader('Location', url);
  res.status(code).send('');
}

export function html(res: ApiResponse, body: string, code = 200): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(code).send(body);
}
