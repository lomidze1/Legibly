"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "./Wordmark";
import styles from "./SiteNav.module.css";

const items = [
  { href: "/#how", id: "how", label: "How it works" },
  { href: "/#checks", id: "checks", label: "What it checks" },
  { href: "/#pricing", id: "pricing", label: "Pricing" },
  { href: "/#faq", id: "faq", label: "FAQ" },
];

export function SiteNav() {
  const active = useActiveSection(items.map((item) => item.id));
  const headerRef = useMeasuredNavHeight();

  return (
    <header className={styles.header} ref={headerRef}>
      <nav className={styles.nav} aria-label="Main">
        <Link href="/" className={styles.home} aria-label="Legibly home">
          <Wordmark />
        </Link>
        {/*
          No CTA here. "Get early access" appeared three times in the first
          viewport — nav, hero form, and the specimen's button — and a label
          repeated that often stops reading as an action. The hero form is
          200px below this bar and does the same job.
        */}
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.href}>
              <Link
                className={styles.link}
                href={item.href}
                aria-current={item.id === active ? "true" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

/**
 * Publish the bar's real height as --nav-h, which drives scroll-padding-top.
 *
 * The bar wraps, so its height is a function of viewport width: 144px at
 * 320px (the link row takes two lines), ~107px once four links fit on one.
 * A hard-coded breakpoint value is wrong at every width but one, and anchor
 * jumps then land under the bar.
 */
function useMeasuredNavHeight() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () => {
      document.documentElement.style.setProperty(
        "--nav-h",
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * Which section the reader is in. The nav had no position indicator on a page
 * that scrolls 5,700px past ten sections.
 *
 * The observer's top margin clears the sticky bar so a section counts as
 * "current" once it is actually readable, not once it slides under the nav.
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return active;
}
