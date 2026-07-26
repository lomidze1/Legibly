import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { site } from "@/data/site";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Wordmark />
          <p className={styles.note}>
            A <a href={site.links.glinc}>Glinc</a> plugin. This site is set in
            Atkinson Hyperlegible, a typeface designed for low-vision readers,
            and every color pair on it passes the same WCAG math the plugin
            enforces.
          </p>
        </div>
        <nav className={styles.columns} aria-label="Footer">
          <div>
            <h2 className={styles.heading}>Product</h2>
            <ul className={styles.list}>
              <li>
                <Link href="/#how-it-works">How it works</Link>
              </li>
              <li>
                <Link href="/#features">Features</Link>
              </li>
              <li>
                <Link href="/#pricing">Pricing</Link>
              </li>
              <li>
                <Link href="/#faq">FAQ</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className={styles.heading}>Company</h2>
            <ul className={styles.list}>
              <li>
                <a href={site.links.glinc}>Glinc studio</a>
              </li>
              <li>
                <a href={site.links.web2wireframe}>Web2Wireframe</a>
              </li>
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
            </ul>
          </div>
        </nav>
        <p className={styles.legal}>
          © {new Date().getFullYear()} Glinc. Legibly is a Glinc product. Figma
          is a trademark of Figma, Inc., which does not endorse this plugin.
        </p>
      </div>
    </footer>
  );
}
