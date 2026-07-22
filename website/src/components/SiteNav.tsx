import Link from "next/link";
import { Wordmark } from "./Wordmark";
import styles from "./SiteNav.module.css";

const items = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteNav() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main">
        <Link href="/" className={styles.home} aria-label="Legibly home">
          <Wordmark />
        </Link>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.href}>
              <Link className={styles.link} href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link className={styles.cta} href="/#waitlist">
          Get early access
        </Link>
      </nav>
    </header>
  );
}
