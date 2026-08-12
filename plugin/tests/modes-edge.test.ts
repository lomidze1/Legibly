/**
 * buildModeProjections at its edges: the label when a collection is unnamed,
 * the default sweep cap (an uncapped sweep is a full re-scan per mode and
 * would blow the 2s budget, NF4), and the modes that resolve to nothing.
 */
import { describe, expect, it } from 'vitest';
import { buildModeProjections, MAX_MODE_SWEEP } from '../src/main/modes';
import { CollectionLite, TokenSourceApi, VariableLite } from '../src/main/tokens';

function api(collections: CollectionLite[], variables: VariableLite[]): TokenSourceApi {
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

const UNNAMED: CollectionLite = {
  id: 'anon',
  defaultModeId: 'light',
  modes: [
    { modeId: 'light', name: 'Light' },
    { modeId: 'dark', name: 'Dark' },
  ],
};

describe('buildModeProjections — labelling', () => {
  it('falls back to the bare mode name when the collection has none', async () => {
    const result = await buildModeProjections(
      api([UNNAMED], [v('surface', 'anon', { light: { r: 1, g: 1, b: 1 }, dark: { r: 0, g: 0, b: 0 } })])
    );
    expect(result.projections[0]!.label).toBe('Dark');
  });

  it('keys a projection by collection and mode, so two collections never collide', async () => {
    const result = await buildModeProjections(
      api([UNNAMED], [v('surface', 'anon', { light: { r: 1, g: 1, b: 1 }, dark: { r: 0, g: 0, b: 0 } })])
    );
    expect(result.projections[0]!.key).toBe('anon:dark');
    expect(result.projections[0]!.collectionId).toBe('anon');
    expect(result.projections[0]!.modeId).toBe('dark');
  });
});

describe('buildModeProjections — nothing to sweep', () => {
  it('a themed collection with no colour variables produces no projections', async () => {
    const result = await buildModeProjections(api([UNNAMED], []));
    expect(result).toEqual({ projections: [], skipped: 0 });
  });

  it('drops a mode in which no variable resolves to a colour, and counts it as unswept', async () => {
    // values that are neither a colour nor an alias → resolveVariableColor null
    const result = await buildModeProjections(
      api([UNNAMED], [v('broken', 'anon', { light: 'red', dark: 'blue' })])
    );
    expect(result.projections).toEqual([]);
    // Dropping it silently would let the honesty footer claim the sweep covered
    // a mode it never looked at.
    expect(result.skipped).toBe(1);
  });

  it('carries the variable alpha through into the projected colour', async () => {
    const result = await buildModeProjections(
      api([UNNAMED], [v('veil', 'anon', { light: { r: 1, g: 1, b: 1 }, dark: { r: 0, g: 0, b: 0, a: 0.4 } })])
    );
    expect(result.projections[0]!.colors.get('veil')).toEqual({ r: 0, g: 0, b: 0, a: 0.4 });
  });
});

describe('buildModeProjections — the sweep cap', () => {
  const many: CollectionLite = {
    id: 'brand',
    defaultModeId: 'm0',
    name: 'Brand',
    modes: Array.from({ length: 8 }, (_, i) => ({ modeId: `m${i}`, name: `M${i}` })),
  };
  const values = Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [`m${i}`, { r: i / 8, g: 0, b: 0 }])
  );

  it('defaults to MAX_MODE_SWEEP and reports the rest as unchecked', async () => {
    const result = await buildModeProjections(api([many], [v('c', 'brand', values)]));
    expect(result.projections).toHaveLength(MAX_MODE_SWEEP);
    expect(result.skipped).toBe(7 - MAX_MODE_SWEEP); // 7 modes are not on screen
  });

  it('sweeps the modes in collection order, skipping the one on screen', async () => {
    const result = await buildModeProjections(
      api([many], [v('c', 'brand', values)]),
      new Map([['brand', 'm2']])
    );
    expect(result.projections.map((p) => p.modeId)).toEqual(['m0', 'm1', 'm3', 'm4']);
  });
});
