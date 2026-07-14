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
  | 'invisible-text';

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
}

export interface ScanReport {
  findings: Finding[];
  /** Count of text nodes that passed the deterministic check. */
  passCount: number;
  /** Nodes scanned in total. */
  scannedCount: number;
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
  beforeRatio: number;
  afterRatio: number;
  requiredRatio: number;
  /** e.g. "text/muted → text/primary" or "new token: legibly/fixed-1". */
  changeDescription: string;
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

/** SCs outside v0.1 scope, shown in the transparency footer (F7). */
export const NOT_CHECKED_SCS: string[] = [
  '1.4.11 Non-text Contrast (v0.2)',
  '2.5.8 Target Size (v0.2)',
  '1.4.12 Text Spacing (v0.2)',
  '1.1.1 Non-text Content / alt text (v0.3)',
  '2.4.6 Headings & Labels (v0.3)',
  'Focus order, reflow, semantics — not determinable from a static Figma file',
];
