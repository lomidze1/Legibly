/** Fixture builders for structural NodeLite trees. */
import type { NodeLite, PaintLite, RectLite } from '../src/shared/figma-lite';
import type { RGBA } from '../src/shared/types';

export const WHITE = { r: 1, g: 1, b: 1 };
export const BLACK = { r: 0, g: 0, b: 0 };
export const GRAY_77 = { r: 0x77 / 255, g: 0x77 / 255, b: 0x77 / 255 };
export const GRAY_76 = { r: 0x76 / 255, g: 0x76 / 255, b: 0x76 / 255 };

export function rgba(r: number, g: number, b: number, a = 1): RGBA {
  return { r, g, b, a };
}

export function solid(color: { r: number; g: number; b: number }, opts: Partial<PaintLite> = {}): PaintLite {
  return { type: 'SOLID', color, ...opts } as PaintLite;
}

export function box(x: number, y: number, width: number, height: number): RectLite {
  return { x, y, width, height };
}

let idCounter = 0;
export function node(partial: Partial<NodeLite> & { type: string }): NodeLite {
  idCounter += 1;
  return {
    id: partial.id ?? `n${idCounter}`,
    name: partial.name ?? `${partial.type.toLowerCase()}-${idCounter}`,
    ...partial,
  } as NodeLite;
}

export function text(partial: Partial<NodeLite> = {}): NodeLite {
  return node({
    type: 'TEXT',
    characters: 'Hello world',
    fontSize: 16,
    fontWeight: 400,
    fills: [solid(BLACK)],
    absoluteBoundingBox: box(10, 10, 100, 20),
    ...partial,
  });
}

/** Wire parent pointers through a tree (children arrays are back-to-front). */
export function withParents(root: NodeLite, parent: NodeLite | null = null): NodeLite {
  (root as { parent: NodeLite | null }).parent = parent;
  if (root.children) for (const c of root.children) withParents(c, root);
  return root;
}

/** A page with a solid background wrapping the given children. */
export function page(children: NodeLite[], backgrounds: PaintLite[] = [solid(WHITE)]): NodeLite {
  const p = node({ type: 'PAGE', children, backgrounds });
  return withParents(p);
}

/** Deterministic PRNG (mulberry32) for property-style loops. */
export function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
