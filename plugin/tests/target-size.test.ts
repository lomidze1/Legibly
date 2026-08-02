/**
 * v0.2 Phase A verify: SC 2.5.8 target size — collection, spacing
 * exception, honesty tiers (reactions=certain, name=suspect).
 */
import { describe, expect, it } from 'vitest';
import {
  checkTargetSizes,
  collectTargets,
  spacingExceptionHolds,
  MIN_TARGET_PX,
} from '../src/shared/target-size';
import { box, node, withParents } from './helpers';

const tap = (over: Partial<Parameters<typeof node>[0]> = {}) =>
  node({ type: 'FRAME', reactions: [{ trigger: 'ON_CLICK' }], absoluteBoundingBox: box(0, 0, 20, 20), ...over });

describe('collectTargets', () => {
  it('collects nodes with prototype reactions as certain', () => {
    const b = tap({ name: 'anything' });
    withParents(node({ type: 'PAGE', children: [b] }));
    const targets = collectTargets([b.parent!]);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.certain).toBe(true);
  });

  it('collects interactive-looking names as suspect', () => {
    const b = node({ type: 'FRAME', name: 'Primary Button', absoluteBoundingBox: box(0, 0, 20, 20) });
    const targets = collectTargets([withParents(node({ type: 'PAGE', children: [b] }))]);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.certain).toBe(false);
  });

  it('ignores plain frames and text named like buttons', () => {
    const plain = node({ type: 'FRAME', name: 'hero', absoluteBoundingBox: box(0, 0, 20, 20) });
    const textBtn = node({ type: 'TEXT', name: 'button label', absoluteBoundingBox: box(0, 0, 20, 20) });
    const root = withParents(node({ type: 'PAGE', children: [plain, textBtn] }));
    expect(collectTargets([root])).toHaveLength(0);
  });

  it('collapses nested targets to the outermost (icon inside a button)', () => {
    const icon = node({ type: 'VECTOR', name: 'icon-button', absoluteBoundingBox: box(4, 4, 12, 12) });
    const button = tap({ name: 'Buy', children: [icon], absoluteBoundingBox: box(0, 0, 20, 20) });
    const root = withParents(node({ type: 'PAGE', children: [button] }));
    const targets = collectTargets([root]);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.node.name).toBe('Buy');
  });

  it('collects instances with a State variant axis as suspect', () => {
    const b = node({
      type: 'INSTANCE',
      name: 'Untitled',
      absoluteBoundingBox: box(0, 0, 20, 20),
      componentProperties: { State: { type: 'VARIANT', value: 'Default' } },
    });
    const targets = collectTargets([withParents(node({ type: 'PAGE', children: [b] }))]);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.certain).toBe(false);
  });

  it('does not treat a Status axis as a control — that is the badge convention', () => {
    const badge = node({
      type: 'INSTANCE',
      name: 'Untitled',
      absoluteBoundingBox: box(0, 0, 20, 20),
      componentProperties: { Status: { type: 'VARIANT', value: 'Success' } },
    });
    expect(collectTargets([withParents(node({ type: 'PAGE', children: [badge] }))])).toHaveLength(0);
  });

  it('ignores non-variant component properties', () => {
    const card = node({
      type: 'INSTANCE',
      name: 'Untitled',
      absoluteBoundingBox: box(0, 0, 20, 20),
      componentProperties: { State: { type: 'BOOLEAN', value: true } },
    });
    expect(collectTargets([withParents(node({ type: 'PAGE', children: [card] }))])).toHaveLength(0);
  });

  it('collects form fields — they are controls, and 1.4.11 measures their borders', () => {
    const input = node({ type: 'FRAME', name: 'Email input', absoluteBoundingBox: box(0, 0, 200, 40) });
    const targets = collectTargets([withParents(node({ type: 'PAGE', children: [input] }))]);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.certain).toBe(false);
  });

  it('skips invisible subtrees', () => {
    const b = tap({ visible: false });
    const root = withParents(node({ type: 'PAGE', children: [b] }));
    expect(collectTargets([root])).toHaveLength(0);
  });
});

describe('spacingExceptionHolds — SC 2.5.8 exception', () => {
  it('holds for an isolated undersized target', () => {
    const lone = { node: tap(), certain: true, box: box(100, 100, 20, 20) };
    expect(spacingExceptionHolds(lone, [lone])).toBe(true);
  });

  it('fails when another target crowds the 24px circle', () => {
    const a = { node: tap(), certain: true, box: box(100, 100, 20, 20) };
    const b = { node: tap(), certain: true, box: box(122, 100, 20, 20) }; // 2px gap
    expect(spacingExceptionHolds(a, [a, b])).toBe(false);
  });

  it('holds when neighbors are far enough away', () => {
    const a = { node: tap(), certain: true, box: box(100, 100, 20, 20) };
    const b = { node: tap(), certain: true, box: box(160, 100, 20, 20) }; // 40px gap
    expect(spacingExceptionHolds(a, [a, b])).toBe(true);
  });
});

describe('checkTargetSizes — verdicts', () => {
  it('24×24 and larger passes', () => {
    const ok = { node: tap(), certain: true, box: box(0, 0, 24, 24) };
    const result = checkTargetSizes([ok]);
    expect(result.findings).toHaveLength(0);
    expect(result.passCount).toBe(1);
  });

  it('undersized + certain + crowded → violation with size data', () => {
    const a = { node: tap({ name: 'Tab A', layoutMode: 'HORIZONTAL' }), certain: true, box: box(0, 0, 20, 20) };
    const b = { node: tap({ name: 'Tab B' }), certain: true, box: box(21, 0, 20, 20) };
    const result = checkTargetSizes([a, b]);
    expect(result.findings).toHaveLength(2);
    const first = result.findings[0]!;
    expect(first.tier).toBe('violation');
    expect(first.sc).toBe('2.5.8');
    expect(first.targetSize).toMatchObject({ required: MIN_TARGET_PX, autoFixable: true });
  });

  it('undersized + suspect (name only) → needsReview, never violation', () => {
    const a = { node: node({ type: 'FRAME', name: 'btn-small' }), certain: false, box: box(0, 0, 18, 18) };
    const b = { node: node({ type: 'FRAME', name: 'btn-small-2' }), certain: false, box: box(20, 0, 18, 18) };
    const result = checkTargetSizes([a, b]);
    expect(result.findings.every((f) => f.tier === 'needsReview')).toBe(true);
    expect(result.findings.every((f) => f.reason === 'maybe-interactive')).toBe(true);
  });

  it('undersized but exception holds → pass', () => {
    const lone = { node: tap(), certain: true, box: box(0, 0, 20, 20) };
    const result = checkTargetSizes([lone]);
    expect(result.findings).toHaveLength(0);
    expect(result.passCount).toBe(1);
  });

  it('non-auto-layout violations are flagged as not auto-fixable', () => {
    const a = { node: tap({ layoutMode: 'NONE' }), certain: true, box: box(0, 0, 20, 20) };
    const b = { node: tap(), certain: true, box: box(21, 0, 20, 20) };
    const result = checkTargetSizes([a, b]);
    expect(result.findings[0]!.targetSize!.autoFixable).toBe(false);
  });
});

describe('checkTargetSizes — 44px enhanced floor (SC 2.5.5)', () => {
  it('reports 2.5.5, not 2.5.8, when the enhanced floor is used', () => {
    const a = { node: tap({ layoutMode: 'HORIZONTAL' }), certain: true, box: box(0, 0, 32, 32) };
    const result = checkTargetSizes([a], 44);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.sc).toBe('2.5.5');
    expect(result.findings[0]!.targetSize).toMatchObject({ required: 44 });
  });

  it('does NOT grant the spacing exception — 2.5.5 is size-only', () => {
    const lone = { node: tap(), certain: true, box: box(0, 0, 32, 32) };
    expect(checkTargetSizes([lone], 24).findings).toHaveLength(0); // isolated → 2.5.8 exception
    expect(checkTargetSizes([lone], 44).findings).toHaveLength(1); // 2.5.5 has no exception
  });

  it('44×44 and larger passes the enhanced floor', () => {
    const ok = { node: tap(), certain: true, box: box(0, 0, 44, 44) };
    const result = checkTargetSizes([ok], 44);
    expect(result.findings).toHaveLength(0);
    expect(result.passCount).toBe(1);
  });

  it('keeps the honesty tier — a name-only target is still needsReview', () => {
    const a = { node: node({ type: 'FRAME', name: 'btn' }), certain: false, box: box(0, 0, 30, 30) };
    const result = checkTargetSizes([a], 44);
    expect(result.findings[0]!.tier).toBe('needsReview');
    expect(result.findings[0]!.sc).toBe('2.5.5');
  });
});
