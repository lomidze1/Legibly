/**
 * Advisory checks — readability guidance, NOT WCAG conformance.
 *
 * WCAG sets no minimum font size: 8px text passes 1.4.3 as long as its
 * contrast holds. That is a real gap between "conformant" and "legible", and
 * legibility is the product's name — so we say something, in a tier that can
 * never be mistaken for a legal finding (see Tier.advisory in types.ts).
 *
 * Every advisory carries `sc: 'Best practice'` rather than a criterion number,
 * so an exported report cannot imply a success criterion was failed.
 */
import type { Finding } from './types';
import { NodeLite, isMixed } from './figma-lite';

export const ADVISORY_SC = 'Best practice';

/**
 * Below this, text is hard work on a phone at arm's length. Chosen as the
 * smallest size mainstream design systems still ship as a real token — low
 * enough that ordinary captions and labels stay quiet.
 */
export const MIN_COMFORTABLE_PX = 12;

export function checkSmallText(node: NodeLite): Finding | null {
  if (node.type !== 'TEXT') return null;
  if (!node.characters || node.characters.trim().length === 0) return null;
  if (isMixed(node.fontSize) || typeof node.fontSize !== 'number') return null;
  if (node.fontSize >= MIN_COMFORTABLE_PX) return null;

  return {
    nodeId: node.id,
    nodeName: node.name,
    tier: 'advisory',
    sc: ADVISORY_SC,
    reason: 'small-text',
    fontSize: node.fontSize,
    detail: `${node.fontSize}px text — below the ${MIN_COMFORTABLE_PX}px most people can read comfortably on a phone`,
  };
}
