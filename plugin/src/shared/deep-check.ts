/**
 * Deep check — pixel-true contrast verification (detection research §2.1.5,
 * the deterministic alternative to an LLM-vision estimate).
 *
 * For "check by eye" cases (image/complex backdrops) the text is made
 * temporarily transparent, its top-level frame is exported to PNG, and the
 * REAL rendered pixels under the text box are measured. Pixels are ground
 * truth: all pass → verified pass; all fail → confirmed fail; mixed →
 * honest range. Runs fully on-device.
 */
import type { NeedsReviewReason, RGBA } from './types';
import { NodeLite, RectLite, contains } from './figma-lite';
import { wcagRatio } from './contrast';

/** needsReview reasons where pixel sampling can produce a real verdict. */
export const DEEP_CHECKABLE: ReadonlySet<NeedsReviewReason> = new Set([
  'image-fill',
  'gradient-fill',
  'gradient-range',
  'unresolved-background',
  'partial-overlap',
  'blend-mode',
] as NeedsReviewReason[]);

export interface DeepVerdict {
  kind: 'pass' | 'fail' | 'mixed' | 'unresolved';
  /** Worst / best pixel ratios (absent for unresolved). */
  min?: number;
  max?: number;
  /**
   * True when every pixel of the region was read. A large region is probed on
   * a grid instead, and a thin dark band can fall between probes — so a pass
   * found that way is evidence, not proof, and must not be worded as proof.
   */
  exhaustive?: boolean;
  detail: string;
}

/**
 * The export root: the text's top-level ancestor under the page — what we
 * screenshot. Throws when the text isn't fully inside it (rotation/overflow
 * make the pixel mapping unsafe).
 */
export function findExportRoot(node: NodeLite): NodeLite {
  let cur: NodeLite = node;
  while (cur.parent && cur.parent.type !== 'PAGE') cur = cur.parent;
  if (cur === node) throw new Error('This layer has no parent frame to render');
  const rootBox = cur.absoluteBoundingBox;
  const bbox = node.absoluteBoundingBox;
  if (!rootBox || !bbox || !contains(rootBox, bbox)) {
    throw new Error('The text overflows its frame — pixel check is unsafe here');
  }
  return cur;
}

/** Text bbox in export-image coordinates (css px, scale applied by caller). */
export function regionInRoot(node: NodeLite, root: NodeLite): RectLite {
  const b = node.absoluteBoundingBox!;
  const r = root.absoluteBoundingBox!;
  return { x: b.x - r.x, y: b.y - r.y, width: b.width, height: b.height };
}

/**
 * Judge the sampled region. `data` is RGBA8 (canvas ImageData.data) of the
 * CROPPED region (width × height px). Sub-samples on a grid (≤ ~4k probes).
 * Any translucent pixel → unresolved (something behind the frame shows
 * through; we refuse to guess).
 */
export function deepVerdict(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  fg: RGBA,
  required: number
): DeepVerdict {
  if (width <= 0 || height <= 0) {
    return { kind: 'unresolved', detail: 'Empty region' };
  }
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 4096)));
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const a = data[i + 3]!;
      if (a < 255) {
        return { kind: 'unresolved', detail: 'The rendered background is semi-transparent here' };
      }
      const bg: RGBA = { r: data[i]! / 255, g: data[i + 1]! / 255, b: data[i + 2]! / 255, a: 1 };
      const ratio = wcagRatio(fg, bg);
      if (ratio < min) min = ratio;
      if (ratio > max) max = ratio;
    }
  }
  if (min === Infinity) return { kind: 'unresolved', detail: 'No pixels sampled' };
  const exhaustive = step === 1;
  const fmt = (v: number) => v.toFixed(2);
  if (min >= required) {
    return {
      kind: 'pass',
      min,
      max,
      exhaustive,
      detail: exhaustive
        ? `Pixel-checked ✓ — worst spot ${fmt(min)}:1 meets ${required}:1`
        : `Pixel-sampled ✓ — worst of every ${step}th pixel is ${fmt(min)}:1, over ${required}:1`,
    };
  }
  if (max < required) {
    return {
      kind: 'fail',
      min,
      max,
      exhaustive,
      detail: `Confirmed by pixels — best spot ${fmt(max)}:1 is below ${required}:1`,
    };
  }
  return {
    kind: 'mixed',
    min,
    max,
    exhaustive,
    detail: `Real pixels vary ${fmt(min)}:1–${fmt(max)}:1 — some spots fail ${required}:1; check where the text sits`,
  };
}
