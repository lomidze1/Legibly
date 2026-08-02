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
  'missing-alt': {
    title: 'Image has no alt text recorded',
    why: 'Screen-reader users need a text alternative for informative images. Figma has no native alt field, so Legibly records it for dev handoff and the report.',
    todo: 'Write a short description of what the image conveys, or mark it decorative if it carries no information.',
  },
  'color-only-signifier': {
    title: 'Colour is the only thing marking this text',
    why: 'Part of this text is a different colour from the rest, with no underline, weight or size change. Readers who don’t see that colour difference — colour blindness, a greyscale print, a dimmed screen — read it as ordinary text. If it’s a link or a status, its meaning is lost.',
    todo: 'If it is a link or carries meaning, underline it (one click below) or add another cue. If the colour is purely decorative, ignore this.',
  },
  'no-visible-label': {
    title: 'Field may have no visible label',
    why: 'A placeholder is not a label: it vanishes the moment someone types, it is often too low-contrast to read, and voice-control users have no name to speak. Figma has no form semantics, so we go by the layer name and by what sits next to it.',
    todo: 'Add a short text label above or beside the field. If this layer is not actually an input, ignore this.',
  },
  'no-focus-state': {
    title: 'Component has states, but no focus state',
    why: 'This component set defines how it looks on hover or when pressed, but not when it has keyboard focus. Whoever builds it then has to invent a focus ring — or ships without one, and keyboard users lose their place on the screen.',
    todo: 'Add a Focus variant with a visible indicator, and keep it at 3:1 against its background so it passes the non-text contrast rule.',
  },
  'small-text': {
    title: 'Very small text',
    why: 'WCAG sets no minimum font size, so this is our advice rather than a rule: below about 12px, text gets hard to read on a phone held at arm’s length, and for anyone whose near vision has changed.',
    todo: 'Raise the size if this carries real content. Legal fine print and decorative labels are usually fine as they are — this never counts as a WCAG failure.',
  },
  'clipped-text': {
    title: 'Text is cut off by its container',
    why: 'This text layer extends past a frame that clips its contents, so part of the string is never painted. Nobody sees it — and the missing words usually only surface once someone reads the string in the build.',
    todo: 'Widen or grow the container, shorten the text, or switch the layer to auto-height so it wraps. If the clipping is deliberate (a mask or a marquee), ignore this.',
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
