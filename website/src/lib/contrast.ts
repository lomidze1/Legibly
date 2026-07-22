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
 * Brand tokens. globals.css mirrors these values; the unit test audits
 * every pair used on the site. Change a color here and in globals.css
 * together, and the test tells you if the site stopped passing.
 */
export const tokens = {
  bg: "#fcfcfc",
  surface: "#ffffff",
  tint: "#f2f3f1",
  text: "#191c20",
  textMuted: "#4b5158",
  accent: "#1e40af",
  accentHover: "#1d4ed8",
  accentTint: "#eef2fd",
  fail: "#b42318",
  failTint: "#fdf1f0",
  review: "#92400e",
  reviewTint: "#fdf3e7",
  pass: "#166534",
  passTint: "#eefaf1",
  onAccent: "#ffffff",
} as const;
