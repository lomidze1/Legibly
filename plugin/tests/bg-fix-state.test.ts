/**
 * The frame-wide regression baseline behind the background fix (F13 step 3).
 * `planBgFix` is only as safe as these two: frameState has to notice what
 * currently passes, and noRegression has to distinguish "was already broken"
 * from "this fix broke it".
 */
import { describe, expect, it } from 'vitest';
import { frameState, noRegression } from '../src/main/bg-fix';
import type { Settings } from '../src/shared/types';
import { GRAY_76, GRAY_77, WHITE, box, node, page, solid, text } from './helpers';

const AA: Settings = { level: 'AA', strictMode: false, targetFloor: 24 };

const PALE = { r: 0.85, g: 0.85, b: 0.85 }; // ~1.4:1 on white — fails 1.4.11
const INK = { r: 0.1, g: 0.1, b: 0.1 };

/** A frame under a white page — findExportRoot's shape, without the export. */
function frameWith(children: ReturnType<typeof node>[]) {
  const frame = node({
    type: 'FRAME',
    name: 'Screen',
    fills: [solid(WHITE)],
    absoluteBoundingBox: box(0, 0, 400, 300),
    children,
  });
  page([frame]);
  return frame;
}

function icon(id: string, fill: { r: number; g: number; b: number }) {
  return node({
    id,
    type: 'VECTOR',
    name: `icon-${id}`,
    fills: [solid(fill)],
    absoluteBoundingBox: box(20, 20, 16, 16),
  });
}

/** A prototype-linked button — collectTargets marks it certain. */
function button(id: string, children: ReturnType<typeof node>[]) {
  return node({
    id,
    type: 'FRAME',
    name: 'Buy',
    reactions: [{ trigger: 'ON_CLICK' }],
    fills: [],
    absoluteBoundingBox: box(10, 10, 120, 40),
    children,
  });
}

describe('frameState', () => {
  it('records the pass/fail verdict of every text on the frame', () => {
    const ok = text({ id: 'ok', fills: [solid(GRAY_76)] }); // 4.54:1 → passes AA
    const bad = text({ id: 'bad', fills: [solid(GRAY_77)] }); // 4.48:1 → fails AA
    const state = frameState(frameWith([ok, bad]), AA);
    expect(state.textPasses.get('ok')).toBe(true);
    expect(state.textPasses.get('bad')).toBe(false);
    expect(state.textPasses.size).toBe(2);
  });

  it('records failing 1.4.11 probes, keyed by node and paint target', () => {
    const state = frameState(frameWith([button('btn', [icon('pale', PALE)])]), AA);
    expect([...state.probePasses.keys()]).toEqual(['pale:shape-fill']);
  });

  it('keeps passing probes OUT of the map — only failures are the baseline', () => {
    const state = frameState(frameWith([button('btn', [icon('ink', INK)])]), AA);
    expect(state.probePasses.size).toBe(0);
  });

  it('an empty frame has nothing to protect', () => {
    const state = frameState(frameWith([]), AA);
    expect(state.textPasses.size).toBe(0);
    expect(state.probePasses.size).toBe(0);
  });
});

describe('noRegression', () => {
  const state = (
    texts: [string, boolean][],
    probes: string[] = []
  ): ReturnType<typeof frameState> => ({
    textPasses: new Map(texts),
    probePasses: new Map(probes.map((k) => [k, false])),
  });

  it('an unchanged frame is no regression', () => {
    const before = state([['a', true], ['b', false]], ['icon:shape-fill']);
    expect(noRegression(before, before)).toBe(true);
  });

  it('a text that passed and now fails IS a regression', () => {
    expect(noRegression(state([['a', true]]), state([['a', false]]))).toBe(false);
  });

  it('a text that already failed and still fails is not a regression', () => {
    expect(noRegression(state([['a', false]]), state([['a', false]]))).toBe(true);
  });

  it('a text that was failing and now passes is an improvement, not a regression', () => {
    expect(noRegression(state([['a', false]]), state([['a', true]]))).toBe(true);
  });

  it('a text that disappeared from the after-state is not counted as broken', () => {
    expect(noRegression(state([['a', true]]), state([]))).toBe(true);
  });

  it('a newly failing icon probe IS a regression', () => {
    expect(noRegression(state([], []), state([], ['icon:shape-fill']))).toBe(false);
  });

  it('a probe that was already failing is not a new regression', () => {
    const before = state([], ['icon:shape-fill']);
    expect(noRegression(before, state([], ['icon:shape-fill']))).toBe(true);
  });

  it('a probe that stopped failing is an improvement', () => {
    expect(noRegression(state([], ['icon:shape-fill']), state([], []))).toBe(true);
  });

  it('a stroke and a fill on the same node are tracked separately', () => {
    const before = state([], ['btn:stroke']);
    expect(noRegression(before, state([], ['btn:stroke', 'btn:shape-fill']))).toBe(false);
  });
});
