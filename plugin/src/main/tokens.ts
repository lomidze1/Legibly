/**
 * Token harvester (F11 groundwork): reads local color variables and paint
 * styles into a serializable TokenCandidate index. Abstracted over a slim
 * API surface so the resolution logic is unit-testable without `figma`.
 */
import type { RGBA, TokenCandidate, TokenIndex } from '../shared/types';

export interface VariableLite {
  id: string;
  name: string;
  resolvedType: string;
  variableCollectionId: string;
  valuesByMode: Record<string, unknown>;
}

export interface CollectionLite {
  id: string;
  defaultModeId: string;
}

export interface PaintStyleLite {
  id: string;
  name: string;
  paints: readonly { type: string; visible?: boolean; opacity?: number; color?: { r: number; g: number; b: number } }[];
}

export interface TokenSourceApi {
  getLocalColorVariables(): Promise<VariableLite[]>;
  getCollection(id: string): Promise<CollectionLite | null>;
  getVariableById(id: string): Promise<VariableLite | null>;
  getLocalPaintStyles(): Promise<PaintStyleLite[]>;
}

interface VariableAliasValue {
  type: 'VARIABLE_ALIAS';
  id: string;
}

function isAlias(v: unknown): v is VariableAliasValue {
  return !!v && (v as VariableAliasValue).type === 'VARIABLE_ALIAS';
}

function isColorValue(v: unknown): v is { r: number; g: number; b: number; a?: number } {
  const c = v as { r?: unknown; g?: unknown; b?: unknown };
  return !!v && typeof c.r === 'number' && typeof c.g === 'number' && typeof c.b === 'number';
}

/** Resolve a variable's color in its collection's default mode, following aliases (≤10 hops). */
async function resolveVariableColor(
  variable: VariableLite,
  api: TokenSourceApi,
  depth = 0
): Promise<RGBA | null> {
  if (depth > 10) return null;
  const collection = await api.getCollection(variable.variableCollectionId);
  if (!collection) return null;
  const value = variable.valuesByMode[collection.defaultModeId] ?? Object.values(variable.valuesByMode)[0];
  if (isAlias(value)) {
    const target = await api.getVariableById(value.id);
    if (!target) return null;
    return resolveVariableColor(target, api, depth + 1);
  }
  if (isColorValue(value)) return { r: value.r, g: value.g, b: value.b, a: value.a ?? 1 };
  return null;
}

export async function harvestTokens(api: TokenSourceApi): Promise<TokenIndex> {
  const tokens: TokenCandidate[] = [];

  for (const variable of await api.getLocalColorVariables()) {
    const color = await resolveVariableColor(variable, api);
    // Only fully opaque tokens are safe snap targets: a translucent fg would
    // change with its backdrop and could silently fail elsewhere (NF3).
    if (color && color.a >= 1) {
      tokens.push({ id: variable.id, kind: 'variable', name: variable.name, color });
    }
  }

  for (const style of await api.getLocalPaintStyles()) {
    if (style.paints.length !== 1) continue;
    const p = style.paints[0]!;
    if (p.type !== 'SOLID' || p.visible === false || !p.color) continue;
    const alpha = typeof p.opacity === 'number' ? p.opacity : 1;
    if (alpha < 1) continue;
    tokens.push({ id: style.id, kind: 'style', name: style.name, color: { ...p.color, a: 1 } });
  }

  return { tokens, empty: tokens.length === 0 };
}

/** Adapter over the real figma global (not unit-tested; exercised in Figma). */
export function figmaTokenSource(): TokenSourceApi {
  return {
    getLocalColorVariables: async () =>
      (await figma.variables.getLocalVariablesAsync('COLOR')) as unknown as VariableLite[],
    getCollection: async (id) =>
      (await figma.variables.getVariableCollectionByIdAsync(id)) as unknown as CollectionLite | null,
    getVariableById: async (id) =>
      (await figma.variables.getVariableByIdAsync(id)) as unknown as VariableLite | null,
    getLocalPaintStyles: async () =>
      (await figma.getLocalPaintStylesAsync()) as unknown as PaintStyleLite[],
  };
}
