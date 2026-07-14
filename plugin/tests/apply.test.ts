/**
 * Canvas apply with commit-time verification (F12, F15, F17, NF1) across
 * all fix kinds: text/shape/stroke color, min-size, line-height. The trust
 * property under test: a fix that does not re-pass the same deterministic
 * check is reverted and reported — it cannot stay on canvas.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBatch, applyFix } from '../src/main/apply';
import type { Settings, TokenCandidate } from '../src/shared/types';
import { hexToRgba } from '../src/shared/fix';

const AA: Settings = { level: 'AA', strictMode: false };
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
let collections: { id: string; name: string; defaultModeId: string }[];
let createdVariables: { name: string; collection: string; value?: unknown }[];
let commitUndo: ReturnType<typeof vi.fn>;
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

/** Auto-layout button whose width/height honor min constraints (like Figma). */
function makeButtonNode(id: string, w: number, h: number, layoutMode = 'HORIZONTAL'): MockNode {
  const { frame } = whitePage();
  const node: MockNode = {
    id,
    name: `btn-${id}`,
    type: 'FRAME',
    layoutMode,
    minWidth: null,
    minHeight: null,
    fills: [],
    absoluteBoundingBox: { x: 0, y: 0, width: w, height: h },
    parent: frame,
    get width() {
      return Math.max(w, (this.minWidth as number) ?? 0);
    },
    get height() {
      return Math.max(h, (this.minHeight as number) ?? 0);
    },
  };
  frame.children = [node];
  return node;
}

/** Icon vector inside a white frame (backdrop resolvable). */
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
  collections = [];
  createdVariables = [];
  commitUndo = vi.fn();
  loadFontAsync = vi.fn(async () => undefined);
  vi.stubGlobal('figma', {
    mixed: MIXED,
    commitUndo,
    loadFontAsync,
    getNodeByIdAsync: async (id: string) => nodes[id] ?? null,
    variables: {
      getVariableByIdAsync: async (id: string) => variables[id] ?? null,
      setBoundVariableForPaint: (paint: object, _field: string, variable: { id: string }) => ({
        ...paint,
        boundVariables: { color: { id: variable.id } },
      }),
      getLocalVariableCollectionsAsync: async () => collections,
      createVariableCollection: (name: string) => {
        const col = { id: `col-${collections.length + 1}`, name, defaultModeId: 'mode-1' };
        collections.push(col);
        return col;
      },
      createVariable: (name: string, collection: { id: string }, _type: string) => {
        const v = {
          id: `var-new-${createdVariables.length + 1}`,
          name,
          setValueForMode: (_mode: string, value: unknown) => {
            createdVariables.push({ name, collection: collection.id, value });
          },
        };
        variables[v.id] = v;
        return v;
      },
    },
  });
});

const passingToken: TokenCandidate = {
  id: 'var-ink',
  kind: 'variable',
  name: 'text/strong',
  color: hexToRgba('#333333'), // 12.6:1 on white
};

const failingToken: TokenCandidate = {
  id: 'var-ghost',
  kind: 'variable',
  name: 'text/ghost',
  color: hexToRgba('#eeeeee'), // ~1.2:1 on white — must never commit
};

describe('applyFix — text fill (1.4.3)', () => {
  it('applies a passing token and reports the verified after-ratio', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    const result = await applyFix('t1', { kind: 'token', token: passingToken }, AA, '4.48:1', '4.5:1', '1.4.3');
    expect(result.before).toBe('4.48:1');
    expect(parseFloat(result.after)).toBeGreaterThanOrEqual(4.5);
    expect(result.sc).toBe('1.4.3');
    expect(result.changeDescription).toContain('text/strong');
    const fills = nodes.t1.fills as { color: { r: number }; boundVariables?: unknown }[];
    expect(fills[0]!.boundVariables).toEqual({ color: { id: 'var-ink' } });
  });

  it('REVERTS when the applied fix does not re-pass the same check (NF1)', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    variables['var-ghost'] = { id: 'var-ghost', name: 'text/ghost' };
    const originalFills = nodes.t1.fills;
    await expect(
      applyFix('t1', { kind: 'token', token: failingToken }, AA, '4.48:1', '4.5:1', '1.4.3')
    ).rejects.toThrow('verification failed');
    expect(nodes.t1.fills).toEqual(originalFills);
  });

  it('style-based fix verifies and applies via setFillStyleIdAsync', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    stylePaints['style-ink'] = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    const styleToken: TokenCandidate = { id: 'style-ink', kind: 'style', name: 'Text/Ink', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 } };
    const result = await applyFix('t1', { kind: 'token', token: styleToken }, AA, '4.48:1', '4.5:1', '1.4.3');
    expect(parseFloat(result.after)).toBeGreaterThanOrEqual(4.5);
  });

  it('proposal creates a variable in the Legibly collection and binds it', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    const result = await applyFix(
      't1',
      { kind: 'proposal', color: hexToRgba('#555555'), tokenName: 'legibly/contrast-fix-1' },
      AA,
      '4.48:1',
      '4.5:1',
      '1.4.3'
    );
    expect(parseFloat(result.after)).toBeGreaterThanOrEqual(4.5);
    expect(collections.map((c) => c.name)).toContain('Legibly');
    expect(createdVariables[0]).toMatchObject({ name: 'legibly/contrast-fix-1' });
  });

  it('throws when the node does not exist', async () => {
    await expect(
      applyFix('missing', { kind: 'token', token: passingToken }, AA, '4:1', '4.5:1', '1.4.3')
    ).rejects.toThrow('not found');
  });
});

describe('applyFix — shape fill & stroke (1.4.11)', () => {
  it('fixes an icon fill with a passing token (verified ≥ 3:1)', async () => {
    nodes.icon = makeIconNode('icon', '#cccccc');
    variables['var-ink'] = { id: 'var-ink', name: 'icon/strong' };
    const result = await applyFix(
      'icon',
      { kind: 'token', token: passingToken, paintTarget: 'shape-fill' },
      AA,
      '1.61:1',
      '3:1',
      '1.4.11'
    );
    expect(parseFloat(result.after)).toBeGreaterThanOrEqual(3);
    expect(result.sc).toBe('1.4.11');
  });

  it('reverts a failing icon fill fix', async () => {
    nodes.icon = makeIconNode('icon', '#cccccc');
    variables['var-ghost'] = { id: 'var-ghost', name: 'text/ghost' };
    const original = nodes.icon.fills;
    await expect(
      applyFix('icon', { kind: 'token', token: failingToken, paintTarget: 'shape-fill' }, AA, '1.61:1', '3:1', '1.4.11')
    ).rejects.toThrow('verification failed');
    expect(nodes.icon.fills).toEqual(original);
  });

  it('fixes a stroke without touching fills', async () => {
    nodes.icon = makeIconNode('icon', '#cccccc');
    variables['var-ink'] = { id: 'var-ink', name: 'border/strong' };
    const originalFills = nodes.icon.fills;
    const result = await applyFix(
      'icon',
      { kind: 'token', token: passingToken, paintTarget: 'stroke' },
      AA,
      '1.61:1',
      '3:1',
      '1.4.11'
    );
    expect(parseFloat(result.after)).toBeGreaterThanOrEqual(3);
    expect(nodes.icon.fills).toEqual(originalFills);
    const strokes = nodes.icon.strokes as { boundVariables?: unknown }[];
    expect(strokes[0]!.boundVariables).toEqual({ color: { id: 'var-ink' } });
  });
});

describe('applyFix — min-size (2.5.8)', () => {
  it('sets min size on an auto-layout node and verifies the new box', async () => {
    nodes.btn = makeButtonNode('btn', 18, 20);
    const result = await applyFix('btn', { kind: 'min-size', required: 24 }, AA, '18×20px', '24×24px', '2.5.8');
    expect(result.after).toBe('24×24px');
    expect(nodes.btn.minWidth).toBe(24);
    expect(nodes.btn.minHeight).toBe(24);
  });

  it('refuses non-auto-layout nodes with actionable guidance', async () => {
    nodes.btn = makeButtonNode('btn', 18, 20, 'NONE');
    await expect(applyFix('btn', { kind: 'min-size', required: 24 }, AA, '18×20px', '24×24px', '2.5.8')).rejects.toThrow(
      'auto layout'
    );
    expect(nodes.btn.minWidth).toBeNull();
  });

  it('reverts min constraints when the box does not actually grow', async () => {
    nodes.btn = makeButtonNode('btn', 18, 20);
    // simulate a layout that ignores min constraints (fixed by parent)
    Object.defineProperty(nodes.btn, 'width', { get: () => 18 });
    await expect(applyFix('btn', { kind: 'min-size', required: 24 }, AA, '18×20px', '24×24px', '2.5.8')).rejects.toThrow(
      'verification failed'
    );
    expect(nodes.btn.minWidth).toBeNull();
    expect(nodes.btn.minHeight).toBeNull();
  });
});

describe('applyFix — line-height (1.4.12)', () => {
  it('raises line height to 150% after loading the font', async () => {
    nodes.t1 = makeTextNode('t1', '#333333');
    const result = await applyFix('t1', { kind: 'line-height', percent: 150 }, AA, '120%', '150%', '1.4.12');
    expect(result.after).toBe('150%');
    expect(loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
    expect(nodes.t1.lineHeight).toEqual({ unit: 'PERCENT', value: 150 });
  });

  it('refuses mixed-font text', async () => {
    nodes.t1 = makeTextNode('t1', '#333333');
    nodes.t1.fontName = MIXED;
    await expect(applyFix('t1', { kind: 'line-height', percent: 150 }, AA, '120%', '150%', '1.4.12')).rejects.toThrow(
      'Mixed fonts'
    );
  });

  it('reverts when the requested percent is below the floor', async () => {
    nodes.t1 = makeTextNode('t1', '#333333');
    const prev = nodes.t1.lineHeight;
    await expect(applyFix('t1', { kind: 'line-height', percent: 120 }, AA, '110%', '150%', '1.4.12')).rejects.toThrow(
      'verification failed'
    );
    expect(nodes.t1.lineHeight).toEqual(prev);
  });
});

describe('applyBatch — single undo step (F17)', () => {
  it('applies mixed fix kinds, collects failures, one commitUndo', async () => {
    nodes.a = makeTextNode('a', '#777777');
    nodes.b = makeButtonNode('b', 18, 20);
    nodes.c = makeTextNode('c', '#777777');
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    variables['var-ghost'] = { id: 'var-ghost', name: 'text/ghost' };
    const cOriginalFills = nodes.c.fills;

    const result = await applyBatch(
      [
        { nodeId: 'a', instruction: { kind: 'token', token: passingToken }, before: '4.48:1', target: '4.5:1', sc: '1.4.3' },
        { nodeId: 'b', instruction: { kind: 'min-size', required: 24 }, before: '18×20px', target: '24×24px', sc: '2.5.8' },
        { nodeId: 'c', instruction: { kind: 'token', token: failingToken }, before: '4.48:1', target: '4.5:1', sc: '1.4.3' },
      ],
      AA
    );

    expect(result.applied.map((a) => a.nodeId)).toEqual(['a', 'b']);
    expect(result.applied.map((a) => a.sc)).toEqual(['1.4.3', '2.5.8']);
    expect(result.failed).toHaveLength(1);
    expect(nodes.c.fills).toEqual(cOriginalFills); // failed fix reverted
    expect(commitUndo).toHaveBeenCalledTimes(1); // one Cmd-Z for the batch
  });

  it('empty batch still commits a single (empty) undo step safely', async () => {
    const result = await applyBatch([], AA);
    expect(result.applied).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(commitUndo).toHaveBeenCalledTimes(1);
  });
});
