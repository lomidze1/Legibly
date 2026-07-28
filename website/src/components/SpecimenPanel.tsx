import { Button } from "./Button";
import styles from "./SpecimenPanel.module.css";

/**
 * The plugin panel as a specimen: one failing card, and the same card repaired.
 *
 * The panel used to stop at the violation, which meant the hero's only product
 * visual demonstrated the half of the job the headline dismisses ("Checkers
 * tell you"). It now carries the fix as well, because that is the claim.
 *
 * The failing sample measures exactly 2.4:1 (--color-neutral-500 on
 * --color-surface) and the repair 6.9:1 (--color-neutral-700 on the same
 * ground). Both are captioned as specimens and marked aria-hidden: a page that
 * claims to pass its own nine checks must keep the deliberate failure off its
 * accessibility surface. src/lib/contrast.test.ts pins both ratios, so neither
 * can drift from the numbers printed beside them.
 */
export function SpecimenPanel() {
  return (
    <figure className={styles.panel}>
      <figcaption className={styles.header}>
        <span className={styles.dot} aria-hidden="true" />
        Legibly · selection audit
      </figcaption>
      <div className={styles.body}>
        <div>
          <span className={styles.sampleCaption}>
            Sample under audit — intentionally failing
          </span>
          <div className={styles.sample} aria-hidden="true">
            <p className={styles.sampleTitle}>Order #2381</p>
            <p className={styles.sampleBody}>
              Payment due in 3 days. Update your billing details to avoid a
              pause in service.
            </p>
          </div>
        </div>

        <div className={styles.verdict}>
          <span className={styles.ratio}>2.4:1</span>
          <span className={styles.verdictLabel}>Fails AA · needs 4.5:1</span>
          <span />
          <span className={styles.verdictNote}>
            Body text measured against the resolved background — four fill
            layers, 62% opacity, one gradient.
          </span>
        </div>

        <div className={styles.step} aria-hidden="true">
          <span className={styles.stepRule} />
          <span className={styles.stepLabel}>One click</span>
          <span className={styles.stepRule} />
        </div>

        <div>
          <span className={styles.sampleCaption}>
            Repaired from your own tokens
          </span>
          <div className={styles.sample} aria-hidden="true">
            <p className={styles.sampleTitle}>Order #2381</p>
            <p className={styles.sampleBodyFixed}>
              Payment due in 3 days. Update your billing details to avoid a
              pause in service.
            </p>
          </div>
        </div>

        <div className={styles.verdict}>
          <span className={`${styles.ratio} ${styles.ratioPass}`}>6.9:1</span>
          {/* 6.9 is not AAA. The plugin picks the nearest passing token, not
              the darkest one, so this says exactly what it cleared. */}
          <span className={styles.verdictLabelPass}>Passes AA · needed 4.5:1</span>
          <span />
          <span className={styles.verdictNote}>
            Swapped to{" "}
            <span className={styles.token}>
              <span className={styles.swatch} />
              text/secondary
            </span>{" "}
            — already in your library. Nothing invented, one undo reverses it.
          </span>
        </div>

        <div className={styles.rule} />

        <div className={styles.footer}>
          <span className={styles.count}>1 violation · 0 needs review</span>
          {/*
            Illustration, not a control: this sits 300px from the real form and
            used to be the widest, most central button in the first viewport.
          */}
          <Button href="/#early" variant="quiet">
            Fix with my tokens
          </Button>
        </div>
      </div>
    </figure>
  );
}
