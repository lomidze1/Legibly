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
    (next: Settings) => {
      setSettings(next);
      setReport(null);
      setApplied({});
      setFailures({});
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
          Scan page
        </button>
        {fixableNow.length > 0 && (
          <button className="btn" disabled={scanning} onClick={() => void applyAll()}>
            Fix all ({fixableNow.length})
          </button>
        )}
      </div>

      <div className="settings">
        <label>
          Level
          <select
            value={settings.level}
            onChange={(e) => updateSettings({ ...settings, level: e.target.value as Settings['level'] })}
          >
            <option value="AA">AA</option>
            <option value="AAA">AAA</option>
          </select>
        </label>
        <label title="Forbid new-token proposals — escalate instead (governance teams)">
          <input
            type="checkbox"
            checked={settings.strictMode}
            onChange={(e) => updateSettings({ ...settings, strictMode: e.target.checked })}
          />
          Strict mode
        </label>
      </div>

      {error && <div className="error-bar">{error}</div>}

      <div className="results">
        {!report && !scanning && (
          <div className="empty">
            <h3>Legibly</h3>
            Scan your selection or the current page for WCAG {settings.level} text-contrast issues.
            <br />
            Detection is free and fully on-device — nothing leaves Figma.
          </div>
        )}
        {scanning && <div className="empty">Scanning…</div>}
        {report && !scanning && (
          <>
            <div className="summary">
              Scanned <strong>{report.scannedCount}</strong> text layers ·{' '}
              <strong>{report.passCount}</strong> pass · <strong>{violations.length}</strong>{' '}
              violations · <strong>{reviews.length}</strong> need review
            </div>

            {violations.length > 0 && (
              <>
                <div className="tier-heading">
                  Violations <span className="count">{violations.length}</span>
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
                  Needs review <span className="count">{reviews.length}</span>
                </div>
                {reviews.map((f) => (
                  <div className="card" key={f.nodeId}>
                    <div className="card-head">
                      <span className="node-name" onClick={() => selectNode(f.nodeId)}>
                        {f.nodeName}
                      </span>
                      <span className="badge badge-review">NEEDS REVIEW</span>
                    </div>
                    <div className="detail">{f.detail}</div>
                  </div>
                ))}
              </>
            )}

            {violations.length === 0 && reviews.length === 0 && (
              <div className="empty">
                <h3>All clear ✓</h3>
                No certain contrast violations found in the scanned layers.
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
          Violations are mathematically certain (zero false positives). Uncertain cases are listed
          as “needs review”, never silently passed.
        </div>
      )}
    </div>
  );
}

function Swatch({ color }: { color: RGBA }): React.ReactElement {
  return <span className="swatch" style={{ background: rgbaToHex(color) }} />;
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
        <span className="node-name" onClick={() => onSelect(f.nodeId)}>
          {f.nodeName}
        </span>
        {applied ? (
          <span className="badge badge-fixed">FIXED ✓</span>
        ) : (
          <span className="badge badge-violation">SC {f.sc}</span>
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
                    : `Accept new token ${rgbaToHex(plan.proposal.proposedColor)} (${plan.proposal.verifiedRatio.toFixed(2)}:1)`}
                </button>
                <Swatch color={plan.proposal.proposedColor} />
              </>
            )}
            {plan?.status === 'unfixable' && (
              <div className="escalation">
                No on-system token reaches {plan.before.requiredRatio}:1 against this background
                {strictMode ? ' (strict mode: new tokens are off)' : ''}. Options: change the
                background, add a compliant token to your system, or acknowledge &amp; override.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
