/**
 * Shared domain types for Legibly v0.1 "Contrast, fixed right".
 * Grounded in docs/requirements.md §1 and docs/research/wcag-detection-architecture.md §3.
 */

/** Normalized color, all channels 0..1. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type WcagLevel = 'AA' | 'AAA';

/**
 * 3-tier result model (F7):
 * - violation: mathematically certain, deterministic — the zero-false-positive tier (F8)
 * - needsReview: computable suspicion or ambiguous input — never a hard fail
 * - notChecked: out of v0.1 scope — listed so silence never reads as a pass
 */
export type Tier = 'violation' | 'needsReview';

export type NeedsReviewReason =
  | 'gradient-fill'
  | 'gradient-range'
  | 'image-fill'
  | 'video-fill'
  | 'blend-mode'
  | 'mixed-text-properties'
  | 'partial-overlap'
  | 'unresolved-background'
  | 'non-solid-text-fill'
  | 'no-text-fill'
  | 'invisible-text'
  | 'maybe-interactive'
  | 'line-height-floor'
  | 'non-text-judgment';

export interface Finding {
  nodeId: string;
  nodeName: string;
  tier: Tier;
  /** WCAG success criterion, e.g. "1.4.3". */
  sc: string;
  /** Composited effective foreground (opaque). Present on violations. */
  fg?: RGBA;
  /** Composited effective background (opaque). Present on violations. */
  bg?: RGBA;
  /**
   * All sampled backgrounds when the text sits on a gradient (F6 extension):
   * a verdict/fix must hold against EVERY sample. Absent for flat solids.
   */
  bgSamples?: RGBA[];
  /** Measured WCAG 2 contrast ratio. */
  ratio?: number;
  /** Required ratio for this node at the configured level. */
  requiredRatio?: number;
  /** Advisory APCA Lc readout (F9) — never a gate. */
  apcaLc?: number;
  isLargeText?: boolean;
  fontSize?: number;
  /** Why this landed in needsReview. */
  reason?: NeedsReviewReason;
  /** Human-readable detail for the results panel. */
  detail: string;
  /** Name of the token/style currently bound to the fill (same-ramp step, F13). */
  currentTokenName?: string;
  /** Which paint a color fix applies to (1.4.3 text vs 1.4.11 icon/border). */
  paintTarget?: 'text-fill' | 'shape-fill' | 'stroke';
  /** SC 2.5.8 data. */
  targetSize?: { width: number; height: number; required: number; autoFixable: boolean };
  /** SC 1.4.12 data. */
  lineHeight?: { ratio: number; fixable: boolean };
}

export interface ScanReport {
  findings: Finding[];
  /** Count of text nodes that passed the deterministic check. */
  passCount: number;
  /** Nodes scanned in total. */
  scannedCount: number;
  /** Interactive targets examined (2.5.8 / 1.4.11). */
  targetCount: number;
  /** SCs we do not evaluate in v0.1 — transparency footer (F7). */
  notChecked: string[];
  durationMs: number;
}

/** A color the fix engine may snap to: a user variable or paint style (F11). */
export interface TokenCandidate {
  id: string;
  kind: 'variable' | 'style';
  name: string;
  color: RGBA;
}

export interface TokenIndex {
  tokens: TokenCandidate[];
  /** True when the file has no color variables/styles at all. */
  empty: boolean;
}

/** How a fix candidate was derived — drives UI labeling and D8 policy. */
export type FixStrategy =
  | 'same-ramp'
  | 'nearest-token'
  | 'any-token'
  | 'new-token-proposal';

export interface FixCandidateResult {
  strategy: FixStrategy;
  /** Token used, when strategy is token-based. */
  token?: TokenCandidate;
  /** Proposed novel color (only for new-token-proposal, D8). */
  proposedColor?: RGBA;
  /** Verified post-fix ratio — re-measured by the same check (F12/NF1). */
  verifiedRatio: number;
}

export interface FixPlan {
  nodeId: string;
  status: 'fixable' | 'needs-proposal' | 'unfixable';
  /** The chosen (first passing) candidate, if fixable. */
  candidate?: FixCandidateResult;
  /** New-token proposal available when no on-system token passes and strict mode is off (D8). */
  proposal?: FixCandidateResult;
  before: { ratio: number; requiredRatio: number };
}

export interface AppliedFix {
  nodeId: string;
  nodeName: string;
  sc: string;
  /** Measured before, e.g. "2.90:1" | "18×20px" | "120%". */
  before: string;
  /** Verified after, e.g. "4.60:1" | "24×24px" | "150%". */
  after: string;
  /** The requirement met, e.g. "4.5:1" | "24×24px" | "150%". */
  target: string;
  /** e.g. "text/muted → text/primary" or "min size set to 24×24". */
  changeDescription: string;
}

/** F13 step 3: verified plan to fix a violation by re-tokening its background. */
export interface BgFixPlan {
  ownerId: string;
  ownerName: string;
  token: TokenCandidate;
  verifiedRatio: number;
  /** Layers re-verified across the frame. */
  checkedCount: number;
}

export interface Settings {
  level: WcagLevel;
  /** D8/F14: forbid new-token proposals; escalate instead. */
  strictMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  level: 'AA',
  strictMode: false,
};

/** What we do NOT (fully) check — the transparency footer (F7). */
export const NOT_CHECKED_SCS: string[] = [
  '1.1.1 Non-text Content / alt text (v0.3)',
  '2.4.6 Headings & Labels (v0.3)',
  '2.5.8 — elements without prototype interactions are “check by eye” only',
  '1.4.11 — only icons/borders on interactive elements are measured',
  '1.4.12 — only authored line-height; letter/word spacing adaptability is runtime-only',
  'Focus order, reflow, semantics — not determinable from a static Figma file',
];
