/**
 * Text spacing capability check — WCAG 2.2 SC 1.4.12 Text Spacing, AA.
 *
 * The real criterion tests RUNTIME adaptability (no loss when users raise
 * line height to 1.5×) — undecidable from a static file. We honestly check
 * capability only: authored line-height below the 1.5× floor is flagged as
 * needsReview, never a violation (detection research §2.3). Only explicit
 * numeric line-heights are checked; AUTO depends on font metrics and would
 * be noise.
 */
import type { Finding } from './types';
import { NodeLite, isMixed } from './figma-lite';

export const SPACING_SC = '1.4.12';
export const LINE_HEIGHT_FLOOR = 1.5;

interface LineHeightLite {
  unit: 'PIXELS' | 'PERCENT' | 'AUTO';
  value?: number;
}

function readLineHeight(v: unknown): LineHeightLite | null {
  if (!v || typeof v !== 'object') return null;
  const lh = v as LineHeightLite;
  if (lh.unit !== 'PIXELS' && lh.unit !== 'PERCENT' && lh.unit !== 'AUTO') return null;
  return lh;
}

/** Authored line-height as a multiple of font size, or null when unknowable. */
export function lineHeightRatio(node: NodeLite): number | null {
  if (isMixed(node.lineHeight) || isMixed(node.fontSize)) return null;
  const fontSize = typeof node.fontSize === 'number' ? node.fontSize : null;
  const lh = readLineHeight(node.lineHeight);
  if (!fontSize || !lh || lh.unit === 'AUTO' || typeof lh.value !== 'number') return null;
  return lh.unit === 'PERCENT' ? lh.value / 100 : lh.value / fontSize;
}

/** null = no finding (ok or unknowable). */
export function checkTextSpacing(node: NodeLite): Finding | null {
  if (!node.characters || node.characters.trim().length === 0) return null;
  const ratio = lineHeightRatio(node);
  if (ratio === null || ratio >= LINE_HEIGHT_FLOOR) return null;
  // One-click raise is only safe when the font is a single known face.
  const fixable = !isMixed(node.fontName) && !isMixed(node.fontSize);
  return {
    nodeId: node.id,
    nodeName: node.name,
    tier: 'needsReview',
    sc: SPACING_SC,
    reason: 'line-height-floor',
    detail: `Line height is ${(ratio * 100).toFixed(0)}% of font size — the adaptability floor is 150%`,
    lineHeight: { ratio, fixable },
  };
}
