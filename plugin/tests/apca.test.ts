/**
 * APCA advisory readout (F9) — validated against the published apca-w3
 * 0.0.98G-4g reference values. Advisory only; never gates a verdict.
 */
import { describe, expect, it } from 'vitest';
import { apcaLc } from '../src/shared/apca';
import { rgba } from './helpers';

const hex = (h: string) => {
  const n = parseInt(h, 16);
  return rgba(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1);
};

describe('apcaLc — apca-w3 reference values', () => {
  it('#888 text on #fff bg ≈ 63.06', () => {
    expect(apcaLc(hex('888888'), hex('ffffff'))).toBeCloseTo(63.056, 1);
  });
  it('#fff text on #888 bg ≈ -68.54 (reverse polarity is negative)', () => {
    expect(apcaLc(hex('ffffff'), hex('888888'))).toBeCloseTo(-68.541, 1);
  });
  it('#000 text on #aaa bg ≈ 58.15', () => {
    expect(apcaLc(hex('000000'), hex('aaaaaa'))).toBeCloseTo(58.146, 1);
  });
  it('#aaa text on #000 bg ≈ -56.24', () => {
    expect(apcaLc(hex('aaaaaa'), hex('000000'))).toBeCloseTo(-56.241, 1);
  });
  it('identical colors → 0', () => {
    expect(apcaLc(hex('777777'), hex('777777'))).toBe(0);
  });
  it('near-identical colors clip to 0', () => {
    expect(apcaLc(rgba(0.5, 0.5, 0.5), rgba(0.502, 0.502, 0.502))).toBe(0);
  });
  it('translucent fg composites over bg first', () => {
    const direct = apcaLc(rgba(0.5, 0.5, 0.5), hex('ffffff'));
    const viaAlpha = apcaLc(rgba(0, 0, 0, 0.5), hex('ffffff'));
    expect(viaAlpha).toBeCloseTo(direct, 4);
  });
});
