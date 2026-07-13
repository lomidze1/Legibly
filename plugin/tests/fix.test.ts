/**
 * Phase 6/8 verify: fix engine (F11–F14, D8).
 * The core invariant (NF1): no plan ever endorses a candidate that fails
 * the same deterministic check — including a 500-case property sweep.
 */
import { describe, expect, it } from 'vitest';
import { minimalContrastFix, planFix, rampPrefix, hexToRgba, rgbaToHex } from '../src/shared/fix';
import { wcagRatio } from '../src/shared/contrast';
import type { Finding, Settings, TokenCandidate } from '../src/shared/types';
import { prng, rgba } from './helpers';

const AA: Settings = { level: 'AA', strictMode: false };
const STRICT: Settings = { level: 'AA', strictMode: true };

const WHITE = rgba(1, 1, 1);

function violation(fg: ReturnType<typeof rgba>, bg: ReturnType<typeof rgba>, required = 4.5, currentTokenName?: string): Finding {
  return {
    nodeId: 'node-1',
    nodeName: 'Body copy',
    tier: 'violation',
    sc: '1.4.3',
    fg,
    bg,
    ratio: wcagRatio(fg, bg),
    requiredRatio: required,
    detail: '',
    currentTokenName,
  };
}

const token = (id: string, name: string, c: ReturnType<typeof rgba>): TokenCandidate => ({
  id,
  kind: 'variable',
  name,
  color: c,
});

describe('rampPrefix', () => {
  it('splits slash ramps', () => expect(rampPrefix('text/muted')).toBe('text'));
  it('splits dash ramps', () => expect(rampPrefix('gray-600')).toBe('gray'));
  it('splits dotted ramps', () => expect(rampPrefix('fg.default')).toBe('fg'));
  it('keeps nested prefixes', () => expect(rampPrefix('color/gray/600')).toBe('color/gray'));
  it('returns null for single-segment names', () => expect(rampPrefix('primary')).toBeNull());
});

describe('hex round-trip', () => {
  it('rgbaToHex(hexToRgba(x)) is identity', () => {
    for (const h of ['#000000', '#ffffff', '#777777', '#0d66d0', '#ab34f2']) {
      expect(rgbaToHex(hexToRgba(h))).toBe(h);
    }
  });
});

describe('minimalContrastFix — binary search on OKLCH lightness', () => {
  it('returns a passing color for a failing gray on white', () => {
    const fg = hexToRgba('#777777'); // 4.48:1 on white
    const fixed = minimalContrastFix(fg, WHITE, 4.5);
    expect(fixed).not.toBeNull();
    expect(wcagRatio(fixed!, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it('change is minimal — the result does not overshoot far past the target', () => {
    const fg = hexToRgba('#777777');
    const fixed = minimalContrastFix(fg, WHITE, 4.5)!;
    expect(wcagRatio(fixed, WHITE)).toBeLessThan(4.75);
  });

  it('preserves hue: a failing blue stays blue', () => {
    const fg = hexToRgba('#7a9fe8'); // light blue, fails on white
    const fixed = minimalContrastFix(fg, WHITE, 4.5)!;
    expect(wcagRatio(fixed, WHITE)).toBeGreaterThanOrEqual(4.5);
    // blue channel remains dominant
    expect(fixed.b).toBeGreaterThan(fixed.r);
  });

  it('darkens on light backgrounds, lightens on dark backgrounds', () => {
    const fgLight = minimalContrastFix(hexToRgba('#999999'), WHITE, 4.5)!;
    expect(fgLight.r).toBeLessThan(0x99 / 255);
    const fgDark = minimalContrastFix(hexToRgba('#555555'), rgba(0, 0, 0), 4.5)!;
    expect(fgDark.r).toBeGreaterThan(0x55 / 255);
  });

  it('returns null when the target is unreachable (mid-gray bg, AAA 7:1)', () => {
    const midGray = rgba(0.5, 0.5, 0.5); // neither black nor white reaches 7:1
    expect(minimalContrastFix(hexToRgba('#777777'), midGray, 7)).toBeNull();
  });
});

describe('planFix — resolution order (F13)', () => {
  it('prefers a same-ramp token when the current token name is known', () => {
    const f = violation(hexToRgba('#777777'), WHITE, 4.5, 'text/muted');
    const tokens = [
      token('t1', 'text/strong', hexToRgba('#333333')), // same ramp, passes
      token('t2', 'ink/black', hexToRgba('#000000')), // passes but other ramp
    ];
    const plan = planFix(f, tokens, AA, f.currentTokenName);
    expect(plan.status).toBe('fixable');
    expect(plan.candidate!.token!.id).toBe('t1');
    expect(plan.candidate!.strategy).toBe('same-ramp');
  });

  it('hue-compatible token beats a cross-hue token (brand preservation, RM2)', () => {
    const fg = hexToRgba('#7a9fe8'); // light blue on white — fails
    const f = violation(fg, WHITE);
    const tokens = [
      token('red', 'accent/red', hexToRgba('#8b1a1a')), // passes, wrong hue
      token('blue', 'brand/blue-700', hexToRgba('#1d4ed8')), // passes, same hue
    ];
    const plan = planFix(f, tokens, AA);
    expect(plan.status).toBe('fixable');
    expect(plan.candidate!.token!.id).toBe('blue');
    expect(plan.candidate!.strategy).toBe('nearest-token');
  });

  it('falls back to any passing token when hue-compatible ones are absent', () => {
    const fg = hexToRgba('#7a9fe8'); // blue
    const f = violation(fg, WHITE);
    const tokens = [token('red', 'accent/red', hexToRgba('#8b1a1a'))];
    const plan = planFix(f, tokens, AA);
    expect(plan.status).toBe('fixable');
    expect(plan.candidate!.token!.id).toBe('red');
    expect(plan.candidate!.strategy).toBe('any-token');
  });

  it('never selects a failing token even if it is the perceptual nearest', () => {
    const fg = hexToRgba('#777777');
    const f = violation(fg, WHITE);
    const tokens = [
      token('near-fail', 'gray/500', hexToRgba('#7a7a7a')), // nearest but fails
      token('far-pass', 'gray/900', hexToRgba('#111111')), // passes
    ];
    const plan = planFix(f, tokens, AA);
    expect(plan.status).toBe('fixable');
    expect(plan.candidate!.token!.id).toBe('far-pass');
    expect(plan.candidate!.verifiedRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('proposes a minimal new token when no on-system token passes (D8)', () => {
    const f = violation(hexToRgba('#777777'), WHITE);
    const tokens = [token('bad', 'gray/300', hexToRgba('#cccccc'))]; // fails
    const plan = planFix(f, tokens, AA);
    expect(plan.status).toBe('needs-proposal');
    expect(plan.proposal!.strategy).toBe('new-token-proposal');
    expect(plan.proposal!.verifiedRatio).toBeGreaterThanOrEqual(4.5);
    expect(wcagRatio(plan.proposal!.proposedColor!, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it('strict mode forbids proposals → unfixable/escalate (F14)', () => {
    const f = violation(hexToRgba('#777777'), WHITE);
    const plan = planFix(f, [], STRICT);
    expect(plan.status).toBe('unfixable');
    expect(plan.proposal).toBeUndefined();
  });

  it('unreachable targets escalate even without strict mode', () => {
    const midGray = rgba(0.5, 0.5, 0.5);
    const f = violation(hexToRgba('#777777'), midGray, 7);
    const plan = planFix(f, [], AA);
    expect(plan.status).toBe('unfixable');
  });

  it('non-violation findings are not planned', () => {
    const f: Finding = {
      nodeId: 'n',
      nodeName: 'n',
      tier: 'needsReview',
      sc: '1.4.3',
      detail: '',
    };
    expect(planFix(f, [], AA).status).toBe('unfixable');
  });
});

describe('planFix — property sweep: a committed candidate NEVER fails (NF1)', () => {
  it('500 random violations across random palettes', () => {
    const rand = prng(20260713);
    const targets = [3, 4.5, 7];
    let fixable = 0;
    let proposals = 0;
    for (let i = 0; i < 500; i++) {
      const fg = rgba(rand(), rand(), rand());
      const bg = rgba(rand(), rand(), rand());
      const required = targets[Math.floor(rand() * targets.length)]!;
      if (wcagRatio(fg, bg) >= required) continue; // only violations are planned
      const paletteSize = Math.floor(rand() * 8);
      const tokens: TokenCandidate[] = Array.from({ length: paletteSize }, (_, j) =>
        token(`t${j}`, `ramp${j % 3}/step${j}`, rgba(rand(), rand(), rand()))
      );
      const strict = rand() < 0.3;
      const plan = planFix(violation(fg, bg, required), tokens, { level: 'AA', strictMode: strict });

      if (plan.status === 'fixable') {
        fixable++;
        // THE invariant: re-measure with the same check.
        expect(wcagRatio(plan.candidate!.token!.color, bg)).toBeGreaterThanOrEqual(required);
        expect(plan.candidate!.verifiedRatio).toBeGreaterThanOrEqual(required);
      } else if (plan.status === 'needs-proposal') {
        proposals++;
        expect(strict).toBe(false); // strict mode never proposes
        expect(wcagRatio(plan.proposal!.proposedColor!, bg)).toBeGreaterThanOrEqual(required);
      }
    }
    // sanity: the sweep actually exercised both paths
    expect(fixable).toBeGreaterThan(20);
    expect(proposals).toBeGreaterThan(20);
  });
});
