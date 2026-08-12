/**
 * Every gate in the engine, tested AT the number rather than around it.
 * A `>` where the spec says `>=` moves a whole class of layers from pass to
 * violation, and the zero-false-positive claim (F8) is exactly this
 * inclusivity. Degenerate input (0, negative, NaN, empty) is checked in the
 * same place: it must degrade, never produce a confident verdict.
 */
import { describe, expect, it } from 'vitest';
import { isLargeText, passesContrast, requiredRatio, wcagRatio } from '../src/shared/contrast';
import { classifyTextNode } from '../src/shared/classify';
import { checkTargetSizes, MIN_TARGET_PX, spacingExceptionHolds, targetSc } from '../src/shared/target-size';
import { checkTextSpacing, lineHeightRatio, LINE_HEIGHT_FLOOR } from '../src/shared/text-spacing';
import { checkAltText, MIN_IMAGE_SIZE } from '../src/shared/alt-text';
import { checkSmallText, MIN_COMFORTABLE_PX } from '../src/shared/advisory';
import { checkClippedText } from '../src/shared/clipped-text';
import { deepVerdict } from '../src/shared/deep-check';
import { minimalContrastFix } from '../src/shared/fix';
import { DEFAULT_SETTINGS, type Settings } from '../src/shared/types';
import { GRAY_77, WHITE, box, node, page, prng, rgba, solid, text } from './helpers';

const AA: Settings = { level: 'AA', strictMode: false, targetFloor: 24 };
const AAA: Settings = { level: 'AAA', strictMode: false, targetFloor: 24 };

/** #777777 on white measures 4.48:1 — over the 3:1 large gate, under 4.5:1. */
function grayTextOnWhite(extra: Record<string, unknown>) {
  const t = text({ fills: [solid(GRAY_77)], ...extra });
  page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 400, 200), children: [t] })]);
  return t;
}

const tap = (extra: Record<string, unknown> = {}) =>
  node({ type: 'FRAME', name: 'Tab', layoutMode: 'HORIZONTAL', ...extra });

describe('the contrast gate is inclusive', () => {
  it('a measured ratio always satisfies itself as the requirement', () => {
    const rand = prng(20260812);
    for (let i = 0; i < 200; i++) {
      const fg = rgba(rand(), rand(), rand());
      const bg = rgba(rand(), rand(), rand());
      expect(passesContrast(fg, bg, wcagRatio(fg, bg))).toBe(true);
    }
  });

  it('the smallest step above the requirement still fails', () => {
    const fg = rgba(0, 0, 0);
    const bg = rgba(1, 1, 1);
    const measured = wcagRatio(fg, bg);
    expect(passesContrast(fg, bg, measured + 1e-9)).toBe(false);
  });

  it('a NaN colour can never pass — it is not silently treated as black', () => {
    const broken = rgba(NaN, 0, 0);
    expect(Number.isNaN(wcagRatio(broken, rgba(1, 1, 1)))).toBe(true);
    expect(passesContrast(broken, rgba(1, 1, 1), 4.5)).toBe(false);
    expect(passesContrast(broken, rgba(1, 1, 1), 0)).toBe(false);
  });
});

describe('large-text boundary (SC 1.4.3)', () => {
  it('24px is large; a hair under is not', () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(23.999, 400)).toBe(false);
    expect(classifyTextNode(grayTextOnWhite({ fontSize: 24 }), AA).kind).toBe('pass');
    expect(classifyTextNode(grayTextOnWhite({ fontSize: 23.999 }), AA)).toMatchObject({
      kind: 'finding',
      finding: { tier: 'violation', requiredRatio: 4.5 },
    });
  });

  it('bold at 18.66px is large; the same size one weight step lighter is not', () => {
    expect(isLargeText(18.66, 700)).toBe(true);
    expect(isLargeText(18.66, 699)).toBe(false);
    expect(classifyTextNode(grayTextOnWhite({ fontSize: 18.66, fontWeight: 700 }), AA).kind).toBe('pass');
    expect(classifyTextNode(grayTextOnWhite({ fontSize: 18.66, fontWeight: 699 }), AA)).toMatchObject({
      kind: 'finding',
      finding: { tier: 'violation' },
    });
  });

  it('zero and NaN font sizes are never large', () => {
    expect(isLargeText(0, 400)).toBe(false);
    expect(isLargeText(NaN, 700)).toBe(false);
  });

  it('AAA raises the same layer from pass to violation', () => {
    expect(classifyTextNode(grayTextOnWhite({ fontSize: 24 }), AA).kind).toBe('pass');
    expect(classifyTextNode(grayTextOnWhite({ fontSize: 24 }), AAA)).toMatchObject({
      kind: 'finding',
      finding: { requiredRatio: requiredRatio(true, 'AAA') },
    });
  });
});

describe('tap-target boundary (SC 2.5.8 / 2.5.5)', () => {
  /**
   * Two overlapping targets. The 24px spacing exception is generous enough
   * that a near-24 target with any real gap around it genuinely passes SC
   * 2.5.8 — so to isolate the SIZE boundary the neighbours have to actually
   * crowd the centre.
   */
  const crowded = (w: number, h: number) => [
    { node: tap({ name: 'A' }), certain: true, box: box(0, 0, w, h) },
    { node: tap({ name: 'B' }), certain: true, box: box(w / 2, h / 2, w, h) },
  ];

  it(`${MIN_TARGET_PX}×${MIN_TARGET_PX} passes; a hair under is a violation`, () => {
    expect(checkTargetSizes(crowded(24, 24)).findings).toHaveLength(0);
    const under = checkTargetSizes(crowded(23.999, 24));
    expect(under.findings).toHaveLength(2);
    expect(under.findings[0]!.tier).toBe('violation');
  });

  it('one short side is enough to fail', () => {
    expect(checkTargetSizes(crowded(48, 23.999)).findings).toHaveLength(2);
  });

  it('44×44 passes the enhanced floor; a hair under does not', () => {
    expect(checkTargetSizes(crowded(44, 44), 44).findings).toHaveLength(0);
    const under = checkTargetSizes(crowded(43.999, 44), 44);
    expect(under.findings).toHaveLength(2);
    expect(under.findings[0]!.sc).toBe('2.5.5');
  });

  it('a zero-sized target is a violation, not a crash', () => {
    const finding = checkTargetSizes(crowded(0, 0)).findings[0]!;
    expect(finding.tier).toBe('violation');
    expect(finding.targetSize).toMatchObject({ width: 0, height: 0, required: MIN_TARGET_PX });
    expect(finding.detail).toContain('0×0px');
  });

  it('no targets at all is an empty, non-throwing result', () => {
    expect(checkTargetSizes([])).toEqual({ findings: [], passCount: 0 });
  });

  it('a lone target always satisfies the spacing exception', () => {
    const lone = { node: tap(), certain: true, box: box(0, 0, 4, 4) };
    expect(spacingExceptionHolds(lone, [lone])).toBe(true);
  });
});

describe('line-height floor (SC 1.4.12)', () => {
  const at = (lineHeight: unknown, fontSize = 16) => text({ fontSize, lineHeight });

  it(`exactly ${LINE_HEIGHT_FLOOR}× is quiet; a hair under is flagged`, () => {
    expect(checkTextSpacing(at({ unit: 'PERCENT', value: 150 }))).toBeNull();
    const finding = checkTextSpacing(at({ unit: 'PERCENT', value: 149.9 }));
    expect(finding).toMatchObject({ tier: 'needsReview', reason: 'line-height-floor' });
    expect(finding!.lineHeight!.ratio).toBeCloseTo(1.499, 3);
  });

  it('pixel line heights are measured against the font size', () => {
    expect(lineHeightRatio(at({ unit: 'PIXELS', value: 24 }, 16))).toBeCloseTo(1.5, 10);
    expect(checkTextSpacing(at({ unit: 'PIXELS', value: 24 }, 16))).toBeNull();
    expect(checkTextSpacing(at({ unit: 'PIXELS', value: 23.9 }, 16))).not.toBeNull();
  });

  it('a zero font size is unknowable, not a division by zero', () => {
    expect(lineHeightRatio(at({ unit: 'PIXELS', value: 24 }, 0))).toBeNull();
    expect(checkTextSpacing(at({ unit: 'PIXELS', value: 24 }, 0))).toBeNull();
  });

  it('a malformed line-height object is unknowable rather than assumed fine', () => {
    expect(lineHeightRatio(at({ unit: 'EM', value: 1.2 }))).toBeNull();
    expect(lineHeightRatio(at({ unit: 'PERCENT' }))).toBeNull();
    expect(lineHeightRatio(at(null))).toBeNull();
  });
});

describe('image size floor (SC 1.1.1)', () => {
  const img = (w: number, h: number) =>
    node({
      type: 'RECTANGLE',
      fills: [{ type: 'IMAGE' }],
      absoluteBoundingBox: box(0, 0, w, h),
    });

  it(`exactly ${MIN_IMAGE_SIZE}px square is checked`, () => {
    expect(checkAltText(img(32, 32))).toMatchObject({ reason: 'missing-alt' });
  });

  it('a hair under on either side is treated as decoration', () => {
    expect(checkAltText(img(31.9, 32))).toBeNull();
    expect(checkAltText(img(32, 31.9))).toBeNull();
  });

  it('an image with no resolved bounds is skipped rather than guessed at', () => {
    expect(checkAltText(node({ type: 'RECTANGLE', fills: [{ type: 'IMAGE' }] }))).toBeNull();
  });
});

describe('advisory font size', () => {
  it(`exactly ${MIN_COMFORTABLE_PX}px is quiet; a hair under is advice, never a failure`, () => {
    expect(checkSmallText(text({ fontSize: 12 }))).toBeNull();
    const finding = checkSmallText(text({ fontSize: 11.9 }));
    expect(finding).toMatchObject({ tier: 'advisory', sc: 'Best practice', fontSize: 11.9 });
  });
});

describe('clipped-text tolerance (SC 1.4.10)', () => {
  const overflowing = (width: number) => {
    const t = text({ absoluteBoundingBox: box(0, 0, width, 20) });
    page([
      node({
        type: 'FRAME',
        name: 'Card',
        clipsContent: true,
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    return t;
  };

  it('overflow exactly at the 2px tolerance stays quiet', () => {
    expect(checkClippedText(overflowing(202))).toBeNull();
  });

  it('a hair past the tolerance is reported', () => {
    expect(checkClippedText(overflowing(202.5))).toMatchObject({ reason: 'clipped-text' });
  });
});

describe('the shipped defaults', () => {
  it('scan out of the box at AA, non-strict, on the SC 2.5.8 tap-target floor', () => {
    expect(DEFAULT_SETTINGS).toEqual({ level: 'AA', strictMode: false, targetFloor: MIN_TARGET_PX });
    expect(targetSc(DEFAULT_SETTINGS.targetFloor)).toBe('2.5.8');
    expect(requiredRatio(false, DEFAULT_SETTINGS.level)).toBe(4.5);
  });

  it('the enhanced floor reports the criterion it actually applied', () => {
    expect(targetSc(44)).toBe('2.5.5');
  });
});

describe('degenerate input elsewhere', () => {
  it('deepVerdict refuses an empty or negative region', () => {
    expect(deepVerdict([], 0, 10, rgba(0, 0, 0), 4.5).kind).toBe('unresolved');
    expect(deepVerdict([], -1, -1, rgba(0, 0, 0), 4.5).kind).toBe('unresolved');
  });

  it('deepVerdict refuses a fully transparent region', () => {
    const data = new Uint8ClampedArray(4 * 4).fill(0);
    expect(deepVerdict(data, 2, 2, rgba(0, 0, 0), 4.5)).toMatchObject({ kind: 'unresolved' });
  });

  it('minimalContrastFix has nothing to solve against zero backgrounds', () => {
    expect(minimalContrastFix(rgba(0.5, 0.5, 0.5), [], 4.5)).toBeNull();
  });
});
