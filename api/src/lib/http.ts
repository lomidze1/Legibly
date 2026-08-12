/**
 * The slice of the Vercel request/response objects the routes actually use.
 * Narrow on purpose: handlers stay testable with plain objects, and the real
 * `VercelRequest`/`VercelResponse` satisfy these structurally.
 */

import type { HeaderBag } from './clientIp';

export interface ApiRequest {
  method?: string;
  headers: HeaderBag;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
  setHeader(name: string, value: string | number | readonly string[]): unknown;
}

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<void> | void;
