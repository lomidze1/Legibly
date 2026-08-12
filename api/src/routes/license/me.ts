import { env } from '../../config/env';
import type { ApiHandler } from '../../lib/http';
import { serializeLicense } from '../../lib/serializeLicense';
import { requireAuth } from '../../middleware/auth';
import { licenseStore, type LicenseStore } from '../../models/License';

export interface LicenseMeDeps {
  licenses: LicenseStore;
  authSecret: string;
  now: () => number;
}

/**
 * The subject is the token's `userId` and nothing else.
 *
 * ⚠️ A `figmaUserId` in the query string is ignored on purpose. Reading one
 * would let anyone hand over someone else's id and read their licence — the
 * exact IDOR w2w shipped and had to fix.
 */
export function createLicenseMeHandler(deps: LicenseMeDeps): ApiHandler {
  return async (req, res) => {
    if (req.method !== undefined && req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'method_not_allowed' });
      return;
    }

    const now = deps.now();
    const userId = requireAuth(req, res, deps.authSecret, now);
    if (userId === null) return;

    const license = await deps.licenses.getOrCreate(userId);
    res.status(200).json({ success: true, license: serializeLicense(license, now) });
  };
}

export const licenseMeHandler: ApiHandler = (req, res) =>
  createLicenseMeHandler({
    licenses: licenseStore,
    authSecret: env().authSecret,
    now: () => Date.now(),
  })(req, res);
