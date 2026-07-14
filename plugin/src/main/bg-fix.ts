/**
 * Background-adjust fix — F13 resolution-order step 3 (closes the D10
 * deferral). When no foreground token can fix a text-contrast violation,
 * try changing the BACKGROUND node's fill to one of the user's tokens.
 *
 * A shared background may affect other layers, so correctness-by-
 * construction here means frame-wide: a candidate commits iff
 *   (a) the target text passes, and
 *   (b) nothing that passed before fails after — texts (1.4.3),
 *       line-heights are color-independent, and icon/stroke probes (1.4.11)
 *       are all re-measured across the whole top-level frame.
 * Candidates are probed by mutating the fill and restoring it; the probe
 * itself is wrapped in try/finally so the canvas is never left dirty.
 */
import type { BgFixPlan, RGBA, Settings, TokenCandidate } from '../shared/types';
import { NodeLite, isPaintArray } from '../shared/figma-lite';
import { resolveBackdrop } from '../shared/background';
import { classifyTextNode } from '../shared/classify';
import { collectTextNodes } from '../shared/scan';
import { collectTargets } from '../shared/target-size';
import { checkNonTextContrast } from '../shared/non-text';
import { findExportRoot } from '../shared/deep-check';
import { toCulori, wcagRatio } from '../shared/contrast';
import { differenceEuclidean } from 'culori';

const perceptual = differenceEuclidean('oklch');

/**
 * The background "owner": the node painting the front-most layer behind the
 * text — adjustable only when that layer is the text's ENTIRE effective
 * background (a single opaque solid; gradients/translucency excluded).
 */
export function findBgOwner(text: NodeLite): NodeLite | null {
  const backdrop = resolveBackdrop(text);
  if (!backdrop.ok || backdrop.bgs.length !== 1) return null;
  const bg = backdrop.bgs[0]!;
  // Walk candidates: nearest node up the chain whose own top fill equals the
  // resolved bg exactly — i.e. it alone determines the backdrop.
  let cur: NodeLite | null | undefined = text.parent;
  while (cur && cur.type !== 'PAGE') {
    const fills = cur.fills;
    if (isPaintArray(fills) && fills.length > 0) {
      const top = fills[fills.length - 1]!;
      if (
        top.type === 'SOLID' &&
        top.visible !== false &&
        (top.opacity ?? 1) >= 1 &&
        'color' in top &&
        colorsEqual((top as { color: { r: number; g: number; b: number } }).color, bg)
      ) {
        return cur;
      }
      return null; // nearest painted ancestor doesn't match → stacked/translucent
    }
    cur = cur.parent;
  }
  return null;
}

function colorsEqual(a: { r: number; g: number; b: number }, b: RGBA): boolean {
  const eps = 1e-4;
  return Math.abs(a.r - b.r) < eps && Math.abs(a.g - b.g) < eps && Math.abs(a.b - b.b) < eps;
}

interface FrameState {
  textPasses: Map<string, boolean>;
  probePasses: Map<string, boolean>;
}

/** Snapshot which layers currently pass — the regression baseline. */
export function frameState(root: NodeLite, settings: Settings): FrameState {
  const textPasses = new Map<string, boolean>();
  for (const t of collectTextNodes([root])) {
    textPasses.set(t.id, classifyTextNode(t, settings).kind === 'pass');
  }
  const probePasses = new Map<string, boolean>();
  const targets = collectTargets([root]);
  const result = checkNonTextContrast(targets);
  for (const f of result.findings) probePasses.set(`${f.nodeId}:${f.paintTarget}`, false);
  return { textPasses, probePasses };
}

/** True when nothing that passed in `before` fails in `after`. */
export function noRegression(before: FrameState, after: FrameState): boolean {
  for (const [id, passed] of before.textPasses) {
    if (passed && after.textPasses.get(id) === false) return false;
  }
  for (const [key] of after.probePasses) {
    if (!before.probePasses.has(key)) return false; // newly failing probe
  }
  return true;
}

/**
 * Probe candidates by temporarily setting the owner's fill. Pure of side
 * effects: the original fill is always restored before returning.
 */
export function planBgFix(
  text: NodeLite,
  tokens: TokenCandidate[],
  settings: Settings,
  requiredRatio: number,
  fg: RGBA
): BgFixPlan | null {
  const owner = findBgOwner(text);
  if (!owner) return null;
  const fills = owner.fills;
  if (!isPaintArray(fills)) return null;

  const root = findExportRoot(text);
  const before = frameState(root, settings);

  // Order: hue-near tokens first (least brand disruption), then by distance.
  const currentBg = (fills[fills.length - 1] as { color: { r: number; g: number; b: number } }).color;
  const candidates = tokens
    .filter((t) => wcagRatio(fg, t.color) >= requiredRatio) // must fix the target
    .sort(
      (a, b) =>
        perceptual(toCulori({ ...currentBg, a: 1 } as RGBA), toCulori(a.color)) -
        perceptual(toCulori({ ...currentBg, a: 1 } as RGBA), toCulori(b.color))
    );

  const prevFills = [...fills];
  const mutable = owner as { fills?: unknown };
  try {
    for (const token of candidates) {
      mutable.fills = [
        ...prevFills.slice(0, -1),
        { type: 'SOLID', color: { r: token.color.r, g: token.color.g, b: token.color.b } },
      ];
      const verdict = classifyTextNode(text, settings);
      if (verdict.kind !== 'pass') continue;
      const after = frameState(root, settings);
      if (!noRegression(before, after)) continue;
      return {
        ownerId: owner.id,
        ownerName: owner.name,
        token,
        verifiedRatio: verdict.ratio,
        checkedCount: before.textPasses.size + before.probePasses.size,
      };
    }
    return null;
  } finally {
    mutable.fills = prevFills;
  }
}
