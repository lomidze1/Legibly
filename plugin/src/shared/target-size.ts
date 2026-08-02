/**
 * Target size check — WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA.
 *
 * Two floors, two different criteria — the SC we report must match the rule
 * we actually applied:
 *   - 24px → SC 2.5.8 Target Size (Minimum), AA. Has the spacing exception:
 *     an undersized target passes when a 24px-diameter circle centered on it
 *     intersects no other target and no other undersized target's circle.
 *   - 44px → SC 2.5.5 Target Size (Enhanced), AAA (also the iOS HIG floor).
 *     2.5.5 has NO spacing exception — size is the whole rule.
 *
 * Honesty tiers (detection research §2.2): Figma has no DOM truth for
 * "interactive", so:
 *   - prototype reactions on the node → explicit intent → violation-eligible
 *   - everything else below           → needsReview, never a hard fail
 *
 * The suspect signals, in order of how much they actually mean:
 *   - a "State" VARIANT axis on an instance — the component was BUILT to react
 *   - a control-ish layer name (Button, Tab, Toggle…)
 *   - a form-field name (Input, Select…), shared with the 2.4.6 check
 * Widening these widens 1.4.11 too, since non-text contrast is measured on
 * exactly the targets collected here.
 */
import type { Finding, TargetFloor } from './types';
import { NodeLite, RectLite, contains } from './figma-lite';
import { FIELD_HINT } from './form-label';

export const TARGET_SC = '2.5.8';
export const TARGET_SC_ENHANCED = '2.5.5';
export const MIN_TARGET_PX = 24;

/** The criterion a given floor actually enforces. */
export function targetSc(floor: TargetFloor): string {
  return floor >= 44 ? TARGET_SC_ENHANCED : TARGET_SC;
}

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
 * An instance carrying a "State" variant axis. Deliberately not "Status" —
 * that is the badge convention (Status=Success), and a badge is not a control.
 */
export function hasStateVariant(node: NodeLite): boolean {
  const props = node.componentProperties;
  if (!props) return false;
  return Object.entries(props).some(
    ([key, def]) => def?.type === 'VARIANT' && /\bstate\b/i.test(key)
  );
}

/** Everything short of a prototype reaction — suspect, never a hard fail. */
function looksInteractive(node: NodeLite): boolean {
  if (node.type === 'TEXT') return false;
  return NAME_HINT.test(node.name) || FIELD_HINT.test(node.name) || hasStateVariant(node);
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
    if (box && (certain || looksInteractive(n))) all.push({ node: n, certain, box });
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

function isUndersized(box: RectLite, floor: number = MIN_TARGET_PX): boolean {
  return box.width < floor || box.height < floor;
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

/**
 * Evaluate all targets against the configured floor (passes are silent,
 * counted by the caller). The spacing exception belongs to SC 2.5.8 only —
 * at the 44px enhanced floor (2.5.5) size is the whole rule.
 */
export function checkTargetSizes(
  targets: readonly Target[],
  floor: TargetFloor = MIN_TARGET_PX
): {
  findings: Finding[];
  passCount: number;
} {
  const findings: Finding[] = [];
  const sc = targetSc(floor);
  let passCount = 0;
  for (const t of targets) {
    if (!isUndersized(t.box, floor)) {
      passCount++;
      continue;
    }
    if (floor === MIN_TARGET_PX && spacingExceptionHolds(t, targets)) {
      passCount++;
      continue;
    }
    const size = `${Math.round(t.box.width)}×${Math.round(t.box.height)}`;
    const need = `${floor}×${floor}px`;
    if (t.certain) {
      findings.push({
        nodeId: t.node.id,
        nodeName: t.node.name,
        tier: 'violation',
        sc,
        detail:
          floor === MIN_TARGET_PX
            ? `Tap target is ${size}px — needs ${need} (or clear space around it)`
            : `Tap target is ${size}px — needs ${need}`,
        targetSize: {
          width: t.box.width,
          height: t.box.height,
          required: floor,
          autoFixable: canAutoFix(t.node),
        },
      });
    } else {
      findings.push({
        nodeId: t.node.id,
        nodeName: t.node.name,
        tier: 'needsReview',
        sc,
        reason: 'maybe-interactive',
        detail: `Named like a control and only ${size}px — needs ${need} if it is interactive`,
      });
    }
  }
  return { findings, passCount };
}
