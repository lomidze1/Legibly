/**
 * Scanner (F5): traverse selection or page, classify every visible text node.
 * Pure over NodeLite so the whole pipeline is unit-testable (C1).
 */
import type { ScanReport, Settings } from './types';
import { NOT_CHECKED_SCS } from './types';
import { NodeLite } from './figma-lite';
import { classifyTextNode } from './classify';

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
    notChecked: NOT_CHECKED_SCS,
    durationMs: 0,
  };
  for (const t of texts) {
    const result = classifyTextNode(t, settings);
    if (result.kind === 'pass') report.passCount++;
    else if (result.kind === 'finding') report.findings.push(result.finding);
  }
  // violations first, then needsReview; stable within tiers
  report.findings.sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'violation' ? -1 : 1));
  report.durationMs = now() - start;
  return report;
}
