/**
 * Scanner: traverse selection or page and run every check —
 * text contrast (1.4.3), use of colour (1.4.1), target size (2.5.8/2.5.5),
 * non-text contrast (1.4.11), text spacing capability (1.4.12),
 * alt-text presence (1.1.1), clipped text (1.4.10), label presence (2.4.6),
 * focus-state capability (2.4.7), plus non-WCAG advisories. Pure over
 * NodeLite (C1).
 */
import type { Finding, ScanReport, Settings } from './types';
import { NOT_CHECKED_SCS } from './types';
import { NodeLite } from './figma-lite';
import { classifyTextNode } from './classify';
import { checkTextSpacing } from './text-spacing';
import { collectTargets, checkTargetSizes } from './target-size';
import { checkNonTextContrast } from './non-text';
import { checkAltText, hasImageFill } from './alt-text';
import { checkUseOfColor } from './use-of-color';
import { checkClippedText } from './clipped-text';
import { checkSmallText } from './advisory';
import { checkFormLabels } from './form-label';
import { checkFocusStates } from './focus-state';

function isRendered(node: NodeLite): boolean {
  return node.visible !== false && (typeof node.opacity !== 'number' || node.opacity > 0);
}

/** Certain first, then judgement, then non-WCAG advice. Stable within a tier. */
const TIER_ORDER: Record<Finding['tier'], number> = { violation: 0, needsReview: 1, advisory: 2 };
export function byTier(a: Finding, b: Finding): number {
  return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
}

/** Depth-first collection of rendered TEXT nodes under the given roots. */
export function collectTextNodes(roots: readonly NodeLite[]): NodeLite[] {
  const out: NodeLite[] = [];
  const walk = (n: NodeLite): void => {
    if (!isRendered(n)) return;
    if (n.type === 'TEXT') out.push(n);
    if (n.children) for (const c of n.children) walk(c);
  };
  for (const r of roots) walk(r);
  return out;
}

export function scanNodes(
  roots: readonly NodeLite[],
  settings: Settings,
  now: () => number = () => Date.now()
): ScanReport {
  const start = now();
  const texts = collectTextNodes(roots);
  const report: ScanReport = {
    findings: [],
    passCount: 0,
    scannedCount: texts.length,
    targetCount: 0,
    imageCount: 0,
    notChecked: NOT_CHECKED_SCS,
    durationMs: 0,
  };

  // 1.4.3 + 1.4.12 over text nodes
  for (const t of texts) {
    const result = classifyTextNode(t, settings);
    if (result.kind === 'pass') report.passCount++;
    else if (result.kind === 'finding') report.findings.push(result.finding);

    const spacing = checkTextSpacing(t);
    if (spacing) report.findings.push(spacing);

    const colorOnly = checkUseOfColor(t);
    if (colorOnly) report.findings.push(colorOnly);

    const clipped = checkClippedText(t);
    if (clipped) report.findings.push(clipped);

    const small = checkSmallText(t);
    if (small) report.findings.push(small);
  }

  // 2.5.8 + 1.4.11 over interactive targets
  const targets = collectTargets(roots);
  report.targetCount = targets.length;
  const sizes = checkTargetSizes(targets, settings.targetFloor);
  report.findings.push(...sizes.findings);
  const nonText = checkNonTextContrast(targets);
  report.findings.push(...nonText.findings);

  // 2.4.6 label presence + 2.4.7 focus-state capability — both need sibling
  // and variant context, so they run over the roots, not per node.
  report.findings.push(...checkFormLabels(roots));
  report.findings.push(...checkFocusStates(roots));

  // 1.1.1 alt-text presence over content-sized images
  const walkImages = (n: NodeLite): void => {
    if (!isRendered(n)) return;
    if (hasImageFill(n)) {
      const result = checkAltText(n);
      if (result === 'pass') report.imageCount++;
      else if (result) {
        report.imageCount++;
        report.findings.push(result);
      }
    }
    if (n.children) for (const c of n.children) walkImages(c);
  };
  for (const r of roots) walkImages(r);

  report.findings.sort(byTier);
  report.durationMs = now() - start;
  return report;
}
