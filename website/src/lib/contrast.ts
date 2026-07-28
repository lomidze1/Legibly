/**
 * WCAG 2.x relative luminance + contrast ratio.
 * Same math the Legibly plugin gates fixes with. The website uses it twice:
 * live numbers in the hero demo, and a unit test that audits every brand
 * token pair so the site itself provably passes what it sells.
 */

export function relativeLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: string, bg: string): number {
  const [hi, lo] = [relativeLuminance(fg), relativeLuminance(bg)].sort(
    (a, b) => b - a,
  );
  return (hi + 0.05) / (lo + 0.05);
}

/** Format a ratio the way the plugin does: "8.5:1" (one decimal). */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
}

/**
 * Brand tokens ("Classical"). globals.css mirrors these values; the unit test
 * audits every pair used on the site. Change a color here and in globals.css
 * together, and the test tells you if the site stopped passing.
 */
export const tokens = {
  bg: "#f3f2f2",
  /** The failing specimen card in the hero panel, and nothing else. */
  surface: "#eae9e9",
  /** The hero panel ground. */
  neutral100: "#f8f4f4",
  text: "#201f1d",
  /** Body paragraphs. */
  neutral800: "#444141",
  /** Small and secondary text. Set to clear AAA (7:1), not just AA. */
  neutral700: "#504d4d",
  /** Retired during design review — 3.85:1. Banned for text; see the test. */
  neutral600: "#7d7979",
  /** The intentionally-failing specimen text. Never used for real copy. */
  neutral500: "#9b9797",
  /** Rules, borders, focus ring, and text at 24px and above. */
  accent: "#b68235",
  /**
   * All accent-colored text below 24px. Set to clear AAA (7:1) on the tightest
   * of the three grounds — the 6% accent tint, where it measures 7.18:1.
   */
  accent700: "#684607",
  /** Link hover. The system's own accent-600 (#a06f24) is only 3.9:1. */
  accent800: "#5a3b0a",
  /** The 6% accent tint on the "Legibly" comparison card, over --color-bg. */
  accentTint: "#efebe7",
} as const;
