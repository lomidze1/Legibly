/**
 * 3-tier classification of a single text node (F5, F7, F8).
 * `violation` is emitted only on mathematically certain input — the
 * zero-false-positive contract. Uncertainty degrades to `needsReview`.
 *
 * Gradient backgrounds are decided over EVERY sample: all pass → pass,
 * all fail → violation, straddling → needsReview with the measured range.
 */
import type { Finding, Settings } from './types';
import { NodeLite, isMixed } from './figma-lite';
import { resolveTextColors } from './background';
import { isLargeText, requiredRatio, wcagRatio } from './contrast';
import { apcaLc } from './apca';

export const CONTRAST_SC = '1.4.3';

export type ClassifyResult =
  | { kind: 'pass'; ratio: number }
  | { kind: 'skip' }
  | { kind: 'finding'; finding: Finding };

export function classifyTextNode(node: NodeLite, settings: Settings): ClassifyResult {
  if (!node.characters || node.characters.trim().length === 0) return { kind: 'skip' };

  if (isMixed(node.fontSize) || isMixed(node.fontWeight)) {
    return {
      kind: 'finding',
      finding: needsReview(node, 'mixed-text-properties', 'Mixed font sizes/weights across ranges — check each range manually'),
    };
  }
  const fontSize = typeof node.fontSize === 'number' ? node.fontSize : undefined;
  const fontWeight = typeof node.fontWeight === 'number' ? node.fontWeight : 400;
  if (fontSize === undefined) {
    return {
      kind: 'finding',
      finding: needsReview(node, 'mixed-text-properties', 'Font size could not be read'),
    };
  }

  const resolved = resolveTextColors(node);
  if (!resolved.ok) {
    if (resolved.reason === 'no-text-fill' || resolved.reason === 'invisible') {
      // Rendered-but-invisible text (0% fill) is worth a human look — common
      // import artifact; may also be read by assistive tech in production.
      return {
        kind: 'finding',
        finding: needsReview(node, 'invisible-text', 'Text layer exists but has no visible color'),
      };
    }
    return {
      kind: 'finding',
      finding: needsReview(node, resolved.reason, resolved.detail),
    };
  }

  const large = isLargeText(fontSize, fontWeight);
  const required = requiredRatio(large, settings.level);
  const ratios = resolved.bgs.map((bg) => wcagRatio(resolved.fg, bg));
  const minRatio = Math.min(...ratios);
  const maxRatio = Math.max(...ratios);
  const worstBg = resolved.bgs[ratios.indexOf(minRatio)]!;
  const isGradient = resolved.bgs.length > 1;

  if (minRatio >= required) return { kind: 'pass', ratio: minRatio };

  if (maxRatio < required) {
    // Every sampled spot fails → certain violation, even on a gradient.
    const measured = isGradient
      ? `${minRatio.toFixed(2)}:1–${maxRatio.toFixed(2)}:1 across the gradient`
      : `${minRatio.toFixed(2)}:1`;
    return {
      kind: 'finding',
      finding: {
        nodeId: node.id,
        nodeName: node.name,
        tier: 'violation',
        sc: CONTRAST_SC,
        fg: resolved.fg,
        bg: worstBg,
        bgSamples: isGradient ? resolved.bgs : undefined,
        ratio: minRatio,
        requiredRatio: required,
        apcaLc: apcaLc(resolved.fg, worstBg),
        isLargeText: large,
        fontSize,
        detail: `${measured} — requires ${required}:1 (${large ? 'large' : 'normal'} text, ${settings.level})`,
      },
    };
  }

  // Some samples pass, some fail → honest needs-review with the range.
  return {
    kind: 'finding',
    finding: needsReview(
      node,
      'gradient-range',
      `Contrast varies from ${minRatio.toFixed(2)}:1 to ${maxRatio.toFixed(2)}:1 across the gradient — requires ${required}:1`
    ),
  };
}

function needsReview(
  node: NodeLite,
  reason: NonNullable<Finding['reason']>,
  detail: string
): Finding {
  return {
    nodeId: node.id,
    nodeName: node.name,
    tier: 'needsReview',
    sc: CONTRAST_SC,
    reason,
    detail,
  };
}
