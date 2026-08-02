/**
 * Wave 3 verify: the advisory tier. These are NOT WCAG verdicts — the tier and
 * the SC label both have to say so, or an exported report starts implying
 * conformance failures we never measured.
 */
import { describe, expect, it } from 'vitest';
import { ADVISORY_SC, checkSmallText, MIN_COMFORTABLE_PX } from '../src/shared/advisory';
import { buildCsv } from '../src/shared/report-csv';
import type { ScanReport } from '../src/shared/types';
import { node, text } from './helpers';

describe('checkSmallText', () => {
  it('flags text below the comfortable floor as advisory, never a violation', () => {
    const finding = checkSmallText(text({ fontSize: 10 }))!;
    expect(finding).not.toBeNull();
    expect(finding.tier).toBe('advisory');
    expect(finding.sc).toBe(ADVISORY_SC);
    expect(finding.reason).toBe('small-text');
    expect(finding.detail).toContain('10px');
  });

  it('stays quiet at and above the floor', () => {
    expect(checkSmallText(text({ fontSize: MIN_COMFORTABLE_PX }))).toBeNull();
    expect(checkSmallText(text({ fontSize: 16 }))).toBeNull();
  });

  it('ignores empty text, mixed sizes and non-text nodes', () => {
    expect(checkSmallText(text({ fontSize: 8, characters: '   ' }))).toBeNull();
    expect(checkSmallText(text({ fontSize: Symbol('mixed') }))).toBeNull();
    expect(checkSmallText(node({ type: 'FRAME' }))).toBeNull();
  });
});

describe('advisory findings in the exported report', () => {
  it('are labelled as guidance, not as a conformance result', () => {
    const report: ScanReport = {
      findings: [checkSmallText(text({ name: 'caption', fontSize: 9 }))!],
      passCount: 0,
      scannedCount: 1,
      targetCount: 0,
      imageCount: 0,
      notChecked: [],
      durationMs: 1,
    };
    const csv = buildCsv(report, {}, { fileName: 'f', level: 'AA', date: '2026-07-26' });
    expect(csv).toContain('Advisory (not WCAG)');
    expect(csv).toContain('Legibly guidance — not a WCAG criterion');
    expect(csv).not.toContain('Violation');
  });
});
