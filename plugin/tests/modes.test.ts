/**
 * Wave 1 verify: variable-mode discovery — one projection per mode the canvas
 * is not showing, aliases resolved per collection, sweep capped.
 */
import { describe, expect, it } from 'vitest';
import { buildModeProjections } from '../src/main/modes';
import { CollectionLite, TokenSourceApi, VariableLite } from '../src/main/tokens';

const THEME: CollectionLite = {
  id: 'theme',
  defaultModeId: 'light',
  name: 'Theme',
  modes: [
    { modeId: 'light', name: 'Light' },
    { modeId: 'dark', name: 'Dark' },
  ],
};

const PRIMITIVES: CollectionLite = {
  id: 'prim',
  defaultModeId: 'only',
  name: 'Primitives',
  modes: [{ modeId: 'only', name: 'Default' }],
};

function api(
  collections: CollectionLite[],
  variables: VariableLite[]
): TokenSourceApi {
  const byId = new Map(variables.map((v) => [v.id, v]));
  return {
    getLocalColorVariables: async () => variables,
    getCollection: async (id) => collections.find((c) => c.id === id) ?? null,
    getVariableById: async (id) => byId.get(id) ?? null,
    getLocalPaintStyles: async () => [],
    getLocalCollections: async () => collections,
  };
}

const v = (id: string, collectionId: string, valuesByMode: Record<string, unknown>): VariableLite => ({
  id,
  name: id,
  resolvedType: 'COLOR',
  variableCollectionId: collectionId,
  valuesByMode,
});

describe('buildModeProjections', () => {
  it('returns nothing when no collection has more than one mode', async () => {
    const result = await buildModeProjections(
      api([PRIMITIVES], [v('a', 'prim', { only: { r: 1, g: 1, b: 1 } })])
    );
    expect(result.projections).toEqual([]);
  });

  it('projects the mode the canvas is not showing, and labels it', async () => {
    const result = await buildModeProjections(
      api([THEME], [v('surface', 'theme', { light: { r: 1, g: 1, b: 1 }, dark: { r: 0, g: 0, b: 0 } })])
    );
    expect(result.projections).toHaveLength(1);
    expect(result.projections[0]!.label).toBe('Theme · Dark');
    expect(result.projections[0]!.colors.get('surface')).toMatchObject({ r: 0, g: 0, b: 0, a: 1 });
  });

  it('respects the mode the page is actually pinned to', async () => {
    const result = await buildModeProjections(
      api([THEME], [v('surface', 'theme', { light: { r: 1, g: 1, b: 1 }, dark: { r: 0, g: 0, b: 0 } })]),
      new Map([['theme', 'dark']]) // canvas already shows Dark → sweep Light
    );
    expect(result.projections).toHaveLength(1);
    expect(result.projections[0]!.label).toBe('Theme · Light');
    expect(result.projections[0]!.colors.get('surface')).toMatchObject({ r: 1, g: 1, b: 1 });
  });

  it('resolves an alias into a single-mode collection under that collection’s own mode', async () => {
    const result = await buildModeProjections(
      api(
        [THEME, PRIMITIVES],
        [
          v('text', 'theme', {
            light: { type: 'VARIABLE_ALIAS', id: 'ink' },
            dark: { type: 'VARIABLE_ALIAS', id: 'paper' },
          }),
          v('ink', 'prim', { only: { r: 0, g: 0, b: 0 } }),
          v('paper', 'prim', { only: { r: 1, g: 1, b: 1 } }),
        ]
      )
    );
    expect(result.projections[0]!.colors.get('text')).toMatchObject({ r: 1, g: 1, b: 1 });
  });

  it('caps the sweep and reports what it left out', async () => {
    const many: CollectionLite = {
      id: 'brand',
      defaultModeId: 'm0',
      name: 'Brand',
      modes: Array.from({ length: 6 }, (_, i) => ({ modeId: `m${i}`, name: `M${i}` })),
    };
    const values = Object.fromEntries(
      Array.from({ length: 6 }, (_, i) => [`m${i}`, { r: i / 6, g: 0, b: 0 }])
    );
    const result = await buildModeProjections(api([many], [v('c', 'brand', values)]), new Map(), 2);
    expect(result.projections).toHaveLength(2);
    expect(result.skipped).toBe(3); // 5 non-showing modes, 2 swept
  });
});
