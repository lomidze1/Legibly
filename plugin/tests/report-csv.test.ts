/**
 * v0.2 Phase D verify: CSV compliance report (F19) — content, statuses,
 * RFC 4180 escaping.
 */
import { describe, expect, it } from 'vitest';
import { buildCsv, csvFileName } from '../src/shared/report-csv';
import type { AppliedFix, Finding, ScanReport } from '../src/shared/types';
import { rgba } from './helpers';

const META = { fileName: 'My App', level: 'AA', date: '2026-07-14' };

function reportWith(findings: Finding[]): ScanReport {
  return {
    findings,
    passCount: 5,
    scannedCount: 7,
    targetCount: 3,
    notChecked: ['1.1.1 alt text'],
    durationMs: 12,
  };
}

const contrastViolation: Finding = {
  nodeId: '1:1',
  nodeName: 'Body copy',
  tier: 'violation',
  sc: '1.4.3',
  fg: rgba(0.5, 0.5, 0.5),
  bg: rgba(1, 1, 1),
  ratio: 3.94,
  requiredRatio: 4.5,
  detail: '3.94:1 — requires 4.5:1',
};

describe('buildCsv', () => {
  it('includes meta preamble, header, and one row per finding', () => {
    const csv = buildCsv(reportWith([contrastViolation]), {}, META);
    expect(csv).toContain('Legibly accessibility report');
    expect(csv).toContain('File,My App');
    expect(csv).toContain('Checked against,WCAG 2.2 AA');
    expect(csv).toContain('7 text layers, 3 interactive targets; 5 text layers pass');
    expect(csv).toContain('Layer,Node ID,SC,Criterion,Result,Measured,Required,Fix applied,Details');
    expect(csv).toContain('Body copy,1:1,1.4.3,Contrast (Minimum),Violation,3.94:1,4.5:1,,');
  });

  it('marks applied fixes as Fixed with before → after', () => {
    const applied: Record<string, AppliedFix> = {
      '1:1:1.4.3': {
        nodeId: '1:1',
        nodeName: 'Body copy',
        sc: '1.4.3',
        before: '3.94:1',
        after: '4.61:1',
        target: '4.5:1',
        changeDescription: 'text/muted → text/strong',
      },
    };
    const csv = buildCsv(reportWith([contrastViolation]), applied, META);
    expect(csv).toContain('Fixed,3.94:1 → 4.61:1,4.5:1,text/muted → text/strong');
  });

  it('renders target-size and line-height measurements', () => {
    const tap: Finding = {
      nodeId: '2:2',
      nodeName: 'Tab',
      tier: 'violation',
      sc: '2.5.8',
      detail: 'small',
      targetSize: { width: 18.4, height: 20, required: 24, autoFixable: true },
    };
    const lh: Finding = {
      nodeId: '3:3',
      nodeName: 'Para',
      tier: 'needsReview',
      sc: '1.4.12',
      reason: 'line-height-floor',
      detail: 'tight',
      lineHeight: { ratio: 1.2, fixable: true },
    };
    const csv = buildCsv(reportWith([tap, lh]), {}, META);
    expect(csv).toContain('Tab,2:2,2.5.8,Target Size (Minimum),Violation,18×20px,24×24px');
    expect(csv).toContain('Para,3:3,1.4.12,Text Spacing,Needs review,120%,150%');
  });

  it('escapes commas, quotes and newlines per RFC 4180', () => {
    const tricky: Finding = {
      ...contrastViolation,
      nodeId: '4:4',
      nodeName: 'Says "hi", twice\nreally',
    };
    const csv = buildCsv(reportWith([tricky]), {}, META);
    expect(csv).toContain('"Says ""hi"", twice\nreally"');
  });
});

describe('csvFileName', () => {
  it('slugs the file name and appends the date', () => {
    expect(csvFileName(META)).toBe('legibly-report-My-App-2026-07-14.csv');
  });
  it('falls back for exotic names', () => {
    expect(csvFileName({ ...META, fileName: '***' })).toBe('legibly-report-design-2026-07-14.csv');
  });
});
