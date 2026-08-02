/**
 * Wave 2 verify: SC 1.4.1 Use of Color — a colour-only run inside a paragraph
 * is flagged, and every non-colour cue silences it (needsReview only, never a
 * hard fail — detection research §2.4).
 */
import { describe, expect, it } from 'vitest';
import { checkUseOfColor, USE_OF_COLOR_SC } from '../src/shared/use-of-color';
import type { TextSegmentLite } from '../src/shared/figma-lite';
import { BLACK, node, solid } from './helpers';

const LINK_BLUE = { r: 0.1, g: 0.35, b: 0.9 };
const GRAY = { r: 0.45, g: 0.45, b: 0.45 };

const seg = (over: Partial<TextSegmentLite> & { characters: string }): TextSegmentLite => ({
  start: 0,
  end: over.characters.length,
  fills: [solid(BLACK)],
  textDecoration: 'NONE',
  fontSize: 16,
  fontWeight: 400,
  fontName: { family: 'Inter', style: 'Regular' },
  ...over,
});

/**
 * A TEXT node whose styled runs are the given segments. `fills` is the mixed
 * sentinel because that is what Figma reports for a multi-styled layer — and
 * what the check uses to skip the per-node run lookup on uniform text.
 */
const MIXED = Symbol('figma.mixed');

function textWithSegments(segments: TextSegmentLite[]) {
  return node({
    type: 'TEXT',
    characters: segments.map((s) => s.characters).join(''),
    fontSize: 16,
    fontWeight: 400,
    fills: MIXED,
    getStyledTextSegments: () => segments,
  });
}

const body = (characters: string, over: Partial<TextSegmentLite> = {}) =>
  seg({ characters, ...over });
const link = (characters: string, over: Partial<TextSegmentLite> = {}) =>
  seg({ characters, fills: [solid(LINK_BLUE)], start: 100, end: 100 + characters.length, ...over });

describe('checkUseOfColor — the failure it exists to catch', () => {
  it('flags a differently-coloured run with no other cue', () => {
    const finding = checkUseOfColor(
      textWithSegments([body('Read our full policy or '), link('contact support'), body(' today.')])
    );
    expect(finding).not.toBeNull();
    expect(finding!.sc).toBe(USE_OF_COLOR_SC);
    expect(finding!.tier).toBe('needsReview');
    expect(finding!.reason).toBe('color-only-signifier');
    expect(finding!.colorOnly!.excerpt).toBe('contact support');
    expect(finding!.colorOnly!.ranges).toEqual([{ start: 100, end: 115 }]);
  });

  it('never emits a violation — 1.4.1 intent is judgement', () => {
    const finding = checkUseOfColor(
      textWithSegments([body('Body copy here '), link('and a link')])
    );
    expect(finding!.tier).toBe('needsReview');
  });

  it('collects every colour-only run into one finding', () => {
    const finding = checkUseOfColor(
      textWithSegments([
        body('See '),
        link('terms', { start: 4, end: 9 }),
        body(' and '),
        link('privacy', { start: 14, end: 21 }),
      ])
    );
    expect(finding!.colorOnly!.ranges).toHaveLength(2);
    expect(finding!.detail).toContain('+1 more');
  });

  it('treats the longest-running colour as the body, not the first run', () => {
    const finding = checkUseOfColor(
      textWithSegments([
        link('Buy', { start: 0, end: 3 }),
        body(' now and save on every plan we offer this month'),
      ])
    );
    expect(finding!.colorOnly!.excerpt).toBe('Buy');
  });
});

describe('checkUseOfColor — a second cue silences it', () => {
  const cases: [string, Partial<TextSegmentLite>][] = [
    ['underline', { textDecoration: 'UNDERLINE' }],
    ['strikethrough', { textDecoration: 'STRIKETHROUGH' }],
    ['bolder weight', { fontWeight: 700 }],
    ['larger size', { fontSize: 20 }],
    ['italic style', { fontName: { family: 'Inter', style: 'Italic' } }],
  ];
  for (const [label, cue] of cases) {
    it(`stays silent when the run also has a ${label}`, () => {
      const finding = checkUseOfColor(
        textWithSegments([body('Read the '), link('policy', cue), body(' first.')])
      );
      expect(finding).toBeNull();
    });
  }

  it('stays silent for a tonal variant of the body colour (muted caption)', () => {
    const finding = checkUseOfColor(
      textWithSegments([body('Total due today '), link('incl. VAT', { fills: [solid(GRAY)] })])
    );
    expect(finding).toBeNull();
  });
});

describe('checkUseOfColor — quiet by default', () => {
  it('ignores single-run text', () => {
    expect(checkUseOfColor(textWithSegments([body('All one colour')]))).toBeNull();
  });

  it('ignores runs that are only whitespace', () => {
    const finding = checkUseOfColor(
      textWithSegments([body('Hello'), link('   ', { fills: [solid(LINK_BLUE)] })])
    );
    expect(finding).toBeNull();
  });

  it('ignores runs whose fill is not a measurable solid', () => {
    const finding = checkUseOfColor(
      textWithSegments([body('Hello '), link('world', { fills: [{ type: 'GRADIENT_LINEAR' }] })])
    );
    expect(finding).toBeNull();
  });

  it('ignores non-text nodes and nodes without run data', () => {
    expect(checkUseOfColor(node({ type: 'FRAME' }))).toBeNull();
    expect(checkUseOfColor(node({ type: 'TEXT', characters: 'x' }))).toBeNull();
  });

  it('skips the run lookup entirely when the layer has uniform fills', () => {
    let called = false;
    const uniform = node({
      type: 'TEXT',
      characters: 'All one colour',
      fills: [solid(BLACK)],
      getStyledTextSegments: () => {
        called = true;
        return [];
      },
    });
    expect(checkUseOfColor(uniform)).toBeNull();
    expect(called).toBe(false);
  });

  it('stays silent when reading the runs throws', () => {
    const bad = node({
      type: 'TEXT',
      characters: 'x',
      fills: MIXED,
      getStyledTextSegments: () => {
        throw new Error('unavailable');
      },
    });
    expect(checkUseOfColor(bad)).toBeNull();
  });
});
