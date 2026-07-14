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
    why: 'This gradient can’t be measured (missing color data or several gradients stacked).',
    todo: 'Check the lightest and darkest areas by eye, or place the text on a solid color.',
  },
  'gradient-range': {
    title: 'Contrast varies across the gradient',
    why: 'Behind this text the gradient goes from passing to failing — some areas are readable, some aren’t.',
    todo: 'Check where the text actually sits, or adjust the gradient colors so the whole range passes, then rescan.',
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
  'maybe-interactive': {
    title: 'Might be a tap target that’s too small',
    why: 'It’s named like a control but has no prototype interaction, so we can’t be certain it’s interactive.',
    todo: 'If it is interactive, make it at least 24×24px or leave clear space around it. If not, ignore this.',
  },
  'line-height-floor': {
    title: 'Line height below the 1.5× floor',
    why: 'Some readers increase line spacing to 1.5× to follow the text. Layouts authored tighter than that often break or clip when they do.',
    todo: 'Raise the line height to at least 150% (one click below), or verify the layout tolerates looser spacing.',
  },
  'non-text-judgment': {
    title: 'Icon or border may need more contrast',
    why: 'The 3:1 rule applies only to parts users must SEE to operate the UI — whether this one is essential or decorative is your call.',
    todo: 'If people need to notice it to use the screen, aim for 3:1 or higher against its background.',
  },
  'invisible-text': {
    title: 'Invisible text layer',
    why: 'This text exists in the design but has no visible color (0% opacity or no fill) — a common leftover from imports. Real users won’t see it, but it may still be read out by assistive tech in the final product.',
    todo: 'If it’s not needed, delete the layer. If it should be visible, give it a color and rescan.',
  },
};

export function reviewCopy(reason: NeedsReviewReason | undefined): ReviewCopy {
  return (reason && REVIEW_COPY[reason]) || REVIEW_COPY['unresolved-background'];
}
