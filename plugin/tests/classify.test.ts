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

  it('text without fills is skipped (not rendered)', () => {
    const t = text({ fills: [] });
    onWhite(t);
    expect(classifyTextNode(t, AA).kind).toBe('skip');
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

  it('gradient behind text → needsReview, never a violation (F8)', () => {
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
