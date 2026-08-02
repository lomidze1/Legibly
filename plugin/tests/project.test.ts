/**
 * Wave 1 verify: variable-mode projection — the mirror re-colours bound
 * paints, leaves unbound ones alone, keeps the tree walkable, and refuses to
 * project a mode onto a subtree pinned to a different one (F8).
 */
import { describe, expect, it } from 'vitest';
import {
  findInTree,
  ModeSlice,
  projectShallow,
  projectTree,
  touchesModeColors,
} from '../src/shared/project';
import { classifyTextNode } from '../src/shared/classify';
import { DEFAULT_SETTINGS } from '../src/shared/types';
import { BLACK, WHITE, node, page, rgba, solid, text } from './helpers';

const bound = (color: { r: number; g: number; b: number }, variableId: string) =>
  solid(color, { boundVariables: { color: { id: variableId } } } as never);

const slice = (colors: [string, ReturnType<typeof rgba>][]): ModeSlice => ({
  collectionId: 'col1',
  modeId: 'dark',
  colors: new Map(colors),
});

describe('projectTree — re-colouring', () => {
  it('substitutes the mode value of a bound solid paint', () => {
    const t = text({ fills: [bound(BLACK, 'v-text')] });
    const root = page([node({ type: 'FRAME', children: [t], fills: [solid(WHITE)] })]);
    const mirror = projectTree(root, slice([['v-text', rgba(1, 1, 1)]]));
    const mt = findInTree(mirror, new Set([t.id]))[0]!;
    expect((mt.fills as never[])[0]).toMatchObject({ color: { r: 1, g: 1, b: 1 } });
  });

  it('carries the variable alpha into paint opacity', () => {
    const t = text({ fills: [bound(BLACK, 'v-text')] });
    const mirror = projectTree(page([t]), slice([['v-text', rgba(0, 0, 0, 0.4)]]));
    const mt = findInTree(mirror, new Set([t.id]))[0]!;
    expect((mt.fills as { opacity: number }[])[0]!.opacity).toBeCloseTo(0.4);
  });

  it('leaves unbound paints and unknown variables untouched', () => {
    const plain = text({ fills: [solid(BLACK)] });
    const other = text({ fills: [bound(BLACK, 'v-other')] });
    const mirror = projectTree(page([plain, other]), slice([['v-text', rgba(1, 1, 1)]]));
    for (const id of [plain.id, other.id]) {
      const m = findInTree(mirror, new Set([id]))[0]!;
      expect((m.fills as { color: { r: number } }[])[0]!.color.r).toBe(0);
    }
  });

  it('never mutates the source tree', () => {
    const t = text({ fills: [bound(BLACK, 'v-text')] });
    projectTree(page([t]), slice([['v-text', rgba(1, 1, 1)]]));
    expect((t.fills as { color: { r: number } }[])[0]!.color.r).toBe(0);
  });

  it('keeps parents wired so the background resolver can walk up', () => {
    const t = text({ fills: [bound(BLACK, 'v-text')] });
    const frame = node({ type: 'FRAME', children: [t], fills: [bound(WHITE, 'v-bg')] });
    const mirror = projectTree(page([frame]), slice([['v-bg', rgba(0.1, 0.1, 0.1)]]));
    const mt = findInTree(mirror, new Set([t.id]))[0]!;
    expect(mt.parent?.id).toBe(frame.id);
    expect((mt.parent!.fills as { color: { r: number } }[])[0]!.color.r).toBeCloseTo(0.1);
  });
});

describe('projectTree — pinned subtrees (zero false positives)', () => {
  it('marks a subtree pinned to another mode invisible instead of re-colouring', () => {
    const t = text({ fills: [bound(BLACK, 'v-text')] });
    const pinned = node({
      type: 'FRAME',
      children: [t],
      fills: [solid(WHITE)],
      explicitVariableModes: { col1: 'light' },
    });
    const mirror = projectTree(page([pinned]), slice([['v-text', rgba(1, 1, 1)]]));
    const mp = findInTree(mirror, new Set([pinned.id]))[0]!;
    expect(mp.visible).toBe(false);
    // Pruned: the pinned subtree is not mirrored at all, so it is never scanned.
    expect(findInTree(mirror, new Set([t.id]))).toHaveLength(0);
  });

  it('projects normally when the pin matches the mode being projected', () => {
    const t = text({ fills: [bound(BLACK, 'v-text')] });
    const pinned = node({
      type: 'FRAME',
      children: [t],
      fills: [solid(WHITE)],
      explicitVariableModes: { col1: 'dark' },
    });
    const mirror = projectTree(page([pinned]), slice([['v-text', rgba(1, 1, 1)]]));
    const mt = findInTree(mirror, new Set([t.id]))[0]!;
    expect((mt.fills as { color: { r: number } }[])[0]!.color.r).toBe(1);
  });
});

describe('projection feeds the existing detector unchanged', () => {
  it('turns a passing light-mode text into a dark-mode violation', () => {
    const t = text({ fills: [bound(BLACK, 'v-text')] });
    const frame = node({ type: 'FRAME', children: [t], fills: [bound(WHITE, 'v-bg')] });
    const root = page([frame]);

    // As rendered (light): black on white → passes.
    expect(classifyTextNode(t, DEFAULT_SETTINGS).kind).toBe('pass');

    // Dark mode keeps the text near-black but flips the surface to near-black too.
    const mirror = projectTree(
      root,
      slice([
        ['v-text', rgba(0.1, 0.1, 0.1)],
        ['v-bg', rgba(0.05, 0.05, 0.05)],
      ])
    );
    const mt = findInTree(mirror, new Set([t.id]))[0]!;
    const verdict = classifyTextNode(mt, DEFAULT_SETTINGS);
    expect(verdict.kind).toBe('finding');
    expect(verdict.kind === 'finding' && verdict.finding.tier).toBe('violation');
  });
});

describe('touchesModeColors / projectShallow', () => {
  it('detects whether a subtree uses any of the mode variables', () => {
    const usesIt = page([text({ fills: [bound(BLACK, 'v-text')] })]);
    const doesNot = page([text({ fills: [solid(BLACK)] })]);
    const colors = new Map([['v-text', rgba(1, 1, 1)]]);
    expect(touchesModeColors(usesIt, colors)).toBe(true);
    expect(touchesModeColors(doesNot, colors)).toBe(false);
  });

  it('projects a container’s own background without walking its children', () => {
    const child = text();
    const p = node({ type: 'PAGE', children: [child], backgrounds: [bound(WHITE, 'v-page')] });
    const shallow = projectShallow(p, slice([['v-page', rgba(0, 0, 0)]]));
    expect((shallow.backgrounds as { color: { r: number } }[])[0]!.color.r).toBe(0);
    expect(shallow.children).toBeUndefined();
  });
});
