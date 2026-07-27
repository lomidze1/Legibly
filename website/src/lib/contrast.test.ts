import { describe, expect, it } from "vitest";
import { contrastRatio, formatRatio, tokens } from "./contrast";

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // Symmetric: order of arguments must not matter.
    expect(contrastRatio("#b68235", "#f3f2f2")).toBeCloseTo(
      contrastRatio("#f3f2f2", "#b68235"),
      10,
    );
  });
});

describe("formatRatio", () => {
  it("truncates to one decimal like the plugin readout", () => {
    expect(formatRatio(8.29)).toBe("8.2:1");
    expect(formatRatio(4.5)).toBe("4.5:1");
  });
});

/**
 * The site's own accessibility audit. The page claims to pass the same nine
 * checks the plugin performs, which makes this an acceptance criterion rather
 * than a nicety. Every foreground/background pair actually used on the page
 * is held to WCAG 2.2 AA for its size class.
 *
 * Three grounds carry text: --color-bg (the page), --color-neutral-100 (the
 * hero panel) and the 6% accent tint (the "Legibly" comparison card).
 */
describe("brand token contrast audit", () => {
  /** Text below 24px — AA needs 4.5:1. */
  const bodyPairs: Array<[string, string, string]> = [
    ["text on bg", tokens.text, tokens.bg],
    ["body copy (neutral-800) on bg", tokens.neutral800, tokens.bg],
    ["small text (neutral-700) on bg", tokens.neutral700, tokens.bg],
    ["accent text (accent-700) on bg", tokens.accent700, tokens.bg],
    ["link hover (accent-800) on bg", tokens.accent800, tokens.bg],

    ["text on the hero panel", tokens.text, tokens.neutral100],
    ["body copy on the hero panel", tokens.neutral800, tokens.neutral100],
    ["small text on the hero panel", tokens.neutral700, tokens.neutral100],
    ["accent text on the hero panel", tokens.accent700, tokens.neutral100],

    ["body copy on the accent tint", tokens.neutral800, tokens.accentTint],
    ["accent text on the accent tint", tokens.accent700, tokens.accentTint],
  ];

  /**
   * Non-text and large text — AA needs 3:1. The accent itself only ever
   * appears as a rule, a border, the focus ring, or a numeral at 34px+.
   */
  const largePairs: Array<[string, string, string]> = [
    ["accent rules and borders on bg", tokens.accent, tokens.bg],
    ["the hero ratio (34px) on the hero panel", tokens.accent, tokens.neutral100],
    ["the Pro price (46px) on bg", tokens.accent, tokens.bg],
  ];

  it.each(bodyPairs)("%s passes AA (4.5:1)", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(largePairs)("%s passes AA for non-text (3:1)", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  /**
   * The accent is legal as a rule and illegal as small text. This is the
   * whole reason accent-700 exists — assert the trap is still a trap so
   * nobody "simplifies" the two tokens back into one.
   */
  it("bans --color-accent for text below 24px", () => {
    expect(contrastRatio(tokens.accent, tokens.bg)).toBeLessThan(4.5);
  });

  /**
   * neutral-600 was removed during design review. If it ever comes back for
   * text, this test is the reason it should not.
   */
  it("bans --color-neutral-600 for text anywhere", () => {
    expect(contrastRatio(tokens.neutral600, tokens.bg)).toBeLessThan(4.5);
  });
});

/**
 * The hero specimen is a deliberate failure — the thing the plugin catches —
 * and the panel prints its ratio as "2.4:1" in copy. If the palette moves,
 * the printed number has to move with it, so pin the measurement here.
 */
describe("the hero specimen", () => {
  const ratio = contrastRatio(tokens.neutral500, tokens.surface);

  it("still measures the 2.4:1 the panel prints", () => {
    expect(Math.round(ratio * 10) / 10).toBe(2.4);
  });

  it("still fails AA, which is the entire point", () => {
    expect(ratio).toBeLessThan(4.5);
  });
});
