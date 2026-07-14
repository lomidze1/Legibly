/**
 * Effective-background resolver (F6 — the moat).
 *
 * Resolves the real background behind a text node by walking the ancestor
 * chain and z-order-lower siblings, alpha-compositing flat solid fills.
 * The zero-false-positive contract (F8, detection research §2.1): a hard
 * verdict is only produced when EVERY contributing layer is a flat solid
 * with NORMAL/PASS_THROUGH blending and resolvable geometry. Anything else
 * degrades to `needsReview`, never a guessed ratio.
 */
import type { NeedsReviewReason } from './types';
import type { RGBA } from './types';
import {
  NodeLite,
  PaintLite,
  RectLite,
  contains,
  intersects,
  isGradientPaint,
  isMixed,
  isPaintArray,
  isSolidPaint,
} from './figma-lite';
import { flattenStack } from './contrast';

export type ResolveResult =
  /** `bgs` = every sampled background (length 1 for flat solids); `bg` = bgs[0]. */
  | { ok: true; fg: RGBA; bg: RGBA; bgs: RGBA[] }
  /** `fg` is included when the text color itself resolved (deep check needs it). */
  | { ok: false; reason: NeedsReviewReason; detail: string; fg?: RGBA }
  | { ok: false; reason: 'invisible'; detail: string; fg?: RGBA };

interface SolidLayer {
  kind: 'solid';
  color: { r: number; g: number; b: number };
  /** fill opacity × owning node opacity (ancestor opacity applied later). */
  localAlpha: number;
  /** The node that owns this fill — used to fold in ancestor opacities. */
  owner: NodeLite;
}

interface GradientLayer {
  kind: 'gradient';
  stops: readonly import('./figma-lite').GradientStopLite[];
  localAlpha: number;
  owner: NodeLite;
}

type Layer = SolidLayer | GradientLayer;

const OK_NODE_BLEND = new Set(['NORMAL', 'PASS_THROUGH', undefined]);

function nodeOpacity(n: NodeLite): number {
  return typeof n.opacity === 'number' ? n.opacity : 1;
}

function paintAlpha(p: PaintLite): number {
  return typeof p.opacity === 'number' ? p.opacity : 1;
}

function paintVisible(p: PaintLite): boolean {
  return p.visible !== false && paintAlpha(p) > 0;
}

function blendOk(mode: string | undefined): boolean {
  return OK_NODE_BLEND.has(mode as never) || mode === undefined;
}

function nonSolidReason(type: string): NeedsReviewReason {
  if (type.startsWith('GRADIENT')) return 'gradient-fill';
  if (type === 'IMAGE') return 'image-fill';
  if (type === 'VIDEO') return 'video-fill';
  return 'unresolved-background';
}

/**
 * Sample a gradient densely: every stop plus a fine grid between them.
 * Geometry is deliberately ignored (which part of the gradient sits under
 * the text) — the verdict must hold for the WHOLE gradient, which can only
 * be conservative: it may under-decide (→ needsReview), never mis-decide.
 */
export function sampleGradient(
  stops: readonly import('./figma-lite').GradientStopLite[],
  gridSteps = 24
): RGBA[] {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return [];
  if (sorted.length === 1) return [{ ...sorted[0]!.color }];
  const samples: RGBA[] = sorted.map((s) => ({ ...s.color }));
  for (let i = 1; i <= gridSteps; i++) {
    const pos =
      sorted[0]!.position + ((sorted[sorted.length - 1]!.position - sorted[0]!.position) * i) / (gridSteps + 1);
    // find surrounding stops
    let lo = sorted[0]!;
    let hi = sorted[sorted.length - 1]!;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (sorted[j]!.position <= pos && pos <= sorted[j + 1]!.position) {
        lo = sorted[j]!;
        hi = sorted[j + 1]!;
        break;
      }
    }
    const span = hi.position - lo.position;
    const t = span === 0 ? 0 : (pos - lo.position) / span;
    samples.push({
      r: lo.color.r + (hi.color.r - lo.color.r) * t,
      g: lo.color.g + (hi.color.g - lo.color.g) * t,
      b: lo.color.b + (hi.color.b - lo.color.b) * t,
      a: lo.color.a + (hi.color.a - lo.color.a) * t,
    });
  }
  return samples;
}

/** Product of `opacity` over all ancestors strictly above `node` (up to page). */
function ancestorAlpha(node: NodeLite): number {
  let a = 1;
  let cur = node.parent;
  while (cur && cur.type !== 'PAGE') {
    a *= nodeOpacity(cur);
    cur = cur.parent;
  }
  return a;
}

type CollectError = { reason: NeedsReviewReason; detail: string };

/**
 * Collect solid paint layers of one node's fill stack into `out` (front of
 * the overall stack). Returns an error when any visible paint is not a flat
 * solid or uses a non-normal blend mode.
 */
function collectFills(node: NodeLite, out: Layer[]): CollectError | null {
  const fills = node.fills;
  if (fills === undefined) return null;
  if (isMixed(fills)) {
    return { reason: 'unresolved-background', detail: `"${node.name}" has mixed fills` };
  }
  if (!isPaintArray(fills)) return null;
  // fills[] is bottom-to-top; we push top-first so `out` stays front-to-back.
  for (let i = fills.length - 1; i >= 0; i--) {
    const p = fills[i]!;
    if (!paintVisible(p)) continue;
    if (!blendOk(p.blendMode) && p.blendMode !== 'NORMAL') {
      return { reason: 'blend-mode', detail: `"${node.name}" uses blend mode ${p.blendMode}` };
    }
    if (!isSolidPaint(p)) {
      // Gradients with stop data are resolvable by sampling (see §flatten).
      if (isGradientPaint(p) && p.gradientStops && p.gradientStops.length > 0) {
        out.push({
          kind: 'gradient',
          stops: p.gradientStops,
          localAlpha: paintAlpha(p) * nodeOpacity(node),
          owner: node,
        });
        continue;
      }
      const reason = nonSolidReason(p.type);
      return { reason, detail: `"${node.name}" has a ${p.type.toLowerCase()} fill behind the element` };
    }
    out.push({ kind: 'solid', color: p.color, localAlpha: paintAlpha(p) * nodeOpacity(node), owner: node });
  }
  return null;
}

/**
 * Resolve the effective foreground and background of a text node.
 * Front-to-back layer collection: text's z-lower siblings (nearest first),
 * then each ancestor's fills and the ancestor's z-lower siblings, ending at
 * the page background.
 */
export function resolveTextColors(text: NodeLite): ResolveResult {
  // 1. Foreground: the text's own fill stack.
  if (text.fills === undefined || (isPaintArray(text.fills) && text.fills.length === 0)) {
    return { ok: false, reason: 'no-text-fill', detail: 'Text has no fill' };
  }
  if (isMixed(text.fills)) {
    return {
      ok: false,
      reason: 'mixed-text-properties',
      detail: 'Text has mixed fills across character ranges',
    };
  }
  if (!blendOk(text.blendMode)) {
    return { ok: false, reason: 'blend-mode', detail: `Text uses blend mode ${text.blendMode}` };
  }
  const fgPaints = (text.fills as readonly PaintLite[]).filter(paintVisible);
  if (fgPaints.length === 0) {
    return { ok: false, reason: 'no-text-fill', detail: 'Text has no visible fill' };
  }
  for (const p of fgPaints) {
    if (!isSolidPaint(p)) {
      return {
        ok: false,
        reason: 'non-solid-text-fill',
        detail: `Text fill is ${p.type.toLowerCase()} — cannot reduce to one color`,
      };
    }
    if (!blendOk(p.blendMode) && p.blendMode !== 'NORMAL') {
      return { ok: false, reason: 'blend-mode', detail: `Text fill uses blend mode ${p.blendMode}` };
    }
  }
  const fgStack: RGBA[] = fgPaints.map((p) => {
    const s = p as import('./figma-lite').SolidPaintLite;
    return { ...s.color, a: paintAlpha(p) };
  });
  let fg = flattenStack(fgStack);
  if (fg.a === 0) return { ok: false, reason: 'invisible', detail: 'Text fill is fully transparent' };
  fg = { ...fg, a: fg.a * nodeOpacity(text) * ancestorAlpha(text) };

  // 2. Background behind the element.
  const backdrop = resolveBackdrop(text);
  if (!backdrop.ok) return { ...backdrop, fg };
  return { ok: true, fg, bg: backdrop.bgs[0]!, bgs: backdrop.bgs };
}

export type BackdropResult =
  | { ok: true; bgs: RGBA[] }
  | { ok: false; reason: NeedsReviewReason; detail: string };

/**
 * Resolve everything painted BEHIND a node (any node — text, icon, button):
 * collect layers front-to-back walking up the tree, truncate at the first
 * fully opaque layer, resolve gradients by sampling.
 */
export function resolveBackdrop(node: NodeLite): BackdropResult {
  const bbox = node.absoluteBoundingBox;
  if (!bbox) {
    return { ok: false, reason: 'unresolved-background', detail: `"${node.name}" has no bounding box` };
  }
  const layers: Layer[] = [];
  let pageBackgrounds: readonly PaintLite[] | undefined;

  let cur: NodeLite = node;
  while (cur.parent) {
    const parent: NodeLite = cur.parent;
    if (parent.type === 'PAGE') {
      pageBackgrounds = parent.backgrounds;
      break;
    }
    if (!blendOk(parent.blendMode)) {
      return {
        ok: false,
        reason: 'blend-mode',
        detail: `"${parent.name}" uses blend mode ${parent.blendMode}`,
      };
    }
    const siblings = parent.children ?? [];
    const idx = siblings.indexOf(cur);
    // Figma children are back-to-front: lower index renders behind.
    for (let i = idx - 1; i >= 0; i--) {
      const sib = siblings[i]!;
      const err = inspectBehindLayer(sib, bbox, layers);
      if (err) return { ok: false, ...err };
    }
    // The parent's own fills render behind all of its children.
    const err = collectFills(parent, layers);
    if (err) return { ok: false, ...err };
    cur = parent;
  }

  // 3. Truncate behind the front-most fully opaque layer: whatever is
  // painted deeper is invisible to the text and must not affect the verdict
  // (an opaque gradient button on a gradient page is ONE gradient, not two).
  const effAlpha = (l: Layer): number => Math.min(1, l.localAlpha * ancestorAlpha(l.owner));
  const isOpaqueLayer = (l: Layer): boolean =>
    effAlpha(l) >= 1 && (l.kind === 'solid' || l.stops.every((s) => s.color.a >= 1));
  const kept: Layer[] = [];
  for (const l of layers) {
    kept.push(l);
    if (isOpaqueLayer(l)) break;
  }

  // Gradients are resolved by sampling: the verdict must hold for EVERY
  // sample. Two stacked (translucent) gradients → every combination of
  // their samples. Three or more → honest needs-review.
  const gradients = kept.filter((l): l is GradientLayer => l.kind === 'gradient');
  if (gradients.length > 2) {
    return {
      ok: false,
      reason: 'gradient-fill',
      detail: 'Several gradients are stacked behind the element',
    };
  }
  const gridSteps = gradients.length > 1 ? 9 : 24;
  const sampleSets = gradients.map((g) => sampleGradient(g.stops, gridSteps));
  if (sampleSets.some((s) => s.length === 0)) {
    return { ok: false, reason: 'gradient-fill', detail: 'Gradient has no color stops' };
  }
  let combos: RGBA[][] = [[]];
  for (const set of sampleSets) combos = combos.flatMap((c) => set.map((s) => [...c, s]));

  const pageSolid = resolvePageBackground(pageBackgrounds);

  const bgs: RGBA[] = [];
  for (const combo of combos) {
    let gradientIndex = 0;
    const backToFront = kept
      .map((l) => {
        const a = effAlpha(l);
        if (l.kind === 'solid') return { ...l.color, a };
        const s = combo[gradientIndex++]!;
        return { r: s.r, g: s.g, b: s.b, a: Math.min(1, s.a * a) };
      })
      .reverse();
    let bg = flattenStack(backToFront);

    if (bg.a < 1) {
      // Composite over the page background if it is a flat solid.
      if (pageSolid === 'non-solid') {
        return {
          ok: false,
          reason: 'unresolved-background',
          detail: 'Page background is not a flat solid',
        };
      }
      if (pageSolid !== 'none') bg = flattenStack([pageSolid, bg]);
    }
    if (bg.a < 0.999) {
      return {
        ok: false,
        reason: 'unresolved-background',
        detail: 'Background never becomes opaque behind the element',
      };
    }
    bgs.push({ ...bg, a: 1 });
  }
  return { ok: true, bgs };
}

/** Does this node's OWN fill stack contain any visible paint? */
function hasVisiblePaint(n: NodeLite): boolean {
  const fills = n.fills;
  if (fills === undefined) return false;
  if (isMixed(fills)) return true; // unknown → must not be ignored
  if (!isPaintArray(fills)) return false;
  return fills.some(paintVisible);
}

/**
 * Does anything in this subtree actually paint pixels under the text bbox?
 * Imported websites are full of transparent wrapper frames (div.container…)
 * that overlap everything but paint nothing — those must be ignored, not
 * flagged (the #1 false-needs-review source on real files).
 */
function subtreePaints(n: NodeLite, bbox: RectLite): boolean {
  if (n.visible === false || nodeOpacity(n) === 0) return false;
  const box = n.absoluteBoundingBox;
  if (box && intersects(box, bbox) && hasVisiblePaint(n)) return true;
  return (n.children ?? []).some((c) => subtreePaints(c, bbox));
}

/**
 * Inspect one node rendered behind the element. Transparent subtrees are
 * ignored; painting containers are resolved RECURSIVELY (children over own
 * fills, back-to-front); a painted layer that only partially covers the
 * text degrades to partial-overlap (never a guessed color).
 */
function inspectBehindLayer(sib: NodeLite, bbox: RectLite, layers: Layer[]): CollectError | null {
  if (sib.visible === false || nodeOpacity(sib) === 0) return null;
  if (!subtreePaints(sib, bbox)) return null; // transparent wrapper → ignore
  if (!blendOk(sib.blendMode)) {
    return { reason: 'blend-mode', detail: `"${sib.name}" uses blend mode ${sib.blendMode}` };
  }
  // Children render above the node's own fills; walk them front-to-back.
  if (sib.children) {
    for (let i = sib.children.length - 1; i >= 0; i--) {
      const err = inspectBehindLayer(sib.children[i]!, bbox, layers);
      if (err) return err;
    }
  }
  if (!hasVisiblePaint(sib)) return null;
  const sibBox = sib.absoluteBoundingBox;
  if (!sibBox || !intersects(sibBox, bbox)) return null;
  if (!contains(sibBox, bbox)) {
    return {
      reason: 'partial-overlap',
      detail: `"${sib.name}" partially overlaps the text — it may span multiple backgrounds`,
    };
  }
  return collectFills(sib, layers);
}

function resolvePageBackground(
  backgrounds: readonly PaintLite[] | undefined
): RGBA | 'none' | 'non-solid' {
  if (!backgrounds || backgrounds.length === 0) return 'none';
  const visible = backgrounds.filter(paintVisible);
  if (visible.length === 0) return 'none';
  const stack: RGBA[] = [];
  for (const p of visible) {
    if (!isSolidPaint(p)) return 'non-solid';
    stack.push({ ...p.color, a: paintAlpha(p) });
  }
  return flattenStack(stack);
}
