/**
 * The fix engine's building blocks that only ever ran through planFix:
 * the hue filter that keeps a fix recognisably the user's brand (RM2), the
 * worst-case ratio the verifier is built on, the hex round-trip the UI and
 * the proposal names depend on, and contextsOf's degenerate inputs.
 */
import { describe, expect, it } from 'vitest';
import { formatHex } from 'culori';
import {
  contextsOf,
  hexToRgba,
  hueCompatible,
  minRatioOver,
  rgbaToHex,
} from '../src/shared/fix';
import { wcagRatio } from '../src/shared/contrast';
import type { Finding } from '../src/shared/types';
import { rgba } from './helpers';

/** A colour at a chosen OKLCH hue, round-tripped through sRGB like a real fill. */
const atHue = (h: number) => hexToRgba(formatHex({ mode: 'oklch', l: 0.6, c: 0.12, h })!);

const violation = (extra: Partial<Finding>): Finding => ({
  nodeId: 'n1',
  nodeName: 'label',
  tier: 'violation',
  sc: '1.4.3',
  detail: '',
  ...extra,
});

describe('hueCompatible', () => {
  it('accepts two colours inside the tolerance and rejects a hue jump', () => {
    expect(hueCompatible(atHue(240), atHue(260), 30)).toBe(true);
    expect(hueCompatible(atHue(240), atHue(20), 30)).toBe(false);
  });

  it('wraps around 0°/360° instead of measuring the long way round', () => {
    expect(hueCompatible(atHue(350), atHue(10), 30)).toBe(true); // 20° apart
    expect(hueCompatible(atHue(350), atHue(45), 30)).toBe(false); // 55° apart
  });

  it('is symmetric', () => {
    expect(hueCompatible(atHue(120), atHue(150), 30)).toBe(
      hueCompatible(atHue(150), atHue(120), 30)
    );
  });

  it('widening the tolerance admits a pair it previously rejected', () => {
    expect(hueCompatible(atHue(200), atHue(250), 30)).toBe(false);
    expect(hueCompatible(atHue(200), atHue(250), 60)).toBe(true);
  });

  it('two near-greys are compatible with each other but not with a hue', () => {
    const grey = rgba(0.5, 0.5, 0.5);
    const darkGrey = rgba(0.2, 0.2, 0.2);
    expect(hueCompatible(grey, darkGrey, 30)).toBe(true);
    expect(hueCompatible(grey, atHue(240), 30)).toBe(false);
    expect(hueCompatible(atHue(240), grey, 30)).toBe(false);
  });
});

describe('minRatioOver — the worst-case judge', () => {
  const white = rgba(1, 1, 1);
  const black = rgba(0, 0, 0);

  it('matches wcagRatio for a single background', () => {
    expect(minRatioOver(black, [white])).toBeCloseTo(wcagRatio(black, white), 10);
  });

  it('reports the WORST background, not the average', () => {
    const mid = rgba(0.5, 0.5, 0.5);
    const worst = Math.min(wcagRatio(black, white), wcagRatio(black, mid));
    expect(minRatioOver(black, [white, mid])).toBeCloseTo(worst, 10);
    expect(minRatioOver(black, [mid, white])).toBeCloseTo(worst, 10); // order-independent
  });

  it('no backgrounds means nothing constrains the candidate', () => {
    expect(minRatioOver(black, [])).toBe(Infinity);
  });
});

describe('hex round-trip', () => {
  it('expands three-digit shorthand', () => {
    expect(hexToRgba('#fff')).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(hexToRgba('#000')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it('tolerates a missing leading hash', () => {
    expect(hexToRgba('336699')).toEqual(hexToRgba('#336699'));
  });

  it('clamps out-of-gamut channels instead of emitting a broken hex', () => {
    expect(rgbaToHex(rgba(-1, 0.5, 2))).toBe('#0080ff');
  });

  it('always emits two digits per channel', () => {
    expect(rgbaToHex(rgba(1 / 255, 1 / 255, 1 / 255))).toBe('#010101');
  });
});

describe('contextsOf — degenerate findings', () => {
  it('drops modes whose background list is empty', () => {
    const contexts = contextsOf(
      violation({ bgByMode: { '': [rgba(1, 1, 1)], 'theme:dark': [] } })
    );
    expect(contexts.map((c) => c.mode)).toEqual(['']);
  });

  it('falls back to the measured situation when every mode is empty', () => {
    const bg = rgba(1, 1, 1);
    const contexts = contextsOf(violation({ bg, bgByMode: { '': [], 'theme:dark': [] } }));
    expect(contexts).toEqual([{ mode: '', bgs: [bg] }]);
  });

  it('prefers gradient samples over the single representative background', () => {
    const bg = rgba(1, 1, 1);
    const samples = [rgba(1, 1, 1), rgba(0.9, 0.9, 0.9)];
    expect(contextsOf(violation({ bg, bgSamples: samples }))).toEqual([{ mode: '', bgs: samples }]);
  });

  it('a finding with no background at all yields one empty context', () => {
    expect(contextsOf(violation({}))).toEqual([{ mode: '', bgs: [] }]);
  });
});
