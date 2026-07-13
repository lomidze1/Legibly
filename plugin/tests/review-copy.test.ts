/**
 * Every needs-review reason must carry complete, human-readable guidance
 * (ux rule: "no bare flags" — every flag explains why + what to do).
 */
import { describe, expect, it } from 'vitest';
import { REVIEW_COPY, reviewCopy } from '../src/shared/review-copy';
import type { NeedsReviewReason } from '../src/shared/types';

const ALL_REASONS: NeedsReviewReason[] = [
  'gradient-fill',
  'image-fill',
  'video-fill',
  'blend-mode',
  'mixed-text-properties',
  'partial-overlap',
  'unresolved-background',
  'non-solid-text-fill',
  'no-text-fill',
];

describe('REVIEW_COPY', () => {
  it('covers every NeedsReviewReason with non-empty title/why/todo', () => {
    for (const reason of ALL_REASONS) {
      const c = REVIEW_COPY[reason];
      expect(c, reason).toBeDefined();
      expect(c.title.length, reason).toBeGreaterThan(5);
      expect(c.why.length, reason).toBeGreaterThan(20);
      expect(c.todo.length, reason).toBeGreaterThan(20);
    }
  });

  it('avoids jargon words in user-facing copy', () => {
    const banned = /\b(node|bbox|alpha|composit|deterministic|sc \d)\b/i;
    for (const reason of ALL_REASONS) {
      const c = REVIEW_COPY[reason];
      expect(`${c.title} ${c.why} ${c.todo}`, reason).not.toMatch(banned);
    }
  });

  it('falls back to a safe default for unknown reasons', () => {
    expect(reviewCopy(undefined).title.length).toBeGreaterThan(0);
  });
});
