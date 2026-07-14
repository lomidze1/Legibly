/**
 * v0.2 Phase B verify: SC 1.4.11 non-text contrast — icons and borders on
 * interactive targets, measured against the resolved backdrop; judgment
 * cases degrade to needsReview.
 */
import { describe, expect, it } from 'vitest';
import { checkNonTextContrast, measureNonText } from '../src/shared/non-text';
import type { Target } from '../src/shared/target-size';
import { BLACK, WHITE, box, node, page, solid } from './helpers';

const LIGHT_GRAY = { r: 0.8, g: 0.8, b: 0.8 }; // 1.62:1 on white — fails 3:1
const DARK = { r: 0.2, g: 0.2, b: 0.2 }; // ~10:1 on white — passes

/** Build: page(white) > frame(white) > button > [icon]. Returns target. */
function buttonWithIcon(iconFill: typeof DARK, opts: { certain?: boolean; stroke?: typeof DARK } = {}): Target {
  const icon = node({
    type: 'VECTOR',
    name: 'chevron',
    fills: [solid(iconFill)],
    absoluteBoundingBox: box(10, 10, 16, 16),
  });
  const button = node({
    type: 'FRAME',
    name: 'Buy',
    reactions: opts.certain === false ? undefined : [{ trigger: 'ON_CLICK' }],
    fills: [],
    strokes: opts.stroke ? [solid(opts.stroke)] : undefined,
    absoluteBoundingBox: box(0, 0, 120, 40),
    children: [icon],
  });
  page([
    node({
      type: 'FRAME',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(0, 0, 400, 200),
      children: [button],
    }),
  ]);
  return { node: button, certain: opts.certain !== false, box: button.absoluteBoundingBox! };
}

describe('checkNonTextContrast', () => {
  it('dark icon on white passes', () => {
    const result = checkNonTextContrast([buttonWithIcon(DARK)]);
    expect(result.findings).toHaveLength(0);
    expect(result.passCount).toBe(1);
  });

  it('pale icon on a certain-interactive button → violation with fix data', () => {
    const result = checkNonTextContrast([buttonWithIcon(LIGHT_GRAY)]);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0]!;
    expect(f.tier).toBe('violation');
    expect(f.sc).toBe('1.4.11');
    expect(f.requiredRatio).toBe(3);
    expect(f.paintTarget).toBe('shape-fill');
    expect(f.fg).toBeDefined();
    expect(f.bg).toBeDefined();
    expect(f.ratio!).toBeLessThan(3);
  });

  it('pale icon on a name-only (suspect) target → needsReview', () => {
    const result = checkNonTextContrast([buttonWithIcon(LIGHT_GRAY, { certain: false })]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.tier).toBe('needsReview');
    expect(result.findings[0]!.reason).toBe('non-text-judgment');
  });

  it('pale border (stroke) on a certain target → violation on the stroke', () => {
    const result = checkNonTextContrast([buttonWithIcon(DARK, { stroke: LIGHT_GRAY })]);
    const strokeFinding = result.findings.find((f) => f.paintTarget === 'stroke');
    expect(strokeFinding).toBeDefined();
    expect(strokeFinding!.tier).toBe('violation');
  });

  it('unmeasurable backdrop (image) stays silent — covered by the footer', () => {
    const icon = node({
      type: 'VECTOR',
      fills: [solid(LIGHT_GRAY)],
      absoluteBoundingBox: box(10, 10, 16, 16),
    });
    const button = node({
      type: 'FRAME',
      reactions: [{}],
      fills: [{ type: 'IMAGE' }],
      absoluteBoundingBox: box(0, 0, 120, 40),
      children: [icon],
    });
    page([button]);
    const result = checkNonTextContrast([{ node: button, certain: true, box: button.absoluteBoundingBox! }]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('measureNonText — the fix verifier judge', () => {
  it('measures a shape fill against its backdrop', () => {
    const target = buttonWithIcon(DARK);
    const icon = target.node.children![0]!;
    const measured = measureNonText(icon, 'shape-fill');
    expect(measured).not.toBeNull();
    expect(measured!.min).toBeGreaterThan(3);
  });

  it('returns null for gradient-filled shapes (no single color)', () => {
    const icon = node({
      type: 'VECTOR',
      fills: [{ type: 'GRADIENT_LINEAR', gradientStops: [] }],
      absoluteBoundingBox: box(10, 10, 16, 16),
    });
    page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 100, 100), children: [icon] })]);
    expect(measureNonText(icon, 'shape-fill')).toBeNull();
  });

  it('white icon on black passes at 21:1', () => {
    const icon = node({
      type: 'VECTOR',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(10, 10, 16, 16),
    });
    page([node({ type: 'FRAME', fills: [solid(BLACK)], absoluteBoundingBox: box(0, 0, 100, 100), children: [icon] })]);
    const measured = measureNonText(icon, 'shape-fill');
    expect(measured!.min).toBeCloseTo(21, 1);
  });
});
