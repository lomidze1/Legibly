/**
 * Clipped text — content the design silently hides.
 *
 * When a text layer extends past an ancestor frame that clips its contents,
 * the characters outside the frame are simply not painted. Nobody reads them:
 * not a sighted user, not a magnifier user, not the person reading the string
 * off the handoff. It is the most common artifact in imported/converted files.
 *
 * What we claim (and what we don't): this is pure geometry — the layer's own
 * bounds against a clipping ancestor's — so the measurement is exact. SC 1.4.10
 * Reflow itself is about behaviour at 320px, which a static file cannot
 * exhibit (detection research §1); we report the design-time signal under it
 * and say so in the footer. Always needsReview, never a hard fail: a clipped
 * layer can be a deliberate mask or a marquee.
 */
import type { Finding } from './types';
import { NodeLite, RectLite } from './figma-lite';

export const CLIPPED_SC = '1.4.10';

/**
 * Sub-pixel slack. Figma text bounds carry a fraction of a pixel of overhang
 * for descenders and hinting; below this, nothing legible is lost.
 */
const TOLERANCE_PX = 2;

/** How far `box` sticks out of `clip` on its worst side (0 when contained). */
function overflowOf(box: RectLite, clip: RectLite): { amount: number; side: string } {
  const sides: [number, string][] = [
    [clip.x - box.x, 'left'],
    [clip.y - box.y, 'top'],
    [box.x + box.width - (clip.x + clip.width), 'right'],
    [box.y + box.height - (clip.y + clip.height), 'bottom'],
  ];
  let worst: [number, string] = [0, ''];
  for (const s of sides) if (s[0] > worst[0]) worst = s;
  return { amount: worst[0], side: worst[1] };
}

/** Nearest ancestor that clips, with both boxes resolved. */
function clippingAncestor(node: NodeLite): { node: NodeLite; box: RectLite } | null {
  let cur = node.parent;
  while (cur && cur.type !== 'PAGE') {
    if (cur.clipsContent === true && cur.absoluteBoundingBox) {
      return { node: cur, box: cur.absoluteBoundingBox };
    }
    cur = cur.parent;
  }
  return null;
}

export function checkClippedText(node: NodeLite): Finding | null {
  if (node.type !== 'TEXT') return null;
  if (!node.characters || node.characters.trim().length === 0) return null;
  const box = node.absoluteBoundingBox;
  if (!box) return null;

  const clipper = clippingAncestor(node);
  if (!clipper) return null;

  const { amount, side } = overflowOf(box, clipper.box);
  if (amount <= TOLERANCE_PX) return null;

  return {
    nodeId: node.id,
    nodeName: node.name,
    tier: 'needsReview',
    sc: CLIPPED_SC,
    reason: 'clipped-text',
    detail: `Text runs ${Math.round(amount)}px past the ${side} edge of “${clipper.node.name}”, which clips its contents — that part is not visible`,
  };
}
