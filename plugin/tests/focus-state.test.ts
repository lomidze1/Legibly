/**
 * Wave 3 verify: SC 2.4.7 focus-state capability — a component set with an
 * interaction-state axis but no Focus variant is flagged; size/type axes and
 * sets that already define focus stay quiet.
 */
import { describe, expect, it } from 'vitest';
import {
  checkComponentSet,
  checkFocusStates,
  FOCUS_SC,
  parseVariantAxes,
} from '../src/shared/focus-state';
import { node, page } from './helpers';

const set = (variantNames: string[], over: Record<string, unknown> = {}) =>
  node({
    type: 'COMPONENT_SET',
    name: 'Button',
    children: variantNames.map((name) => node({ type: 'COMPONENT', name })),
    ...over,
  });

describe('parseVariantAxes', () => {
  it('reads Figma’s "Prop=Value, Prop=Value" variant naming', () => {
    const axes = parseVariantAxes(['State=Hover, Size=Large', 'State=Default, Size=Small']);
    expect([...axes.get('state')!]).toEqual(['Hover', 'Default']);
    expect([...axes.get('size')!]).toEqual(['Large', 'Small']);
  });

  it('ignores names that carry no variant pairs', () => {
    expect(parseVariantAxes(['Button', '']).size).toBe(0);
  });
});

describe('checkComponentSet', () => {
  it('flags a state axis with no focus variant', () => {
    const finding = checkComponentSet(set(['State=Default', 'State=Hover', 'State=Pressed']))!;
    expect(finding).not.toBeNull();
    expect(finding.sc).toBe(FOCUS_SC);
    expect(finding.tier).toBe('needsReview');
    expect(finding.reason).toBe('no-focus-state');
    expect(finding.detail).toContain('no focus state');
  });

  it('stays quiet when a focus variant exists', () => {
    expect(checkComponentSet(set(['State=Default', 'State=Hover', 'State=Focus']))).toBeNull();
    expect(checkComponentSet(set(['State=Default', 'State=Hover', 'State=Focused']))).toBeNull();
    expect(
      checkComponentSet(set(['State=Default', 'State=Hover', 'State=Focus-visible']))
    ).toBeNull();
  });

  it('ignores axes that are not about interaction state', () => {
    expect(checkComponentSet(set(['Size=Small', 'Size=Large']))).toBeNull();
    expect(checkComponentSet(set(['Icon=Left', 'Icon=Right', 'Icon=None']))).toBeNull();
  });

  it('does not treat a mostly-semantic axis as states because one word matches', () => {
    // "Default" is state-like, but Danger/Ghost/Primary are not — 1 of 4.
    expect(
      checkComponentSet(set(['Type=Default', 'Type=Danger', 'Type=Ghost', 'Type=Primary']))
    ).toBeNull();
  });

  it('ignores a set with no variants at all', () => {
    expect(checkComponentSet(node({ type: 'COMPONENT_SET', name: 'Button' }))).toBeNull();
  });
});

describe('checkFocusStates — traversal', () => {
  it('finds component sets nested in the scanned tree', () => {
    const s = set(['State=Default', 'State=Hover']);
    const frame = node({ type: 'FRAME', name: 'Library', children: [s] });
    const root = page([frame]);
    expect(checkFocusStates([root])).toHaveLength(1);
  });

  it('skips hidden component sets', () => {
    const s = set(['State=Default', 'State=Hover'], { visible: false });
    expect(checkFocusStates([page([s])])).toHaveLength(0);
  });
});
