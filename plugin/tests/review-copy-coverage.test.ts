/**
 * Completeness of the needs-review copy for the reasons added after v0.1 —
 * colour-only runs, clipped text, missing labels, missing focus states and
 * the small-text advisory. A reason with no copy renders as a bare flag, and
 * "no bare flags" is the rule the whole review tier is written to.
 */
import { describe, expect, it } from 'vitest';
import { REVIEW_COPY, reviewCopy } from '../src/shared/review-copy';
import type { NeedsReviewReason } from '../src/shared/types';

/** Every member of the NeedsReviewReason union, in declaration order. */
const ALL_REASONS: Record<NeedsReviewReason, true> = {
  'gradient-fill': true,
  'gradient-range': true,
  'image-fill': true,
  'video-fill': true,
  'blend-mode': true,
  'mixed-text-properties': true,
  'partial-overlap': true,
  'unresolved-background': true,
  'non-solid-text-fill': true,
  'no-text-fill': true,
  'invisible-text': true,
  'maybe-interactive': true,
  'line-height-floor': true,
  'non-text-judgment': true,
  'missing-alt': true,
  'color-only-signifier': true,
  'clipped-text': true,
  'no-visible-label': true,
  'no-focus-state': true,
  'small-text': true,
};

/** The reasons only the v0.2/v0.3 checks can produce. */
const LATER_REASONS: NeedsReviewReason[] = [
  'color-only-signifier',
  'clipped-text',
  'no-visible-label',
  'no-focus-state',
  'small-text',
  'invisible-text',
];

describe('REVIEW_COPY — completeness', () => {
  it('has an entry for every reason and no entry for anything else', () => {
    expect(Object.keys(REVIEW_COPY).sort()).toEqual(Object.keys(ALL_REASONS).sort());
  });

  it('the newer checks all carry a title, a why and a todo', () => {
    for (const reason of LATER_REASONS) {
      const copy = REVIEW_COPY[reason];
      expect(copy.title.trim().length, `${reason}.title`).toBeGreaterThan(0);
      expect(copy.why.trim().length, `${reason}.why`).toBeGreaterThan(20);
      expect(copy.todo.trim().length, `${reason}.todo`).toBeGreaterThan(20);
    }
  });

  it('the newer copy avoids jargon a first-time user would not know', () => {
    const banned = /\b(node|bbox|alpha|composit|deterministic|criterion|conformance|apca|luminance|sc \d)\b/i;
    for (const reason of LATER_REASONS) {
      const copy = REVIEW_COPY[reason];
      expect(`${copy.title} ${copy.why} ${copy.todo}`, reason).not.toMatch(banned);
    }
  });

  it('only the advisory names WCAG at all — to say it is NOT a failure', () => {
    for (const reason of Object.keys(ALL_REASONS) as NeedsReviewReason[]) {
      const copy = REVIEW_COPY[reason];
      const text = `${copy.title} ${copy.why} ${copy.todo}`;
      if (reason === 'small-text') continue;
      expect(text, reason).not.toMatch(/\bwcag\b/i);
    }
    const advisory = REVIEW_COPY['small-text'];
    expect(`${advisory.why} ${advisory.todo}`).toContain('never counts as a WCAG failure');
  });

  it('every todo offers something the user can actually do', () => {
    for (const reason of Object.keys(ALL_REASONS) as NeedsReviewReason[]) {
      expect(REVIEW_COPY[reason].todo.trim(), reason).not.toBe('');
      expect(REVIEW_COPY[reason].todo, reason).toMatch(/[.!]$/);
    }
  });

  it('falls back to the safest explanation for a reason it does not know', () => {
    expect(reviewCopy(undefined)).toBe(REVIEW_COPY['unresolved-background']);
    expect(reviewCopy('not-a-reason' as NeedsReviewReason)).toBe(REVIEW_COPY['unresolved-background']);
  });
});
