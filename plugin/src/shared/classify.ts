/**
 * 3-tier classification of a single text node (F5, F7, F8).
 * `violation` is emitted only on mathematically certain input — the
 * zero-false-positive contract. Uncertainty degrades to `needsReview`.
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
      return { kind: 'skip' }; // not rendered — nothing to check
    }
    return {
      kind: 'finding',
      finding: needsReview(node, resolved.reason, resolved.detail),
    };
  }

  const large = isLargeText(fontSize, fontWeight);
  const required = requiredRatio(large, settings.level);
  const ratio = wcagRatio(resolved.fg, resolved.bg);
  if (ratio >= required) return { kind: 'pass', ratio };

  return {
    kind: 'finding',
    finding: {
      nodeId: node.id,
      nodeName: node.name,
      tier: 'violation',
      sc: CONTRAST_SC,
      fg: resolved.fg,
      bg: resolved.bg,
      ratio,
      requiredRatio: required,
      apcaLc: apcaLc(resolved.fg, resolved.bg),
      isLargeText: large,
      fontSize,
      detail: `${ratio.toFixed(2)}:1 — requires ${required}:1 (${large ? 'large' : 'normal'} text, ${settings.level})`,
    },
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
