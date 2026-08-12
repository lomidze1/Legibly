/**
 * scan → plan → apply → rescan, over one tree that is both a NodeLite the
 * detectors read and a "canvas" the apply layer mutates. This is the property
 * the whole product rests on: the fixes Legibly offers actually clear the
 * findings it raised, and re-running the scan afterwards says so.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBatch, applyFix } from '../src/main/apply';
import type { FixInstruction } from '../src/main/apply';
import { scanNodes } from '../src/shared/scan';
import { planFix } from '../src/shared/fix';
import { hexToRgba } from '../src/shared/fix';
import type { NodeLite } from '../src/shared/figma-lite';
import type { Settings, TokenCandidate } from '../src/shared/types';

const AA: Settings = { level: 'AA', strictMode: false, targetFloor: 24 };
const STRICT: Settings = { level: 'AA', strictMode: true, targetFloor: 24 };
const MIXED = Symbol('figma.mixed');

interface MockNode {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

let nodes: Record<string, MockNode>;
let variables: Record<string, { id: string; name: string }>;
let commitUndo: ReturnType<typeof vi.fn>;

const solid = (hex: string) => {
  const c = hexToRgba(hex);
  return { type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } };
};

const INK: TokenCandidate = { id: 'var-ink', kind: 'variable', name: 'text/strong', color: hexToRgba('#333333') };

function register(...list: MockNode[]): void {
  for (const n of list) nodes[n.id] = n;
}

/** page(white) > frame(white) > [headline, caption, btnA, btnB] */
function buildScene(pageBg = '#ffffff') {
  const page: MockNode = {
    id: 'page',
    name: 'Page 1',
    type: 'PAGE',
    backgrounds: [solid(pageBg)],
    parent: null,
  };
  const frame: MockNode = {
    id: 'frame',
    name: 'Screen',
    type: 'FRAME',
    fills: [solid(pageBg)],
    absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
    parent: page,
  };
  page.children = [frame];

  const headline: MockNode = {
    id: 'headline',
    name: 'Headline',
    type: 'TEXT',
    characters: 'Total due today',
    fontSize: 16,
    fontWeight: 400,
    fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PERCENT', value: 150 },
    textAutoResize: 'HEIGHT',
    fills: [solid('#777777')], // 4.48:1 on white — just under AA
    absoluteBoundingBox: { x: 10, y: 10, width: 120, height: 20 },
    parent: frame,
  };

  const caption: MockNode = {
    id: 'caption',
    name: 'Caption',
    type: 'TEXT',
    characters: 'Taxes included',
    fontSize: 16,
    fontWeight: 400,
    fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { unit: 'PERCENT', value: 120 }, // under the 1.5× floor
    textAutoResize: 'HEIGHT',
    fills: [solid('#333333')],
    absoluteBoundingBox: { x: 10, y: 40, width: 120, height: 20 },
    parent: frame,
  };

  /** Auto-layout button whose bounds honour min constraints, like Figma's. */
  const makeButton = (id: string, x: number, w: number, h: number): MockNode => {
    const btn: MockNode = {
      id,
      name: `btn-${id}`,
      type: 'FRAME',
      layoutMode: 'HORIZONTAL',
      minWidth: null,
      minHeight: null,
      fills: [],
      reactions: [{ trigger: 'ON_CLICK' }],
      parent: frame,
      get width(): number {
        return Math.max(w, (this.minWidth as number | null) ?? 0);
      },
      get height(): number {
        return Math.max(h, (this.minHeight as number | null) ?? 0);
      },
      get absoluteBoundingBox() {
        return { x, y: 80, width: this.width as number, height: this.height as number };
      },
    };
    return btn;
  };

  const btnA = makeButton('btnA', 10, 18, 20);
  const btnB = makeButton('btnB', 29, 18, 20); // crowds A's 24px circle
  frame.children = [headline, caption, btnA, btnB];

  register(page, frame, headline, caption, btnA, btnB);
  return { page, frame, headline, caption, btnA, btnB };
}

beforeEach(() => {
  nodes = {};
  variables = { 'var-ink': { id: 'var-ink', name: 'text/strong' } };
  commitUndo = vi.fn();
  vi.stubGlobal('figma', {
    mixed: MIXED,
    commitUndo,
    loadFontAsync: vi.fn(async () => undefined),
    getNodeByIdAsync: async (id: string) => nodes[id] ?? null,
    variables: {
      getVariableByIdAsync: async (id: string) => variables[id] ?? null,
      setBoundVariableForPaint: (paint: object, _field: string, variable: { id: string }) => ({
        ...paint,
        boundVariables: { color: { id: variable.id } },
      }),
      getLocalVariableCollectionsAsync: async () => [],
      getLocalVariablesAsync: async () => Object.values(variables),
    },
  });
});

describe('scan → fix → rescan', () => {
  it('the first scan finds exactly the issues the scene was built with', () => {
    const { frame } = buildScene();
    const report = scanNodes([frame as unknown as NodeLite], AA);
    expect(report.scannedCount).toBe(2);
    expect(report.targetCount).toBe(2);
    expect(report.findings.filter((f) => f.tier === 'violation').map((f) => f.sc).sort()).toEqual([
      '1.4.3',
      '2.5.8',
      '2.5.8',
    ]);
    expect(report.findings.filter((f) => f.sc === '1.4.12')).toHaveLength(1);
  });

  it('every offered fix clears its own finding, and the rescan is empty', async () => {
    const { frame } = buildScene();
    const root = frame as unknown as NodeLite;
    const before = scanNodes([root], AA);

    const contrast = before.findings.find((f) => f.sc === '1.4.3')!;
    const plan = planFix(contrast, [INK], AA);
    expect(plan.status).toBe('fixable');

    const fixes: { nodeId: string; instruction: FixInstruction; before: string; target: string; sc: string }[] = [
      {
        nodeId: contrast.nodeId,
        instruction: { kind: 'token', token: plan.candidate!.token! },
        before: `${contrast.ratio!.toFixed(2)}:1`,
        target: '4.5:1',
        sc: '1.4.3',
      },
      ...before.findings
        .filter((f) => f.targetSize?.autoFixable)
        .map((f) => ({
          nodeId: f.nodeId,
          instruction: { kind: 'min-size', required: f.targetSize!.required } as FixInstruction,
          before: '18×20px',
          target: '24×24px',
          sc: f.sc,
        })),
      {
        nodeId: 'caption',
        instruction: { kind: 'line-height', percent: 150 },
        before: '120%',
        target: '150%',
        sc: '1.4.12',
      },
    ];

    const result = await applyBatch(fixes, AA);
    expect(result.failed).toEqual([]);
    expect(result.applied).toHaveLength(4);
    expect(commitUndo).toHaveBeenCalledTimes(1); // one Cmd-Z for the whole run

    const after = scanNodes([root], AA);
    expect(after.findings).toEqual([]);
    expect(after.passCount).toBe(2);
    expect(after.targetCount).toBe(2); // the buttons are still targets, just big enough
  });

  it('re-running the same fixes on the fixed tree changes nothing', async () => {
    const { frame } = buildScene();
    const root = frame as unknown as NodeLite;
    const contrast = scanNodes([root], AA).findings.find((f) => f.sc === '1.4.3')!;
    const token = planFix(contrast, [INK], AA).candidate!.token!;

    await applyFix('headline', { kind: 'token', token }, AA, '4.48:1', '4.5:1', '1.4.3');
    const fillsOnce = JSON.parse(JSON.stringify(nodes.headline!.fills));
    await applyFix('headline', { kind: 'token', token }, AA, '4.48:1', '4.5:1', '1.4.3');
    expect(JSON.parse(JSON.stringify(nodes.headline!.fills))).toEqual(fillsOnce);

    await applyFix('btnA', { kind: 'min-size', required: 24 }, AA, '18×20px', '24×24px', '2.5.8');
    const boxOnce = { ...(nodes.btnA!.absoluteBoundingBox as object) };
    await applyFix('btnA', { kind: 'min-size', required: 24 }, AA, '24×24px', '24×24px', '2.5.8');
    expect({ ...(nodes.btnA!.absoluteBoundingBox as object) }).toEqual(boxOnce);

    expect(scanNodes([root], AA).findings.filter((f) => f.nodeId === 'headline')).toEqual([]);
  });

  it('a violation with no usable token stays flagged after the run', async () => {
    const { frame, headline } = buildScene('#808080');
    headline.fills = [solid('#8a8a8a')]; // ~1.1:1 on mid grey
    const root = frame as unknown as NodeLite;
    const before = scanNodes([root], AA);
    const contrast = before.findings.find((f) => f.nodeId === 'headline' && f.sc === '1.4.3')!;
    expect(contrast.tier).toBe('violation');

    // The only token in the file is the same mid grey — nothing can pass, and
    // strict mode forbids inventing a colour (D8/F14).
    const useless: TokenCandidate = { id: 'var-grey', kind: 'variable', name: 'surface/base', color: hexToRgba('#808080') };
    const plan = planFix(contrast, [useless], STRICT);
    expect(plan.status).toBe('unfixable');

    const after = scanNodes([root], AA);
    expect(after.findings.some((f) => f.nodeId === 'headline' && f.tier === 'violation')).toBe(true);
  });

  it('a fix rejected at commit time leaves the rescan exactly as it was', async () => {
    const { frame } = buildScene();
    const root = frame as unknown as NodeLite;
    const before = scanNodes([root], AA);
    variables['var-ghost'] = { id: 'var-ghost', name: 'text/ghost' };
    const failing: TokenCandidate = { id: 'var-ghost', kind: 'variable', name: 'text/ghost', color: hexToRgba('#eeeeee') };

    await expect(
      applyFix('headline', { kind: 'token', token: failing }, AA, '4.48:1', '4.5:1', '1.4.3')
    ).rejects.toThrow('verification failed');

    const after = scanNodes([root], AA);
    expect(after.findings.map((f) => `${f.nodeId}:${f.sc}`)).toEqual(
      before.findings.map((f) => `${f.nodeId}:${f.sc}`)
    );
    expect(after.findings.find((f) => f.nodeId === 'headline')!.ratio).toBeCloseTo(
      before.findings.find((f) => f.nodeId === 'headline')!.ratio!,
      10
    );
  });
});
