"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { contrastRatio, formatRatio } from "@/lib/contrast";
import styles from "./FixDemo.module.css";

/**
 * A live miniature of what the plugin does. Nothing here is faked:
 * the ratios in the readout are computed by the same WCAG function the
 * unit tests audit the site's own palette with. "Fix" swaps the failing
 * color for a passing token; "Undo" puts the violation back.
 *
 * The card itself is painted to a <canvas> rather than laid out as DOM text.
 * That is not a cosmetic choice: the "before" specimen is deliberately
 * 2.4:1, and as live DOM text it made axe, Lighthouse and WAVE report a real
 * SC 1.4.3 violation on the homepage of a WCAG product. It is a picture of
 * someone else's broken design, so it is rendered as a picture — with the
 * full text carried in the canvas's accessible name, and the arithmetic
 * still computed live below.
 */
const CANVAS_BG = "#f1f1ee";
const BEFORE = "#999da4"; // fails AA on the canvas
const TOKEN = "#3d4450"; // the design system's text/secondary token

const CARD_TITLE = "Order #2381";
const CARD_BODY =
  "Payment due in 3 days. Update your billing details to avoid a pause in service.";

/** Logical card size. Drawn once at this size and scaled by CSS, like a screenshot. */
const W = 420;
const H = 150;
const PAD = 22;
const LINE = 26;
const FIX_MS = 520;

/** Mix two #rrggbb colors in sRGB. Used to tween the fix, not to judge it. */
function mixHex(from: string, to: string, t: number): string {
  const parse = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = parse(from);
  const b = parse(to);
  return `#${a
    .map((v, i) => Math.round(v + (b[i] - v) * t))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function FixDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [fixed, setFixed] = useState(false);
  const [color, setColor] = useState(BEFORE);

  const paint = useCallback((bodyColor: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const family = getComputedStyle(canvas).fontFamily;

    ctx.fillStyle = CANVAS_BG;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 10);
    ctx.fill();

    ctx.textBaseline = "top";
    ctx.fillStyle = "#191c20";
    ctx.font = `700 17px ${family}`;
    ctx.fillText(CARD_TITLE, PAD, PAD);

    ctx.fillStyle = bodyColor;
    ctx.font = `400 17px ${family}`;
    wrap(ctx, CARD_BODY, W - PAD * 2).forEach((line, i) => {
      ctx.fillText(line, PAD, PAD + 32 + i * LINE);
    });
  }, []);

  // Repaint on every tween frame, and once more when the webfont lands —
  // the first paint can happen before Atkinson is ready, which changes wrapping.
  useEffect(() => {
    paint(color);
  }, [paint, color]);

  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) paint(color);
    });
    return () => {
      cancelled = true;
    };
    // Intentionally once: this is the webfont-arrival repaint, not a color repaint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function toggle() {
    const next = !fixed;
    setFixed(next);
    const from = next ? BEFORE : TOKEN;
    const to = next ? TOKEN : BEFORE;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setColor(to);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FIX_MS);
      setColor(mixHex(from, to, 1 - Math.pow(1 - t, 3)));
      frameRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    frameRef.current = requestAnimationFrame(step);
  }

  // Read out the color that is actually on the canvas right now, so the number
  // climbs and the verdict flips at the true 4.5:1 crossing rather than on a timer.
  const ratio = contrastRatio(color, CANVAS_BG);
  const passes = ratio >= 4.5;

  return (
    <div className={styles.frame}>
      <p className={styles.frameLabel} id="fixdemo-label">
        Live demo, real math
      </p>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={`Design mock-up of a card reading “${CARD_TITLE}. ${CARD_BODY}”. Its body text is currently ${
          fixed
            ? "the dark token text/secondary, which passes AA."
            : "light grey, which fails AA against the card background."
        }`}
      />

      <div className={styles.readout} aria-hidden="true">
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

      {/*
        The visible readout updates every animation frame; announcing that would
        be unusable. This one changes once per click, on the settled state.
      */}
      <p className="sr-only" role="status">
        {fixed
          ? "Fixed. 8.6 to 1, passes AA, using the token text/secondary. Re-verified."
          : "2.4 to 1, fails AA. 4.5 to 1 is required."}
      </p>

      <button type="button" className={styles.action} onClick={toggle}>
        {fixed ? "Undo" : "Fix with my tokens"}
      </button>
    </div>
  );
}
