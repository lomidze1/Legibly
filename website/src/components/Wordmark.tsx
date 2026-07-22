import styles from "./Wordmark.module.css";

/**
 * The Legibly mark: a geometric "L" built from two blocks, plus the name.
 * Deliberately minimal — the typeface carries the brand.
 */
export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <svg
        className={styles.mark}
        width="22"
        height="22"
        viewBox="0 0 22 22"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="2" width="6" height="18" rx="2" fill="var(--accent)" />
        <rect x="3" y="14" width="16" height="6" rx="2" fill="var(--accent)" />
      </svg>
      Legibly
    </span>
  );
}
