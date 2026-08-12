/**
 * The scanner's wiring, not the individual checks: the image walk (1.1.1),
 * the target count (2.5.8/1.4.11), the two whole-tree checks (2.4.6/2.4.7),
 * and the report-level invariants the UI depends on — one card per
 * layer-and-criterion, nothing counted twice, nothing rendered counted at all.
 */
import { describe, expect, it } from 'vitest';
import { scanNodes } from '../src/shared/scan';
import { NOT_CHECKED_SCS } from '../src/shared/types';
import type { NodeLite } from '../src/shared/figma-lite';
import type { Settings } from '../src/shared/types';
import { GRAY_77, WHITE, box, node, page, solid, text } from './helpers';

const AA: Settings = { level: 'AA', strictMode: false, targetFloor: 24 };

function screen(children: NodeLite[]) {
  const frame = node({
    type: 'FRAME',
    name: 'Screen',
    fills: [solid(WHITE)],
    absoluteBoundingBox: box(0, 0, 800, 600),
    children,
  });
  page([frame]);
  return frame;
}

const image = (size: number, alt?: string, decorative = false) =>
  node({
    type: 'RECTANGLE',
    name: 'hero',
    fills: [{ type: 'IMAGE' }],
    absoluteBoundingBox: box(0, 0, size, size),
    getSharedPluginData: (_ns: string, key: string) =>
      key === 'altText' ? (alt ?? '') : decorative ? 'true' : '',
  });

describe('scanNodes — empty and degenerate input', () => {
  it('an empty selection produces an empty, honest report', () => {
    const report = scanNodes([], AA);
    expect(report).toMatchObject({
      findings: [],
      passCount: 0,
      scannedCount: 0,
      targetCount: 0,
      imageCount: 0,
    });
    expect(report.notChecked).toEqual(NOT_CHECKED_SCS);
  });

  it('a frame with nothing in it scans clean', () => {
    const report = scanNodes([screen([])], AA);
    expect(report.findings).toEqual([]);
    expect(report.scannedCount).toBe(0);
  });
});

describe('scanNodes — 1.1.1 image walk', () => {
  it('counts a content-sized image and flags the missing alt text', () => {
    const report = scanNodes([screen([image(64)])], AA);
    expect(report.imageCount).toBe(1);
    expect(report.findings.filter((f) => f.sc === '1.1.1')).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({ tier: 'needsReview', reason: 'missing-alt' });
  });

  it('counts an image with recorded alt text but raises nothing', () => {
    const report = scanNodes([screen([image(64, 'A dog asleep on a beach')])], AA);
    expect(report.imageCount).toBe(1);
    expect(report.findings.filter((f) => f.sc === '1.1.1')).toHaveLength(0);
  });

  it('an image marked decorative is counted and left alone', () => {
    const report = scanNodes([screen([image(64, undefined, true)])], AA);
    expect(report.imageCount).toBe(1);
    expect(report.findings.filter((f) => f.sc === '1.1.1')).toHaveLength(0);
  });

  it('sub-32px graphics are not counted at all — flagging them is noise', () => {
    const report = scanNodes([screen([image(16)])], AA);
    expect(report.imageCount).toBe(0);
    expect(report.findings).toEqual([]);
  });

  it('finds images nested several frames deep', () => {
    const deep = node({
      type: 'FRAME',
      absoluteBoundingBox: box(0, 0, 200, 200),
      children: [node({ type: 'GROUP', children: [image(64)] })],
    });
    expect(scanNodes([screen([deep])], AA).imageCount).toBe(1);
  });

  it('skips images inside an invisible subtree', () => {
    const hidden = node({ type: 'FRAME', visible: false, children: [image(64)] });
    const report = scanNodes([screen([hidden])], AA);
    expect(report.imageCount).toBe(0);
    expect(report.findings).toEqual([]);
  });
});

describe('scanNodes — target and text counts', () => {
  it('counts interactive targets separately from text layers', () => {
    const button = node({
      type: 'FRAME',
      name: 'Buy now',
      reactions: [{ trigger: 'ON_CLICK' }],
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(10, 10, 120, 40),
      children: [text({ name: 'label' })],
    });
    const report = scanNodes([screen([button])], AA);
    expect(report.targetCount).toBe(1);
    expect(report.scannedCount).toBe(1); // the label
  });

  it('a zero-opacity subtree contributes neither text nor targets', () => {
    const ghost = node({
      type: 'FRAME',
      name: 'Button',
      opacity: 0,
      reactions: [{ trigger: 'ON_CLICK' }],
      absoluteBoundingBox: box(0, 0, 10, 10),
      children: [text({})],
    });
    const report = scanNodes([screen([ghost])], AA);
    expect(report.targetCount).toBe(0);
    expect(report.scannedCount).toBe(0);
  });
});

describe('scanNodes — the whole-tree checks', () => {
  it('surfaces a field with no visible label (2.4.6)', () => {
    const field = node({
      type: 'FRAME',
      name: 'Email input',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(40, 200, 240, 48),
    });
    const report = scanNodes([screen([field])], AA);
    const label = report.findings.filter((f) => f.sc === '2.4.6');
    expect(label).toHaveLength(1);
    expect(label[0]).toMatchObject({ tier: 'needsReview', reason: 'no-visible-label' });
  });

  it('surfaces a component set with states but no focus variant (2.4.7)', () => {
    const set = node({
      type: 'COMPONENT_SET',
      name: 'Button',
      children: [
        node({ type: 'COMPONENT', name: 'State=Default' }),
        node({ type: 'COMPONENT', name: 'State=Hover' }),
        node({ type: 'COMPONENT', name: 'State=Pressed' }),
      ],
    });
    const report = scanNodes([screen([set])], AA);
    const focus = report.findings.filter((f) => f.sc === '2.4.7');
    expect(focus).toHaveLength(1);
    expect(focus[0]).toMatchObject({ tier: 'needsReview', reason: 'no-focus-state' });
  });
});

describe('scanNodes — report invariants', () => {
  it('one layer can raise several criteria, and each gets its own card key', () => {
    const t = text({
      name: 'fine print',
      fontSize: 9,
      fills: [solid(GRAY_77)],
      lineHeight: { unit: 'PERCENT', value: 110 },
    });
    const report = scanNodes([screen([t])], AA);
    const scs = report.findings.filter((f) => f.nodeId === t.id).map((f) => f.sc).sort();
    expect(scs).toEqual(['1.4.12', '1.4.3', 'Best practice']);
  });

  it('never emits two findings under the same node-and-criterion key', () => {
    const t = text({
      name: 'fine print',
      fontSize: 9,
      fills: [solid(GRAY_77)],
      lineHeight: { unit: 'PERCENT', value: 110 },
    });
    const button = node({
      type: 'FRAME',
      name: 'Buy',
      reactions: [{ trigger: 'ON_CLICK' }],
      absoluteBoundingBox: box(10, 300, 18, 18),
      children: [],
    });
    const report = scanNodes([screen([t, button, image(64)])], AA);
    const keys = report.findings.map((f) => `${f.nodeId}:${f.sc}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('passCount and the 1.4.3 findings together account for every text layer', () => {
    const good = text({ name: 'ok' });
    const bad = text({ name: 'bad', fills: [solid(GRAY_77)] });
    const report = scanNodes([screen([good, bad])], AA);
    const contrast = report.findings.filter((f) => f.sc === '1.4.3');
    expect(report.passCount + contrast.length).toBe(report.scannedCount);
  });

  it('resolves text through 40 nested frames without losing the page background', () => {
    let cursor = text({ name: 'deep', fills: [solid(GRAY_77)] });
    for (let i = 0; i < 40; i++) {
      cursor = node({ type: 'FRAME', name: `w${i}`, children: [cursor] });
    }
    const report = scanNodes([screen([cursor])], AA);
    expect(report.scannedCount).toBe(1);
    expect(report.findings.filter((f) => f.sc === '1.4.3')).toMatchObject([{ tier: 'violation' }]);
  });
});
