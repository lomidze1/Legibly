/**
 * Deterministic WCAG 2 contrast math (F5, F9).
 * WCAG 2 ratio is the gate; APCA Lc is advisory only (see apca.ts).
 * Uses culori's wcagContrast — the same function is the detector AND the
 * fix verifier (correctness-by-construction, F12/NF1).
 */
import { wcagContrast } from 'culori';
import type { RGBA, WcagLevel } from './types';

/** Alpha-composite `top` over an opaque `bottom` (simple alpha, NORMAL blend). */
export function compositeOver(top: RGBA, bottom: RGBA): RGBA {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
    g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
    b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
    a,
  };
}

/** Flatten a back-to-front stack of layers into one color. Bottom layer first. */
export function flattenStack(layers: RGBA[]): RGBA {
  let acc: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  for (const layer of layers) acc = compositeOver(layer, acc);
  return acc;
}

export function toCulori(c: RGBA): { mode: 'rgb'; r: number; g: number; b: number } {
  return { mode: 'rgb', r: c.r, g: c.g, b: c.b };
}

/**
 * WCAG 2 contrast ratio between a (possibly translucent) fg and an opaque bg.
 * The fg is composited over the bg first, per WCAG's effective-color method.
 */
export function wcagRatio(fg: RGBA, bg: RGBA): number {
  const effFg = fg.a < 1 ? compositeOver(fg, { ...bg, a: 1 }) : fg;
  return wcagContrast(toCulori(effFg), toCulori(bg));
}

/**
 * WCAG "large text": ≥ 24 CSS px, or ≥ 18.66 px (14 pt) with bold weight (≥ 700).
 * (F5; W3C Understanding 1.4.3.)
 */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  if (fontSizePx >= 24) return true;
  return fontSizePx >= 18.66 && fontWeight >= 700;
}

/** Required ratio for text at the given level (SC 1.4.3 AA / 1.4.6 AAA). */
export function requiredRatio(large: boolean, level: WcagLevel): number {
  if (level === 'AAA') return large ? 4.5 : 7;
  return large ? 3 : 4.5;
}

/** The single pass/fail judge — detector and fix verifier share this (NF1). */
export function passesContrast(fg: RGBA, bg: RGBA, required: number): boolean {
  return wcagRatio(fg, bg) >= required;
}
