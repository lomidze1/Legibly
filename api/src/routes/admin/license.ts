/**
 * The two things the panel can change: comp a licence, and end one.
 *
 * Both write their audit row *before* the licence moves. If the audit write
 * fails the mutation does not happen at all — a change nobody can account for
 * is worse than a change that did not go through.
 */

import { isDuration, type Duration } from '../../config/pricing.js';
import type { ApiRequest, ApiResponse } from '../../lib/http.js';
import { serializeLicense } from '../../lib/serializeLicense.js';
import { isPlainObject } from '../../lib/validators.js';
import type { LicenseAuditStore } from '../../models/LicenseAudit.js';
import { ADMIN_ORDER_PREFIX } from '../../models/adminStore.js';
import type { LicenseRow, LicenseStore } from '../../models/License.js';
import { computeCycleEnd, isLivePro } from '../../services/licenseService.js';

const DAY_MS = 86_400_000;
const MAX_USER_ID_LENGTH = 64;
const MIN_REASON_LENGTH = 3;
const MAX_GRANT_DAYS = 3650;

export interface AdminLicenseDeps {
  licenses: LicenseStore;
  audit: LicenseAuditStore;
  now: () => number;
}

export interface GrantRequest {
  figmaUserId: string;
  reason: string;
  /** Exactly one of these. A duration stacks like a purchase; days are literal. */
  duration?: Duration;
  days?: number;
}

type ParsedMutation =
  | { action: 'grant'; request: GrantRequest }
  | { action: 'revoke'; figmaUserId: string; reason: string }
  | { error: string };

export function parseMutation(body: unknown): ParsedMutation {
  if (!isPlainObject(body)) return { error: 'invalid_body' };

  const figmaUserId = typeof body.figmaUserId === 'string' ? body.figmaUserId.trim() : '';
  if (figmaUserId === '' || figmaUserId.length > MAX_USER_ID_LENGTH) return { error: 'invalid_figma_user_id' };

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < MIN_REASON_LENGTH) return { error: 'reason_required' };

  if (body.action === 'revoke') return { action: 'revoke', figmaUserId, reason };
  if (body.action !== 'grant') return { error: 'unknown_action' };

  const hasDuration = body.duration !== undefined && body.duration !== null && body.duration !== '';
  const hasDays = body.days !== undefined && body.days !== null && body.days !== '';
  if (hasDuration === hasDays) return { error: 'grant_needs_duration_or_days' };

  if (hasDuration) {
    if (!isDuration(body.duration)) return { error: 'invalid_duration' };
    return { action: 'grant', request: { figmaUserId, reason, duration: body.duration } };
  }

  const days = Number(body.days);
  if (!Number.isInteger(days) || days < 1 || days > MAX_GRANT_DAYS) return { error: 'invalid_days' };
  return { action: 'grant', request: { figmaUserId, reason, days } };
}

/**
 * A duration grant reuses the purchase arithmetic — stacking onto what is left,
 * with the same anti-pile-up ceiling. A day grant is taken literally: the admin
 * asked for N days on top of whatever is live, and no ceiling second-guesses it.
 */
export function grantCycleEnd(existing: LicenseRow | null, request: GrantRequest, now: number): number {
  if (request.duration !== undefined) return computeCycleEnd(existing, request.duration, now);
  const base = isLivePro(existing, now) ? existing!.cycleEndsAt.getTime() : now;
  return base + request.days! * DAY_MS;
}

export async function handleLicenseMutation(
  req: ApiRequest,
  res: ApiResponse,
  deps: AdminLicenseDeps,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'method_not_allowed' });
    return;
  }

  const parsed = parseMutation(req.body);
  if ('error' in parsed) {
    res.status(400).json({ success: false, error: parsed.error });
    return;
  }

  const now = deps.now();
  const at = new Date(now);

  if (parsed.action === 'revoke') {
    // Looked up first so a revoke of a user who does not exist cannot leave an
    // audit row pointing at nothing.
    const existing = await deps.licenses.find(parsed.figmaUserId);
    if (existing === null) {
      res.status(404).json({ success: false, error: 'user_not_found' });
      return;
    }

    await deps.audit.record(
      {
        figmaUserId: parsed.figmaUserId,
        action: 'admin_revoke',
        actor: 'admin',
        reason: parsed.reason,
        detail: `was ${existing.plan}, ended ${existing.cycleEndsAt.toISOString().slice(0, 10)}`,
      },
      at,
    );

    const revoked = await deps.licenses.adminRevoke(parsed.figmaUserId, at);
    res.status(200).json({
      success: true,
      action: 'revoke',
      license: revoked === null ? null : serializeLicense(revoked, now),
    });
    return;
  }

  const { request } = parsed;
  const existing = await deps.licenses.find(request.figmaUserId);
  const cycleEndsAt = new Date(grantCycleEnd(existing, request, now));
  const extent = request.duration ?? `${request.days!}d`;

  await deps.audit.record(
    {
      figmaUserId: request.figmaUserId,
      action: 'admin_grant',
      actor: 'admin',
      reason: request.reason,
      detail: `${extent} → ends ${cycleEndsAt.toISOString().slice(0, 10)}`,
    },
    at,
  );

  const granted = await deps.licenses.adminGrant(request.figmaUserId, {
    cycleStartedAt: at,
    cycleEndsAt,
    orderId: `${ADMIN_ORDER_PREFIX}${now}`,
    duration: request.duration ?? null,
  });

  res.status(200).json({ success: true, action: 'grant', license: serializeLicense(granted, now) });
}
