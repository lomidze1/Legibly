"use client";

import { useState } from "react";
import { contrastRatio, formatRatio } from "@/lib/contrast";
import styles from "./FixDemo.module.css";

/**
 * A live miniature of what the plugin does. Nothing here is faked:
 * the ratios in the readout are computed by the same WCAG function the
 * unit tests audit the site's own palette with. "Fix" swaps the failing
 * color for a passing token; "Undo" puts the violation back.
 */
const CANVAS_BG = "#f1f1ee";
const BEFORE = "#999da4"; // fails AA on the canvas
const TOKEN = "#3d4450"; // the design system's text/secondary token

export function FixDemo() {
  const [fixed, setFixed] = useState(false);

  const color = fixed ? TOKEN : BEFORE;
  const ratio = contrastRatio(color, CANVAS_BG);
  const passes = ratio >= 4.5;

  return (
    <div className={styles.frame}>
      <p className={styles.frameLabel} id="fixdemo-label">
        Live demo, real math
      </p>
      <div
        className={styles.canvas}
        role="group"
        aria-labelledby="fixdemo-label"
        style={{ background: CANVAS_BG }}
      >
        <p className={styles.cardTitle}>Order #2381</p>
        <p className={styles.cardBody} style={{ color }}>
          Payment due in 3 days. Update your billing details to avoid a pause
          in service.
        </p>
      </div>

      <div className={styles.readout} aria-live="polite">
        <span
          className={`${styles.verdict} ${passes ? styles.pass : styles.fail}`}
        >
          <span className={styles.ratio}>{formatRatio(ratio)}</span>
          {passes ? "Passes AA" : "Fails AA (needs 4.5:1)"}
        </span>
        <span className={styles.detail}>
          {passes
            ? "Fixed with the token text/secondary, then re-verified."
            : "Body text against its effective background."}
        </span>
      </div>

      <button
        type="button"
        className={styles.action}
        onClick={() => setFixed(!fixed)}
      >
        {fixed ? "Undo" : "Fix with my tokens"}
      </button>
    </div>
  );
}
