/**
 * Alt-text presence check — WCAG 2.2 SC 1.1.1 Non-text Content (v0.3).
 *
 * Figma has no native alt-text field, so Legibly records intended alt text
 * in sharedPluginData (namespace "legibly") where dev-handoff tooling and
 * the CSV report can read it. Detection research §1: PRESENCE is
 * deterministic; QUALITY is judgment — so a missing record is always
 * needsReview (never a violation), and AI suggestions are review-required.
 */
import type { Finding } from './types';
import { NodeLite, PaintLite, isPaintArray } from './figma-lite';

export const ALT_SC = '1.1.1';
export const ALT_NS = 'legibly';
export const ALT_KEY = 'altText';
export const DECORATIVE_KEY = 'altDecorative';
/** Smaller graphics are near-always decorative; flagging them is noise. */
export const MIN_IMAGE_SIZE = 32;

export function hasImageFill(node: NodeLite): boolean {
  const fills = node.fills;
  if (!isPaintArray(fills)) return false;
  return (fills as readonly PaintLite[]).some(
    (p) => p.type === 'IMAGE' && p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)
  );
}

export interface AltData {
  alt: string;
  decorative: boolean;
}

export function readAltData(node: NodeLite): AltData {
  const read = node.getSharedPluginData?.bind(node);
  if (!read) return { alt: '', decorative: false };
  return {
    alt: (read(ALT_NS, ALT_KEY) || '').trim(),
    decorative: read(ALT_NS, DECORATIVE_KEY) === 'true',
  };
}

/** 'pass' = recorded or decorative; null = not an image worth checking. */
export function checkAltText(node: NodeLite): 'pass' | Finding | null {
  if (!hasImageFill(node)) return null;
  const box = node.absoluteBoundingBox;
  if (!box || box.width < MIN_IMAGE_SIZE || box.height < MIN_IMAGE_SIZE) return null;

  const data = readAltData(node);
  if (data.decorative || data.alt.length > 0) return 'pass';

  return {
    nodeId: node.id,
    nodeName: node.name,
    tier: 'needsReview',
    sc: ALT_SC,
    reason: 'missing-alt',
    detail: 'No alt text recorded for this image',
  };
}
