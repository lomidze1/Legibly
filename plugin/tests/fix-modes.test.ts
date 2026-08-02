/**
 * Verify: a fix must clear EVERY variable mode, not just the one on screen.
 * This is the trust rule that makes dark-mode findings fixable at all — a
 * candidate that repairs Light and breaks Dark must never be offered.
 */
import { describe, expect, it } from 'vitest';
import { colorInMode, contextsOf, planFix } from '../src/shared/fix';
import { attachModeColors, ModeProjection } from '../src/main/modes';
import type { Finding, Settings, TokenCandidate } from '../src/shared/types';
import { rgba } from './helpers';

const AA: Settings = { level: 'AA', strictMode: false, targetFloor: 24 };
const STRICT: Settings = { ...AA, strictMode: true };
const DARK = 'theme:dark';

/** Text on white in the visible mode, on near-black in the dark mode. */
const finding = (over: Partial<Finding> = {}): Finding => ({
  nodeId: 'n1',
  nodeName: 'label',
  tier: 'violation',
  sc: '1.4.3',
  fg: rgba(0.55, 0.55, 0.55),
  bg: rgba(1, 1, 1),
  ratio: 3.5,
  requiredRatio: 4.5,
  detail: '',
  bgByMode: {
    '': [rgba(1, 1, 1)],
    [DARK]: [rgba(0.05, 0.05, 0.05)],
  },
  ...over,
});

/** A variable that flips with the theme. */
const themed = (id: string, name: string, light: TokenCandidate['color'], dark: TokenCandidate['color']): TokenCandidate => ({
  id,
  kind: 'variable',
  name,
  color: light,
  colorsByMode: { [DARK]: dark },
});

describe('contextsOf', () => {
  it('returns one context per mode when the file is themed', () => {
    expect(contextsOf(finding()).map((c) => c.mode).sort()).toEqual(['', DARK]);
  });

  it('falls back to the single measured situation on an unthemed file', () => {
    const contexts = contextsOf(finding({ bgByMode: undefined }));
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.mode).toBe('');
  });

  it('keeps gradient samples as several backgrounds in one context', () => {
    const contexts = contextsOf(
      finding({ bgByMode: undefined, bgSamples: [rgba(1, 1, 1), rgba(0.9, 0.9, 0.9)] })
    );
    expect(contexts[0]!.bgs).toHaveLength(2);
  });
});

describe('colorInMode', () => {
  it('uses the token’s value for that mode, and its only value otherwise', () => {
    const t = themed('v1', 'text/body', rgba(0, 0, 0), rgba(1, 1, 1));
    expect(colorInMode(t, DARK)).toMatchObject({ r: 1 });
    expect(colorInMode(t, '')).toMatchObject({ r: 0 });
    expect(colorInMode({ ...t, colorsByMode: undefined }, DARK)).toMatchObject({ r: 0 });
  });
});

describe('planFix across modes', () => {
  it('rejects a token that fixes the visible mode but fails the dark one', () => {
    // Near-black: 18:1 on white, but 1.1:1 on the dark surface.
    const trap = themed('v1', 'text/ink', rgba(0, 0, 0), rgba(0.1, 0.1, 0.1));
    const plan = planFix(finding(), [trap], STRICT);
    expect(plan.status).toBe('unfixable');
  });

  it('accepts a token that flips with the theme and clears both', () => {
    const good = themed('v2', 'text/primary', rgba(0, 0, 0), rgba(1, 1, 1));
    const plan = planFix(finding(), [good], STRICT);
    expect(plan.status).toBe('fixable');
    expect(plan.candidate!.token!.name).toBe('text/primary');
    // The reported ratio is the WORST across modes, not the flattering one.
    expect(plan.candidate!.verifiedRatio).toBeLessThan(21);
    expect(plan.candidate!.verifiedRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('picks the theme-aware token over a fixed one that only suits light', () => {
    const trap = themed('v1', 'text/ink', rgba(0, 0, 0), rgba(0.1, 0.1, 0.1));
    const good = themed('v2', 'text/primary', rgba(0, 0, 0), rgba(1, 1, 1));
    const plan = planFix(finding(), [trap, good], STRICT);
    expect(plan.candidate!.token!.id).toBe('v2');
  });

  it('proposes a single colour only when it clears every mode', () => {
    // Mid-grey backgrounds in opposite directions: no one literal colour works.
    const impossible = finding({
      bgByMode: { '': [rgba(0.5, 0.5, 0.5)], [DARK]: [rgba(0.45, 0.45, 0.45)] },
    });
    expect(planFix(impossible, [], AA).status).toBe('unfixable');
  });

  it('still plans normally on an unthemed file', () => {
    const plain = finding({ bgByMode: undefined });
    const black: TokenCandidate = { id: 'v3', kind: 'variable', name: 'ink', color: rgba(0, 0, 0) };
    const plan = planFix(plain, [black], STRICT);
    expect(plan.status).toBe('fixable');
  });
});

describe('attachModeColors', () => {
  const projection: ModeProjection = {
    key: DARK,
    label: 'Theme · Dark',
    collectionId: 'theme',
    modeId: 'dark',
    colors: new Map([['v1', rgba(1, 1, 1)]]),
  };

  it('gives a variable its value in each swept mode', () => {
    const [token] = attachModeColors(
      [{ id: 'v1', kind: 'variable', name: 'text/body', color: rgba(0, 0, 0) }],
      [projection]
    );
    expect(token!.colorsByMode![DARK]).toMatchObject({ r: 1, g: 1, b: 1 });
  });

  it('keeps paint styles constant — they do not vary by mode', () => {
    const [token] = attachModeColors(
      [{ id: 'v1', kind: 'style', name: 'Brand/Ink', color: rgba(0, 0, 0) }],
      [projection]
    );
    expect(token!.colorsByMode![DARK]).toMatchObject({ r: 0, g: 0, b: 0 });
  });

  it('leaves tokens untouched when the file has no modes', () => {
    const tokens: TokenCandidate[] = [{ id: 'v1', kind: 'variable', name: 'x', color: rgba(0, 0, 0) }];
    expect(attachModeColors(tokens, [])[0]!.colorsByMode).toBeUndefined();
  });
});
