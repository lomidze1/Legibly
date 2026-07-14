/**
 * Non-text contrast check — WCAG 2.2 SC 1.4.11 Non-text Contrast, AA.
 *
 * Scope (detection research §1, honesty-first): the math is deterministic,
 * but "is this graphic meaningful or decorative" is judgment. So we measure
 * ONLY parts of interactive targets — icons and borders users must see to
 * operate the UI:
 *   - explicit-interactive target (prototype reactions) → violation-eligible
 *   - name-suspect target                               → needsReview only
 * Free-floating graphics are not judged at all (listed in the footer).
 */
import type { Finding, RGBA } from './types';
import { NodeLite, PaintLite, isPaintArray, isSolidPaint } from './figma-lite';
import { resolveBackdrop } from './background';
import { wcagRatio } from './contrast';
import type { Target } from './target-size';

export const NON_TEXT_SC = '1.4.11';
export const NON_TEXT_RATIO = 3;

const ICON_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE']);

function isRendered(n: NodeLite): boolean {
  return n.visible !== false && (typeof n.opacity !== 'number' || n.opacity > 0);
}

/** Topmost visible solid paint of a stack, or null (empty / non-solid). */
function topSolid(paints: unknown): { color: RGBA } | 'non-solid' | null {
  if (!isPaintArray(paints)) return null;
  const visible = (paints as readonly PaintLite[]).filter(
    (p) => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)
  );
  if (visible.length === 0) return null;
  const top = visible[visible.length - 1]!;
  if (!isSolidPaint(top)) return 'non-solid';
  const alpha = typeof top.opacity === 'number' ? top.opacity : 1;
  return { color: { ...top.color, a: alpha } };
}

interface Probe {
  node: NodeLite;
  paintTarget: 'shape-fill' | 'stroke';
  fg: RGBA;
  /** Label for the results card. */
  what: string;
}

/** Collect measurable icon fills and strokes within one interactive target. */
function collectProbes(target: NodeLite): Probe[] {
  const probes: Probe[] = [];
  const stroke = topSolid(target.strokes);
  if (stroke && stroke !== 'non-solid') {
    probes.push({ node: target, paintTarget: 'stroke', fg: stroke.color, what: 'border' });
  }
  const walk = (n: NodeLite): void => {
    if (!isRendered(n)) return;
    if (ICON_TYPES.has(n.type)) {
      const fill = topSolid(n.fills);
      if (fill && fill !== 'non-solid') {
        probes.push({ node: n, paintTarget: 'shape-fill', fg: fill.color, what: 'icon' });
      }
    }
    if (n.children) for (const c of n.children) walk(c);
  };
  if (target.children) for (const c of target.children) walk(c);
  return probes;
}

/**
 * Measure a node's current fill/stroke against its backdrop — the fix
 * verifier's judge for 1.4.11 (same math as the detector, NF1).
 */
export function measureNonText(
  node: NodeLite,
  paintTarget: 'shape-fill' | 'stroke'
): { min: number; max: number } | null {
  const src = paintTarget === 'stroke' ? topSolid(node.strokes) : topSolid(node.fills);
  if (!src || src === 'non-solid') return null;
  const backdrop = resolveBackdrop(node);
  if (!backdrop.ok) return null;
  const ratios = backdrop.bgs.map((bg) => wcagRatio(src.color, bg));
  return { min: Math.min(...ratios), max: Math.max(...ratios) };
}

/** Evaluate 1.4.11 over the interactive targets found by collectTargets. */
export function checkNonTextContrast(targets: readonly Target[]): {
  findings: Finding[];
  passCount: number;
} {
  const findings: Finding[] = [];
  let passCount = 0;
  for (const target of targets) {
    for (const probe of collectProbes(target.node)) {
      const finding = evaluateProbe(probe, target.certain);
      if (finding === 'pass') passCount++;
      else if (finding) findings.push(finding);
    }
  }
  return { findings, passCount };
}

/** Re-check one probe — shared by the scanner and the fix verifier (NF1). */
export function evaluateProbe(probe: Probe, certain: boolean): Finding | 'pass' | null {
  const backdrop = resolveBackdrop(probe.node);
  if (!backdrop.ok) return null; // unmeasurable graphics stay silent (footer covers this)
  const ratios = backdrop.bgs.map((bg) => wcagRatio(probe.fg, bg));
  const minRatio = Math.min(...ratios);
  const maxRatio = Math.max(...ratios);
  if (minRatio >= NON_TEXT_RATIO) return 'pass';

  const worstBg = backdrop.bgs[ratios.indexOf(minRatio)]!;
  const gradient = backdrop.bgs.length > 1;
  const measured = gradient
    ? `${minRatio.toFixed(2)}:1–${maxRatio.toFixed(2)}:1`
    : `${minRatio.toFixed(2)}:1`;

  if (maxRatio < NON_TEXT_RATIO && certain) {
    return {
      nodeId: probe.node.id,
      nodeName: probe.node.name,
      tier: 'violation',
      sc: NON_TEXT_SC,
      fg: probe.fg,
      bg: worstBg,
      bgSamples: gradient ? backdrop.bgs : undefined,
      ratio: minRatio,
      requiredRatio: NON_TEXT_RATIO,
      paintTarget: probe.paintTarget,
      detail: `${probe.what} contrast ${measured} — needs ${NON_TEXT_RATIO}:1`,
    };
  }
  // Certain-interactive but straddling a gradient → range problem, not a
  // meaningfulness judgment.
  const straddles = certain && maxRatio >= NON_TEXT_RATIO;
  return {
    nodeId: probe.node.id,
    nodeName: probe.node.name,
    tier: 'needsReview',
    sc: NON_TEXT_SC,
    reason: straddles ? 'gradient-range' : 'non-text-judgment',
    fg: probe.fg,
    bg: worstBg,
    ratio: minRatio,
    requiredRatio: NON_TEXT_RATIO,
    paintTarget: probe.paintTarget,
    detail: straddles
      ? `${probe.what} contrast varies ${measured} across the gradient — needs ${NON_TEXT_RATIO}:1`
      : `${probe.what} contrast ${measured} — ${NON_TEXT_RATIO}:1 applies if it must be seen to use the UI`,
  };
}

export type { Probe };
