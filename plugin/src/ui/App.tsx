import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AppliedFix,
  BgFixPlan,
  Finding,
  FixPlan,
  RGBA,
  ScanReport,
  Settings,
  TokenIndex,
} from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import type { RpcClient } from '../shared/rpc';
import { planFix, rgbaToHex } from '../shared/fix';
import { reviewCopy } from '../shared/review-copy';
import { DEEP_CHECKABLE, deepVerdict, DeepVerdict } from '../shared/deep-check';
import { buildCsv, csvFileName } from '../shared/report-csv';
import type { RectLite } from '../shared/figma-lite';
import { FooterBar } from './FooterBar';
import { IconClose } from './icons';

interface Props {
  rpc: RpcClient;
  /** Register for pushed main-thread events (e.g. canvas-changed). */
  subscribe?: (cb: (type: string) => void) => void;
}

type BatchResult = { applied: AppliedFix[]; failed: { nodeId: string; error: string }[] };

type Instruction =
  | { kind: 'token'; token: NonNullable<FixPlan['candidate']>['token']; paintTarget?: string }
  | { kind: 'proposal'; color: RGBA; tokenName: string; paintTarget?: string }
  | { kind: 'min-size'; required: number }
  | { kind: 'line-height'; percent: number }
  | { kind: 'underline'; ranges: { start: number; end: number }[]; excerpt: string };

const SC_BADGE: Record<string, string> = {
  '1.4.3': 'LOW CONTRAST',
  '1.4.11': 'ICON/BORDER',
  '2.5.8': 'TAP TARGET',
  '2.5.5': 'TAP TARGET',
  '1.4.12': 'LINE HEIGHT',
  '1.4.1': 'COLOR ONLY',
  '1.4.10': 'CLIPPED TEXT',
  '2.4.6': 'FIELD LABEL',
  '2.4.7': 'FOCUS STATE',
  'Best practice': 'ADVISORY',
};

let proposalCounter = 0;
function nextProposalName(): string {
  proposalCounter += 1;
  return `legibly/contrast-fix-${proposalCounter}`;
}

/** A finding's fixes are tracked per node AND per criterion. */
function keyOf(f: Finding): string {
  return `${f.nodeId}:${f.sc}`;
}

/** Inline SVGs — emoji glyphs ignore `color` and flip presentation across platforms/themes. */
function IconSettings(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      className={`review-group-chevron${open ? ' open' : ''}`}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Layer name that jumps to the node on canvas — a real button so keyboard users can reach it. */
function NodeName({ name, onSelect }: { name: string; onSelect: () => void }): React.ReactElement {
  return (
    <button className="node-name" title="Select this layer on the canvas" onClick={onSelect}>
      {name}
    </button>
  );
}

export function App({ rpc, subscribe }: Props): React.ReactElement {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [scanning, setScanning] = useState(false);
  /** The scope of the last scan, so the stale banner can re-run it. */
  const [lastScope, setLastScope] = useState<'selection' | 'page' | null>(null);
  /** B4: the canvas changed outside our own fixes — results may no longer hold. */
  const [stale, setStale] = useState(false);
  /** Batch fix in flight — kept separate from `scanning` so results stay on screen (F1). */
  const [fixing, setFixing] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [tokens, setTokens] = useState<TokenIndex | null>(null);
  const [applied, setApplied] = useState<Record<string, AppliedFix>>({});
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [deep, setDeep] = useState<Record<string, DeepVerdict>>({});
  const [bgPlans, setBgPlans] = useState<Record<string, BgFixPlan | null>>({});
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
  /** Which "Check by eye" groups are expanded — all collapsed by default to kill the scroll. */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  /** A group-wide batch in flight: which kind, and how far along. */
  const [batchKind, setBatchKind] = useState<null | 'deep' | 'dec' | 'text'>(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  /** Contrast group view toggles — apply only after deep-check produces verdicts. */
  const [sortContrast, setSortContrast] = useState(false);
  const [hideResolved, setHideResolved] = useState(false);

  useEffect(() => {
    rpc.call<Settings>('get-settings').then(setSettings).catch(() => undefined);
  }, [rpc]);

  useEffect(() => {
    subscribe?.((type) => {
      if (type === 'canvas-changed') setStale(true);
    });
  }, [subscribe]);

  const updateSettings = useCallback(
    (next: Settings, keepResults = false) => {
      setSettings(next);
      if (!keepResults) {
        setReport(null);
        setApplied({});
        setFailures({});
      }
      void rpc.call('set-settings', next).catch(() => undefined);
    },
    [rpc]
  );

  const scan = useCallback(
    async (scope: 'selection' | 'page') => {
      setScanning(true);
      setError(null);
      setApplied({});
      setFailures({});
      setDeep({});
      setBgPlans({});
      setStale(false);
      setLastScope(scope);
      try {
        const [r, t] = await Promise.all([
          rpc.call<ScanReport>('scan', { scope, settings }),
          rpc.call<TokenIndex>('tokens'),
        ]);
        setReport(r);
        setTokens(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setReport(null);
      } finally {
        setScanning(false);
      }
    },
    [rpc, settings]
  );

  const violations = useMemo(
    () => report?.findings.filter((f) => f.tier === 'violation') ?? [],
    [report]
  );
  const reviews = useMemo(
    () => report?.findings.filter((f) => f.tier === 'needsReview') ?? [],
    [report]
  );
  /** Non-WCAG guidance — kept out of the issue counts on purpose. */
  const advisories = useMemo(
    () => report?.findings.filter((f) => f.tier === 'advisory') ?? [],
    [report]
  );

  /** Split "Check by eye" into buckets by what the user can actually DO about each. */
  const reviewGroups = useMemo(() => {
    const contrast: Finding[] = []; // uncertain contrast — measurable by deep check
    const image: Finding[] = []; // image alt text — manual or AI
    const text: Finding[] = []; // fixable text property (line height) — one-click
    const other: Finding[] = []; // review only — nothing we can fix for you
    for (const f of reviews) {
      if (f.reason === 'missing-alt') image.push(f);
      else if (f.reason && DEEP_CHECKABLE.has(f.reason)) contrast.push(f);
      else if (f.lineHeight?.fixable) text.push(f);
      else other.push(f);
    }
    return { contrast, image, text, other };
  }, [reviews]);

  /**
   * Color plans for contrast-based violations (1.4.3, 1.4.11), including ones
   * found in a mode the canvas is not showing: each token carries its per-mode
   * value and each finding its per-mode backgrounds, so a candidate is only
   * offered when it clears every theme at once (NF1).
   */
  const plans = useMemo(() => {
    const map: Record<string, FixPlan> = {};
    if (!tokens) return map;
    for (const f of violations) {
      if (f.fg && f.bg) map[keyOf(f)] = planFix(f, tokens.tokens, settings, f.currentTokenName);
    }
    return map;
  }, [violations, tokens, settings]);

  /** Everything one click away: color-fixable + auto-fixable tap targets. */
  const fixableNow = useMemo(
    () =>
      violations.filter((f) => {
        if (applied[keyOf(f)]) return false;
        if (f.targetSize) return f.targetSize.autoFixable;
        return plans[keyOf(f)]?.status === 'fixable';
      }),
    [violations, plans, applied]
  );
  const appliedCount = violations.filter((f) => applied[keyOf(f)]).length;

  /** Build the RPC payload for one finding, or null when not one-click. */
  const payloadFor = useCallback(
    (f: Finding): { instruction: Instruction; before: string; target: string } | null => {
      if (f.targetSize?.autoFixable) {
        return {
          instruction: { kind: 'min-size', required: f.targetSize.required },
          before: `${Math.round(f.targetSize.width)}×${Math.round(f.targetSize.height)}px`,
          target: `${f.targetSize.required}×${f.targetSize.required}px`,
        };
      }
      if (f.lineHeight?.fixable) {
        return {
          instruction: { kind: 'line-height', percent: 150 },
          before: `${(f.lineHeight.ratio * 100).toFixed(0)}%`,
          target: '150%',
        };
      }
      if (f.colorOnly) {
        return {
          instruction: { kind: 'underline', ranges: f.colorOnly.ranges, excerpt: f.colorOnly.excerpt },
          before: 'color only',
          target: 'a second, non-color cue',
        };
      }
      const plan = plans[keyOf(f)];
      if (plan?.status === 'fixable' && plan.candidate?.token) {
        return {
          instruction: { kind: 'token', token: plan.candidate.token, paintTarget: f.paintTarget ?? 'text-fill' },
          before: `${plan.before.ratio.toFixed(2)}:1`,
          target: `${plan.before.requiredRatio}:1`,
        };
      }
      if (plan?.status === 'needs-proposal' && plan.proposal?.proposedColor) {
        return {
          instruction: {
            kind: 'proposal',
            color: plan.proposal.proposedColor,
            tokenName: nextProposalName(),
            paintTarget: f.paintTarget ?? 'text-fill',
          },
          before: `${plan.before.ratio.toFixed(2)}:1`,
          target: `${plan.before.requiredRatio}:1`,
        };
      }
      return null;
    },
    [plans]
  );

  const applyOne = useCallback(
    async (f: Finding) => {
      const payload = payloadFor(f);
      if (!payload) return;
      const key = keyOf(f);
      setBusy((b) => ({ ...b, [key]: true }));
      try {
        const result = await rpc.call<AppliedFix>('apply-fix', {
          nodeId: f.nodeId,
          instruction: payload.instruction,
          settings,
          before: payload.before,
          target: payload.target,
          sc: f.sc,
        });
        setApplied((a) => ({ ...a, [key]: result }));
        setFailures(({ [key]: _, ...rest }) => rest);
      } catch (e) {
        setFailures((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : String(e) }));
      } finally {
        setBusy((b) => ({ ...b, [key]: false }));
      }
    },
    [payloadFor, rpc, settings]
  );

  const applyAll = useCallback(async () => {
    const fixes = fixableNow
      .map((f) => {
        const payload = payloadFor(f);
        return payload
          ? { nodeId: f.nodeId, instruction: payload.instruction, before: payload.before, target: payload.target, sc: f.sc }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (fixes.length === 0) return;
    setFixing(true);
    try {
      const result = await rpc.call<BatchResult>('apply-batch', { fixes, settings });
      setApplied((a) => {
        const next = { ...a };
        for (const ap of result.applied) next[`${ap.nodeId}:${ap.sc}`] = ap;
        return next;
      });
      setFailures((prev) => {
        const next = { ...prev };
        for (const fail of result.failed) {
          const f = fixableNow.find((v) => v.nodeId === fail.nodeId);
          next[f ? keyOf(f) : fail.nodeId] = fail.error;
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFixing(false);
    }
  }, [fixableNow, payloadFor, rpc, settings]);

  const selectNode = useCallback(
    (nodeId: string) => void rpc.call('select-node', { nodeId }).catch(() => undefined),
    [rpc]
  );

  /** Pixel-true deep check: render the frame without the text, sample real pixels. */
  const runDeepCheck = useCallback(
    async (f: Finding) => {
      const key = keyOf(f);
      setBusy((b) => ({ ...b, [key]: true }));
      try {
        const res = await rpc.call<{
          png: Uint8Array;
          rect: RectLite;
          imageCssWidth: number;
          fg: RGBA;
          required: number;
        }>('deep-check', { nodeId: f.nodeId, settings });
        const bmp = await createImageBitmap(new Blob([res.png as BlobPart], { type: 'image/png' }));
        const scale = bmp.width / res.imageCssWidth;
        const w = Math.max(1, Math.round(res.rect.width * scale));
        const h = Math.max(1, Math.round(res.rect.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bmp, -Math.round(res.rect.x * scale), -Math.round(res.rect.y * scale));
        const img = ctx.getImageData(0, 0, w, h);
        const verdict = deepVerdict(img.data, w, h, res.fg, res.required);
        setDeep((d) => ({ ...d, [key]: verdict }));
      } catch (e) {
        setFailures((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : String(e) }));
      } finally {
        setBusy((b) => ({ ...b, [key]: false }));
      }
    },
    [rpc, settings]
  );

  /** F13 step 3: for unfixable contrast violations, offer a background re-token. */
  useEffect(() => {
    for (const f of violations) {
      const key = keyOf(f);
      if (f.sc !== '1.4.3' || !f.fg || f.bgSamples?.length) continue;
      if (plans[key]?.status !== 'unfixable' || key in bgPlans || applied[key]) continue;
      setBgPlans((p) => ({ ...p, [key]: null })); // mark in-flight
      rpc
        .call<BgFixPlan | null>('plan-bg-fix', {
          nodeId: f.nodeId,
          settings,
          requiredRatio: f.requiredRatio,
          fg: f.fg,
        })
        .then((plan) => setBgPlans((p) => ({ ...p, [key]: plan })))
        .catch(() => undefined);
    }
  }, [violations, plans, bgPlans, applied, rpc, settings]);

  const applyBgFix = useCallback(
    async (f: Finding, plan: BgFixPlan) => {
      const key = keyOf(f);
      setBusy((b) => ({ ...b, [key]: true }));
      try {
        const result = await rpc.call<AppliedFix>('apply-bg-fix', {
          nodeId: f.nodeId,
          ownerId: plan.ownerId,
          token: plan.token,
          settings,
          before: `${(f.ratio ?? 0).toFixed(2)}:1`,
          target: `${f.requiredRatio}:1`,
        });
        setApplied((a) => ({ ...a, [key]: result }));
        setFailures(({ [key]: _, ...rest }) => rest);
      } catch (e) {
        setFailures((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : String(e) }));
      } finally {
        setBusy((b) => ({ ...b, [key]: false }));
      }
    },
    [rpc, settings]
  );

  /** 1.1.1: record alt text / decorative flag. */
  const saveAlt = useCallback(
    async (f: Finding, value: { altText?: string; decorative?: boolean }) => {
      const key = keyOf(f);
      setBusy((b) => ({ ...b, [key]: true }));
      try {
        const result = await rpc.call<AppliedFix>('set-alt-text', { nodeId: f.nodeId, ...value });
        setApplied((a) => ({ ...a, [key]: result }));
        setFailures(({ [key]: _, ...rest }) => rest);
      } catch (e) {
        setFailures((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : String(e) }));
      } finally {
        setBusy((b) => ({ ...b, [key]: false }));
      }
    },
    [rpc]
  );

  /** Batch "Deep-check all": measures each backdrop in turn — resolves uncertain, never guesses. */
  const runDeepCheckAll = useCallback(
    async (items: Finding[]) => {
      const pending = items.filter((f) => !deep[keyOf(f)] && !applied[keyOf(f)]);
      if (pending.length === 0) return;
      setBatchKind('deep');
      setBatchProgress({ done: 0, total: pending.length });
      let done = 0;
      for (const f of pending) {
        await runDeepCheck(f);
        setBatchProgress({ done: ++done, total: pending.length });
      }
      setBatchKind(null);
      setBatchProgress(null);
    },
    [deep, applied, runDeepCheck]
  );

  /** Batch "Mark all decorative": records every pending image as decorative — one undo reverts all. */
  const markAllDecorative = useCallback(
    async (items: Finding[]) => {
      const pending = items.filter((f) => !applied[keyOf(f)]);
      if (pending.length === 0) return;
      setBatchKind('dec');
      setBatchProgress({ done: 0, total: pending.length });
      let done = 0;
      for (const f of pending) {
        await saveAlt(f, { decorative: true });
        setBatchProgress({ done: ++done, total: pending.length });
      }
      setBatchKind(null);
      setBatchProgress(null);
    },
    [applied, saveAlt]
  );

  /** Batch "Fix all" for the text group: applies each one-click text fix (line height) in turn. */
  const fixAllText = useCallback(
    async (items: Finding[]) => {
      const pending = items.filter((f) => !applied[keyOf(f)]);
      if (pending.length === 0) return;
      setBatchKind('text');
      setBatchProgress({ done: 0, total: pending.length });
      let done = 0;
      for (const f of pending) {
        await applyOne(f);
        setBatchProgress({ done: ++done, total: pending.length });
      }
      setBatchKind(null);
      setBatchProgress(null);
    },
    [applied, applyOne]
  );

  /** Compliance report (F19) — CSV download built fully client-side. */
  const exportCsv = useCallback(async () => {
    if (!report) return;
    const fileName = await rpc.call<string>('file-name').catch(() => 'design');
    const date = new Date().toISOString().slice(0, 10);
    const csv = buildCsv(report, applied, { fileName, level: settings.level, date });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = csvFileName({ fileName, level: settings.level, date });
    a.click();
    URL.revokeObjectURL(url);
  }, [report, applied, rpc, settings]);

  const renderReviewCard = (f: Finding): React.ReactElement =>
    f.reason === 'missing-alt' ? (
      <AltCard
        key={keyOf(f)}
        finding={f}
        applied={applied[keyOf(f)]}
        failure={failures[keyOf(f)]}
        busy={!!busy[keyOf(f)]}
        draft={altDrafts[keyOf(f)] ?? ''}
        onDraft={(v) => setAltDrafts((d) => ({ ...d, [keyOf(f)]: v }))}
        onSelect={selectNode}
        onSave={saveAlt}
      />
    ) : (
      <ReviewCard
        key={keyOf(f)}
        finding={f}
        applied={applied[keyOf(f)]}
        failure={failures[keyOf(f)]}
        busy={!!busy[keyOf(f)]}
        deep={deep[keyOf(f)]}
        onSelect={selectNode}
        onFix={applyOne}
        onDeepCheck={runDeepCheck}
      />
    );

  const toggleGroup = (k: string): void => setOpenGroups((g) => ({ ...g, [k]: !g[k] }));
  const busyBatch = batchKind !== null;

  // ── Contrast group: deep-check, then optionally sort worst-first and hide the resolved ──
  const contrastPending = reviewGroups.contrast.filter((f) => !deep[keyOf(f)] && !applied[keyOf(f)]).length;
  const resolvedCount = reviewGroups.contrast.filter((f) => deep[keyOf(f)]?.kind === 'pass').length;
  const hasVerdicts = reviewGroups.contrast.some((f) => deep[keyOf(f)]);
  /** Worst first: confirmed fail → mixed → unresolved → unchecked → passed. */
  const severityRank = (f: Finding): number => {
    const v = deep[keyOf(f)];
    if (!v) return 3;
    return v.kind === 'fail' ? 0 : v.kind === 'mixed' ? 1 : v.kind === 'unresolved' ? 2 : 4;
  };
  let contrastList = reviewGroups.contrast;
  if (hideResolved) contrastList = contrastList.filter((f) => deep[keyOf(f)]?.kind !== 'pass');
  if (sortContrast) {
    contrastList = [...contrastList].sort(
      (a, b) => severityRank(a) - severityRank(b) || (deep[keyOf(a)]?.min ?? Infinity) - (deep[keyOf(b)]?.min ?? Infinity)
    );
  }

  const contrastActions: BatchAction[] = [];
  if (contrastPending > 0) {
    contrastActions.push({
      id: 'deep',
      label: `Deep-check all (${contrastPending})`,
      running: 'Checking pixels…',
      progress: batchKind === 'deep' ? batchProgress : null,
      disabled: busyBatch,
      onRun: () => void runDeepCheckAll(reviewGroups.contrast),
    });
  }
  if (hasVerdicts) {
    contrastActions.push({
      id: 'sort',
      label: sortContrast ? 'Original order' : 'Sort worst-first',
      running: '',
      progress: null,
      disabled: busyBatch,
      onRun: () => setSortContrast((s) => !s),
    });
    if (resolvedCount > 0) {
      contrastActions.push({
        id: 'clear',
        label: hideResolved ? `Show passed (${resolvedCount})` : `Hide passed (${resolvedCount})`,
        running: '',
        progress: null,
        disabled: busyBatch,
        onRun: () => setHideResolved((h) => !h),
      });
    }
  }

  // ── Image group: alt text — bulk-decorative ──
  const imageUnresolved = reviewGroups.image.filter((f) => !applied[keyOf(f)]).length;
  const imageActions: BatchAction[] = [];
  if (imageUnresolved > 0) {
    imageActions.push({
      id: 'dec',
      label: `Mark all decorative (${imageUnresolved})`,
      running: 'Marking…',
      progress: batchKind === 'dec' ? batchProgress : null,
      disabled: busyBatch,
      onRun: () => void markAllDecorative(reviewGroups.image),
    });
  }

  // ── Text group: one-click line-height fixes ──
  const textUnresolved = reviewGroups.text.filter((f) => !applied[keyOf(f)]).length;
  const textActions: BatchAction[] = [];
  if (textUnresolved > 0) {
    textActions.push({
      id: 'text',
      label: `Fix all → line height 150% (${textUnresolved})`,
      running: 'Fixing…',
      progress: batchKind === 'text' ? batchProgress : null,
      disabled: busyBatch,
      onRun: () => void fixAllText(reviewGroups.text),
    });
  }

  return (
    <div className="app">
      <div className="toolbar">
        <button className="btn btn-primary" disabled={scanning} onClick={() => void scan('selection')}>
          Scan selection
        </button>
        <button className="btn" disabled={scanning} onClick={() => void scan('page')}>
          Scan full canvas
        </button>
        <div className="toolbar-actions">
          {report && (
            <button
              className="btn btn-icon"
              title="Clear results"
              aria-label="Clear results"
              onClick={() => {
                setReport(null);
                setApplied({});
                setFailures({});
                setError(null);
              }}
            >
              <IconClose />
            </button>
          )}
          <button
            className={`btn btn-icon${showSettings ? ' btn-active' : ''}`}
            title="Settings"
            aria-label="Settings"
            aria-pressed={showSettings}
            onClick={() => setShowSettings((s) => !s)}
          >
            <IconSettings />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings">
          <label>
            Check against
            <select
              value={settings.level}
              onChange={(e) =>
                updateSettings({ ...settings, level: e.target.value as Settings['level'] })
              }
            >
              <option value="AA">AA — standard (recommended)</option>
              <option value="AAA">AAA — stricter, optional</option>
            </select>
          </label>
          <div className="microtext">
            AA is the level laws and audits require. Changing it clears current results.
          </div>
          <label style={{ marginTop: 8 }}>
            Tap target minimum
            <select
              value={settings.targetFloor}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  targetFloor: Number(e.target.value) as Settings['targetFloor'],
                })
              }
            >
              <option value={24}>24px — WCAG AA (SC 2.5.8)</option>
              <option value={44}>44px — WCAG AAA · iOS (SC 2.5.5)</option>
            </select>
          </label>
          <div className="microtext">
            24px allows the spacing exception: a small control passes when nothing else is within
            reach of it. 44px is size-only — the rule mobile platforms expect.
          </div>
        </div>
      )}

      {error && (
        <div className="error-bar" role="alert">
          {error}
        </div>
      )}

      <div className="results">
        {!report && !scanning && (
          <div className="empty">
            <h3>Find issues in your design — and fix them in one click</h3>
            <div className="microtext empty-sub">
              Checks your design against WCAG 2.2 (AA/AAA) — the accessibility standard behind EAA
              and ADA compliance. Deterministic checks, zero false positives, fixes from your own
              color styles.
            </div>
            <ol className="steps">
              <li>Select a frame</li>
              <li>Click Scan</li>
              <li>Fix issues</li>
            </ol>
            <div className="microtext">
              Runs on your device. Nothing ever leaves Figma.
            </div>
          </div>
        )}
        {scanning && (
          <div className="empty" role="status">
            Scanning…
          </div>
        )}
        {report && !scanning && (
          <>
            {stale && (
              <div className="banner banner-stale" role="alert">
                <div className="banner-row">
                  <span>Canvas changed since this scan — results may be out of date.</span>
                  {lastScope && (
                    <button className="btn btn-sm" disabled={scanning} onClick={() => void scan(lastScope)}>
                      Re-scan
                    </button>
                  )}
                </div>
              </div>
            )}
            <NextStepBanner
              violations={violations.length}
              fixable={fixableNow.length}
              appliedCount={appliedCount}
              reviews={reviews.length}
              strictMode={settings.strictMode}
              fixing={fixing}
              onFixAll={() => void applyAll()}
              onToggleStrict={(v) => updateSettings({ ...settings, strictMode: v }, true)}
            />
            <div className="summary summary-row" role="status">
              <span>
                {report.scannedCount} text layers · {report.targetCount} interactive targets checked
                against {settings.level} · {report.passCount} text layers look good
              </span>
              <button className="btn btn-sm" title="Download an audit-ready CSV report" onClick={() => void exportCsv()}>
                Export CSV
              </button>
            </div>

            {violations.length > 0 && (
              <>
                <div className="tier-heading">
                  Issues found <span className="count">{violations.length}</span>
                </div>
                {violations.map((f) => (
                  <ViolationCard
                    key={keyOf(f)}
                    finding={f}
                    plan={plans[keyOf(f)]}
                    bgPlan={bgPlans[keyOf(f)] ?? undefined}
                    applied={applied[keyOf(f)]}
                    failure={failures[keyOf(f)]}
                    busy={!!busy[keyOf(f)]}
                    strictMode={settings.strictMode}
                    onSelect={selectNode}
                    onFix={applyOne}
                    onBgFix={applyBgFix}
                  />
                ))}
              </>
            )}

            {reviews.length > 0 && (
              <>
                <div className="tier-heading">
                  Check by eye <span className="count">{reviews.length}</span>
                </div>
                {reviewGroups.contrast.length > 0 && (
                  <ReviewGroup
                    groupKey="contrast"
                    title="Contrast — check by eye"
                    count={reviewGroups.contrast.length}
                    open={!!openGroups.contrast}
                    onToggle={() => toggleGroup('contrast')}
                    actions={contrastActions}
                  >
                    {contrastList.map(renderReviewCard)}
                  </ReviewGroup>
                )}
                {reviewGroups.image.length > 0 && (
                  <ReviewGroup
                    groupKey="image"
                    title="Image properties"
                    count={reviewGroups.image.length}
                    open={!!openGroups.image}
                    onToggle={() => toggleGroup('image')}
                    actions={imageActions}
                    note="Best accessibility: write real alt text per image and Save. “Mark decorative” hides the image from screen readers — use it only for purely visual images."
                  >
                    {reviewGroups.image.map(renderReviewCard)}
                  </ReviewGroup>
                )}
                {reviewGroups.text.length > 0 && (
                  <ReviewGroup
                    groupKey="text"
                    title="Text properties"
                    count={reviewGroups.text.length}
                    open={!!openGroups.text}
                    onToggle={() => toggleGroup('text')}
                    actions={textActions}
                  >
                    {reviewGroups.text.map(renderReviewCard)}
                  </ReviewGroup>
                )}
                {reviewGroups.other.length > 0 && (
                  <ReviewGroup
                    groupKey="other"
                    title="Needs your judgment"
                    count={reviewGroups.other.length}
                    open={!!openGroups.other}
                    onToggle={() => toggleGroup('other')}
                  >
                    {reviewGroups.other.map(renderReviewCard)}
                  </ReviewGroup>
                )}
              </>
            )}

            {advisories.length > 0 && (
              <>
                <div className="tier-heading">
                  Legibly recommends <span className="count">{advisories.length}</span>
                </div>
                <div className="microtext" style={{ padding: '0 12px 8px' }}>
                  Readability guidance, not WCAG. Nothing here counts as a failure in the exported
                  report — it is labelled “Advisory (not WCAG)”.
                </div>
                {advisories.map(renderReviewCard)}
              </>
            )}

            {violations.length === 0 && reviews.length === 0 && advisories.length === 0 && (
              <div className="empty">
                <h3>All clear ✓</h3>
                No certain issues found in the scanned layers.
              </div>
            )}
          </>
        )}
      </div>

      {report && (
        <div className="footer">
          <details>
            <summary>What Legibly did NOT check ({report.notChecked.length})</summary>
            {report.notChecked.map((s) => (
              <div key={s}>· {s}</div>
            ))}
          </details>
          Flagged issues are mathematically certain (zero false positives). Anything uncertain is
          listed under “Check by eye”, never silently passed.
        </div>
      )}

      <FooterBar
        onOpenUrl={(url) => {
          void rpc.call('open-url', { url }).catch(() => setError('That link could not be opened.'));
        }}
      />
    </div>
  );
}

interface BannerProps {
  violations: number;
  fixable: number;
  appliedCount: number;
  reviews: number;
  strictMode: boolean;
  fixing: boolean;
  onFixAll: () => void;
  onToggleStrict: (v: boolean) => void;
}

/** One strip that answers: what did I get, and what do I do now? */
function NextStepBanner({
  violations,
  fixable,
  appliedCount,
  reviews,
  strictMode,
  fixing,
  onFixAll,
  onToggleStrict,
}: BannerProps): React.ReactElement {
  let message: string;
  let tone: 'ok' | 'action' | 'info' = 'info';
  if (violations === 0 && reviews === 0) {
    message = 'All clear — nothing to fix.';
    tone = 'ok';
  } else if (violations === 0) {
    message = `No certain issues. ${reviews} layer${reviews === 1 ? '' : 's'} to check by eye below.`;
  } else if (appliedCount === violations) {
    message = 'All fixed ✓ — one undo reverts everything.';
    tone = 'ok';
  } else if (fixable > 0) {
    message = `${violations} issue${violations === 1 ? '' : 's'} found — ${fixable} can be fixed in one click.`;
    tone = 'action';
  } else {
    message = `${violations} issue${violations === 1 ? '' : 's'} found — see the options on each card below.`;
  }
  return (
    <div className={`banner banner-${tone}`}>
      <div className="banner-row">
        <span>{message}</span>
        {violations > 0 && appliedCount < violations && (
          <button
            className="btn btn-primary btn-sm"
            disabled={fixable === 0 || fixing}
            title={fixable === 0 ? 'No automatic fix available — see the options on each card' : undefined}
            onClick={onFixAll}
          >
            {fixing ? 'Fixing…' : `Fix issues${fixable > 0 ? ` (${fixable})` : ''}`}
          </button>
        )}
      </div>
      {violations > 0 && appliedCount < violations && (
        <label className="strict-row" title="Applies when fixing, not when scanning">
          <input
            type="checkbox"
            checked={strictMode}
            onChange={(e) => onToggleStrict(e.target.checked)}
          />
          Only use my existing colors
          <span className="microtext">
            {strictMode
              ? 'Legibly will never create a new color token.'
              : 'Off: Legibly may propose one new token when none of yours passes.'}
          </span>
        </label>
      )}
    </div>
  );
}

function Swatch({ color }: { color: RGBA }): React.ReactElement {
  return <span className="swatch" style={{ background: rgbaToHex(color) }} />;
}

function FixedDiff({ applied }: { applied: AppliedFix }): React.ReactElement {
  return (
    <div className="diff">
      <span className="ok">
        {applied.before} → {applied.after}
      </span>{' '}
      (target {applied.target})
      <br />
      {applied.changeDescription}
      <br />
      WCAG 2.2 — SC {applied.sc} satisfied
    </div>
  );
}

interface ReviewCardProps {
  finding: Finding;
  applied: AppliedFix | undefined;
  failure: string | undefined;
  busy: boolean;
  deep: DeepVerdict | undefined;
  onSelect: (nodeId: string) => void;
  onFix: (finding: Finding) => Promise<void>;
  onDeepCheck: (finding: Finding) => Promise<void>;
}

function ReviewCard({
  finding: f,
  applied,
  failure,
  busy,
  deep,
  onSelect,
  onFix,
  onDeepCheck,
}: ReviewCardProps): React.ReactElement {
  const copy = reviewCopy(f.reason);
  const deepable = f.reason !== undefined && DEEP_CHECKABLE.has(f.reason) && !!f.fg;
  return (
    <div className="card">
      <div className="card-head">
        <NodeName name={f.nodeName} onSelect={() => onSelect(f.nodeId)} />
        {applied ? (
          <span className="badge badge-fixed">FIXED ✓</span>
        ) : deep?.kind === 'pass' ? (
          <span className="badge badge-fixed">PIXEL-CHECKED ✓</span>
        ) : deep?.kind === 'fail' ? (
          <span className="badge badge-violation">CONFIRMED ISSUE</span>
        ) : (
          <span className="badge badge-review">{SC_BADGE[f.sc] ?? 'CHECK BY EYE'}</span>
        )}
      </div>
      {f.mode && !applied && <ModeNote label={f.mode} fixable={false} />}
      {applied ? (
        <FixedDiff applied={applied} />
      ) : (
        <>
          <div className="detail">{copy.title}</div>
          {deep && <div className={deep.kind === 'pass' ? 'diff' : 'detail'}>{deep.detail}</div>}
          {failure && <div className="error-bar">{failure}</div>}
          <details className="review-details">
            <summary>Why, and what to do</summary>
            <div className="detail">{copy.why}</div>
            <div className="detail">
              <strong>What to do:</strong> {copy.todo}
            </div>
            <div className="microtext">Tip: click the layer name above to jump to it on the canvas.</div>
            <div className="microtext">Technical detail: {f.detail}</div>
          </details>
          <div className="card-actions">
            {deepable && !deep && (
              <button
                className="btn btn-sm"
                disabled={busy}
                title="Renders this frame without the text and measures the real pixels behind it — on your device"
                onClick={() => void onDeepCheck(f)}
              >
                {busy ? 'Checking pixels…' : 'Deep check (pixel-true)'}
              </button>
            )}
            {f.lineHeight?.fixable && (
              <button className="btn btn-sm" disabled={busy} onClick={() => void onFix(f)}>
                {busy ? 'Fixing…' : 'Set line height to 150%'}
              </button>
            )}
            {f.colorOnly && (
              <button
                className="btn btn-sm"
                disabled={busy}
                title="Adds an underline so the run is marked by more than colour"
                onClick={() => void onFix(f)}
              >
                {busy
                  ? 'Underlining…'
                  : f.colorOnly.ranges.length > 1
                    ? `Underline ${f.colorOnly.ranges.length} runs`
                    : `Underline “${f.colorOnly.excerpt}”`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface AltCardProps {
  finding: Finding;
  applied: AppliedFix | undefined;
  failure: string | undefined;
  busy: boolean;
  draft: string;
  onDraft: (value: string) => void;
  onSelect: (nodeId: string) => void;
  onSave: (finding: Finding, value: { altText?: string; decorative?: boolean }) => Promise<void>;
}

/** 1.1.1 card: manual entry and decorative marker. */
function AltCard({
  finding: f,
  applied,
  failure,
  busy,
  draft,
  onDraft,
  onSelect,
  onSave,
}: AltCardProps): React.ReactElement {
  const copy = reviewCopy(f.reason);
  return (
    <div className="card">
      <div className="card-head">
        <NodeName name={f.nodeName} onSelect={() => onSelect(f.nodeId)} />
        {applied ? (
          <span className="badge badge-fixed">{applied.after === 'decorative' ? 'DECORATIVE ✓' : 'ALT RECORDED ✓'}</span>
        ) : (
          <span className="badge badge-review">ALT TEXT</span>
        )}
      </div>
      {applied ? (
        <div className="diff">
          {applied.changeDescription}
          <br />
          WCAG 2.2 — SC {applied.sc} presence recorded (quality stays your review)
        </div>
      ) : (
        <>
          <div className="detail">{copy.title}</div>
          {failure && <div className="error-bar">{failure}</div>}
          <div className="card-actions">
            <input
              type="text"
              aria-label="Alt text"
              placeholder="Describe what this image conveys…"
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              style={{ flex: '1 1 100%' }}
              maxLength={150}
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={busy || draft.trim().length < 3}
              onClick={() => void onSave(f, { altText: draft })}
            >
              {busy ? 'Saving…' : 'Save alt text'}
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => void onSave(f, { decorative: true })}>
              Mark decorative
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface CardProps {
  finding: Finding;
  plan: FixPlan | undefined;
  bgPlan: BgFixPlan | undefined;
  applied: AppliedFix | undefined;
  failure: string | undefined;
  busy: boolean;
  strictMode: boolean;
  onSelect: (nodeId: string) => void;
  onFix: (finding: Finding) => Promise<void>;
  onBgFix: (finding: Finding, plan: BgFixPlan) => Promise<void>;
}

/**
 * Findings measured in a mode the canvas is not showing. A fix offered here is
 * verified in every theme at once, so applying it cannot repair this one at the
 * visible one's expense — but the user still needs to know why the layer looks
 * fine on screen.
 */
function ModeNote({ label, fixable }: { label: string; fixable: boolean }): React.ReactElement {
  return (
    <div className="escalation">
      Found in <strong>{label}</strong> — this layer reads fine in the mode on screen.{' '}
      {fixable
        ? 'The fix below is checked against every mode, so it holds in both.'
        : `Switch the page to ${label} to work on it there, or change what that colour resolves to in this mode.`}
    </div>
  );
}

function ViolationCard({
  finding: f,
  plan,
  bgPlan,
  applied,
  failure,
  busy,
  strictMode,
  onSelect,
  onFix,
  onBgFix,
}: CardProps): React.ReactElement {
  return (
    <div className="card">
      <div className="card-head">
        {f.fg && f.bg && (
          <span className="swatches">
            <Swatch color={f.fg} />
            <Swatch color={f.bg} />
          </span>
        )}
        <NodeName name={f.nodeName} onSelect={() => onSelect(f.nodeId)} />
        {applied ? (
          <span className="badge badge-fixed">FIXED ✓</span>
        ) : (
          <span className="badge badge-violation">{SC_BADGE[f.sc] ?? `SC ${f.sc}`}</span>
        )}
      </div>
      {f.mode && !applied && (
        <ModeNote
          label={f.mode}
          fixable={plan?.status === 'fixable' || plan?.status === 'needs-proposal'}
        />
      )}

      {applied ? (
        <FixedDiff applied={applied} />
      ) : (
        <>
          <div className="detail">
            {f.detail}
            {typeof f.apcaLc === 'number' && (
              <>
                {' '}
                · <span className="apca">APCA Lc {f.apcaLc.toFixed(0)} (advisory)</span>
              </>
            )}
          </div>
          {failure && <div className="error-bar">{failure}</div>}
          <div className="card-actions">
            {f.targetSize &&
              (f.targetSize.autoFixable ? (
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void onFix(f)}>
                  {busy ? 'Fixing…' : `Fix → min size ${f.targetSize.required}×${f.targetSize.required}`}
                </button>
              ) : (
                <div className="escalation">
                  No auto layout on this element, so Legibly can’t resize it safely. Enlarge it to at
                  least {f.targetSize.required}×{f.targetSize.required}px, or add clear space around it.
                </div>
              ))}
            {plan?.status === 'fixable' && plan.candidate?.token && (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void onFix(f)}>
                {busy ? 'Fixing…' : `Fix → ${plan.candidate.token.name} (${plan.candidate.verifiedRatio.toFixed(2)}:1)`}
              </button>
            )}
            {plan?.status === 'needs-proposal' && plan.proposal?.proposedColor && (
              <>
                <button className="btn btn-sm" disabled={busy} onClick={() => void onFix(f)}>
                  {busy
                    ? 'Creating…'
                    : `Accept new color ${rgbaToHex(plan.proposal.proposedColor)} (${plan.proposal.verifiedRatio.toFixed(2)}:1)`}
                </button>
                <Swatch color={plan.proposal.proposedColor} />
                <span className="microtext">None of your colors passes here — this adds one new token to your file.</span>
              </>
            )}
            {plan?.status === 'unfixable' && bgPlan && (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void onBgFix(f, bgPlan)}>
                {busy
                  ? 'Fixing…'
                  : `Fix background → ${bgPlan.token.name} (${bgPlan.verifiedRatio.toFixed(2)}:1)`}
              </button>
            )}
            {plan?.status === 'unfixable' && bgPlan && (
              <span className="microtext">
                {/* B6: name what changes, show it, and let the user go look at it —
                    a background swap is invisible on the card it was triggered from. */}
                Changes <NodeName name={bgPlan.ownerName} onSelect={() => onSelect(bgPlan.ownerId)} />{' '}
                behind this text
                {f.bg && (
                  <>
                    {': '}
                    <Swatch color={f.bg} /> {rgbaToHex(f.bg)} → <Swatch color={bgPlan.token.color} />{' '}
                    {rgbaToHex(bgPlan.token.color)}
                  </>
                )}
                . {bgPlan.checkedCount} other layers on this frame re-verified, none break.
              </span>
            )}
            {plan?.status === 'unfixable' && !bgPlan && (
              <div className="escalation">
                None of your existing colors reaches {plan.before.requiredRatio}:1 here — as text
                color or as background{strictMode ? ' (new colors are off)' : ''}. Add a
                darker/lighter color to your styles, or change the design.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface BatchAction {
  id: string;
  label: string;
  running: string;
  progress: { done: number; total: number } | null;
  disabled: boolean;
  onRun: () => void;
}

interface ReviewGroupProps {
  groupKey: string;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  actions?: BatchAction[];
  note?: string;
  children: React.ReactNode;
}

/** A collapsible bucket of "check by eye" cards. Batch actions live in a bar atop the open body. */
function ReviewGroup({
  groupKey,
  title,
  count,
  open,
  onToggle,
  actions,
  note,
  children,
}: ReviewGroupProps): React.ReactElement {
  const bodyId = `review-group-${groupKey}`;
  return (
    <div className="review-group">
      <div className="review-group-head">
        <button
          className="review-group-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <IconChevron open={open} />
          {title}
          <span className="count">{count}</span>
        </button>
      </div>
      {open && (
        <div className="review-group-body" id={bodyId}>
          {actions && actions.length > 0 && (
            <div className="review-group-actions">
              {actions.map((a) => (
                <button key={a.id} className="btn btn-sm" disabled={a.disabled} onClick={a.onRun}>
                  {a.progress ? `${a.running} (${a.progress.done}/${a.progress.total})` : a.label}
                </button>
              ))}
            </div>
          )}
          {note && <div className="microtext review-group-note">{note}</div>}
          {children}
        </div>
      )}
    </div>
  );
}
