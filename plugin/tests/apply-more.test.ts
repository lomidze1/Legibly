/**
 * The apply paths nothing covered: the SC 1.4.1 underline fix, the cross-mode
 * guard, `boundVariablePaint`, the style-on-stroke branch — and idempotency,
 * since every fix can be re-applied by a second scan or a re-run batch.
 *
 * Same trust property as apply.test.ts: a fix that does not re-pass the SAME
 * check is reverted, and the canvas is left exactly as it was.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyFix, boundVariablePaint } from '../src/main/apply';
import type { ModeGuard } from '../src/main/apply';
import type { Settings, TokenCandidate } from '../src/shared/types';
import { hexToRgba } from '../src/shared/fix';

const AA: Settings = { level: 'AA', strictMode: false, targetFloor: 24 };
const MIXED = Symbol('figma.mixed');

interface MockNode {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

let nodes: Record<string, MockNode>;
let variables: Record<string, { id: string; name: string }>;
let stylePaints: Record<string, unknown[]>;
let loadFontAsync: ReturnType<typeof vi.fn>;

function whitePage(): { page: Record<string, unknown>; frame: Record<string, unknown> } {
  const page = { type: 'PAGE', backgrounds: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], parent: null };
  const frame: Record<string, unknown> = {
    type: 'FRAME',
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 200 },
    parent: page,
  };
  (page as Record<string, unknown>).children = [frame];
  return { page, frame };
}

function makeTextNode(id: string, fillHex: string): MockNode {
  const { frame } = whitePage();
  const c = hexToRgba(fillHex);
  const node: MockNode = {
    id,
    name: `text-${id}`,
    type: 'TEXT',
    characters: 'Hello',
    fontSize: 16,
    fontWeight: 400,
    fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PERCENT', value: 120 },
    fills: [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }],
    absoluteBoundingBox: { x: 10, y: 10, width: 100, height: 20 },
    parent: frame,
    setFillStyleIdAsync: async (styleId: string) => {
      node.fills = stylePaints[styleId] ?? [];
    },
  };
  frame.children = [node];
  return node;
}

/**
 * A text node with per-character decorations, mirroring Figma's range API.
 * `rejectUnderline` models a font/renderer that silently drops the change —
 * the case commit-time verification exists for.
 */
function makeRichTextNode(
  id: string,
  characters: string,
  opts: { rejectUnderline?: boolean; initial?: (i: number) => string } = {}
): MockNode {
  const { frame } = whitePage();
  const decorations = Array.from(characters, (_, i) => opts.initial?.(i) ?? 'NONE');
  const node: MockNode = {
    id,
    name: `rich-${id}`,
    type: 'TEXT',
    characters,
    fontSize: 16,
    fontWeight: 400,
    fontName: { family: 'Inter', style: 'Regular' },
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    absoluteBoundingBox: { x: 10, y: 10, width: 200, height: 20 },
    parent: frame,
    decorations,
    getStyledTextSegments: (_fields: readonly string[]) => [
      { fontName: { family: 'Inter', style: 'Regular' } },
    ],
    getRangeTextDecoration: (start: number, end: number) => {
      const slice = decorations.slice(start, end);
      return slice.every((d) => d === slice[0]) ? slice[0] : MIXED;
    },
    setRangeTextDecoration: (start: number, end: number, decoration: string) => {
      if (opts.rejectUnderline && decoration === 'UNDERLINE') return;
      for (let i = start; i < end; i++) decorations[i] = decoration;
    },
  };
  frame.children = [node];
  return node;
}

function makeIconNode(id: string, fillHex: string): MockNode {
  const { frame } = whitePage();
  const c = hexToRgba(fillHex);
  const node: MockNode = {
    id,
    name: `icon-${id}`,
    type: 'VECTOR',
    fills: [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }],
    strokes: [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }],
    absoluteBoundingBox: { x: 10, y: 10, width: 16, height: 16 },
    parent: frame,
  };
  frame.children = [node];
  return node;
}

beforeEach(() => {
  nodes = {};
  variables = {};
  stylePaints = {};
  loadFontAsync = vi.fn(async () => undefined);
  vi.stubGlobal('figma', {
    mixed: MIXED,
    commitUndo: vi.fn(),
    loadFontAsync,
    getNodeByIdAsync: async (id: string) => nodes[id] ?? null,
    variables: {
      getVariableByIdAsync: async (id: string) => variables[id] ?? null,
      setBoundVariableForPaint: (paint: object, _field: string, variable: { id: string }) => ({
        ...paint,
        boundVariables: { color: { id: variable.id } },
      }),
      getLocalVariableCollectionsAsync: async () => [],
      getLocalVariablesAsync: async () => Object.values(variables),
    },
  });
});

const passingToken: TokenCandidate = {
  id: 'var-ink',
  kind: 'variable',
  name: 'text/strong',
  color: hexToRgba('#333333'), // 12.6:1 on white
};

const underline = (ranges: { start: number; end: number }[], excerpt = 'full terms') =>
  ({ kind: 'underline', ranges, excerpt }) as const;

describe('applyFix — underline (1.4.1)', () => {
  it('underlines exactly the flagged range and names it in the record', async () => {
    const t = makeRichTextNode('t1', 'Read the full terms today');
    nodes.t1 = t;
    const result = await applyFix(
      't1',
      underline([{ start: 9, end: 19 }]),
      AA,
      'color only',
      'a second, non-color cue',
      '1.4.1'
    );
    expect(result.after).toBe('underlined');
    expect(result.sc).toBe('1.4.1');
    expect(result.changeDescription).toBe('underlined “full terms”');
    const decorations = t.decorations as string[];
    expect(decorations.slice(9, 19).every((d) => d === 'UNDERLINE')).toBe(true);
    expect(decorations[8]).toBe('NONE'); // untouched either side
    expect(decorations[19]).toBe('NONE');
  });

  it('loads every font in the layer before editing a range', async () => {
    nodes.t1 = makeRichTextNode('t1', 'Read the full terms today');
    await applyFix('t1', underline([{ start: 9, end: 19 }]), AA, 'color only', 'cue', '1.4.1');
    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
  });

  it('several runs are one decision, described as a count', async () => {
    const t = makeRichTextNode('t1', 'Read the full terms and the privacy note');
    nodes.t1 = t;
    const result = await applyFix(
      't1',
      underline([
        { start: 9, end: 19 },
        { start: 28, end: 40 },
      ]),
      AA,
      'color only',
      'cue',
      '1.4.1'
    );
    expect(result.changeDescription).toBe('underlined 2 colour-only runs');
    const decorations = t.decorations as string[];
    expect(decorations[9]).toBe('UNDERLINE');
    expect(decorations[30]).toBe('UNDERLINE');
    expect(decorations[20]).toBe('NONE');
  });

  it('refuses an empty range list rather than reporting a no-op as fixed', async () => {
    nodes.t1 = makeRichTextNode('t1', 'Read the full terms');
    await expect(applyFix('t1', underline([]), AA, 'color only', 'cue', '1.4.1')).rejects.toThrow(
      'Nothing to underline'
    );
  });

  it('refuses a non-text node', async () => {
    nodes.icon = makeIconNode('icon', '#cccccc');
    await expect(
      applyFix('icon', underline([{ start: 0, end: 2 }]), AA, 'color only', 'cue', '1.4.1')
    ).rejects.toThrow('Underline applies to text only');
  });

  it('refuses a run that already mixes underline styles, and changes nothing', async () => {
    const t = makeRichTextNode('t1', 'Read the full terms', {
      initial: (i) => (i < 12 ? 'NONE' : 'STRIKETHROUGH'),
    });
    nodes.t1 = t;
    const before = [...(t.decorations as string[])];
    await expect(
      applyFix('t1', underline([{ start: 9, end: 19 }]), AA, 'color only', 'cue', '1.4.1')
    ).rejects.toThrow('mixes underline styles');
    expect(t.decorations).toEqual(before);
  });

  it('REVERTS every range when the decoration did not actually take (NF1)', async () => {
    const t = makeRichTextNode('t1', 'Read the full terms and the privacy note', {
      rejectUnderline: true,
      initial: () => 'STRIKETHROUGH',
    });
    nodes.t1 = t;
    await expect(
      applyFix(
        't1',
        underline([
          { start: 9, end: 19 },
          { start: 28, end: 40 },
        ]),
        AA,
        'color only',
        'cue',
        '1.4.1'
      )
    ).rejects.toThrow('verification failed');
    expect((t.decorations as string[]).every((d) => d === 'STRIKETHROUGH')).toBe(true);
  });

  it('is idempotent — underlining an already-underlined run still succeeds', async () => {
    const t = makeRichTextNode('t1', 'Read the full terms today');
    nodes.t1 = t;
    const first = await applyFix('t1', underline([{ start: 9, end: 19 }]), AA, 'color only', 'cue', '1.4.1');
    const after = [...(t.decorations as string[])];
    const second = await applyFix('t1', underline([{ start: 9, end: 19 }]), AA, 'color only', 'cue', '1.4.1');
    expect(second).toEqual(first);
    expect(t.decorations).toEqual(after);
  });
});

describe('applyFix — the cross-mode guard', () => {
  const guardRejecting = (message: string): ModeGuard => () => message;

  it('a mode that would regress rejects the fix and restores the paint', async () => {
    const t = makeTextNode('t1', '#777777');
    nodes.t1 = t;
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    const original = t.fills;
    await expect(
      applyFix(
        't1',
        { kind: 'token', token: passingToken },
        AA,
        '4.48:1',
        '4.5:1',
        '1.4.3',
        guardRejecting('Fix reverted — it would leave this text at 2.10:1 in Theme · Dark')
      )
    ).rejects.toThrow('Theme · Dark');
    expect(t.fills).toEqual(original);
  });

  it('a clean guard lets the fix commit', async () => {
    const t = makeTextNode('t1', '#777777');
    nodes.t1 = t;
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    const result = await applyFix(
      't1',
      { kind: 'token', token: passingToken },
      AA,
      '4.48:1',
      '4.5:1',
      '1.4.3',
      () => null
    );
    expect(parseFloat(result.after)).toBeGreaterThanOrEqual(4.5);
  });

  it('receives the mutated node and the paint target it was applied to', async () => {
    nodes.icon = makeIconNode('icon', '#cccccc');
    variables['var-ink'] = { id: 'var-ink', name: 'icon/strong' };
    const guard = vi.fn(() => null);
    await applyFix(
      'icon',
      { kind: 'token', token: passingToken, paintTarget: 'stroke' },
      AA,
      '1.61:1',
      '3:1',
      '1.4.11',
      guard as unknown as ModeGuard
    );
    expect(guard).toHaveBeenCalledTimes(1);
    const [node, paintTarget] = guard.mock.calls[0] as unknown as [MockNode, string];
    expect(node.id).toBe('icon');
    expect(paintTarget).toBe('stroke');
  });

  it('is never consulted for non-colour fixes', async () => {
    nodes.t1 = makeRichTextNode('t1', 'Read the full terms today');
    const guard = vi.fn(() => 'should not run');
    await applyFix(
      't1',
      underline([{ start: 9, end: 19 }]),
      AA,
      'color only',
      'cue',
      '1.4.1',
      guard as unknown as ModeGuard
    );
    expect(guard).not.toHaveBeenCalled();
  });
});

describe('applyFix — style tokens on strokes', () => {
  it('refuses a node that cannot carry a stroke style', async () => {
    nodes.icon = makeIconNode('icon', '#cccccc'); // no setStrokeStyleIdAsync
    const styleToken: TokenCandidate = {
      id: 'style-border',
      kind: 'style',
      name: 'Border/Strong',
      color: hexToRgba('#111111'),
    };
    const original = nodes.icon.strokes;
    await expect(
      applyFix('icon', { kind: 'token', token: styleToken, paintTarget: 'stroke' }, AA, '1.6:1', '3:1', '1.4.11')
    ).rejects.toThrow('Cannot style this stroke');
    expect(nodes.icon.strokes).toEqual(original);
  });

  it('applies a stroke style through setStrokeStyleIdAsync', async () => {
    const icon = makeIconNode('icon', '#cccccc');
    stylePaints['style-border'] = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    icon.setStrokeStyleIdAsync = async (styleId: string) => {
      icon.strokes = stylePaints[styleId] ?? [];
    };
    nodes.icon = icon;
    const styleToken: TokenCandidate = {
      id: 'style-border',
      kind: 'style',
      name: 'Border/Strong',
      color: hexToRgba('#111111'),
    };
    const result = await applyFix(
      'icon',
      { kind: 'token', token: styleToken, paintTarget: 'stroke' },
      AA,
      '1.6:1',
      '3:1',
      '1.4.11'
    );
    expect(parseFloat(result.after)).toBeGreaterThanOrEqual(3);
    expect(result.changeDescription).toContain('Border/Strong');
  });
});

describe('boundVariablePaint', () => {
  it('mirrors the variable value into the paint so every reader sees the truth', async () => {
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    const paint = await boundVariablePaint('var-ink', hexToRgba('#333333'));
    expect(paint.type).toBe('SOLID');
    expect(paint.color.r).toBeCloseTo(0x33 / 255, 10);
    expect(paint.boundVariables).toEqual({ color: { id: 'var-ink' } });
  });

  it('refuses to bind a variable that no longer exists', async () => {
    await expect(boundVariablePaint('var-gone', hexToRgba('#333333'))).rejects.toThrow('not found');
  });
});

describe('applyFix — idempotency of a colour fix', () => {
  it('applying the same passing token twice is stable', async () => {
    const t = makeTextNode('t1', '#777777');
    nodes.t1 = t;
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    const first = await applyFix('t1', { kind: 'token', token: passingToken }, AA, '4.48:1', '4.5:1', '1.4.3');
    const fillsAfterFirst = JSON.parse(JSON.stringify(t.fills));
    const second = await applyFix('t1', { kind: 'token', token: passingToken }, AA, '4.48:1', '4.5:1', '1.4.3');
    expect(second.after).toBe(first.after);
    expect(JSON.parse(JSON.stringify(t.fills))).toEqual(fillsAfterFirst);
    // the second run reports the fix as a no-op change from the token to itself
    expect(second.changeDescription).toContain('text/strong');
  });

  // Mixed per-range paints cannot be restored by assignment, so applyColorFix
  // refuses the node outright rather than making a change it could not revert.
  it('refuses a mixed-fill node instead of leaving an unrevertable change', async () => {
    const t = makeTextNode('t1', '#777777');
    t.fills = MIXED;
    nodes.t1 = t;
    variables['var-ghost'] = { id: 'var-ghost', name: 'text/ghost' };
    const failingToken: TokenCandidate = {
      id: 'var-ghost',
      kind: 'variable',
      name: 'text/ghost',
      color: hexToRgba('#eeeeee'), // ~1.2:1 on white — can never commit
    };
    await expect(
      applyFix('t1', { kind: 'token', token: failingToken }, AA, '4.48:1', '4.5:1', '1.4.3')
    ).rejects.toThrow('Mixed paints');
    expect(t.fills).toBe(MIXED);
  });

  // The same refusal protects a token that *would* have passed: no fix is worth
  // destroying per-range paints the plugin cannot put back.
  it('refuses a mixed-fill node even when the token would pass', async () => {
    const t = makeTextNode('t1', '#777777');
    t.fills = MIXED;
    nodes.t1 = t;
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    await expect(
      applyFix('t1', { kind: 'token', token: passingToken }, AA, '4.48:1', '4.5:1', '1.4.3')
    ).rejects.toThrow('Mixed paints');
    expect(t.fills).toBe(MIXED);
  });
});
