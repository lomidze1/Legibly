/**
 * Compliance report export (F19) — CSV, RFC 4180 escaping.
 * Rows cover every finding plus applied-fix outcomes, with a meta preamble
 * auditors can file: date, Figma file, level checked, honest coverage note.
 */
import type { AppliedFix, Finding, ScanReport } from './types';

export interface CsvMeta {
  fileName: string;
  level: string;
  date: string; // ISO yyyy-mm-dd
}

const SC_NAMES: Record<string, string> = {
  '1.4.3': 'Contrast (Minimum)',
  '1.4.11': 'Non-text Contrast',
  '2.5.8': 'Target Size (Minimum)',
  '1.4.12': 'Text Spacing',
  '1.1.1': 'Non-text Content (alt text)',
};

function esc(v: string | number | undefined): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(cells: (string | number | undefined)[]): string {
  return cells.map(esc).join(',');
}

function measuredOf(f: Finding): string {
  if (typeof f.ratio === 'number') return `${f.ratio.toFixed(2)}:1`;
  if (f.targetSize) return `${Math.round(f.targetSize.width)}×${Math.round(f.targetSize.height)}px`;
  if (f.lineHeight) return `${(f.lineHeight.ratio * 100).toFixed(0)}%`;
  return '';
}

function requiredOf(f: Finding): string {
  if (typeof f.requiredRatio === 'number') return `${f.requiredRatio}:1`;
  if (f.targetSize) return `${f.targetSize.required}×${f.targetSize.required}px`;
  if (f.lineHeight) return '150%';
  return '';
}

export function buildCsv(
  report: ScanReport,
  applied: Record<string, AppliedFix>,
  meta: CsvMeta
): string {
  const lines: string[] = [];
  lines.push(row(['Legibly accessibility report']));
  lines.push(row(['File', meta.fileName]));
  lines.push(row(['Date', meta.date]));
  lines.push(row(['Checked against', `WCAG 2.2 ${meta.level}`]));
  lines.push(
    row([
      'Coverage',
      `${report.scannedCount} text layers, ${report.targetCount} interactive targets; ${report.passCount} text layers pass`,
    ])
  );
  lines.push(row(['Not checked', report.notChecked.join('; ')]));
  lines.push('');
  lines.push(row(['Layer', 'Node ID', 'SC', 'Criterion', 'Result', 'Measured', 'Required', 'Fix applied', 'Details']));

  for (const f of report.findings) {
    const fix = applied[`${f.nodeId}:${f.sc}`];
    const result = fix ? 'Fixed' : f.tier === 'violation' ? 'Violation' : 'Needs review';
    lines.push(
      row([
        f.nodeName,
        f.nodeId,
        f.sc,
        SC_NAMES[f.sc] ?? f.sc,
        result,
        fix ? `${fix.before} → ${fix.after}` : measuredOf(f),
        requiredOf(f),
        fix ? fix.changeDescription : '',
        f.detail,
      ])
    );
  }
  return lines.join('\r\n') + '\r\n';
}

export function csvFileName(meta: CsvMeta): string {
  const safe = meta.fileName.replace(/[^\w\d-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'design';
  return `legibly-report-${safe}-${meta.date}.csv`;
}
