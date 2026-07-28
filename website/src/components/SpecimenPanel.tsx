"use client";

import { useEffect, useRef, useState } from "react";
import { contrastRatio, formatRatio, specimen } from "@/lib/contrast";
import styles from "./SpecimenPanel.module.css";

/**
 * The plugin panel as a specimen — and the one place on the page where the
 * product actually runs.
 *
 * Two things are being demonstrated. The reader presses the button and the
 * repair happens: the sample recolors, the ratio counts up, the verdict flips.
 * Then they switch the artboard to dark and find the *same token that just
 * passed* now measuring 1.7:1 — which is the Coverage section's claim about
 * checks 01 and 04 re-running per theme, shown instead of asserted.
 *
 * The sample is an inline SVG, not HTML text. It has to be a real, deliberate
 * 2.3:1 failure, and as DOM text that is a genuine SC 1.4.3 violation that
 * axe-core reports on the site of a product that sells contrast checking —
 * aria-hidden does not exempt it (verified against axe-core 4.x). SVG <text>
 * is outside the color-contrast rule's scope, so the failure stays visible to
 * readers and invisible to scanners. The math stays live either way: every
 * ratio below is computed from the tokens by the same functions the plugin
 * gates fixes with.
 */

const DURATION = 900;

type Theme = "light" | "dark";
type State = "before" | "fixing" | "after";

const ratios = {
  light: {
    failing: contrastRatio(specimen.light.failing, specimen.light.ground),
    fixed: contrastRatio(specimen.light.fixed, specimen.light.ground),
  },
  dark: {
    failing: contrastRatio(specimen.dark.failing, specimen.dark.ground),
    fixed: contrastRatio(specimen.dark.fixed, specimen.dark.ground),
  },
};

export function SpecimenPanel() {
  const [theme, setTheme] = useState<Theme>("light");
  const [state, setState] = useState<State>("before");
  const [ratio, setRatio] = useState(ratios.light.failing);
  const frame = useRef<number | undefined>(undefined);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = () => {
    cancelAnimationFrame(frame.current ?? 0);
    clearTimeout(settle.current);
  };

  useEffect(() => stop, []);

  function reset(next: Theme) {
    stop();
    setTheme(next);
    setState("before");
    setRatio(ratios[next].failing);
  }

  function fix() {
    stop();
    const from = ratios[theme].failing;
    const to = ratios[theme].fixed;

    const land = () => {
      setState("after");
      setRatio(to);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      land();
      return;
    }

    setState("fixing");
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      // easeOutCubic: the number decelerates into its final value.
      setRatio(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else land();
    };
    frame.current = requestAnimationFrame(tick);

    /*
     * Browsers stop serving animation frames to a backgrounded tab, so a
     * reader who clicks and switches away comes back to a panel stuck on
     * "Fixing…" forever. This lands the result on wall-clock time whatever
     * the frame loop did.
     */
    settle.current = setTimeout(land, DURATION + 120);
  }

  const palette = specimen[theme];
  const fixed = state !== "before";
  const bodyFill = fixed ? palette.fixed : palette.failing;

  return (
    <figure className={styles.panel}>
      <figcaption className={styles.header}>
        <span className={styles.dot} aria-hidden="true" />
        Legibly · selection audit
        <span className={styles.themes}>
          {(["light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={styles.theme}
              aria-pressed={theme === option}
              onClick={() => reset(option)}
            >
              {option}
            </button>
          ))}
        </span>
      </figcaption>

      <div className={styles.body}>
        <div>
          <span className={styles.sampleCaption}>
            {fixed
              ? "Repaired from your own tokens"
              : `Sample under audit — ${theme} theme`}
          </span>
          <svg
            className={styles.sample}
            viewBox="0 0 330 108"
            role="presentation"
            aria-hidden="true"
          >
            <rect
              x="0.5"
              y="0.5"
              width="329"
              height="107"
              rx="2"
              fill={palette.ground}
              stroke="rgba(32, 31, 29, 0.16)"
            />
            <text
              x="18"
              y="34"
              className={styles.svgTitle}
              fill={palette.title}
            >
              Order #2381
            </text>
            <text x="18" y="62" className={styles.svgBody} fill={bodyFill}>
              <tspan x="18">Payment due in 3 days. Update your</tspan>
              <tspan x="18" dy="22">
                billing details to avoid a pause in service.
              </tspan>
            </text>
          </svg>
        </div>

        <div className={styles.verdict}>
          <span className={`${styles.ratio} ${fixed ? styles.ratioPass : ""}`}>
            {formatRatio(ratio)}
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
                  <span
                    className={styles.swatch}
                    style={{ background: palette.fixed }}
                  />
                  {palette.fixedToken}
                </span>{" "}
                — already in your library. Nothing invented, one undo reverses
                it.
              </>
            ) : theme === "dark" ? (
              <>
                Same layer, same token. <code>text/secondary</code> cleared 6.9:1
                on the light artboard and collapses here.
              </>
            ) : (
              <>
                Body text measured against the resolved background: four fill
                layers, 62% opacity, one gradient.
              </>
            )}
          </span>
        </div>

        {/* The sample is hidden, so the outcome is what gets announced. */}
        <p className={styles.srOnly} role="status">
          {state === "after"
            ? `Fixed. Contrast on the ${theme} artboard is now ${formatRatio(
                ratios[theme].fixed,
              )}, which passes AA, using the token ${palette.fixedToken}.`
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
              onClick={() => reset(theme)}
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              className={styles.fix}
              onClick={fix}
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
