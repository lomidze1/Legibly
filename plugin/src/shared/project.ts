/**
 * Variable-mode projection.
 *
 * Reading `fills` off a live Figma node gives the colour resolved in whatever
 * mode that node currently renders in — so a scan sees exactly one theme. A
 * file with Light/Dark modes can therefore pass every check on canvas while
 * its other mode is unreadable.
 *
 * This module builds a mirror of the node tree with every variable-bound solid
 * paint re-coloured to its value in a chosen mode. The mirror satisfies
 * `NodeLite` structurally, so the same detectors run over it unchanged — no
 * new judgement enters the system, only more samples (the gradient contract,
 * applied to themes).
 *
 * The canvas is never touched: projection is read-only.
 */
import type { RGBA } from './types';
import { NodeLite, PaintLite, isPaintArray, isSolidPaint } from './figma-lite';

/** variableId → the colour that variable resolves to in one specific mode. */
export type ModeColors = ReadonlyMap<string, RGBA>;

/** One mode of one variable collection, with its resolved colours. */
export interface ModeSlice {
  collectionId: string;
  modeId: string;
  colors: ModeColors;
}

/**
 * Re-colour variable-bound solid paints. Figma keeps a bound paint's alpha in
 * `opacity`, so the variable's alpha channel replaces it. Paints that are not
 * bound (or bound to a variable outside this mode's map) are left untouched —
 * they render identically in every mode.
 */
function projectPaints(paints: unknown, colors: ModeColors): unknown {
  if (!isPaintArray(paints)) return paints;
  let changed = false;
  const out: PaintLite[] = paints.map((p) => {
    if (!isSolidPaint(p)) return p;
    const id = p.boundVariables?.color?.id;
    if (!id) return p;
    const c = colors.get(id);
    if (!c) return p;
    changed = true;
    return { ...p, color: { r: c.r, g: c.g, b: c.b }, opacity: c.a };
  });
  return changed ? out : paints;
}

/**
 * Plain-object copy of one node. Explicit rather than a spread: real Figma
 * nodes expose their properties as prototype getters, which a spread would
 * silently drop. **A new field on `NodeLite` must be added here too**, or the
 * mode pass will read it as undefined.
 */
function copyNode(n: NodeLite): NodeLite {
  return {
    id: n.id,
    name: n.name,
    type: n.type,
    visible: n.visible,
    opacity: n.opacity,
    blendMode: n.blendMode,
    fills: n.fills,
    strokes: n.strokes,
    parent: null,
    children: undefined,
    absoluteBoundingBox: n.absoluteBoundingBox,
    reactions: n.reactions,
    componentProperties: n.componentProperties,
    layoutMode: n.layoutMode,
    clipsContent: n.clipsContent,
    minWidth: n.minWidth,
    minHeight: n.minHeight,
    fontSize: n.fontSize,
    fontWeight: n.fontWeight,
    fontName: n.fontName,
    characters: n.characters,
    lineHeight: n.lineHeight,
    backgrounds: n.backgrounds,
    explicitVariableModes: n.explicitVariableModes,
    getSharedPluginData: n.getSharedPluginData
      ? (ns, key) => n.getSharedPluginData!(ns, key)
      : undefined,
    // Delegated to the live node: styled runs are read for SC 1.4.1, which is
    // not mode-sensitive, so the mirror never re-colours them.
    getStyledTextSegments: n.getStyledTextSegments
      ? (fields) => n.getStyledTextSegments!(fields)
      : undefined,
  };
}

/**
 * Mirror `root` and its subtree under one mode. The mirror's own parent chain
 * is kept live above the root, so project from the page when the background
 * resolver needs to walk past the scanned frames.
 *
 * A subtree that pins this collection to a different mode is marked invisible
 * in the mirror instead of being re-coloured: it renders its own pinned mode
 * on canvas, so the base scan already judged it, and projecting a mode it
 * never shows would invent a failure the user cannot see (F8).
 */
export function projectTree(
  root: NodeLite,
  slice: ModeSlice,
  parentOverride?: NodeLite | null
): NodeLite {
  const { colors, collectionId, modeId } = slice;
  const build = (n: NodeLite, parent: NodeLite | null): NodeLite => {
    const out = copyNode(n);
    out.parent = parent;
    const pinned = n.explicitVariableModes?.[collectionId];
    if (pinned !== undefined && pinned !== modeId) {
      out.visible = false;
      return out;
    }
    out.fills = projectPaints(n.fills, colors);
    out.strokes = projectPaints(n.strokes, colors) as NodeLite['strokes'];
    out.backgrounds = projectPaints(n.backgrounds, colors) as NodeLite['backgrounds'];
    if (n.children) out.children = n.children.map((c) => build(c, out));
    return out;
  };
  return build(root, parentOverride !== undefined ? parentOverride : root.parent ?? null);
}

/**
 * Shallow mirror of a container — its own paints projected, children dropped.
 * Used as a projected parent for a branch, so a page background bound to a
 * variable is still measured in the right mode without walking the whole page.
 */
export function projectShallow(node: NodeLite, slice: ModeSlice): NodeLite {
  const out = copyNode(node);
  out.parent = node.parent ?? null;
  out.fills = projectPaints(node.fills, slice.colors);
  out.backgrounds = projectPaints(node.backgrounds, slice.colors) as NodeLite['backgrounds'];
  return out;
}

/** Every node in a tree by id — one walk, then O(1) lookups per finding. */
export function indexById(root: NodeLite): Map<string, NodeLite> {
  const out = new Map<string, NodeLite>();
  const walk = (n: NodeLite): void => {
    out.set(n.id, n);
    if (n.children) for (const c of n.children) walk(c);
  };
  walk(root);
  return out;
}

/** Locate the mirror nodes matching a set of ids (scan roots after projection). */
export function findInTree(root: NodeLite, ids: ReadonlySet<string>): NodeLite[] {
  const out: NodeLite[] = [];
  const walk = (n: NodeLite): void => {
    if (ids.has(n.id)) out.push(n);
    if (n.children) for (const c of n.children) walk(c);
  };
  walk(root);
  return out;
}

/** True when any paint in the subtree is bound to a variable in this map. */
export function touchesModeColors(root: NodeLite, colors: ModeColors): boolean {
  const bound = (paints: unknown): boolean =>
    isPaintArray(paints) &&
    paints.some((p) => {
      const id = isSolidPaint(p) ? p.boundVariables?.color?.id : undefined;
      return id !== undefined && colors.has(id);
    });
  const walk = (n: NodeLite): boolean => {
    if (bound(n.fills) || bound(n.strokes) || bound(n.backgrounds)) return true;
    return n.children ? n.children.some(walk) : false;
  };
  return walk(root);
}
