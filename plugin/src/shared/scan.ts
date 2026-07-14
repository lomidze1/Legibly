/**
 * Scanner: traverse selection or page and run every check —
 * text contrast (1.4.3), target size (2.5.8), non-text contrast (1.4.11),
 * text spacing capability (1.4.12). Pure over NodeLite (C1).
 */
import type { ScanReport, Settings } from './types';
import { NOT_CHECKED_SCS } from './types';
import { NodeLite } from './figma-lite';
import { classifyTextNode } from './classify';
import { checkTextSpacing } from './text-spacing';
import { collectTargets, checkTargetSizes } from './target-size';
import { checkNonTextContrast } from './non-text';
import { checkAltText, hasImageFill } from './alt-text';

function isRendered(node: NodeLite): boolean {
  return node.visible !== false && (typeof node.opacity !== 'number' || node.opacity > 0);
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
  }

  // 2.5.8 + 1.4.11 over interactive targets
  const targets = collectTargets(roots);
  report.targetCount = targets.length;
  const sizes = checkTargetSizes(targets);
  report.findings.push(...sizes.findings);
  const nonText = checkNonTextContrast(targets);
  report.findings.push(...nonText.findings);

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

  // violations first, then needsReview; stable within tiers
  report.findings.sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'violation' ? -1 : 1));
  report.durationMs = now() - start;
  return report;
}
