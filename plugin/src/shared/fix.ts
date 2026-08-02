/**
 * Fix engine (F11–F14) — correctness-by-construction.
 *
 * Candidate generators are ordered per requirements F13:
 *   same-role ramp step → nearest passing token (hue-filtered) →
 *   any nearest passing token → minimal new-token proposal (D8) → escalate.
 * Every candidate is judged by the SAME deterministic check that flagged
 * the violation (remediation research §2.1): a candidate that does not
 * re-measure as passing is discarded — it can never reach the canvas.
 */
import { clampChroma, differenceEuclidean, formatHex, oklch } from 'culori';
import type {
  Finding,
  FixCandidateResult,
  FixPlan,
  RGBA,
  Settings,
  TokenCandidate,
} from './types';
import { toCulori, wcagRatio } from './contrast';

const perceptualDistance = differenceEuclidean('oklch');

function dist(a: RGBA, b: RGBA): number {
  return perceptualDistance(toCulori(a), toCulori(b));
}

function toOklch(c: RGBA): { l: number; c: number; h?: number } {
  const v = oklch(toCulori(c));
  return { l: v?.l ?? 0, c: v?.c ?? 0, h: v?.h };
}

/** Hue distance in degrees, achromatic-aware (chroma < 0.03 ≈ no hue). */
export function hueCompatible(a: RGBA, b: RGBA, toleranceDeg: number): boolean {
  const oa = toOklch(a);
  const ob = toOklch(b);
  const aAchromatic = oa.c < 0.03 || oa.h === undefined;
  const bAchromatic = ob.c < 0.03 || ob.h === undefined;
  if (aAchromatic || bAchromatic) return aAchromatic && bAchromatic;
  const d = Math.abs(((oa.h! - ob.h!) % 360 + 540) % 360 - 180);
  return d <= toleranceDeg;
}

/** "text/muted" → "text"; "gray-600" → "gray"; used for same-ramp matching. */
export function rampPrefix(name: string): string | null {
  const m = name.match(/^(.*?)[/._-]([^/._-]+)$/);
  return m ? m[1]! : null;
}

/** Worst-case ratio of a color against every sampled background. */
export function minRatioOver(fg: RGBA, bgs: readonly RGBA[]): number {
  let min = Infinity;
  for (const bg of bgs) min = Math.min(min, wcagRatio(fg, bg));
  return min;
}

/**
 * One situation a fix has to survive: a variable mode (`''` = the mode on
 * screen) and the backgrounds measured in it. A gradient contributes several
 * samples to one context; a theme contributes a whole extra context.
 */
export interface FixContext {
  mode: string;
  bgs: readonly RGBA[];
}

/**
 * Every context the finding must be fixed in. On an unthemed file this is the
 * single situation we measured; on a themed one it is every mode, so a fix can
 * never repair the visible theme at another theme's expense.
 */
export function contextsOf(finding: Finding): FixContext[] {
  if (finding.bgByMode) {
    const out = Object.entries(finding.bgByMode)
      .filter(([, bgs]) => bgs.length > 0)
      .map(([mode, bgs]) => ({ mode, bgs }));
    if (out.length > 0) return out;
  }
  const bgs = finding.bgSamples?.length ? finding.bgSamples : finding.bg ? [finding.bg] : [];
  return [{ mode: '', bgs }];
}

/** What a token resolves to in one mode — its own value there, or its only one. */
export function colorInMode(token: TokenCandidate, mode: string): RGBA {
  return token.colorsByMode?.[mode] ?? token.color;
}

/**
 * Worst ratio a candidate achieves across every context. A token is judged
 * with its own per-mode value; a proposed raw colour is the same everywhere.
 */
function worstRatio(
  candidate: { token?: TokenCandidate; color: RGBA },
  contexts: readonly FixContext[]
): number {
  let min = Infinity;
  for (const ctx of contexts) {
    const color = candidate.token ? colorInMode(candidate.token, ctx.mode) : candidate.color;
    min = Math.min(min, minRatioOver(color, ctx.bgs));
  }
  return min;
}

/**
 * Algorithm A (remediation research §1.1): minimal perceptual adjustment —
 * binary search on OKLCH lightness, hue held constant, chroma clamped into
 * gamut. Accepts one bg or all gradient samples; the candidate must pass
 * against EVERY sample. Returns null when even the extreme endpoint cannot
 * reach the target (mid-gray or light-to-dark gradient backgrounds).
 */
export function minimalContrastFix(fg: RGBA, bg: RGBA | readonly RGBA[], target: number): RGBA | null {
  const bgs = Array.isArray(bg) ? (bg as readonly RGBA[]) : [bg as RGBA];
  if (bgs.length === 0) return null;
  const avgBgL = bgs.reduce((s, b) => s + toOklch(b).l, 0) / bgs.length;
  const c = oklch(toCulori(fg));
  if (!c) return null;
  const goDarker = avgBgL >= 0.5;

  const candidateAt = (l: number): RGBA => {
    const clamped = clampChroma({ ...c, l }, 'oklch');
    const hex = formatHex(clamped);
    return hexToRgba(hex);
  };

  const endpoint = candidateAt(goDarker ? 0 : 1);
  if (minRatioOver(endpoint, bgs) < target) return null; // unreachable → escalate

  let lo = goDarker ? 0 : c.l;
  let hi = goDarker ? c.l : 1;
  let best = endpoint;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const cand = candidateAt(mid);
    if (minRatioOver(cand, bgs) >= target) {
      best = cand;
      if (goDarker) lo = mid;
      else hi = mid;
    } else {
      if (goDarker) hi = mid;
      else lo = mid;
    }
  }
  return best;
}

export function hexToRgba(hex: string): RGBA {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
}

export function rgbaToHex(c: RGBA): string {
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
}

interface Candidate {
  strategy: FixCandidateResult['strategy'];
  token?: TokenCandidate;
  color: RGBA;
}

/**
 * Build the ordered candidate list for a contrast violation.
 * `currentTokenName` — name of the token currently bound to the text fill,
 * when known; enables the same-ramp step.
 */
function orderedCandidates(
  fg: RGBA,
  contexts: readonly FixContext[],
  required: number,
  tokens: TokenCandidate[],
  currentTokenName?: string
): Candidate[] {
  const passing = tokens.filter((t) => worstRatio({ token: t, color: t.color }, contexts) >= required);
  const byDistance = (a: TokenCandidate, b: TokenCandidate) => dist(fg, a.color) - dist(fg, b.color);

  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (strategy: Candidate['strategy'], token: TokenCandidate) => {
    if (seen.has(token.id)) return;
    seen.add(token.id);
    out.push({ strategy, token, color: token.color });
  };

  // 1. Same-role ramp step: tokens sharing the current token's name prefix.
  if (currentTokenName) {
    const prefix = rampPrefix(currentTokenName);
    if (prefix) {
      passing
        .filter((t) => rampPrefix(t.name) === prefix && t.name !== currentTokenName)
        .sort(byDistance)
        .forEach((t) => push('same-ramp', t));
    }
  }
  // 2. Nearest passing token, hue-filtered (±30° — preserves brand hue, RM2).
  passing
    .filter((t) => hueCompatible(fg, t.color, 30))
    .sort(byDistance)
    .forEach((t) => push('nearest-token', t));
  // 3. Any nearest passing token (cross-hue fallback).
  passing.sort(byDistance).forEach((t) => push('any-token', t));
  return out;
}

/**
 * Plan a fix for a certain violation. Pure — never touches the canvas.
 * The verification loop: each candidate is re-measured with the SAME
 * wcagRatio check; the first that passes wins (F12). When no on-system
 * token passes: propose a minimal new token unless strict mode (D8/F14).
 */
export function planFix(
  finding: Finding,
  tokens: TokenCandidate[],
  settings: Settings,
  currentTokenName?: string
): FixPlan {
  if (finding.tier !== 'violation' || !finding.fg || !finding.bg || !finding.requiredRatio) {
    return {
      nodeId: finding.nodeId,
      status: 'unfixable',
      before: { ratio: finding.ratio ?? 0, requiredRatio: finding.requiredRatio ?? 0 },
    };
  }
  const { fg, bg, requiredRatio: required } = finding;
  // The fix must hold against every sampled background — across a gradient,
  // and across every variable mode the file defines.
  const contexts = contextsOf(finding);
  const bgs: readonly RGBA[] = finding.bgSamples?.length ? finding.bgSamples : [bg];
  const before = { ratio: finding.ratio ?? minRatioOver(fg, bgs), requiredRatio: required };

  for (const cand of orderedCandidates(fg, contexts, required, tokens, currentTokenName)) {
    // RE-RUN THE EXACT SAME CHECK — the judge, not the generator, authorizes.
    const verifiedRatio = worstRatio(cand, contexts);
    if (verifiedRatio >= required) {
      return {
        nodeId: finding.nodeId,
        status: 'fixable',
        candidate: { strategy: cand.strategy, token: cand.token, verifiedRatio },
        before,
      };
    }
  }

  // No on-system token passes. D8: propose a minimal-change new token —
  // unless strict mode forbids novel values (F14) → escalate.
  if (!settings.strictMode) {
    // A proposed colour is one literal value, identical in every mode, so it
    // has to clear the union of every context's backgrounds at once.
    const allBgs = contexts.flatMap((c) => [...c.bgs]);
    const proposed = minimalContrastFix(fg, allBgs, required);
    if (proposed) {
      const verifiedRatio = worstRatio({ color: proposed }, contexts);
      if (verifiedRatio >= required) {
        return {
          nodeId: finding.nodeId,
          status: 'needs-proposal',
          proposal: { strategy: 'new-token-proposal', proposedColor: proposed, verifiedRatio },
          before,
        };
      }
    }
  }
  return { nodeId: finding.nodeId, status: 'unfixable', before };
}
