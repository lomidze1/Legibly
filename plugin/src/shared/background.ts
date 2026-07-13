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
  isMixed,
  isPaintArray,
  isSolidPaint,
} from './figma-lite';
import { flattenStack } from './contrast';

export type ResolveResult =
  | { ok: true; fg: RGBA; bg: RGBA }
  | { ok: false; reason: NeedsReviewReason; detail: string }
  | { ok: false; reason: 'invisible'; detail: string };

interface Layer {
  color: { r: number; g: number; b: number };
  /** fill opacity × owning node opacity (ancestor opacity applied later). */
  localAlpha: number;
  /** The node that owns this fill — used to fold in ancestor opacities. */
  owner: NodeLite;
}

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
      const reason = nonSolidReason(p.type);
      return { reason, detail: `"${node.name}" has a ${p.type.toLowerCase()} fill behind the text` };
    }
    out.push({ color: p.color, localAlpha: paintAlpha(p) * nodeOpacity(node), owner: node });
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

  // 2. Background: collect layers front-to-back walking up the tree.
  const bbox = text.absoluteBoundingBox;
  if (!bbox) {
    return { ok: false, reason: 'unresolved-background', detail: 'Text has no bounding box' };
  }
  const layers: Layer[] = [];
  let pageBackgrounds: readonly PaintLite[] | undefined;

  let cur: NodeLite = text;
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

  // 3. Fold ancestor opacities into each layer and flatten back-to-front.
  const backToFront = layers
    .map((l) => ({ ...l.color, a: Math.min(1, l.localAlpha * ancestorAlpha(l.owner)) }))
    .reverse();
  let bg = flattenStack(backToFront);

  if (bg.a < 1) {
    // Composite over the page background if it is a flat solid.
    const pageSolid = resolvePageBackground(pageBackgrounds);
    if (pageSolid === 'non-solid') {
      return {
        ok: false,
        reason: 'unresolved-background',
        detail: 'Page background is not a flat solid',
      };
    }
    if (pageSolid === 'none') {
      if (bg.a < 0.999) {
        return {
          ok: false,
          reason: 'unresolved-background',
          detail: 'Background never becomes opaque behind the text',
        };
      }
    } else {
      bg = flattenStack([pageSolid, bg]);
    }
  }
  if (bg.a < 0.999) {
    return {
      ok: false,
      reason: 'unresolved-background',
      detail: 'Background never becomes opaque behind the text',
    };
  }
  return { ok: true, fg, bg: { ...bg, a: 1 } };
}

/**
 * Inspect one node rendered behind the text within the same parent.
 * Contributes its fills when it fully contains the text bbox; flags partial
 * overlap; ignores non-overlapping nodes.
 */
function inspectBehindLayer(sib: NodeLite, bbox: RectLite, layers: Layer[]): CollectError | null {
  if (sib.visible === false || nodeOpacity(sib) === 0) return null;
  const sibBox = sib.absoluteBoundingBox;
  if (!sibBox) return null; // zero-size / unbounded nodes can't paint behind
  if (!intersects(sibBox, bbox)) return null;
  if (!contains(sibBox, bbox)) {
    return {
      reason: 'partial-overlap',
      detail: `"${sib.name}" partially overlaps the text — it may span multiple backgrounds`,
    };
  }
  if (!blendOk(sib.blendMode)) {
    return { reason: 'blend-mode', detail: `"${sib.name}" uses blend mode ${sib.blendMode}` };
  }
  // A covering layer with its own visible children painting inside the bbox
  // is beyond flat-solid resolution (v0.1) → honest needs-review.
  if (sib.children && sib.children.some((c) => childPaintsInside(c, bbox))) {
    return {
      reason: 'unresolved-background',
      detail: `"${sib.name}" has child layers behind the text`,
    };
  }
  return collectFills(sib, layers);
}

function childPaintsInside(child: NodeLite, bbox: RectLite): boolean {
  if (child.visible === false || nodeOpacity(child) === 0) return false;
  const box = child.absoluteBoundingBox;
  if (!box) return false;
  return intersects(box, bbox);
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
