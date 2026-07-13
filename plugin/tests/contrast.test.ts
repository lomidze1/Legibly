/**
 * Phase 2 verify: contrast math matches W3C/WebAIM reference values (F5, F9).
 */
import { describe, expect, it } from 'vitest';
import {
  compositeOver,
  flattenStack,
  isLargeText,
  passesContrast,
  requiredRatio,
  wcagRatio,
} from '../src/shared/contrast';
import { rgba, WHITE, BLACK, GRAY_76, GRAY_77 } from './helpers';

const opaque = (c: { r: number; g: number; b: number }) => rgba(c.r, c.g, c.b, 1);

describe('wcagRatio — known W3C/WebAIM reference values', () => {
  it('black on white = 21:1', () => {
    expect(wcagRatio(opaque(BLACK), opaque(WHITE))).toBeCloseTo(21, 2);
  });
  it('white on white = 1:1', () => {
    expect(wcagRatio(opaque(WHITE), opaque(WHITE))).toBeCloseTo(1, 3);
  });
  it('is symmetric', () => {
    const a = rgba(0.2, 0.4, 0.6);
    const b = rgba(0.9, 0.9, 0.8);
    expect(wcagRatio(a, b)).toBeCloseTo(wcagRatio(b, a), 6);
  });
  it('#767676 on white = 4.54:1 (the canonical AA-passing gray)', () => {
    expect(wcagRatio(opaque(GRAY_76), opaque(WHITE))).toBeCloseTo(4.54, 2);
  });
  it('#777777 on white = 4.48:1 (the canonical AA-failing gray)', () => {
    expect(wcagRatio(opaque(GRAY_77), opaque(WHITE))).toBeCloseTo(4.48, 2);
  });
  it('pure red on white = 4.00:1', () => {
    expect(wcagRatio(rgba(1, 0, 0), opaque(WHITE))).toBeCloseTo(4.0, 2);
  });
  it('pure blue on white = 8.59:1', () => {
    expect(wcagRatio(rgba(0, 0, 1), opaque(WHITE))).toBeCloseTo(8.59, 2);
  });
  it('translucent fg is composited over bg first (50% black on white ≈ #808080)', () => {
    const r = wcagRatio(rgba(0, 0, 0, 0.5), opaque(WHITE));
    expect(r).toBeCloseTo(wcagRatio(rgba(0.5, 0.5, 0.5), opaque(WHITE)), 4);
  });
});

describe('compositeOver / flattenStack', () => {
  it('opaque top wins entirely', () => {
    expect(compositeOver(rgba(1, 0, 0), rgba(0, 1, 0))).toEqual(rgba(1, 0, 0));
  });
  it('50% black over white = mid gray', () => {
    const r = compositeOver(rgba(0, 0, 0, 0.5), rgba(1, 1, 1));
    expect(r.r).toBeCloseTo(0.5, 6);
    expect(r.a).toBe(1);
  });
  it('two 50% layers accumulate alpha (0.75)', () => {
    const r = compositeOver(rgba(0, 0, 0, 0.5), rgba(1, 1, 1, 0.5));
    expect(r.a).toBeCloseTo(0.75, 6);
  });
  it('flattenStack composites bottom-first', () => {
    // white bottom, then 50% black → gray
    const r = flattenStack([rgba(1, 1, 1), rgba(0, 0, 0, 0.5)]);
    expect(r.r).toBeCloseTo(0.5, 6);
  });
  it('flattenStack of empty stack is fully transparent', () => {
    expect(flattenStack([]).a).toBe(0);
  });
  it('zero-alpha layers contribute nothing', () => {
    const r = flattenStack([rgba(1, 1, 1), rgba(1, 0, 0, 0)]);
    expect(r.r).toBeCloseTo(1, 6);
  });
});

describe('isLargeText — WCAG large-text thresholds (F5)', () => {
  it('24px regular is large', () => expect(isLargeText(24, 400)).toBe(true));
  it('23.9px regular is NOT large', () => expect(isLargeText(23.9, 400)).toBe(false));
  it('18.66px bold (700) is large', () => expect(isLargeText(18.66, 700)).toBe(true));
  it('18.66px semibold (600) is NOT large', () => expect(isLargeText(18.66, 600)).toBe(false));
  it('18px bold is NOT large', () => expect(isLargeText(18, 700)).toBe(false));
  it('72px anything is large', () => expect(isLargeText(72, 100)).toBe(true));
});

describe('requiredRatio — AA/AAA gates (F23)', () => {
  it('AA normal = 4.5', () => expect(requiredRatio(false, 'AA')).toBe(4.5));
  it('AA large = 3', () => expect(requiredRatio(true, 'AA')).toBe(3));
  it('AAA normal = 7', () => expect(requiredRatio(false, 'AAA')).toBe(7));
  it('AAA large = 4.5', () => expect(requiredRatio(true, 'AAA')).toBe(4.5));
});

describe('passesContrast — the single judge (NF1)', () => {
  it('#767676 passes AA normal on white', () => {
    expect(passesContrast(opaque(GRAY_76), opaque(WHITE), 4.5)).toBe(true);
  });
  it('#777777 fails AA normal on white', () => {
    expect(passesContrast(opaque(GRAY_77), opaque(WHITE), 4.5)).toBe(false);
  });
  it('#777777 passes large-text 3:1 on white', () => {
    expect(passesContrast(opaque(GRAY_77), opaque(WHITE), 3)).toBe(true);
  });
});
