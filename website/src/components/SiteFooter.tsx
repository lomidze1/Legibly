import Link from "next/link";
import { Container } from "./Container";
import { Wordmark } from "./Wordmark";
import { site } from "@/data/site";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <Container>
      {/* The footer sits inside the content column, under the same hairline
          that separates every other section. */}
      <div className={styles.rule} />
      <footer className={styles.footer}>
        <div className={styles.brand}>
          <span className={styles.mark}>
            <Wordmark />
          </span>
          <p className={styles.note}>
            A <a href={site.links.glinc}>Glinc</a> studio product, built for
            readers who need the contrast — and every color pair on this page
            passes the same WCAG math the plugin enforces.
          </p>
        </div>
        <nav className={styles.column} aria-label="Product">
          <h2 className={styles.heading}>Product</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/#how">How it works</Link>
            </li>
            <li>
              <Link href="/#checks">What it checks</Link>
            </li>
            <li>
              <Link href="/#pricing">Pricing</Link>
            </li>
            <li>
              <Link href="/#faq">FAQ</Link>
            </li>
          </ul>
        </nav>
        <nav className={styles.column} aria-label="Company">
          <h2 className={styles.heading}>Company</h2>
          <ul className={styles.list}>
            <li>
              <a href={site.links.glinc}>Glinc studio</a>
            </li>
            <li>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
          </ul>
        </nav>
        <p className={styles.legal}>
          © {new Date().getFullYear()} Glinc. Legibly is a Glinc product. Figma
          is a trademark of Figma, Inc., which does not endorse this plugin.
        </p>
      </footer>
    </Container>
  );
}
