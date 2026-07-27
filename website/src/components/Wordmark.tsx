import styles from "./Wordmark.module.css";

/**
 * The Legibly mark is the word itself, set in the heading face. Classical
 * carries the brand in the typography — there is no logo glyph, and the only
 * non-text marks on the whole page are a CSS circle and a chevron character.
 * Size is set by the parent (24px in the nav, 22px in the footer).
 */
export function Wordmark() {
  return <span className={styles.wordmark}>Legibly</span>;
}
