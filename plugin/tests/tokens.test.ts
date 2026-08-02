/**
 * Phase 5 verify: token harvester builds a clean candidate index (F11).
 */
import { describe, expect, it } from 'vitest';
import { harvestTokens, TokenSourceApi, VariableLite } from '../src/main/tokens';

function api(overrides: Partial<TokenSourceApi> = {}): TokenSourceApi {
  return {
    getLocalColorVariables: async () => [],
    getCollection: async () => ({ id: 'col1', defaultModeId: 'mode1' }),
    getVariableById: async () => null,
    getLocalPaintStyles: async () => [],
    getLocalCollections: async () => [{ id: 'col1', defaultModeId: 'mode1' }],
    ...overrides,
  };
}

const colorVar = (id: string, name: string, value: unknown): VariableLite => ({
  id,
  name,
  resolvedType: 'COLOR',
  variableCollectionId: 'col1',
  valuesByMode: { mode1: value },
});

describe('harvestTokens — D15: our own proposals are not the user’s system', () => {
  it('excludes variables living in the Legibly collection', async () => {
    const idx = await harvestTokens(
      api({
        getLocalColorVariables: async () => [
          colorVar('v1', 'text/primary', { r: 0.1, g: 0.1, b: 0.1 }),
          { ...colorVar('v2', 'contrast-fix-1', { r: 0, g: 0, b: 0 }), variableCollectionId: 'legibly' },
        ],
        getCollection: async (id) =>
          id === 'legibly'
            ? { id: 'legibly', defaultModeId: 'mode1', name: 'Legibly' }
            : { id: 'col1', defaultModeId: 'mode1', name: 'Brand' },
      })
    );
    expect(idx.tokens.map((t) => t.name)).toEqual(['text/primary']);
  });

  it('keeps user collections that merely have a name', async () => {
    const idx = await harvestTokens(
      api({
        getLocalColorVariables: async () => [colorVar('v1', 'brand/blue', { r: 0, g: 0, b: 1 })],
        getCollection: async () => ({ id: 'col1', defaultModeId: 'mode1', name: 'Design tokens' }),
      })
    );
    expect(idx.tokens).toHaveLength(1);
  });
});

describe('harvestTokens — variables', () => {
  it('harvests opaque color variables', async () => {
    const idx = await harvestTokens(
      api({
        getLocalColorVariables: async () => [
          colorVar('v1', 'text/primary', { r: 0.1, g: 0.1, b: 0.1 }),
          colorVar('v2', 'text/muted', { r: 0.4, g: 0.4, b: 0.4, a: 1 }),
        ],
      })
    );
    expect(idx.empty).toBe(false);
    expect(idx.tokens).toHaveLength(2);
    expect(idx.tokens[0]).toMatchObject({ id: 'v1', kind: 'variable', name: 'text/primary' });
    expect(idx.tokens[0]!.color.a).toBe(1);
  });

  it('excludes translucent variables (unsafe snap targets, NF3)', async () => {
    const idx = await harvestTokens(
      api({
        getLocalColorVariables: async () => [colorVar('v1', 'overlay/dim', { r: 0, g: 0, b: 0, a: 0.5 })],
      })
    );
    expect(idx.tokens).toHaveLength(0);
    expect(idx.empty).toBe(true);
  });

  it('resolves alias chains to the target color', async () => {
    const target = colorVar('v-base', 'base/ink', { r: 0.2, g: 0.2, b: 0.2 });
    const idx = await harvestTokens(
      api({
        getLocalColorVariables: async () => [
          colorVar('v-alias', 'text/default', { type: 'VARIABLE_ALIAS', id: 'v-base' }),
        ],
        getVariableById: async (id) => (id === 'v-base' ? target : null),
      })
    );
    expect(idx.tokens).toHaveLength(1);
    expect(idx.tokens[0]!.name).toBe('text/default');
    expect(idx.tokens[0]!.color.r).toBeCloseTo(0.2, 6);
  });

  it('drops circular alias chains instead of hanging', async () => {
    const a = colorVar('va', 'a', { type: 'VARIABLE_ALIAS', id: 'vb' });
    const b = colorVar('vb', 'b', { type: 'VARIABLE_ALIAS', id: 'va' });
    const idx = await harvestTokens(
      api({
        getLocalColorVariables: async () => [a],
        getVariableById: async (id) => (id === 'va' ? a : id === 'vb' ? b : null),
      })
    );
    expect(idx.tokens).toHaveLength(0);
  });

  it('drops variables whose collection is missing', async () => {
    const idx = await harvestTokens(
      api({
        getLocalColorVariables: async () => [colorVar('v1', 'x', { r: 0, g: 0, b: 0 })],
        getCollection: async () => null,
      })
    );
    expect(idx.tokens).toHaveLength(0);
  });
});

describe('harvestTokens — paint styles', () => {
  it('harvests single-solid opaque styles', async () => {
    const idx = await harvestTokens(
      api({
        getLocalPaintStyles: async () => [
          { id: 's1', name: 'Text/Primary', paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] },
        ],
      })
    );
    expect(idx.tokens).toHaveLength(1);
    expect(idx.tokens[0]).toMatchObject({ id: 's1', kind: 'style' });
  });

  it('skips multi-paint styles, non-solid, invisible, and translucent styles', async () => {
    const idx = await harvestTokens(
      api({
        getLocalPaintStyles: async () => [
          {
            id: 's-multi',
            name: 'multi',
            paints: [
              { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
              { type: 'SOLID', color: { r: 1, g: 1, b: 1 } },
            ],
          },
          { id: 's-grad', name: 'grad', paints: [{ type: 'GRADIENT_LINEAR' }] },
          { id: 's-hidden', name: 'hidden', paints: [{ type: 'SOLID', visible: false, color: { r: 0, g: 0, b: 0 } }] },
          { id: 's-alpha', name: 'alpha', paints: [{ type: 'SOLID', opacity: 0.5, color: { r: 0, g: 0, b: 0 } }] },
        ],
      })
    );
    expect(idx.tokens).toHaveLength(0);
  });
});
