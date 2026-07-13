/**
 * Phase 6/7 verify: canvas apply with commit-time verification (F12, F15,
 * F17, NF1). The trust property under test: a fix that does not re-pass the
 * deterministic check is reverted and reported — it cannot stay on canvas.
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
  characters: string;
  fontSize: number;
  fontWeight: number;
  fills: unknown;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number };
  parent: unknown;
  setFillStyleIdAsync: (id: string) => Promise<void>;
}

let nodes: Record<string, MockNode>;
let variables: Record<string, { id: string; name: string }>;
let stylePaints: Record<string, unknown[]>;
let collections: { id: string; name: string; defaultModeId: string }[];
let createdVariables: { name: string; collection: string; value?: unknown }[];
let commitUndo: ReturnType<typeof vi.fn>;

function makeTextNode(id: string, fillHex: string): MockNode {
  const page = { type: 'PAGE', backgrounds: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], parent: null };
  const frame: Record<string, unknown> = {
    type: 'FRAME',
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 200 },
    parent: page,
  };
  const c = hexToRgba(fillHex);
  const node: MockNode = {
    id,
    name: `text-${id}`,
    type: 'TEXT',
    characters: 'Hello',
    fontSize: 16,
    fontWeight: 400,
    fills: [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }],
    absoluteBoundingBox: { x: 10, y: 10, width: 100, height: 20 },
    parent: frame,
    setFillStyleIdAsync: async (styleId: string) => {
      node.fills = stylePaints[styleId] ?? [];
    },
  };
  frame.children = [node];
  (page as Record<string, unknown>).children = [frame];
  return node;
}

beforeEach(() => {
  nodes = {};
  variables = {};
  stylePaints = {};
  collections = [];
  createdVariables = [];
  commitUndo = vi.fn();
  vi.stubGlobal('figma', {
    mixed: MIXED,
    commitUndo,
    getNodeByIdAsync: async (id: string) => nodes[id] ?? null,
    variables: {
      getVariableByIdAsync: async (id: string) => variables[id] ?? null,
      setBoundVariableForPaint: (paint: object, _field: string, variable: { id: string }) => ({
        ...paint,
        boundVariables: { color: { id: variable.id } },
      }),
      getLocalVariableCollectionsAsync: async () => collections,
      createVariableCollection: (name: string) => {
        const col = {
          id: `col-${collections.length + 1}`,
          name,
          defaultModeId: 'mode-1',
        };
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

describe('applyFix — variable binding', () => {
  it('applies a passing token and reports the verified after-ratio', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    const result = await applyFix('t1', { kind: 'token', token: passingToken }, AA, 4.48);
    expect(result.afterRatio).toBeGreaterThanOrEqual(4.5);
    expect(result.beforeRatio).toBeCloseTo(4.48, 2);
    expect(result.changeDescription).toContain('text/strong');
    const fills = nodes.t1.fills as { color: { r: number }; boundVariables?: unknown }[];
    expect(fills[0]!.boundVariables).toEqual({ color: { id: 'var-ink' } });
    expect(fills[0]!.color.r).toBeCloseTo(0x33 / 255, 4);
  });

  it('REVERTS when the applied fix does not re-pass the same check (NF1)', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    variables['var-ghost'] = { id: 'var-ghost', name: 'text/ghost' };
    const originalFills = nodes.t1.fills;
    await expect(
      applyFix('t1', { kind: 'token', token: failingToken }, AA, 4.48)
    ).rejects.toThrow('verification failed');
    expect(nodes.t1.fills).toEqual(originalFills); // physically reverted
  });

  it('throws when the node does not exist', async () => {
    await expect(applyFix('missing', { kind: 'token', token: passingToken }, AA, 4)).rejects.toThrow(
      'not found'
    );
  });

  it('throws when the variable does not exist and leaves fills untouched', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    const originalFills = nodes.t1.fills;
    await expect(applyFix('t1', { kind: 'token', token: passingToken }, AA, 4.48)).rejects.toThrow(
      'Variable'
    );
    expect(nodes.t1.fills).toEqual(originalFills);
  });
});

describe('applyFix — style binding (F15: binding, not stray override)', () => {
  it('applies a passing style via setFillStyleIdAsync', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    stylePaints['style-ink'] = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    const styleToken: TokenCandidate = {
      id: 'style-ink',
      kind: 'style',
      name: 'Text/Ink',
      color: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
    };
    const result = await applyFix('t1', { kind: 'token', token: styleToken }, AA, 4.48);
    expect(result.afterRatio).toBeGreaterThanOrEqual(4.5);
    expect((nodes.t1.fills as unknown[])[0]).toMatchObject({ color: { r: 0.1 } });
  });

  it('reverts a style fix that fails verification', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    stylePaints['style-pale'] = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
    const pale: TokenCandidate = {
      id: 'style-pale',
      kind: 'style',
      name: 'Text/Pale',
      color: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
    };
    const originalFills = nodes.t1.fills;
    await expect(applyFix('t1', { kind: 'token', token: pale }, AA, 4.48)).rejects.toThrow();
    expect(nodes.t1.fills).toEqual(originalFills);
  });
});

describe('applyFix — new-token proposal (D8)', () => {
  it('creates the variable in a "Legibly" collection and binds it', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    const proposed = hexToRgba('#6f6f6f'); // must fail → then we assert revert? no: pick passing
    const passing = hexToRgba('#555555');
    const result = await applyFix(
      't1',
      { kind: 'proposal', color: passing, tokenName: 'legibly/contrast-fix-1' },
      AA,
      4.48
    );
    expect(result.afterRatio).toBeGreaterThanOrEqual(4.5);
    expect(collections.map((c) => c.name)).toContain('Legibly');
    expect(createdVariables[0]).toMatchObject({ name: 'legibly/contrast-fix-1' });
    expect(result.changeDescription).toContain('new token legibly/contrast-fix-1');
    void proposed;
  });

  it('reuses an existing collection instead of creating a new one', async () => {
    nodes.t1 = makeTextNode('t1', '#777777');
    collections.push({ id: 'col-existing', name: 'Primitives', defaultModeId: 'mode-1' });
    await applyFix('t1', { kind: 'proposal', color: hexToRgba('#444444'), tokenName: 'fix' }, AA, 4.48);
    expect(collections).toHaveLength(1);
    expect(createdVariables[0]!.collection).toBe('col-existing');
  });
});

describe('applyBatch — single undo step (F17)', () => {
  it('applies all passing fixes, collects failures, and calls commitUndo exactly once', async () => {
    nodes.a = makeTextNode('a', '#777777');
    nodes.b = makeTextNode('b', '#999999');
    nodes.c = makeTextNode('c', '#777777');
    variables['var-ink'] = { id: 'var-ink', name: 'text/strong' };
    variables['var-ghost'] = { id: 'var-ghost', name: 'text/ghost' };
    const cOriginalFills = nodes.c.fills;

    const result = await applyBatch(
      [
        { nodeId: 'a', instruction: { kind: 'token', token: passingToken }, beforeRatio: 4.48 },
        { nodeId: 'b', instruction: { kind: 'token', token: passingToken }, beforeRatio: 2.85 },
        { nodeId: 'c', instruction: { kind: 'token', token: failingToken }, beforeRatio: 4.48 },
      ],
      AA
    );

    expect(result.applied.map((a) => a.nodeId)).toEqual(['a', 'b']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.nodeId).toBe('c');
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
