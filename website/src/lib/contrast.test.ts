import { describe, expect, it } from "vitest";
import { contrastRatio, formatRatio, tokens } from "./contrast";

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // Symmetric: order of arguments must not matter.
    expect(contrastRatio("#1e40af", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#1e40af"),
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
 * The site's own accessibility audit. Every foreground/background pair
 * actually used on the page must hold the level we claim in public:
 * AAA (7:1) for body text, AA (4.5:1) for short bold labels and buttons.
 */
describe("brand token contrast audit", () => {
  const bodyPairs: Array<[string, string, string]> = [
    ["text on bg", tokens.text, tokens.bg],
    ["text on surface", tokens.text, tokens.surface],
    ["text on tint", tokens.text, tokens.tint],
    ["muted text on bg", tokens.textMuted, tokens.bg],
    ["muted text on surface", tokens.textMuted, tokens.surface],
    ["muted text on tint", tokens.textMuted, tokens.tint],
    ["links (accent) on bg", tokens.accent, tokens.bg],
    ["accent text on accent tint", tokens.accent, tokens.accentTint],
    // Body copy in .compareUs, .finalCta and .cellTinted sits on the accent
    // tint. It was missing here while the footer claimed every pair passes.
    ["muted text on accent tint", tokens.textMuted, tokens.accentTint],
  ];

  /**
   * Short bold labels and controls, held to AA. The verdict chips live here
   * on purpose: at 17px/700 they are labels, not body copy, so the AAA floor
   * the brand claims for prose does not apply to them.
   */
  const labelPairs: Array<[string, string, string]> = [
    ["button text on accent", tokens.onAccent, tokens.accent],
    ["button text on accent hover", tokens.onAccent, tokens.accentHover],
    ["fail label on bg", tokens.fail, tokens.bg],
    ["fail label on fail tint", tokens.fail, tokens.failTint],
    ["review label on bg", tokens.review, tokens.bg],
    ["review label on review tint", tokens.review, tokens.reviewTint],
    ["pass label on bg", tokens.pass, tokens.bg],
    ["pass label on pass tint", tokens.pass, tokens.passTint],
  ];

  it.each(bodyPairs)("%s passes AAA (7:1)", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(7);
  });

  it.each(labelPairs)("%s passes AA (4.5:1)", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
