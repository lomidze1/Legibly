/**
 * The structural primitives every detector stands on (C1): paint predicates
 * and the two geometry tests. `contains` decides "one background or two"
 * (partial-overlap), `intersects` decides "does this layer touch the text at
 * all" — an inclusive/exclusive slip in either silently changes a verdict.
 */
import { describe, expect, it } from 'vitest';
import {
  contains,
  intersects,
  isGradientPaint,
  isMixed,
  isPaintArray,
  isSolidPaint,
} from '../src/shared/figma-lite';
import { box, solid, WHITE } from './helpers';

const gradient = (type = 'GRADIENT_LINEAR') => ({ type }) as never;

describe('paint predicates', () => {
  it('isSolidPaint is true only for SOLID', () => {
    expect(isSolidPaint(solid(WHITE))).toBe(true);
    expect(isSolidPaint(gradient())).toBe(false);
    expect(isSolidPaint({ type: 'IMAGE' } as never)).toBe(false);
  });

  it('isGradientPaint covers every gradient flavour Figma ships', () => {
    for (const type of ['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND']) {
      expect(isGradientPaint(gradient(type))).toBe(true);
    }
    expect(isGradientPaint({ type: 'IMAGE' } as never)).toBe(false);
    expect(isGradientPaint(solid(WHITE))).toBe(false);
  });

  it('isMixed recognises the figma.mixed sentinel and nothing else', () => {
    expect(isMixed(Symbol('figma.mixed'))).toBe(true);
    expect(isMixed(undefined)).toBe(false);
    expect(isMixed(null)).toBe(false);
    expect(isMixed([])).toBe(false);
    expect(isMixed('mixed')).toBe(false);
  });

  it('isPaintArray accepts an empty stack but never a sentinel', () => {
    expect(isPaintArray([])).toBe(true);
    expect(isPaintArray([solid(WHITE)])).toBe(true);
    expect(isPaintArray(undefined)).toBe(false);
    expect(isPaintArray(Symbol('figma.mixed'))).toBe(false);
    expect(isPaintArray({ 0: solid(WHITE), length: 1 })).toBe(false);
  });
});

describe('contains — the "one background" test', () => {
  const outer = box(0, 0, 100, 100);

  it('a rect contains itself (flush edges still count as covered)', () => {
    expect(contains(outer, box(0, 0, 100, 100))).toBe(true);
  });

  it('contains a strictly inner rect', () => {
    expect(contains(outer, box(10, 10, 50, 50))).toBe(true);
  });

  it('fails by one pixel on each side independently', () => {
    expect(contains(outer, box(-1, 0, 100, 100))).toBe(false); // left
    expect(contains(outer, box(0, -1, 100, 100))).toBe(false); // top
    expect(contains(outer, box(0, 0, 101, 100))).toBe(false); // right
    expect(contains(outer, box(0, 0, 100, 101))).toBe(false); // bottom
  });

  it('is not symmetric — the bigger rect is the container', () => {
    const inner = box(10, 10, 10, 10);
    expect(contains(outer, inner)).toBe(true);
    expect(contains(inner, outer)).toBe(false);
  });
});

describe('intersects — the "does it touch the text" test', () => {
  const a = box(0, 0, 10, 10);

  it('overlapping rects intersect', () => {
    expect(intersects(a, box(5, 5, 10, 10))).toBe(true);
    expect(intersects(box(5, 5, 10, 10), a)).toBe(true); // symmetric
  });

  it('rects that only share an edge do NOT intersect', () => {
    expect(intersects(a, box(10, 0, 10, 10))).toBe(false); // right edge
    expect(intersects(a, box(0, 10, 10, 10))).toBe(false); // bottom edge
    expect(intersects(a, box(-10, 0, 10, 10))).toBe(false); // left edge
  });

  it('disjoint rects do not intersect', () => {
    expect(intersects(a, box(50, 50, 10, 10))).toBe(false);
  });

  it('a fully contained rect also intersects', () => {
    expect(intersects(a, box(2, 2, 3, 3))).toBe(true);
  });

  it('a zero-area rect on the boundary does not intersect', () => {
    expect(intersects(a, box(10, 10, 0, 0))).toBe(false);
  });
});
