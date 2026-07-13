import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AppliedFix,
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

interface Props {
  rpc: RpcClient;
}

type BatchResult = { applied: AppliedFix[]; failed: { nodeId: string; error: string }[] };

let proposalCounter = 0;
function nextProposalName(): string {
  proposalCounter += 1;
  return `legibly/contrast-fix-${proposalCounter}`;
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

  const plans = useMemo(() => {
    const map: Record<string, FixPlan> = {};
    if (!tokens) return map;
    for (const f of violations) {
      map[f.nodeId] = planFix(f, tokens.tokens, settings, f.currentTokenName);
    }
    return map;
  }, [violations, tokens, settings]);

  const applyOne = useCallback(
    async (finding: Finding, plan: FixPlan) => {
      const instruction =
        plan.status === 'fixable' && plan.candidate?.token
          ? { kind: 'token' as const, token: plan.candidate.token }
          : plan.status === 'needs-proposal' && plan.proposal?.proposedColor
            ? {
                kind: 'proposal' as const,
                color: plan.proposal.proposedColor,
                tokenName: nextProposalName(),
              }
            : null;
      if (!instruction) return;
      setBusy((b) => ({ ...b, [finding.nodeId]: true }));
      try {
        const result = await rpc.call<AppliedFix>('apply-fix', {
          nodeId: finding.nodeId,
          instruction,
          settings,
          beforeRatio: plan.before.ratio,
          requiredRatio: plan.before.requiredRatio,
        });
        setApplied((a) => ({ ...a, [finding.nodeId]: result }));
        setFailures(({ [finding.nodeId]: _, ...rest }) => rest);
      } catch (e) {
        setFailures((f) => ({ ...f, [finding.nodeId]: e instanceof Error ? e.message : String(e) }));
      } finally {
        setBusy((b) => ({ ...b, [finding.nodeId]: false }));
      }
    },
    [rpc, settings]
  );

  const fixableNow = violations.filter(
    (f) => plans[f.nodeId]?.status === 'fixable' && !applied[f.nodeId]
  );
  const appliedCount = violations.filter((f) => applied[f.nodeId]).length;

  const applyAll = useCallback(async () => {
    const fixes = fixableNow.map((f) => {
      const plan = plans[f.nodeId]!;
      return {
        nodeId: f.nodeId,
        instruction: { kind: 'token' as const, token: plan.candidate!.token! },
        beforeRatio: plan.before.ratio,
        requiredRatio: plan.before.requiredRatio,
      };
    });
    if (fixes.length === 0) return;
    setScanning(true);
    try {
      const result = await rpc.call<BatchResult>('apply-batch', { fixes, settings });
      setApplied((a) => {
        const next = { ...a };
        for (const ap of result.applied) {
          const plan = plans[ap.nodeId];
          next[ap.nodeId] = { ...ap, requiredRatio: plan?.before.requiredRatio ?? ap.requiredRatio };
        }
        return next;
      });
      setFailures((f) => {
        const next = { ...f };
        for (const fail of result.failed) next[fail.nodeId] = fail.error;
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }, [fixableNow, plans, rpc, settings]);

  const selectNode = useCallback(
    (nodeId: string) => void rpc.call('select-node', { nodeId }).catch(() => undefined),
    [rpc]
  );

  return (
    <div className="app">
      <div className="toolbar">
        <button className="btn btn-primary" disabled={scanning} onClick={() => void scan('selection')}>
          Scan selection
        </button>
        <button className="btn" disabled={scanning} onClick={() => void scan('page')}>
          Scan full canvas
        </button>
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
            <h3>Find hard-to-read text in 3 steps</h3>
            <ol className="steps">
              <li>Select a frame — or select nothing to check the whole canvas</li>
              <li>Click Scan</li>
              <li>Fix issues in one click, using your own color styles</li>
            </ol>
            <button className="btn btn-primary" onClick={() => void scan('selection')}>
              Scan selection
            </button>
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
            <div className="summary">
              {report.scannedCount} text layers checked against {settings.level} ·{' '}
              {report.passCount} look good
            </div>

            {violations.length > 0 && (
              <>
                <div className="tier-heading">
                  Hard to read <span className="count">{violations.length}</span>
                </div>
                {violations.map((f) => (
                  <ViolationCard
                    key={f.nodeId}
                    finding={f}
                    plan={plans[f.nodeId]}
                    applied={applied[f.nodeId]}
                    failure={failures[f.nodeId]}
                    busy={!!busy[f.nodeId]}
                    strictMode={settings.strictMode}
                    onSelect={selectNode}
                    onFix={applyOne}
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
                  <ReviewCard key={f.nodeId} finding={f} onSelect={selectNode} />
                ))}
              </>
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
    message = `${violations} layer${violations === 1 ? ' is' : 's are'} hard to read — ${fixable} can be fixed in one click.`;
    tone = 'action';
  } else {
    message = `${violations} hard-to-read layer${violations === 1 ? '' : 's'} — see the options on each card below.`;
  }
  return (
    <div className={`banner banner-${tone}`}>
      <div className="banner-row">
        <span>{message}</span>
        {fixable > 0 && (
          <button className="btn btn-primary btn-sm" onClick={onFixAll}>
            Fix all {fixable}
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

function ReviewCard({
  finding: f,
  onSelect,
}: {
  finding: Finding;
  onSelect: (nodeId: string) => void;
}): React.ReactElement {
  const copy = reviewCopy(f.reason);
  return (
    <div className="card">
      <div className="card-head">
        <span className="node-name" title="Click to select this layer on the canvas" onClick={() => onSelect(f.nodeId)}>
          {f.nodeName}
        </span>
        <span className="badge badge-review">CHECK BY EYE</span>
      </div>
      <div className="detail">{copy.title}</div>
      <details className="review-details">
        <summary>Why, and what to do</summary>
        <div className="detail">{copy.why}</div>
        <div className="detail">
          <strong>What to do:</strong> {copy.todo}
        </div>
        <div className="microtext">Tip: click the layer name above to jump to it on the canvas.</div>
        <div className="microtext">Technical detail: {f.detail}</div>
      </details>
    </div>
  );
}

interface CardProps {
  finding: Finding;
  plan: FixPlan | undefined;
  applied: AppliedFix | undefined;
  failure: string | undefined;
  busy: boolean;
  strictMode: boolean;
  onSelect: (nodeId: string) => void;
  onFix: (finding: Finding, plan: FixPlan) => Promise<void>;
}

function ViolationCard({
  finding: f,
  plan,
  applied,
  failure,
  busy,
  strictMode,
  onSelect,
  onFix,
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
          <span className="badge badge-violation">LOW CONTRAST</span>
        )}
      </div>

      {applied ? (
        <div className="diff">
          <span className="ok">
            {applied.beforeRatio.toFixed(2)}:1 → {applied.afterRatio.toFixed(2)}:1
          </span>{' '}
          (target {f.requiredRatio}:1)
          <br />
          {applied.changeDescription}
          <br />
          WCAG 2.2 — SC {applied.sc} Contrast (Minimum) satisfied
        </div>
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
            {plan?.status === 'fixable' && plan.candidate?.token && (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void onFix(f, plan)}>
                {busy ? 'Fixing…' : `Fix → ${plan.candidate.token.name} (${plan.candidate.verifiedRatio.toFixed(2)}:1)`}
              </button>
            )}
            {plan?.status === 'needs-proposal' && plan.proposal?.proposedColor && (
              <>
                <button className="btn btn-sm" disabled={busy} onClick={() => void onFix(f, plan)}>
                  {busy
                    ? 'Creating…'
                    : `Accept new color ${rgbaToHex(plan.proposal.proposedColor)} (${plan.proposal.verifiedRatio.toFixed(2)}:1)`}
                </button>
                <Swatch color={plan.proposal.proposedColor} />
                <span className="microtext">None of your colors passes here — this adds one new token to your file.</span>
              </>
            )}
            {plan?.status === 'unfixable' && (
              <div className="escalation">
                None of your existing colors reaches {plan.before.requiredRatio}:1 on this background
                {strictMode ? ' (new colors are off)' : ''}. Try changing the background, or add a
                darker/lighter color to your styles.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
