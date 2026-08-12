/**
 * Variable-mode discovery.
 *
 * A themed file keeps its colours in a collection with more than one mode
 * (Light/Dark, brand themes, density…). Only one of them renders at a time, so
 * a plain scan can only ever see one theme. This module resolves every colour
 * variable under each of the other modes, producing the colour maps that
 * `shared/project.ts` uses to re-run the deterministic checks per mode.
 *
 * Read-only: no canvas or variable mutation, so a mode sweep can never dirty
 * the document or the undo stack.
 */
import type { RGBA, TokenCandidate } from '../shared/types';
import type { ModeSlice } from '../shared/project';
import { CollectionLite, TokenSourceApi, resolveVariableColor } from './tokens';

export interface ModeProjection extends ModeSlice {
  /** Stable key, `collectionId:modeId`. */
  key: string;
  /** User-facing label, e.g. "Theme · Dark". */
  label: string;
}

/**
 * Cap on how many extra modes one scan sweeps. Each mode is a full re-scan, so
 * an unbounded sweep would blow the ≤2s scan budget (NF4) on files that use
 * modes for something other than theming (per-brand or per-density collections
 * can carry a dozen). Modes beyond the cap are reported as unchecked rather
 * than silently skipped.
 */
export const MAX_MODE_SWEEP = 4;

function modesOf(collection: CollectionLite): readonly { modeId: string; name: string }[] {
  return collection.modes ?? [];
}

/**
 * Build one projection per mode the canvas is NOT currently showing.
 *
 * `currentModes` (collectionId → modeId) is the mode each collection resolves
 * to on the page right now; those are what the base scan already measured, so
 * sweeping them again would only produce duplicates. Falls back to the
 * collection's default mode when the page pins nothing.
 *
 * Returns `{ projections, skipped }` — `skipped` is the number of modes the
 * cap left out, for the honesty footer.
 */
export async function buildModeProjections(
  api: TokenSourceApi,
  currentModes: ReadonlyMap<string, string> = new Map(),
  cap: number = MAX_MODE_SWEEP
): Promise<{ projections: ModeProjection[]; skipped: number }> {
  const collections = await api.getLocalCollections();
  const themed = collections.filter((c) => modesOf(c).length > 1);
  if (themed.length === 0) return { projections: [], skipped: 0 };

  const variables = await api.getLocalColorVariables();
  if (variables.length === 0) return { projections: [], skipped: 0 };

  const wanted: { collection: CollectionLite; modeId: string; modeName: string }[] = [];
  for (const collection of themed) {
    const showing = currentModes.get(collection.id) ?? collection.defaultModeId;
    for (const mode of modesOf(collection)) {
      if (mode.modeId === showing) continue;
      wanted.push({ collection, modeId: mode.modeId, modeName: mode.name });
    }
  }

  const selected = wanted.slice(0, cap);
  const projections: ModeProjection[] = [];
  let unresolvable = 0;
  for (const { collection, modeId, modeName } of selected) {
    const overrides = new Map([[collection.id, modeId]]);
    const colors = new Map<string, RGBA>();
    for (const variable of variables) {
      const color = await resolveVariableColor(variable, api, overrides);
      if (color) colors.set(variable.id, color);
    }
    // A mode nothing resolves in was not swept, so the footer has to say so —
    // dropping it silently claims coverage the sweep never had.
    if (colors.size === 0) {
      unresolvable++;
      continue;
    }
    projections.push({
      key: `${collection.id}:${modeId}`,
      label: collection.name ? `${collection.name} · ${modeName}` : modeName,
      collectionId: collection.id,
      modeId,
      colors,
    });
  }
  return { projections, skipped: wanted.length - selected.length + unresolvable };
}

/**
 * Give every token the colour it takes in each swept mode, so the fix engine
 * can judge a candidate by the value it will actually have in that theme
 * rather than by the one currently on screen.
 *
 * Paint styles and variables absent from a mode's map do not vary — they keep
 * their single colour in every context.
 */
export function attachModeColors(
  tokens: readonly TokenCandidate[],
  projections: readonly ModeProjection[]
): TokenCandidate[] {
  if (projections.length === 0) return [...tokens];
  return tokens.map((token) => {
    const colorsByMode: Record<string, RGBA> = {};
    for (const projection of projections) {
      const themed = token.kind === 'variable' ? projection.colors.get(token.id) : undefined;
      colorsByMode[projection.key] = themed ?? token.color;
    }
    return { ...token, colorsByMode };
  });
}
