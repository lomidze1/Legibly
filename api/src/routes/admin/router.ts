/**
 * The whole admin surface behind one serverless function.
 *
 * ⚠️ Not a stylistic choice. Vercel counts every file under `api/` as its own
 * function and the Hobby plan allows twelve — which this project already uses.
 * A catch-all (`api/admin/[...path].ts`) adds the panel, the stats, the feeds
 * and the mutations for the price of one.
 */

import { env } from '../../config/env';
import type { ApiHandler, ApiRequest, ApiResponse } from '../../lib/http';
import { html, queryParam } from '../../lib/http';
import { requireAdmin } from '../../middleware/adminAuth';
import { licenseAuditStore, type LicenseAuditStore } from '../../models/LicenseAudit';
import { adminStore, type AdminStore, type UsersQuery } from '../../models/adminStore';
import { licenseStore, type LicenseStore } from '../../models/License';
import { handleLicenseMutation } from './license';
import { PANEL_HTML } from './panelHtml';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;
const MAX_EXPORT_ROWS = 5000;

export interface AdminDeps {
  admin: AdminStore;
  licenses: LicenseStore;
  audit: LicenseAuditStore;
  adminToken: string;
  now: () => number;
}

/** Vercel hands `[...path].ts` its segments in `query.path`. */
export function segmentsOf(req: ApiRequest): string[] {
  const raw = req.query?.path;
  if (Array.isArray(raw)) return raw.filter((part) => part !== '');
  if (typeof raw === 'string' && raw !== '') return raw.split('/').filter((part) => part !== '');
  return [];
}

function intParam(req: ApiRequest, name: string, fallback: number, min: number, max: number): number {
  const raw = queryParam(req, name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

const SORTS = new Set<UsersQuery['sort']>(['recent', 'seen', 'ends', 'judge']);

function usersQuery(req: ApiRequest): UsersQuery {
  const plan = queryParam(req, 'plan');
  const sort = queryParam(req, 'sort');

  return {
    search: queryParam(req, 'search'),
    plan: plan === 'pro' || plan === 'free' ? plan : undefined,
    paid: queryParam(req, 'paid') === 'true' ? true : undefined,
    sort: SORTS.has(sort as UsersQuery['sort']) ? (sort as UsersQuery['sort']) : 'recent',
    page: intParam(req, 'page', 1, 1, 100_000),
    limit: intParam(req, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT),
  };
}

/** RFC 4180: quote everything, double the quotes inside. */
function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const CSV_COLUMNS = [
  'figmaUserId',
  'email',
  'plan',
  'status',
  'daysLeft',
  'cycleEndsAt',
  'lastDuration',
  'paid',
  'judgeUsed',
  'judgeMonthUsed',
  'lastSeenAt',
  'createdAt',
] as const;

export function createAdminHandler(deps: AdminDeps): ApiHandler {
  return async (req, res) => {
    const segments = segmentsOf(req);
    const route = segments[0] ?? 'panel';

    // The page itself carries no data and no secret — it is a shell that asks
    // for the token in the fragment, which the browser never sends here.
    if (route === 'panel') {
      servePanel(res);
      return;
    }

    if (!requireAdmin(req, res, deps.adminToken)) return;

    const now = new Date(deps.now());

    switch (route) {
      case 'stats': {
        if (!isGet(req, res)) return;
        res.status(200).json({ success: true, stats: await deps.admin.stats(now) });
        return;
      }

      case 'users': {
        if (!isGet(req, res)) return;
        res.status(200).json({ success: true, ...(await deps.admin.users(usersQuery(req))) });
        return;
      }

      case 'users.csv': {
        if (!isGet(req, res)) return;
        const page = await deps.admin.users({ ...usersQuery(req), page: 1, limit: MAX_EXPORT_ROWS });
        const lines = [
          CSV_COLUMNS.join(','),
          ...page.rows.map((row) => CSV_COLUMNS.map((column) => csvCell(row[column])).join(',')),
        ];
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="legibly-users.csv"');
        res.status(200).send(`${lines.join('\n')}\n`);
        return;
      }

      case 'user': {
        if (!isGet(req, res)) return;
        const figmaUserId = queryParam(req, 'figmaUserId');
        if (figmaUserId === undefined) {
          res.status(400).json({ success: false, error: 'figma_user_id_required' });
          return;
        }
        const detail = await deps.admin.user(figmaUserId, now);
        if (detail === null) {
          res.status(404).json({ success: false, error: 'user_not_found' });
          return;
        }
        res.status(200).json({ success: true, ...detail });
        return;
      }

      case 'payments': {
        if (!isGet(req, res)) return;
        res.status(200).json({
          success: true,
          ...(await deps.admin.payments({
            filter: queryParam(req, 'status'),
            page: intParam(req, 'page', 1, 1, 100_000),
            limit: intParam(req, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT),
          })),
        });
        return;
      }

      case 'activity': {
        if (!isGet(req, res)) return;
        res.status(200).json({
          success: true,
          ...(await deps.admin.activity({
            filter: queryParam(req, 'kind'),
            page: intParam(req, 'page', 1, 1, 100_000),
            limit: intParam(req, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT),
          })),
        });
        return;
      }

      case 'license': {
        await handleLicenseMutation(req, res, {
          licenses: deps.licenses,
          audit: deps.audit,
          now: deps.now,
        });
        return;
      }

      default:
        res.status(404).json({ success: false, error: 'unknown_admin_route' });
    }
  };
}

function isGet(req: ApiRequest, res: ApiResponse): boolean {
  if (req.method === undefined || req.method === 'GET') return true;
  res.status(405).json({ success: false, error: 'method_not_allowed' });
  return false;
}

/**
 * The token reaches the page through `location.hash`, which any injected script
 * could read too — so the page is sealed: nothing loads from anywhere else, and
 * `fetch` may only reach this origin.
 */
export function servePanel(res: ApiResponse): void {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  html(res, PANEL_HTML);
}

export const adminHandler: ApiHandler = (req, res) =>
  createAdminHandler({
    admin: adminStore,
    licenses: licenseStore,
    audit: licenseAuditStore,
    adminToken: env().adminToken,
    now: () => Date.now(),
  })(req, res);
