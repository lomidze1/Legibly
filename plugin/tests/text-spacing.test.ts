/**
 * v0.2 Phase A verify: SC 1.4.12 capability check — authored line-height
 * below the 1.5× floor → needsReview only (never a violation).
 */
import { describe, expect, it } from 'vitest';
import { checkTextSpacing, lineHeightRatio } from '../src/shared/text-spacing';
import { text } from './helpers';

describe('lineHeightRatio', () => {
  it('reads PERCENT line height', () => {
    expect(lineHeightRatio(text({ lineHeight: { unit: 'PERCENT', value: 150 } }))).toBe(1.5);
  });
  it('reads PIXELS relative to font size', () => {
    expect(lineHeightRatio(text({ fontSize: 16, lineHeight: { unit: 'PIXELS', value: 20 } }))).toBeCloseTo(1.25, 6);
  });
  it('AUTO is unknowable → null', () => {
    expect(lineHeightRatio(text({ lineHeight: { unit: 'AUTO' } }))).toBeNull();
  });
  it('missing line height → null', () => {
    expect(lineHeightRatio(text({}))).toBeNull();
  });
  it('mixed values → null', () => {
    expect(lineHeightRatio(text({ lineHeight: Symbol('mixed') as unknown as never }))).toBeNull();
  });
});

describe('checkTextSpacing — verdicts', () => {
  it('≥150% passes silently', () => {
    expect(checkTextSpacing(text({ lineHeight: { unit: 'PERCENT', value: 150 } }))).toBeNull();
  });

  it('below the floor → needsReview with ratio + fixable flag', () => {
    const f = checkTextSpacing(
      text({ fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, lineHeight: { unit: 'PIXELS', value: 19.2 } })
    );
    expect(f).not.toBeNull();
    expect(f!.tier).toBe('needsReview');
    expect(f!.sc).toBe('1.4.12');
    expect(f!.reason).toBe('line-height-floor');
    expect(f!.lineHeight).toMatchObject({ fixable: true });
    expect(f!.lineHeight!.ratio).toBeCloseTo(1.2, 6);
  });

  it('mixed font makes the one-click fix unavailable', () => {
    const f = checkTextSpacing(
      text({ fontName: Symbol('mixed') as unknown as never, lineHeight: { unit: 'PERCENT', value: 120 } })
    );
    expect(f!.lineHeight!.fixable).toBe(false);
  });

  it('AUTO line height is never flagged (would be noise)', () => {
    expect(checkTextSpacing(text({ lineHeight: { unit: 'AUTO' } }))).toBeNull();
  });

  it('empty text is skipped', () => {
    expect(checkTextSpacing(text({ characters: ' ', lineHeight: { unit: 'PERCENT', value: 100 } }))).toBeNull();
  });
});
