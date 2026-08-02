"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScanDemo.module.css";

/**
 * The nine checks, running on a page instead of being listed.
 *
 * The hero specimen proves one thing — a single violation, measured and
 * repaired. This proves the other one: a whole selection at once, which is
 * the Pro feature ("batch auto-fix with a single undo") and had nothing
 * demonstrating it.
 *
 * It also carries the three-verdict claim, which used to be a static table in
 * its own section. Two of these six findings are deliberately not fixed:
 * a gradient the math cannot read safely, and a criterion Legibly does not
 * evaluate at all. Pressing "Fix all" and watching those two survive says
 * more than a table row explaining that they would.
 *
 * Timers, not animation frames: a backgrounded tab stops being served frames
 * and this would strand mid-scan.
 */

type Verdict = "violation" | "review" | "not-checked";

type Finding = {
  index: string;
  name: string;
  sc: string;
  detail: string;
  verdict: Verdict;
  /** Only violations carry one — it is what makes them fixable. */
  repaired?: string;
};

const findings: Finding[] = [
  {
    index: "01",
    name: "Text contrast",
    sc: "SC 1.4.3",
    detail: "2.3:1 on the resolved background",
    verdict: "violation",
    repaired: "6.9:1 · text/secondary",
  },
  {
    index: "03",
    name: "Target size",
    sc: "SC 2.5.8",
    detail: "18 × 18, spacing exception does not cover it",
    verdict: "violation",
    repaired: "44 × 44 · touch/min",
  },
  {
    index: "05",
    name: "Image alt text",
    sc: "SC 1.1.1",
    detail: "Three images carrying no description",
    verdict: "violation",
    repaired: "Three described · one marked decorative",
  },
  {
    index: "09",
    name: "Focus states",
    sc: "SC 2.4.7",
    detail: "Hover styled, keyboard focus absent",
    verdict: "violation",
    repaired: "2px ring · focus/ring",
  },
  {
    index: "04",
    name: "Icon and border contrast",
    sc: "SC 1.4.11",
    detail: "Icon sits on a gradient — the range crosses 3:1",
    verdict: "review",
  },
  {
    index: "—",
    name: "Focus order",
    sc: "SC 2.4.3",
    detail: "Needs runtime behaviour, so Legibly never claims it",
    verdict: "not-checked",
  },
];

const fixable = findings.filter((f) => f.verdict === "violation").length;
const STAGGER = 260;

type State = "idle" | "scanning" | "scanned" | "fixed";

const verdictLabel: Record<Verdict, string> = {
  violation: "Violation",
  review: "Needs review",
  "not-checked": "Not checked",
};

export function ScanDemo() {
  const [state, setState] = useState<State>("idle");
  const [revealed, setRevealed] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  function scan() {
    clear();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setRevealed(findings.length);
      setState("scanned");
      return;
    }
    setState("scanning");
    setRevealed(0);
    findings.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => {
          setRevealed(i + 1);
          if (i === findings.length - 1) setState("scanned");
        }, STAGGER * (i + 1)),
      );
    });
  }

  function reset() {
    clear();
    setState("idle");
    setRevealed(0);
  }

  const scanning = state === "scanning";
  const fixed = state === "fixed";
  const showList = state !== "idle";

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.dot} aria-hidden="true" />
        Legibly · page audit
        <span className={styles.scope}>1 page · 214 layers</span>
      </div>

      <div className={styles.body}>
        {!showList && (
          <p className={styles.empty}>
            Nothing has been measured yet. Run the nine checks over a sample
            page and see what comes back.
          </p>
        )}

        {showList && (
          <ol className={styles.list}>
            {findings.slice(0, revealed).map((finding) => {
              const repaired = fixed && finding.verdict === "violation";
              return (
                <li key={finding.name} className={styles.row}>
                  <span className={styles.index}>{finding.index}</span>
                  <span className={styles.name}>
                    {finding.name} <span className={styles.sc}>{finding.sc}</span>
                  </span>
                  <span className={styles.detail}>
                    {repaired ? finding.repaired : finding.detail}
                  </span>
                  {/*
                    A word, not a color. Check 06 on this very list is about
                    meaning carried by hue alone.
                  */}
                  <span
                    className={`${styles.verdict} ${
                      repaired
                        ? styles.fixedMark
                        : styles[
                            finding.verdict === "not-checked"
                              ? "notChecked"
                              : finding.verdict
                          ]
                    }`}
                  >
                    {repaired ? "Fixed" : verdictLabel[finding.verdict]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <p className={styles.srOnly} role="status">
          {state === "scanned"
            ? `Scan complete. ${findings.length} findings: ${fixable} violations, one needs review, one not checked.`
            : fixed
              ? `${fixable} violations fixed. One still needs review and one was never checked — neither was touched.`
              : ""}
        </p>

        <div className={styles.rule} />

        <div className={styles.footer}>
          <span className={styles.count}>
            {state === "idle" && "Nine checks · ready"}
            {scanning && "Scanning…"}
            {state === "scanned" &&
              `${findings.length} findings · ${fixable} fixable`}
            {fixed && `${fixable} fixed · 2 left for you, on purpose`}
          </span>

          {state === "idle" && (
            <button type="button" className={styles.action} onClick={scan}>
              Run scan
            </button>
          )}
          {scanning && (
            <button type="button" className={styles.action} disabled>
              Scanning…
            </button>
          )}
          {state === "scanned" && (
            <button
              type="button"
              className={styles.action}
              onClick={() => setState("fixed")}
            >
              Fix all {fixable}
            </button>
          )}
          {fixed && (
            <button type="button" className={styles.quiet} onClick={reset}>
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
