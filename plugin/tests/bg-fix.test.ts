/**
 * v0.2 Phase E verify: background-adjust fix (F13 step 3).
 * The frame-wide invariant: a candidate commits only when the target text
 * passes AND nothing that passed before regresses — probing always restores
 * the original fill.
 */
import { describe, expect, it } from 'vitest';
import { findBgOwner, planBgFix } from '../src/main/bg-fix';
import type { Settings, TokenCandidate } from '../src/shared/types';
import { wcagRatio } from '../src/shared/contrast';
import { hexToRgba } from '../src/shared/fix';
import { box, node, page, solid, text } from './helpers';

const AA: Settings = { level: 'AA', strictMode: false };

const MID_GRAY = { r: 0.5, g: 0.5, b: 0.5 };
const NEAR_WHITE = { r: 0.98, g: 0.98, b: 0.98 };

const token = (id: string, name: string, hex: string): TokenCandidate => ({
  id,
  kind: 'variable',
  name,
  color: hexToRgba(hex),
});

/** #777 text on a mid-gray card — unfixable by fg (AAA 7:1 window closed at AA too for grays near bg). */
function midGrayScene(extraTexts: ReturnType<typeof text>[] = []) {
  const target = text({ name: 'target', fills: [solid({ r: 0.45, g: 0.45, b: 0.45 })], absoluteBoundingBox: box(20, 20, 80, 16) });
  const card = node({
    type: 'FRAME',
    name: 'card',
    fills: [solid(MID_GRAY)],
    absoluteBoundingBox: box(0, 0, 300, 200),
    children: [target, ...extraTexts],
  });
  page([card]);
  return { target, card };
}

describe('findBgOwner', () => {
  it('finds the nearest ancestor whose top solid fill IS the effective bg', () => {
    const { target, card } = midGrayScene();
    expect(findBgOwner(target)?.id).toBe(card.id);
  });

  it('returns null when the backdrop is a gradient', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 80, 16) });
    page([
      node({
        type: 'FRAME',
        fills: [
          {
            type: 'GRADIENT_LINEAR',
            gradientStops: [
              { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
              { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
            ],
          },
        ],
        absoluteBoundingBox: box(0, 0, 300, 200),
        children: [t],
      }),
    ]);
    expect(findBgOwner(t)).toBeNull();
  });

  it('returns null when a translucent layer sits between text and owner', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 80, 16) });
    const veil = node({
      type: 'RECTANGLE',
      fills: [solid({ r: 1, g: 1, b: 1 }, { opacity: 0.5 })],
      absoluteBoundingBox: box(0, 0, 300, 200),
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(MID_GRAY)],
        absoluteBoundingBox: box(0, 0, 300, 200),
        children: [veil, t],
      }),
    ]);
    expect(findBgOwner(t)).toBeNull();
  });
});

describe('planBgFix', () => {
  it('picks a bg token that fixes the target and regresses nothing', () => {
    const { target, card } = midGrayScene();
    const tokens = [token('t-light', 'surface/light', '#fafafa')];
    const plan = planBgFix(target, tokens, AA, 4.5, hexToRgba('#737373'));
    expect(plan).not.toBeNull();
    expect(plan!.token.id).toBe('t-light');
    expect(plan!.ownerId).toBe(card.id);
    expect(plan!.verifiedRatio).toBeGreaterThanOrEqual(4.5);
    // the probe restored the original fill
    expect((card.fills as { color: typeof MID_GRAY }[])[0]!.color).toEqual(MID_GRAY);
  });

  it('rejects a candidate that would break ANOTHER text on the frame', () => {
    // a large white sibling text passes 3:1 on mid-gray; a light background
    // would fix the target but break the sibling → candidate refused.
    const sibling = text({
      name: 'sibling',
      fills: [solid(NEAR_WHITE)],
      fontSize: 24, // large text → 3:1 gate
      absoluteBoundingBox: box(120, 20, 80, 30),
    });
    const { target } = midGrayScene([sibling]);
    // sanity: sibling passes on mid-gray, would fail on the light candidate
    expect(wcagRatio({ ...NEAR_WHITE, a: 1 }, { ...MID_GRAY, a: 1 })).toBeGreaterThanOrEqual(3);
    expect(wcagRatio({ ...NEAR_WHITE, a: 1 }, hexToRgba('#fafafa'))).toBeLessThan(3);
    const tokens = [token('t-light', 'surface/light', '#fafafa')];
    const plan = planBgFix(target, tokens, AA, 4.5, hexToRgba('#737373'));
    expect(plan).toBeNull(); // light bg would regress the sibling → refused
  });

  it('returns null when no token can fix the target', () => {
    const { target } = midGrayScene();
    const tokens = [token('t-same', 'surface/same', '#808080')];
    const plan = planBgFix(target, tokens, AA, 4.5, hexToRgba('#737373'));
    expect(plan).toBeNull();
  });

  it('always restores the original fill even when scanning throws midway', () => {
    const { target, card } = midGrayScene();
    const tokens = [token('t-light', 'surface/light', '#fafafa'), token('t-dark', 'surface/dark', '#111111')];
    planBgFix(target, tokens, AA, 4.5, hexToRgba('#737373'));
    expect((card.fills as { color: typeof MID_GRAY }[])[0]!.color).toEqual(MID_GRAY);
  });
});

/**
 * `checkedCount` is what the UI turns into "N other layers on this frame
 * re-verified, none break". It was summing the regression baseline's
 * probePasses map, which by construction holds only the FAILING probes — so
 * the number the user read was smaller than the work actually done.
 */
describe('planBgFix — the re-verified count', () => {
  it('counts the 1.4.11 probes that passed, not only the ones that failed', () => {
    const { target, card } = midGrayScene();
    // A button with a dark icon on the same card: one probe, and it passes.
    const icon = node({
      type: 'VECTOR',
      name: 'chevron',
      fills: [solid({ r: 0, g: 0, b: 0 })],
      absoluteBoundingBox: box(200, 20, 16, 16),
    });
    const button = node({
      type: 'FRAME',
      name: 'Buy',
      reactions: [{ trigger: 'ON_CLICK' }],
      fills: [],
      absoluteBoundingBox: box(190, 10, 40, 40),
      children: [icon],
    });
    card.children = [...(card.children ?? []), button];
    page([card]);

    const plan = planBgFix(
      target,
      [token('t-white', 'surface/page', '#ffffff')],
      AA,
      4.5,
      hexToRgba('#737373'),
    );

    expect(plan).not.toBeNull();
    // 1 text layer + 1 passing probe. Counting probePasses alone would say 1.
    expect(plan!.checkedCount).toBe(2);
  });
});
