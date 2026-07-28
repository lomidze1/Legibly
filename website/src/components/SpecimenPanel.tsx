"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SpecimenPanel.module.css";

/**
 * The plugin panel as a specimen — and the one place on the page where the
 * product actually runs.
 *
 * It used to be a still of the violation, which meant the hero's only visual
 * demonstrated the half of the job the headline dismisses ("Checkers tell
 * you"). Now the reader presses the button and watches the repair happen:
 * the sample recolors, the ratio counts up, the verdict flips.
 *
 * The failing sample measures exactly 2.4:1 (--color-neutral-500 on
 * --color-surface) and the repair 6.9:1 (--color-neutral-700 on the same
 * ground). src/lib/contrast.test.ts pins both, so neither can drift from the
 * numbers printed beside them. The sample itself stays aria-hidden: a page
 * claiming to pass its own nine checks must keep the deliberate failure off
 * its accessibility surface, and the verdict below it is announced instead.
 */

const BEFORE = 2.4;
const AFTER = 6.9;
const DURATION = 900;

type State = "before" | "fixing" | "after";

export function SpecimenPanel() {
  const [state, setState] = useState<State>("before");
  const [ratio, setRatio] = useState(BEFORE);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => () => cancelAnimationFrame(frame.current ?? 0), []);

  function run(next: State) {
    cancelAnimationFrame(frame.current ?? 0);

    if (next === "before") {
      setState("before");
      setRatio(BEFORE);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setState("after");
      setRatio(AFTER);
      return;
    }

    setState("fixing");
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      // easeOutCubic: the number decelerates into its final value.
      const eased = 1 - Math.pow(1 - t, 3);
      setRatio(BEFORE + (AFTER - BEFORE) * eased);
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setState("after");
        setRatio(AFTER);
      }
    };
    frame.current = requestAnimationFrame(tick);
  }

  const fixed = state !== "before";

  return (
    <figure className={styles.panel}>
      <figcaption className={styles.header}>
        <span className={styles.dot} aria-hidden="true" />
        Legibly · selection audit
      </figcaption>
      <div className={styles.body}>
        <div>
          <span className={styles.sampleCaption}>
            {fixed ? "Repaired from your own tokens" : "Sample under audit"}
          </span>
          <div className={styles.sample} aria-hidden="true">
            <p className={styles.sampleTitle}>Order #2381</p>
            <p
              className={`${styles.sampleBody} ${fixed ? styles.sampleBodyFixed : ""}`}
            >
              Payment due in 3 days. Update your billing details to avoid a
              pause in service.
            </p>
          </div>
        </div>

        <div className={styles.verdict}>
          <span className={`${styles.ratio} ${fixed ? styles.ratioPass : ""}`}>
            {ratio.toFixed(1)}:1
          </span>
          <span
            className={fixed ? styles.verdictLabelPass : styles.verdictLabel}
          >
            {fixed ? "Passes AA · needed 4.5:1" : "Fails AA · needs 4.5:1"}
          </span>
          <span />
          <span className={styles.verdictNote}>
            {state === "after" ? (
              <>
                Swapped to{" "}
                <span className={styles.token}>
                  <span className={styles.swatch} />
                  text/secondary
                </span>{" "}
                — already in your library. Nothing invented, one undo reverses
                it.
              </>
            ) : (
              <>
                Body text measured against the resolved background: four fill
                layers, 62% opacity, one gradient.
              </>
            )}
          </span>
        </div>

        {/* The verdict is the outcome, so it is what gets announced. */}
        <p className={styles.srOnly} role="status">
          {state === "after"
            ? "Fixed. Contrast is now 6.9 to 1, which passes AA, using the token text/secondary."
            : ""}
        </p>

        <div className={styles.rule} />

        <div className={styles.footer}>
          <span className={styles.count}>
            {fixed ? "0 violations · 1 fixed" : "1 violation · 0 needs review"}
          </span>
          {state === "after" ? (
            <button
              type="button"
              className={styles.undo}
              onClick={() => run("before")}
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              className={styles.fix}
              onClick={() => run("after")}
              disabled={state === "fixing"}
            >
              {state === "fixing" ? "Fixing…" : "Fix with my tokens"}
            </button>
          )}
        </div>
      </div>
    </figure>
  );
}
