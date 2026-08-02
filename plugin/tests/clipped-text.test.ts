/**
 * Wave 2 verify: clipped text — exact geometry against the nearest clipping
 * ancestor, sub-pixel slack ignored, needsReview only.
 */
import { describe, expect, it } from 'vitest';
import { checkClippedText, CLIPPED_SC } from '../src/shared/clipped-text';
import { box, node, text, withParents } from './helpers';

/** A text layer inside a frame, with parents wired. */
function inFrame(
  textBox: ReturnType<typeof box>,
  frameBox: ReturnType<typeof box>,
  frameOver: Record<string, unknown> = {}
) {
  const t = text({ absoluteBoundingBox: textBox });
  const frame = node({
    type: 'FRAME',
    name: 'Card',
    children: [t],
    absoluteBoundingBox: frameBox,
    ...frameOver,
  });
  withParents(node({ type: 'PAGE', children: [frame] }));
  return t;
}

describe('checkClippedText', () => {
  it('flags text running past a clipping frame', () => {
    const t = inFrame(box(0, 0, 300, 20), box(0, 0, 200, 100), { clipsContent: true });
    const finding = checkClippedText(t)!;
    expect(finding).not.toBeNull();
    expect(finding.sc).toBe(CLIPPED_SC);
    expect(finding.tier).toBe('needsReview');
    expect(finding.reason).toBe('clipped-text');
    expect(finding.detail).toContain('100px past the right edge');
    expect(finding.detail).toContain('Card');
  });

  it('reports the worst side when it overflows more than one', () => {
    const t = inFrame(box(0, 0, 210, 140), box(0, 0, 200, 100), { clipsContent: true });
    expect(checkClippedText(t)!.detail).toContain('bottom');
  });

  it('detects overflow past the top and left edges too', () => {
    const t = inFrame(box(-30, 10, 100, 20), box(0, 0, 200, 100), { clipsContent: true });
    expect(checkClippedText(t)!.detail).toContain('left edge');
  });

  it('stays silent when the frame does not clip', () => {
    const t = inFrame(box(0, 0, 300, 20), box(0, 0, 200, 100), { clipsContent: false });
    expect(checkClippedText(t)).toBeNull();
  });

  it('stays silent when the text fits', () => {
    const t = inFrame(box(10, 10, 100, 20), box(0, 0, 200, 100), { clipsContent: true });
    expect(checkClippedText(t)).toBeNull();
  });

  it('ignores sub-pixel overhang (descenders, hinting)', () => {
    const t = inFrame(box(0, 0, 201.5, 20), box(0, 0, 200, 100), { clipsContent: true });
    expect(checkClippedText(t)).toBeNull();
  });

  it('finds a clipping ancestor further up the chain', () => {
    const t = text({ absoluteBoundingBox: box(0, 0, 300, 20) });
    const inner = node({ type: 'FRAME', name: 'Row', children: [t], absoluteBoundingBox: box(0, 0, 300, 20) });
    const outer = node({
      type: 'FRAME',
      name: 'Panel',
      children: [inner],
      absoluteBoundingBox: box(0, 0, 200, 100),
      clipsContent: true,
    });
    withParents(node({ type: 'PAGE', children: [outer] }));
    expect(checkClippedText(t)!.detail).toContain('Panel');
  });

  it('ignores empty text layers and non-text nodes', () => {
    const empty = inFrame(box(0, 0, 300, 20), box(0, 0, 200, 100), { clipsContent: true });
    (empty as { characters?: string }).characters = '   ';
    expect(checkClippedText(empty)).toBeNull();
    expect(checkClippedText(node({ type: 'FRAME' }))).toBeNull();
  });

  it('ignores text with no resolved bounds', () => {
    const t = text({ absoluteBoundingBox: null });
    withParents(node({ type: 'PAGE', children: [t] }));
    expect(checkClippedText(t)).toBeNull();
  });
});
