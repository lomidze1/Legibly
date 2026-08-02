/**
 * Use of Color — WCAG 2.2 SC 1.4.1, Level A.
 *
 * The failure this catches is the classic one: a link inside a paragraph that
 * is marked as a link by colour alone. Readers who can't distinguish that
 * colour see ordinary body text.
 *
 * Scope is deliberately narrow, because "is this colour carrying meaning?" is
 * judgement, not maths (detection research §2.4 — 1.4.1 is needsReview only,
 * never a hard fail). We only look INSIDE one text layer, where a run differs
 * from the body around it, and we stay quiet whenever a second, non-colour cue
 * is present:
 *   - underline or strikethrough  → the cue exists
 *   - different weight or italic  → the cue exists
 *   - different size              → the cue exists
 *   - same hue family as the body → a tonal variant (muted caption, emphasis),
 *     not a semantic colour like link-blue or error-red
 * Standalone colour-coded labels, icons and chart keys are not judged at all —
 * their meaning simply isn't in the file (listed in the honesty footer).
 */
import type { Finding, RGBA } from './types';
import {
  NodeLite,
  PaintLite,
  TextSegmentLite,
  isMixed,
  isPaintArray,
  isSolidPaint,
} from './figma-lite';
import { hueCompatible, rgbaToHex } from './fix';

export const USE_OF_COLOR_SC = '1.4.1';

/** Hue tolerance for "same colour family" — matches the fix engine's (RM2). */
const SAME_FAMILY_DEG = 30;

const SEGMENT_FIELDS = ['fills', 'textDecoration', 'fontSize', 'fontWeight', 'fontName'] as const;

/** Topmost visible solid colour of a paint stack, or null. */
function topSolidColor(paints: unknown): RGBA | null {
  if (!isPaintArray(paints)) return null;
  const visible = (paints as readonly PaintLite[]).filter(
    (p) => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)
  );
  const top = visible[visible.length - 1];
  if (!top || !isSolidPaint(top)) return null;
  return { ...top.color, a: typeof top.opacity === 'number' ? top.opacity : 1 };
}

interface Run {
  segment: TextSegmentLite;
  color: RGBA;
  key: string;
}

/** Runs whose colour we can actually compare, keyed by hex. */
function measurableRuns(segments: readonly TextSegmentLite[]): Run[] {
  const out: Run[] = [];
  for (const segment of segments) {
    if (segment.characters.trim().length === 0) continue;
    const color = topSolidColor(segment.fills);
    if (!color) continue;
    out.push({ segment, color, key: rgbaToHex(color) });
  }
  return out;
}

/** The colour covering the most characters — the body text. */
function dominantKey(runs: readonly Run[]): string | null {
  const weight = new Map<string, number>();
  for (const r of runs) {
    weight.set(r.key, (weight.get(r.key) ?? 0) + r.segment.characters.trim().length);
  }
  let best: string | null = null;
  let bestWeight = 0;
  for (const [key, w] of weight) {
    if (w > bestWeight) {
      best = key;
      bestWeight = w;
    }
  }
  return best;
}

/** True when this run carries a cue other than colour. */
function hasNonColorCue(run: Run, body: TextSegmentLite): boolean {
  const decoration = run.segment.textDecoration;
  if (decoration !== undefined && decoration !== 'NONE') return true;
  if (run.segment.fontWeight !== undefined && run.segment.fontWeight !== body.fontWeight) return true;
  if (run.segment.fontSize !== undefined && run.segment.fontSize !== body.fontSize) return true;
  if (
    run.segment.fontName !== undefined &&
    body.fontName !== undefined &&
    run.segment.fontName.style !== body.fontName.style
  ) {
    return true;
  }
  return false;
}

function excerptOf(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 40 ? `${clean.slice(0, 39)}…` : clean;
}

/**
 * One finding per text layer (not per run): the fix underlines every run that
 * needs it, so several links in a paragraph are one decision, not five cards.
 */
export function checkUseOfColor(node: NodeLite): Finding | null {
  if (node.type !== 'TEXT' || !node.getStyledTextSegments) return null;
  // Uniform fills across the layer means no colour-coded run can exist. This
  // pre-filter matters: reading styled runs is a per-node API call, and most
  // text layers are uniformly styled (NF4 — 2s for 500 text nodes).
  if (!isMixed(node.fills)) return null;

  let segments: readonly TextSegmentLite[];
  try {
    segments = node.getStyledTextSegments(SEGMENT_FIELDS);
  } catch {
    return null; // not a text node we can read runs from — stay silent
  }
  if (segments.length < 2) return null;

  const runs = measurableRuns(segments);
  const bodyKey = dominantKey(runs);
  if (!bodyKey) return null;
  const body = runs.find((r) => r.key === bodyKey)!;

  const flagged = runs.filter(
    (r) =>
      r.key !== bodyKey &&
      !hasNonColorCue(r, body.segment) &&
      // A tonal step of the body colour reads as styling, not as a signifier.
      !hueCompatible(r.color, body.color, SAME_FAMILY_DEG)
  );
  if (flagged.length === 0) return null;

  const first = excerptOf(flagged[0]!.segment.characters);
  const more = flagged.length > 1 ? ` (+${flagged.length - 1} more)` : '';
  return {
    nodeId: node.id,
    nodeName: node.name,
    tier: 'needsReview',
    sc: USE_OF_COLOR_SC,
    reason: 'color-only-signifier',
    detail: `“${first}”${more} is set apart from the surrounding text by colour alone — no underline, weight or size difference`,
    colorOnly: {
      ranges: flagged.map((r) => ({ start: r.segment.start, end: r.segment.end })),
      excerpt: first,
    },
  };
}
