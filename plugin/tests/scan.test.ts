/**
 * Phase 4 verify: scanner traversal + report shape (F5, F7, F10, NF4).
 */
import { describe, expect, it } from 'vitest';
import { collectTextNodes, scanNodes } from '../src/shared/scan';
import type { Settings } from '../src/shared/types';
import { GRAY_76, GRAY_77, WHITE, box, node, page, solid, text } from './helpers';

const AA: Settings = { level: 'AA', strictMode: false };

function frame(children: ReturnType<typeof text>[], fills = [solid(WHITE)]) {
  return node({ type: 'FRAME', fills, absoluteBoundingBox: box(0, 0, 800, 600), children });
}

describe('collectTextNodes', () => {
  it('collects nested text nodes depth-first', () => {
    const t1 = text({ name: 'a' });
    const t2 = text({ name: 'b' });
    const inner = node({ type: 'FRAME', absoluteBoundingBox: box(0, 0, 100, 100), children: [t2] });
    const root = frame([t1]);
    (root.children as unknown[]).push(inner);
    page([root]);
    expect(collectTextNodes([root]).map((n) => n.name)).toEqual(['a', 'b']);
  });

  it('skips invisible subtrees entirely', () => {
    const t = text({});
    const hidden = node({ type: 'FRAME', visible: false, children: [t] });
    expect(collectTextNodes([hidden])).toEqual([]);
  });

  it('skips zero-opacity subtrees', () => {
    const t = text({});
    const ghost = node({ type: 'FRAME', opacity: 0, children: [t] });
    expect(collectTextNodes([ghost])).toEqual([]);
  });

  it('skips invisible text itself', () => {
    const t = text({ visible: false });
    const root = frame([t]);
    expect(collectTextNodes([root])).toEqual([]);
  });
});

describe('scanNodes', () => {
  it('produces pass/violation counts and the transparency footer', () => {
    const pass = text({ fills: [solid(GRAY_76)] });
    const fail = text({ fills: [solid(GRAY_77)] });
    const root = frame([pass, fail]);
    page([root]);
    const report = scanNodes([root], AA);
    expect(report.scannedCount).toBe(2);
    expect(report.passCount).toBe(1);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]!.tier).toBe('violation');
    expect(report.notChecked.length).toBeGreaterThan(0);
  });

  it('sorts violations before needsReview', () => {
    const review = text({ name: 'review-me', fills: [solid(GRAY_77)] });
    const reviewFrame = node({
      type: 'FRAME',
      fills: [{ type: 'GRADIENT_LINEAR' }],
      absoluteBoundingBox: box(0, 0, 100, 100),
      children: [review],
    });
    // placed clear of the gradient frame so its own verdict stays certain
    const violation = text({ name: 'violate-me', fills: [solid(GRAY_77)], absoluteBoundingBox: box(300, 300, 100, 20) });
    const root = frame([reviewFrame as never, violation]);
    page([root]);
    const report = scanNodes([root], AA);
    expect(report.findings.map((f) => f.tier)).toEqual(['violation', 'needsReview']);
  });

  it('measures duration with the injected clock', () => {
    let calls = 0;
    const now = () => (calls++ === 0 ? 100 : 150);
    const report = scanNodes([], AA, now);
    expect(report.durationMs).toBe(50);
    expect(report.scannedCount).toBe(0);
  });

  it('scans 500 text nodes well under the 2s budget (NF4)', () => {
    const texts = Array.from({ length: 500 }, (_, i) =>
      text({ name: `t${i}`, fills: [solid(i % 2 ? GRAY_77 : GRAY_76)] })
    );
    const root = frame(texts);
    page([root]);
    const start = performance.now();
    const report = scanNodes([root], AA);
    const elapsed = performance.now() - start;
    expect(report.scannedCount).toBe(500);
    expect(elapsed).toBeLessThan(2000);
  });
});
