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

interface Props {
  rpc: RpcClient;
}

type BatchResult = { applied: AppliedFix[]; failed: { nodeId: string; error: string }[] };

type Instruction =
  | { kind: 'token'; token: NonNullable<FixPlan['candidate']>['token']; paintTarget?: string }
  | { kind: 'proposal'; color: RGBA; tokenName: string; paintTarget?: string }
  | { kind: 'min-size'; required: number }
  | { kind: 'line-height'; percent: number };

const SC_BADGE: Record<string, string> = {
  '1.4.3': 'LOW CONTRAST',
  '1.4.11': 'ICON/BORDER',
  '2.5.8': 'TAP TARGET',
  '1.4.12': 'LINE HEIGHT',
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

export function App({ rpc }: Props): React.ReactElement {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [tokens, setTokens] = useState<TokenIndex | null>(null);
  const [applied, setApplied] = useState<Record<string, AppliedFix>>({});
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [deep, setDeep] = useState<Record<string, DeepVerdict>>({});
  const [bgPlans, setBgPlans] = useState<Record<string, BgFixPlan | null>>({});

  useEffect(() => {
    rpc.call<Settings>('get-settings').then(setSettings).catch(() => undefined);
  }, [rpc]);

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

  /** Color plans for contrast-based violations (1.4.3, 1.4.11). */
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
    setScanning(true);
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
      setScanning(false);
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

  return (
    <div className="app">
      <div className="toolbar">
        <button className="btn btn-primary" disabled={scanning} onClick={() => void scan('selection')}>
          Scan selection
        </button>
        <button className="btn" disabled={scanning} onClick={() => void scan('page')}>
          Scan full canvas
        </button>
        {report && (
          <button
            className="btn btn-icon"
            title="Clear results"
            onClick={() => {
              setReport(null);
              setApplied({});
              setFailures({});
              setError(null);
            }}
          >
            ✕
          </button>
        )}
        <button
          className={`btn btn-icon${showSettings ? ' btn-active' : ''}`}
          title="Settings"
          onClick={() => setShowSettings((s) => !s)}
        >
          ⚙
        </button>
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
        </div>
      )}

      {error && <div className="error-bar">{error}</div>}

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
            <div className="microtext">Runs on your device. Nothing leaves Figma.</div>
          </div>
        )}
        {scanning && <div className="empty">Scanning…</div>}
        {report && !scanning && (
          <>
            <NextStepBanner
              violations={violations.length}
              fixable={fixableNow.length}
              appliedCount={appliedCount}
              reviews={reviews.length}
              strictMode={settings.strictMode}
              onFixAll={() => void applyAll()}
              onToggleStrict={(v) => updateSettings({ ...settings, strictMode: v }, true)}
            />
            <div className="summary summary-row">
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
                {reviews.map((f) => (
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
                ))}
              </>
            )}

            {violations.length === 0 && reviews.length === 0 && (
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
    </div>
  );
}

interface BannerProps {
  violations: number;
  fixable: number;
  appliedCount: number;
  reviews: number;
  strictMode: boolean;
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
    message = 'All fixed ✓ — one Cmd-Z undoes everything.';
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
            disabled={fixable === 0}
            title={fixable === 0 ? 'No automatic fix available — see the options on each card' : undefined}
            onClick={onFixAll}
          >
            Fix issues{fixable > 0 ? ` (${fixable})` : ''}
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
        <span className="node-name" title="Click to select this layer on the canvas" onClick={() => onSelect(f.nodeId)}>
          {f.nodeName}
        </span>
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
        <span className="node-name" title="Click to select this layer on the canvas" onClick={() => onSelect(f.nodeId)}>
          {f.nodeName}
        </span>
        {applied ? (
          <span className="badge badge-fixed">FIXED ✓</span>
        ) : (
          <span className="badge badge-violation">{SC_BADGE[f.sc] ?? `SC ${f.sc}`}</span>
        )}
      </div>

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
                Changes “{bgPlan.ownerName}” behind this text — {bgPlan.checkedCount} other layers
                on this frame re-verified, none break.
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
