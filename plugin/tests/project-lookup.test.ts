/**
 * The two lookups the mode sweep runs per scan: indexById (one walk, then
 * O(1) per finding) and findInTree (locating the mirror of a scan root).
 * Both must return the MIRROR nodes, never the live ones — a fix measured on
 * a live node would be measured in the mode already on screen.
 */
import { describe, expect, it } from 'vitest';
import { findInTree, indexById, ModeSlice, projectTree } from '../src/shared/project';
import { BLACK, WHITE, box, node, page, rgba, solid, text } from './helpers';

const slice: ModeSlice = {
  collectionId: 'col1',
  modeId: 'dark',
  colors: new Map([['v-surface', rgba(0, 0, 0, 1)]]),
};

/** page > frame > [card > text, label] */
function tree() {
  const inner = text({ id: 'txt', name: 'headline' });
  const card = node({ id: 'card', type: 'FRAME', absoluteBoundingBox: box(0, 0, 100, 100), children: [inner] });
  const label = text({ id: 'label', name: 'caption' });
  const frame = node({
    id: 'frame',
    type: 'FRAME',
    fills: [solid(WHITE)],
    absoluteBoundingBox: box(0, 0, 400, 300),
    children: [card, label],
  });
  const root = page([frame]);
  return { root, frame, card, inner, label };
}

describe('indexById', () => {
  it('indexes the root and every descendant', () => {
    const { root, frame, card, inner, label } = tree();
    const index = indexById(root);
    expect(index.size).toBe(5);
    expect(index.get('frame')).toBe(frame);
    expect(index.get('card')).toBe(card);
    expect(index.get('txt')).toBe(inner);
    expect(index.get('label')).toBe(label);
    expect(index.get(root.id)).toBe(root);
  });

  it('a leaf indexes to itself alone', () => {
    const leaf = text({ id: 'solo' });
    expect([...indexById(leaf).keys()]).toEqual(['solo']);
  });

  it('indexes the projected mirror, not the live tree', () => {
    const { root } = tree();
    const mirror = projectTree(root, slice);
    const live = indexById(root);
    const mirrored = indexById(mirror);
    expect(mirrored.size).toBe(live.size);
    expect(mirrored.get('txt')).not.toBe(live.get('txt'));
    expect(mirrored.get('txt')!.name).toBe('headline');
  });
});

describe('findInTree', () => {
  it('finds several ids in one walk', () => {
    const { root } = tree();
    const found = findInTree(root, new Set(['card', 'label']));
    expect(found.map((n) => n.id).sort()).toEqual(['card', 'label']);
  });

  it('matches the root itself when its id is asked for', () => {
    const { root } = tree();
    expect(findInTree(root, new Set([root.id])).map((n) => n.id)).toEqual([root.id]);
  });

  it('returns nothing for ids that are not in this tree', () => {
    const { root } = tree();
    expect(findInTree(root, new Set(['nope']))).toEqual([]);
    expect(findInTree(root, new Set())).toEqual([]);
  });

  it('returns the mirror node for a scan root after projection', () => {
    const { root, card } = tree();
    const mirror = projectTree(root, slice);
    const [found] = findInTree(mirror, new Set(['card']));
    expect(found).toBeDefined();
    expect(found).not.toBe(card);
    expect(found!.id).toBe('card');
    // and it is still walkable upward, so the resolver can reach the page
    expect(found!.parent?.id).toBe('frame');
  });

  it('a subtree marked invisible by a mode pin is still findable', () => {
    const pinned = text({ id: 'pinned', explicitVariableModes: { col1: 'light' } });
    const frame = node({
      id: 'frame',
      type: 'FRAME',
      fills: [solid(BLACK)],
      absoluteBoundingBox: box(0, 0, 100, 100),
      children: [pinned],
    });
    const root = page([frame]);
    const [found] = findInTree(projectTree(root, slice), new Set(['pinned']));
    expect(found!.visible).toBe(false);
  });
});
