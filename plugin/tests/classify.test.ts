/**
 * Phase 4 verify: 3-tier classification (F5, F7, F8).
 * The zero-false-positive property: `violation` only on certain math.
 */
import { describe, expect, it } from 'vitest';
import { classifyTextNode } from '../src/shared/classify';
import type { Settings } from '../src/shared/types';
import { GRAY_77, GRAY_76, WHITE, box, node, page, solid, text } from './helpers';

const AA: Settings = { level: 'AA', strictMode: false };
const AAA: Settings = { level: 'AAA', strictMode: false };

function onWhite(t: ReturnType<typeof text>): void {
  page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 400, 200), children: [t] })]);
}

describe('classifyTextNode — verdicts', () => {
  it('#767676 16px on white passes AA', () => {
    const t = text({ fills: [solid(GRAY_76)] });
    onWhite(t);
    const r = classifyTextNode(t, AA);
    expect(r.kind).toBe('pass');
  });

  it('#777777 16px on white is a certain violation at AA (4.48 < 4.5)', () => {
    const t = text({ fills: [solid(GRAY_77)] });
    onWhite(t);
    const r = classifyTextNode(t, AA);
    expect(r.kind).toBe('finding');
    if (r.kind === 'finding') {
      expect(r.finding.tier).toBe('violation');
      expect(r.finding.sc).toBe('1.4.3');
      expect(r.finding.ratio).toBeCloseTo(4.48, 2);
      expect(r.finding.requiredRatio).toBe(4.5);
      expect(r.finding.isLargeText).toBe(false);
      expect(typeof r.finding.apcaLc).toBe('number');
    }
  });

  it('#777777 at 24px passes AA (large text needs only 3:1)', () => {
    const t = text({ fills: [solid(GRAY_77)], fontSize: 24 });
    onWhite(t);
    expect(classifyTextNode(t, AA).kind).toBe('pass');
  });

  it('#777777 at 18.66px bold passes AA (large-text bold rule)', () => {
    const t = text({ fills: [solid(GRAY_77)], fontSize: 18.66, fontWeight: 700 });
    onWhite(t);
    expect(classifyTextNode(t, AA).kind).toBe('pass');
  });

  it('#767676 on white FAILS AAA (4.54 < 7)', () => {
    const t = text({ fills: [solid(GRAY_76)] });
    onWhite(t);
    const r = classifyTextNode(t, AAA);
    expect(r.kind).toBe('finding');
    if (r.kind === 'finding') {
      expect(r.finding.tier).toBe('violation');
      expect(r.finding.requiredRatio).toBe(7);
    }
  });

  it('empty text is skipped', () => {
    const t = text({ characters: '   ' });
    onWhite(t);
    expect(classifyTextNode(t, AA).kind).toBe('skip');
  });

  it('text without fills → needsReview invisible-text (import artifact)', () => {
    const t = text({ fills: [] });
    onWhite(t);
    const r = classifyTextNode(t, AA);
    expect(r.kind).toBe('finding');
    if (r.kind === 'finding') {
      expect(r.finding.tier).toBe('needsReview');
      expect(r.finding.reason).toBe('invisible-text');
    }
  });

  it('text with a 0%-opacity fill → needsReview invisible-text', () => {
    const t = text({ fills: [solid(GRAY_77, { opacity: 0 })] });
    onWhite(t);
    const r = classifyTextNode(t, AA);
    expect(r.kind).toBe('finding');
    if (r.kind === 'finding') expect(r.finding.reason).toBe('invisible-text');
  });

  it('mixed font size → needsReview, never a violation (F8)', () => {
    const t = text({ fills: [solid(GRAY_77)], fontSize: Symbol('mixed') as unknown as never });
    onWhite(t);
    const r = classifyTextNode(t, AA);
    expect(r.kind).toBe('finding');
    if (r.kind === 'finding') {
      expect(r.finding.tier).toBe('needsReview');
      expect(r.finding.reason).toBe('mixed-text-properties');
    }
  });

  it('gradient WITHOUT stop data → needsReview, never a violation (F8)', () => {
    const t = text({ fills: [solid(GRAY_77)] });
    page([
      node({
        type: 'FRAME',
        fills: [{ type: 'GRADIENT_LINEAR' }],
        absoluteBoundingBox: box(0, 0, 400, 200),
        children: [t],
      }),
    ]);
    const r = classifyTextNode(t, AA);
    expect(r.kind).toBe('finding');
    if (r.kind === 'finding') expect(r.finding.tier).toBe('needsReview');
  });
});

describe('classifyTextNode — gradients decided by sampling', () => {
  const stops = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => [
    { position: 0, color: { ...a, a: 1 } },
    { position: 1, color: { ...b, a: 1 } },
  ];

  function onGradient(t: ReturnType<typeof text>, from: { r: number; g: number; b: number }, to: { r: number; g: number; b: number }) {
    page([
      node({
        type: 'FRAME',
        fills: [{ type: 'GRADIENT_LINEAR', gradientStops: stops(from, to) }],
        absoluteBoundingBox: box(0, 0, 400, 200),
        children: [t],
      }),
    ]);
  }

  it('PASSES when every spot of the gradient passes (black on white→#eee)', () => {
    const t = text({ fills: [solid({ r: 0, g: 0, b: 0 })] });
    onGradient(t, WHITE, { r: 0.93, g: 0.93, b: 0.93 });
    expect(classifyTextNode(t, AA).kind).toBe('pass');
  });

  it('VIOLATION when every spot fails (#777 on white→#f0f0f0), with range detail', () => {
    const t = text({ fills: [solid(GRAY_77)] });
    onGradient(t, WHITE, { r: 0.94, g: 0.94, b: 0.94 });
    const r = classifyTextNode(t, AA);
    expect(r.kind).toBe('finding');
    if (r.kind === 'finding') {
      expect(r.finding.tier).toBe('violation');
      expect(r.finding.bgSamples!.length).toBeGreaterThan(2);
      expect(r.finding.detail).toContain('across the gradient');
    }
  });

  it('needsReview gradient-range when the gradient straddles the threshold', () => {
    const t = text({ fills: [solid(GRAY_77)] }); // 4.48 on white (fail), 4.69 on black (pass)
    onGradient(t, WHITE, { r: 0, g: 0, b: 0 });
    const r = classifyTextNode(t, AA);
    expect(r.kind).toBe('finding');
    if (r.kind === 'finding') {
      expect(r.finding.tier).toBe('needsReview');
      expect(r.finding.reason).toBe('gradient-range');
      expect(r.finding.detail).toMatch(/varies from .* to .*/);
    }
  });

  it('semi-transparent solid button over a gradient still resolves (the "My User" case)', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20), fills: [solid({ r: 0, g: 0, b: 0 })] });
    const button = node({
      type: 'FRAME',
      fills: [solid({ r: 0.05, g: 0.05, b: 0.07 }, { opacity: 0.08 })],
      absoluteBoundingBox: box(10, 10, 100, 50),
      children: [],
    });
    page([
      node({
        type: 'FRAME',
        fills: [{ type: 'GRADIENT_LINEAR', gradientStops: stops(WHITE, { r: 0.9, g: 0.92, b: 0.98 }) }],
        absoluteBoundingBox: box(0, 0, 400, 200),
        children: [button, t],
      }),
    ]);
    // black text over a light gradient seen through an 8% dark veil → passes everywhere
    expect(classifyTextNode(t, AA).kind).toBe('pass');
  });
});
