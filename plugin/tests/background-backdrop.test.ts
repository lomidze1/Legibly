/**
 * The two exports of the background resolver that nothing tested directly:
 * `sampleGradient` (the conservative "hold for the WHOLE gradient" sampler)
 * and `resolveBackdrop` — the entry point 1.4.11 and the bg-fix planner use
 * for NON-text nodes, where resolveTextColors never runs.
 */
import { describe, expect, it } from 'vitest';
import { resolveBackdrop, sampleGradient } from '../src/shared/background';
import type { GradientStopLite } from '../src/shared/figma-lite';
import { BLACK, WHITE, box, node, page, solid } from './helpers';

const stop = (position: number, r: number, g: number, b: number, a = 1): GradientStopLite => ({
  position,
  color: { r, g, b, a },
});

/** A rectangle with real bounds — resolveBackdrop refuses anything without them. */
const rect = (fills: unknown = [], extra: Record<string, unknown> = {}) =>
  node({
    type: 'RECTANGLE',
    fills: fills as never,
    absoluteBoundingBox: box(20, 20, 40, 40),
    ...extra,
  });

describe('sampleGradient', () => {
  it('no stops → no samples (the caller must degrade to needs-review)', () => {
    expect(sampleGradient([])).toEqual([]);
  });

  it('a single stop is one flat colour', () => {
    expect(sampleGradient([stop(0.3, 1, 0, 0)])).toEqual([{ r: 1, g: 0, b: 0, a: 1 }]);
  });

  it('samples every stop plus the requested grid between them', () => {
    const samples = sampleGradient([stop(0, 1, 1, 1), stop(1, 0, 0, 0)], 24);
    expect(samples).toHaveLength(2 + 24);
    expect(samples[0]).toEqual({ r: 1, g: 1, b: 1, a: 1 }); // both endpoints kept
    expect(samples[1]).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    for (const s of samples) {
      expect(s.r).toBeGreaterThanOrEqual(0);
      expect(s.r).toBeLessThanOrEqual(1);
    }
  });

  it('interpolates linearly between the surrounding stops', () => {
    // grid step 1 of 1 lands exactly halfway → mid grey.
    const samples = sampleGradient([stop(0, 1, 1, 1), stop(1, 0, 0, 0)], 1);
    expect(samples).toHaveLength(3);
    expect(samples[2]!.r).toBeCloseTo(0.5, 6);
  });

  it('sorts stops by position, so authoring order cannot flip the ends', () => {
    const forwards = sampleGradient([stop(0, 1, 1, 1), stop(1, 0, 0, 0)], 4);
    const backwards = sampleGradient([stop(1, 0, 0, 0), stop(0, 1, 1, 1)], 4);
    expect(backwards).toEqual(forwards);
  });

  it('interpolates alpha too — a fading gradient is not treated as opaque', () => {
    const samples = sampleGradient([stop(0, 0, 0, 0, 1), stop(1, 0, 0, 0, 0)], 1);
    expect(samples[2]!.a).toBeCloseTo(0.5, 6);
  });

  it('gridSteps 0 returns exactly the authored stops', () => {
    expect(sampleGradient([stop(0, 1, 1, 1), stop(1, 0, 0, 0)], 0)).toHaveLength(2);
  });
});

describe('resolveBackdrop — non-text nodes', () => {
  it('a node with no bounds cannot be measured', () => {
    const r = node({ type: 'RECTANGLE', name: 'ghost', fills: [] });
    page([r]);
    const result = resolveBackdrop(r);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: 'unresolved-background' });
    expect((result as { detail: string }).detail).toContain('bounding box');
  });

  it('resolves straight to the page background when nothing sits between', () => {
    const r = rect();
    page([r]);
    const result = resolveBackdrop(r);
    expect(result.ok).toBe(true);
    expect((result as { bgs: unknown[] }).bgs).toEqual([{ r: 1, g: 1, b: 1, a: 1 }]);
  });

  it('an unpainted page leaves the backdrop transparent → unresolved', () => {
    const r = rect();
    page([r], []);
    const result = resolveBackdrop(r);
    expect(result).toMatchObject({ ok: false, reason: 'unresolved-background' });
    expect((result as { detail: string }).detail).toContain('never becomes opaque');
  });

  it('composites a translucent ancestor fill over the page', () => {
    const r = rect();
    page([
      node({
        type: 'FRAME',
        fills: [solid(BLACK, { opacity: 0.5 })],
        absoluteBoundingBox: box(0, 0, 200, 200),
        children: [r],
      }),
    ]);
    const result = resolveBackdrop(r);
    expect(result.ok).toBe(true);
    const bg = (result as { bgs: { r: number; a: number }[] }).bgs[0]!;
    expect(bg.r).toBeCloseTo(0.5, 6);
    expect(bg.a).toBe(1);
  });

  it('an ancestor blend mode is honest uncertainty, not a guess', () => {
    const r = rect();
    page([
      node({
        type: 'FRAME',
        name: 'Multiplied',
        blendMode: 'MULTIPLY',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 200),
        children: [r],
      }),
    ]);
    const result = resolveBackdrop(r);
    expect(result).toMatchObject({ ok: false, reason: 'blend-mode' });
    expect((result as { detail: string }).detail).toContain('MULTIPLY');
  });

  it('an image fill behind the node degrades to image-fill', () => {
    const r = rect();
    page([
      node({
        type: 'FRAME',
        fills: [{ type: 'IMAGE' }],
        absoluteBoundingBox: box(0, 0, 200, 200),
        children: [r],
      }),
    ]);
    expect(resolveBackdrop(r)).toMatchObject({ ok: false, reason: 'image-fill' });
  });

  it('a gradient behind the node becomes many samples, all of them opaque', () => {
    const r = rect();
    page([
      node({
        type: 'FRAME',
        fills: [
          {
            type: 'GRADIENT_LINEAR',
            gradientStops: [stop(0, 1, 1, 1), stop(1, 0, 0, 0)],
          },
        ],
        absoluteBoundingBox: box(0, 0, 200, 200),
        children: [r],
      }),
    ]);
    const result = resolveBackdrop(r);
    expect(result.ok).toBe(true);
    const bgs = (result as { bgs: { a: number }[] }).bgs;
    expect(bgs).toHaveLength(26); // 2 stops + 24 grid samples
    expect(bgs.every((b) => b.a === 1)).toBe(true);
  });

  it('an opaque layer truncates the stack — a gradient deeper down is invisible', () => {
    const r = rect();
    const card = node({
      type: 'FRAME',
      name: 'card',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(0, 0, 100, 100),
      children: [r],
    });
    page([
      node({
        type: 'FRAME',
        fills: [
          { type: 'GRADIENT_LINEAR', gradientStops: [stop(0, 1, 1, 1), stop(1, 0, 0, 0)] },
        ],
        absoluteBoundingBox: box(0, 0, 200, 200),
        children: [card],
      }),
    ]);
    const result = resolveBackdrop(r);
    expect(result.ok).toBe(true);
    expect((result as { bgs: unknown[] }).bgs).toEqual([{ r: 1, g: 1, b: 1, a: 1 }]);
  });

  it('a z-lower sibling that covers the node wins over the frame fill', () => {
    const r = rect();
    const cover = node({
      type: 'RECTANGLE',
      fills: [solid(BLACK)],
      absoluteBoundingBox: box(0, 0, 200, 200),
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 200),
        children: [cover, r], // cover renders behind r
      }),
    ]);
    const result = resolveBackdrop(r);
    expect((result as { bgs: unknown[] }).bgs).toEqual([{ r: 0, g: 0, b: 0, a: 1 }]);
  });
});
