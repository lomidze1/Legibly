/**
 * Human-readable explanations for every needs-review reason.
 * Pattern (ux-copy): what happened + why + how to fix. No jargon —
 * written for a first-time, non-expert user. Auditable via tests: every
 * NeedsReviewReason must have complete copy.
 */
import type { NeedsReviewReason } from './types';

export interface ReviewCopy {
  /** Short human title, e.g. "Text sits on a photo". */
  title: string;
  /** Why we can't give a certain verdict. */
  why: string;
  /** What the user can do about it. */
  todo: string;
}

export const REVIEW_COPY: Record<NeedsReviewReason, ReviewCopy> = {
  'image-fill': {
    title: 'Text sits on a photo',
    why: 'The colors behind this text change pixel by pixel, so contrast can’t be measured reliably.',
    todo: 'Check it by eye — or add a dark/light overlay between the photo and the text, then rescan.',
  },
  'video-fill': {
    title: 'Text sits on a video',
    why: 'Video backgrounds change constantly, so contrast can’t be measured.',
    todo: 'Add a solid or dimmed overlay behind the text, then rescan.',
  },
  'gradient-fill': {
    title: 'Text sits on a gradient',
    why: 'A gradient has many colors behind the text — some spots may pass while others fail.',
    todo: 'Check the lightest and darkest areas by eye, or place the text on a solid color.',
  },
  'blend-mode': {
    title: 'A blend effect is in the way',
    why: 'Layers with blend modes (Multiply, Overlay…) change colors in ways that can’t be computed from layer data.',
    todo: 'Check by eye, or set the blend mode to Normal and rescan.',
  },
  'partial-overlap': {
    title: 'Text crosses two backgrounds',
    why: 'Part of this text is on one color and part on another, so there is no single measurement.',
    todo: 'Check both areas by eye, or move the text fully onto one background.',
  },
  'mixed-text-properties': {
    title: 'Mixed text styles in one layer',
    why: 'This text layer mixes different sizes, weights or colors, so one verdict would be wrong for part of it.',
    todo: 'Check each styled part by eye, or split it into separate text layers and rescan.',
  },
  'unresolved-background': {
    title: 'Background too complex to measure',
    why: 'The layers behind this text are stacked in a way that can’t be reduced to one reliable color.',
    todo: 'Check it by eye — simplifying the layers behind the text usually makes it measurable.',
  },
  'non-solid-text-fill': {
    title: 'The text itself has a gradient or image fill',
    why: 'Text painted with a gradient or image has no single color to measure.',
    todo: 'Give the text one solid color, then rescan.',
  },
  'no-text-fill': {
    title: 'Text has no visible color',
    why: 'This layer has no visible fill, so there is nothing to measure.',
    todo: 'If the text should be visible, give it a fill and rescan.',
  },
};

export function reviewCopy(reason: NeedsReviewReason | undefined): ReviewCopy {
  return (reason && REVIEW_COPY[reason]) || REVIEW_COPY['unresolved-background'];
}
