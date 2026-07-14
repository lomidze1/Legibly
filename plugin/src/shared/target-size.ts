/**
 * Target size check — WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA.
 *
 * Interactive targets must be ≥ 24×24 CSS px, with the spacing exception:
 * an undersized target passes when a 24px-diameter circle centered on it
 * intersects no other target and no other undersized target's circle.
 *
 * Honesty tiers (detection research §2.2): Figma has no DOM truth for
 * "interactive", so:
 *   - prototype reactions on the node → explicit intent → violation-eligible
 *   - interactive-looking name only    → needsReview, never a hard fail
 */
import type { Finding } from './types';
import { NodeLite, RectLite, contains } from './figma-lite';

export const TARGET_SC = '2.5.8';
export const MIN_TARGET_PX = 24;

const NAME_HINT =
  /\b(button|btn|link|cta|tab|chip|toggle|switch|checkbox|radio|fab|icon[-_ ]?button|menu[-_ ]?item)\b/i;

export interface Target {
  node: NodeLite;
  /** true = prototype reaction present (explicit interactive intent). */
  certain: boolean;
  box: RectLite;
}

function isRendered(n: NodeLite): boolean {
  return n.visible !== false && (typeof n.opacity !== 'number' || n.opacity > 0);
}

function area(r: RectLite): number {
  return r.width * r.height;
}

/**
 * Collect interactive targets under the roots. Nested targets collapse to
 * the outermost (an icon inside a button is part of the button's target,
 * not an adjacent one).
 */
export function collectTargets(roots: readonly NodeLite[]): Target[] {
  const all: Target[] = [];
  const walk = (n: NodeLite): void => {
    if (!isRendered(n)) return;
    const box = n.absoluteBoundingBox;
    const certain = Array.isArray(n.reactions) && n.reactions.length > 0;
    const suspect = n.type !== 'TEXT' && NAME_HINT.test(n.name);
    if (box && (certain || suspect)) all.push({ node: n, certain, box });
    if (n.children) for (const c of n.children) walk(c);
  };
  for (const r of roots) walk(r);
  return all.filter(
    (t, i) =>
      !all.some(
        (o, j) =>
          j !== i &&
          contains(o.box, t.box) &&
          (area(o.box) > area(t.box) || (area(o.box) === area(t.box) && j < i))
      )
  );
}

function isUndersized(box: RectLite): boolean {
  return box.width < MIN_TARGET_PX || box.height < MIN_TARGET_PX;
}

/** Distance from a point to a rectangle (0 when inside). */
function pointRectDistance(px: number, py: number, r: RectLite): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.width));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.height));
  return Math.hypot(dx, dy);
}

/**
 * The SC 2.5.8 spacing exception: a 24px-diameter circle centered on the
 * undersized target must not intersect any other target, nor any other
 * undersized target's circle.
 */
export function spacingExceptionHolds(target: Target, all: readonly Target[]): boolean {
  const cx = target.box.x + target.box.width / 2;
  const cy = target.box.y + target.box.height / 2;
  const R = MIN_TARGET_PX / 2;
  for (const other of all) {
    if (other === target) continue;
    if (pointRectDistance(cx, cy, other.box) < R) return false;
    if (isUndersized(other.box)) {
      const ox = other.box.x + other.box.width / 2;
      const oy = other.box.y + other.box.height / 2;
      if (Math.hypot(cx - ox, cy - oy) < MIN_TARGET_PX) return false;
    }
  }
  return true;
}

function canAutoFix(node: NodeLite): boolean {
  return typeof node.layoutMode === 'string' && node.layoutMode !== 'NONE';
}

/** Evaluate all targets; returns findings (passes are silent, counted by caller). */
export function checkTargetSizes(targets: readonly Target[]): {
  findings: Finding[];
  passCount: number;
} {
  const findings: Finding[] = [];
  let passCount = 0;
  for (const t of targets) {
    if (!isUndersized(t.box)) {
      passCount++;
      continue;
    }
    if (spacingExceptionHolds(t, targets)) {
      passCount++;
      continue;
    }
    const size = `${Math.round(t.box.width)}×${Math.round(t.box.height)}`;
    if (t.certain) {
      findings.push({
        nodeId: t.node.id,
        nodeName: t.node.name,
        tier: 'violation',
        sc: TARGET_SC,
        detail: `Tap target is ${size}px — needs ${MIN_TARGET_PX}×${MIN_TARGET_PX}px (or clear space around it)`,
        targetSize: {
          width: t.box.width,
          height: t.box.height,
          required: MIN_TARGET_PX,
          autoFixable: canAutoFix(t.node),
        },
      });
    } else {
      findings.push({
        nodeId: t.node.id,
        nodeName: t.node.name,
        tier: 'needsReview',
        sc: TARGET_SC,
        reason: 'maybe-interactive',
        detail: `Named like a control and only ${size}px — needs ${MIN_TARGET_PX}×${MIN_TARGET_PX}px if it is interactive`,
      });
    }
  }
  return { findings, passCount };
}
