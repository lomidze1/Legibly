import { Button } from "./Button";
import styles from "./SpecimenPanel.module.css";

/**
 * The plugin panel as a specimen: what Legibly reports on one failing card.
 *
 * The sample inside measures exactly 2.4:1 (--color-neutral-500 on
 * --color-surface) — it is the thing the plugin catches, so it is captioned
 * as a specimen and marked aria-hidden: a page that claims to pass its own
 * nine checks must keep the deliberate failure off its accessibility surface.
 * src/lib/contrast.test.ts pins the ratio, so it cannot drift from the "2.4:1"
 * printed beside it.
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

        <div className={styles.rule} />

        <div className={styles.footer}>
          <span className={styles.count}>1 violation · 0 needs review</span>
          <Button href="/#early">Fix with my tokens</Button>
        </div>
      </div>
    </figure>
  );
}
