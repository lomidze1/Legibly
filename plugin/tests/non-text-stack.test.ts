/**
 * Two things 1.4.11 used to get wrong, both about *which* paint gets measured.
 *
 * A paint stack is not its top paint: a translucent paint on top of an opaque
 * one shows that opaque paint, not the backdrop. And an interactive target that
 * is itself an icon — a bare VECTOR with a reaction — was never probed at all,
 * because only its children were walked.
 */
import { describe, expect, it } from 'vitest';
import { checkNonTextContrast, measureNonText, NON_TEXT_RATIO } from '../src/shared/non-text';
import type { Target } from '../src/shared/target-size';
import { BLACK, WHITE, box, node, page, solid } from './helpers';

const PALE = { r: 0.85, g: 0.85, b: 0.85 }; // ~1.4:1 on white — fails 3:1
const DARK = { r: 0.2, g: 0.2, b: 0.2 }; // ~12.6:1 on white — passes

/** An icon carrying `fills`, inside a white frame so its backdrop resolves. */
function iconWithFills(fills: unknown[]) {
  const icon = node({
    type: 'VECTOR',
    name: 'chevron',
    fills: fills as never,
    absoluteBoundingBox: box(10, 10, 16, 16),
  });
  page([
    node({
      type: 'FRAME',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [icon],
    }),
  ]);
  return icon;
}

describe('the paint stack, not just the top paint', () => {
  it('composites a translucent paint over the opaque one beneath it', () => {
    // 40% white over opaque black renders mid-grey (~5.7:1 on white). Measuring
    // the top paint alone would composite 40% white over the WHITE backdrop and
    // call a clearly visible icon a 1:1 failure.
    const icon = iconWithFills([solid(BLACK), solid(WHITE, { opacity: 0.4 })]);
    const measured = measureNonText(icon, 'shape-fill');
    expect(measured!.min).toBeCloseTo(5.74, 1);
    expect(measured!.min).toBeGreaterThan(NON_TEXT_RATIO);
  });

  it('stops at the first opaque paint — nothing below it can be seen', () => {
    // A gradient under an opaque solid is invisible, so the stack is still
    // measurable and the solid is the answer.
    const icon = iconWithFills([
      { type: 'GRADIENT_LINEAR', gradientStops: [] },
      solid(DARK),
    ]);
    const measured = measureNonText(icon, 'shape-fill');
    expect(measured!.min).toBeCloseTo(12.63, 1);
  });

  it('a gradient showing THROUGH a translucent paint is unmeasurable, not guessed', () => {
    const icon = iconWithFills([
      { type: 'GRADIENT_LINEAR', gradientStops: [] },
      solid(WHITE, { opacity: 0.5 }),
    ]);
    expect(measureNonText(icon, 'shape-fill')).toBeNull();
  });

  it('a lone translucent paint still composites over the backdrop', () => {
    // Nothing beneath it, so the alpha survives to the caller: 50% black on
    // white renders mid-grey, not black.
    const icon = iconWithFills([solid(BLACK, { opacity: 0.5 })]);
    const measured = measureNonText(icon, 'shape-fill');
    expect(measured!.min).toBeGreaterThan(NON_TEXT_RATIO);
    expect(measured!.min).toBeLessThan(21); // opaque black would be 21:1
  });

  it('invisible paints are skipped before the stack is walked', () => {
    const icon = iconWithFills([solid(BLACK), solid(PALE, { visible: false })]);
    const measured = measureNonText(icon, 'shape-fill');
    expect(measured!.min).toBeCloseTo(21, 1); // the black shows, unmodified
  });
});

/** A target that IS the icon: a bare vector with a prototype reaction. */
function vectorTarget(fill: typeof DARK, opts: { stroke?: typeof DARK } = {}): Target {
  const vector = node({
    type: 'VECTOR',
    name: 'close',
    reactions: [{ trigger: 'ON_CLICK' }],
    fills: [solid(fill)],
    strokes: opts.stroke ? [solid(opts.stroke)] : undefined,
    absoluteBoundingBox: box(10, 10, 24, 24),
  });
  page([
    node({
      type: 'FRAME',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(0, 0, 400, 200),
      children: [vector],
    }),
  ]);
  return { node: vector, certain: true, box: vector.absoluteBoundingBox! };
}

describe('an interactive target that is itself an icon', () => {
  it('measures its own fill — walking only its children would skip it', () => {
    const result = checkNonTextContrast([vectorTarget(PALE)]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      tier: 'violation',
      sc: '1.4.11',
      paintTarget: 'shape-fill',
      nodeName: 'close',
    });
  });

  it('a passing one is counted, not reported', () => {
    const result = checkNonTextContrast([vectorTarget(DARK)]);
    expect(result.findings).toHaveLength(0);
    expect(result.passCount).toBe(1);
  });

  it('probes its fill and its stroke exactly once each', () => {
    const result = checkNonTextContrast([vectorTarget(PALE, { stroke: PALE })]);
    expect(result.findings.map((f) => f.paintTarget).sort()).toEqual(['shape-fill', 'stroke']);
  });

  it('still does not treat a container target’s own fill as an icon', () => {
    // The guard against over-reporting: a pale FRAME is a surface, not a
    // graphic, and 1.4.11 has nothing to say about it.
    const frame = node({
      type: 'FRAME',
      name: 'Buy',
      reactions: [{ trigger: 'ON_CLICK' }],
      fills: [solid(PALE)],
      absoluteBoundingBox: box(10, 10, 120, 40),
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 400, 200),
        children: [frame],
      }),
    ]);
    const result = checkNonTextContrast([
      { node: frame, certain: true, box: frame.absoluteBoundingBox! },
    ]);
    expect(result.findings).toHaveLength(0);
    expect(result.passCount).toBe(0);
  });
});
