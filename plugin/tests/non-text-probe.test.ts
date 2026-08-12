/**
 * `evaluateProbe` is the shared judge for SC 1.4.11 — the scanner and the fix
 * verifier both go through it (NF1), but nothing exercised it directly. The
 * branch that matters most is the one checkNonTextContrast rarely reaches: a
 * certain-interactive element straddling a gradient is a RANGE problem, not a
 * "is this graphic meaningful" judgement.
 */
import { describe, expect, it } from 'vitest';
import { evaluateProbe, measureNonText, NON_TEXT_RATIO } from '../src/shared/non-text';
import type { Probe } from '../src/shared/non-text';
import type { GradientStopLite } from '../src/shared/figma-lite';
import { BLACK, WHITE, box, node, page, rgba, solid } from './helpers';

const PALE = { r: 0.85, g: 0.85, b: 0.85 }; // ~1.4:1 on white
const INK = { r: 0.1, g: 0.1, b: 0.1 }; // ~17:1 on white

const stop = (position: number, v: number): GradientStopLite => ({
  position,
  color: { r: v, g: v, b: v, a: 1 },
});

/** An icon inside a frame, so its backdrop resolves. */
function iconOn(frameFills: unknown, iconFill: { r: number; g: number; b: number }) {
  const icon = node({
    type: 'VECTOR',
    name: 'chevron',
    fills: [solid(iconFill)],
    absoluteBoundingBox: box(10, 10, 16, 16),
  });
  page([
    node({
      type: 'FRAME',
      fills: frameFills as never,
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [icon],
    }),
  ]);
  return icon;
}

const probeFor = (n: ReturnType<typeof node>, fg: { r: number; g: number; b: number }): Probe => ({
  node: n,
  paintTarget: 'shape-fill',
  fg: rgba(fg.r, fg.g, fg.b),
  what: 'icon',
});

describe('evaluateProbe — verdicts', () => {
  it('a probe at or above 3:1 passes silently', () => {
    const icon = iconOn([solid(WHITE)], INK);
    expect(evaluateProbe(probeFor(icon, INK), true)).toBe('pass');
    expect(evaluateProbe(probeFor(icon, INK), false)).toBe('pass');
  });

  it('certain-interactive and failing everywhere → violation with fix data', () => {
    const icon = iconOn([solid(WHITE)], PALE);
    const finding = evaluateProbe(probeFor(icon, PALE), true);
    expect(finding).not.toBe('pass');
    expect(finding).toMatchObject({
      tier: 'violation',
      sc: '1.4.11',
      requiredRatio: NON_TEXT_RATIO,
      paintTarget: 'shape-fill',
    });
    expect((finding as { ratio: number }).ratio).toBeLessThan(NON_TEXT_RATIO);
    expect((finding as { bg: unknown }).bg).toEqual({ r: 1, g: 1, b: 1, a: 1 });
  });

  it('name-suspect only → needsReview, because meaningfulness is judgement', () => {
    const icon = iconOn([solid(WHITE)], PALE);
    const finding = evaluateProbe(probeFor(icon, PALE), false);
    expect(finding).toMatchObject({ tier: 'needsReview', reason: 'non-text-judgment' });
    expect((finding as { detail: string }).detail).toContain('if it must be seen');
  });

  it('certain-interactive but straddling a gradient → gradient-range, not judgement', () => {
    // white icon over a #767676→#999999 gradient: one end clears 3:1, the other does not.
    const icon = iconOn(
      [{ type: 'GRADIENT_LINEAR', gradientStops: [stop(0, 0x76 / 255), stop(1, 0x99 / 255)] }],
      WHITE
    );
    const finding = evaluateProbe(probeFor(icon, WHITE), true);
    expect(finding).toMatchObject({ tier: 'needsReview', reason: 'gradient-range' });
    const detail = (finding as { detail: string }).detail;
    expect(detail).toContain('varies');
    expect(detail).toContain('across the gradient');
  });

  it('an unmeasurable backdrop stays silent — the footer covers it', () => {
    const icon = iconOn([{ type: 'IMAGE' }], PALE);
    expect(evaluateProbe(probeFor(icon, PALE), true)).toBeNull();
    expect(evaluateProbe(probeFor(icon, PALE), false)).toBeNull();
  });

  it('reports the WORST sample as the background of a gradient violation', () => {
    const icon = iconOn(
      [{ type: 'GRADIENT_LINEAR', gradientStops: [stop(0, 0.8), stop(1, 1)] }],
      PALE
    );
    const finding = evaluateProbe(probeFor(icon, PALE), true);
    expect(finding).toMatchObject({ tier: 'violation' });
    expect((finding as { bgSamples: unknown[] }).bgSamples!.length).toBeGreaterThan(1);
    expect((finding as { detail: string }).detail).toContain('–'); // a measured range
  });
});

describe('measureNonText — the fix verifier judge', () => {
  it('reports one ratio for a flat backdrop', () => {
    const icon = iconOn([solid(WHITE)], INK);
    const measured = measureNonText(icon, 'shape-fill');
    expect(measured).not.toBeNull();
    expect(measured!.min).toBeCloseTo(measured!.max, 10);
    expect(measured!.min).toBeGreaterThan(NON_TEXT_RATIO);
  });

  it('reports a real min/max spread across a gradient', () => {
    const icon = iconOn(
      [{ type: 'GRADIENT_LINEAR', gradientStops: [stop(0, 0), stop(1, 1)] }],
      INK
    );
    const measured = measureNonText(icon, 'shape-fill');
    expect(measured!.max).toBeGreaterThan(measured!.min);
  });

  it('returns null when the node carries no measurable paint on that target', () => {
    const icon = iconOn([solid(WHITE)], INK);
    expect(measureNonText(icon, 'stroke')).toBeNull(); // no strokes at all
  });

  it('returns null when the backdrop cannot be resolved', () => {
    const icon = iconOn([{ type: 'IMAGE' }], INK);
    expect(measureNonText(icon, 'shape-fill')).toBeNull();
  });

  it('measures a stroke against the backdrop, independently of the fill', () => {
    const bordered = node({
      type: 'FRAME',
      name: 'Buy',
      fills: [solid(WHITE)],
      strokes: [solid(BLACK)],
      absoluteBoundingBox: box(10, 10, 100, 40),
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [bordered],
      }),
    ]);
    const measured = measureNonText(bordered, 'stroke');
    expect(measured!.min).toBeCloseTo(21, 1);
  });
});
