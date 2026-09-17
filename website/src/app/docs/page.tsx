import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How to use Legibly: select a frame, scan, and fix. What each check measures, and what Free and Pro include.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Docs</h1>
        <p className={styles.kicker}>Everything the plugin does, in one page</p>

        <h2>Getting started</h2>
        <ol>
          <li>Open the plugin in any Figma file.</li>
          <li>
            Select a frame and press <strong>Scan selection</strong>, or press{" "}
            <strong>Scan full canvas</strong> to check the whole page.
          </li>
          <li>
            Each issue names the layer, the criterion, and the measured value.
            Press <strong>Fix</strong> to apply the suggested change — taken
            from your own color styles and variables where possible — or fix
            it by hand and re-scan.
          </li>
        </ol>
        <p>
          Every fix is re-verified after it is applied: the plugin measures the
          result again rather than assuming the change worked. Undo in Figma
          (⌘Z) reverts a fix like any other edit.
        </p>

        <h2>What it checks</h2>
        <p>
          Nine deterministic checks against WCAG 2.2 (AA/AAA), plus advisory
          notices where the standard requires judgement.{" "}
          <Link href="/#checks">The full list with details is on the home page</Link>
          — in short: text contrast (1.4.3), line spacing (1.4.12), target
          size (2.5.8 · 2.5.5), icon and border contrast (1.4.11), image alt
          text (1.1.1), color-only links (1.4.1), clipped text (1.4.10), field
          labels (2.4.6), and focus states (2.4.7).
        </p>
        <p>
          A result is only ever reported when it is measured, never inferred —
          if a check cannot decide, it stays quiet instead of guessing. That
          is what &quot;zero false positives&quot; means here.
        </p>

        <h2>Privacy</h2>
        <p>
          The plugin runs entirely on your machine and makes no network
          requests; its manifest declares{" "}
          <code>&quot;allowedDomains&quot;: [&quot;none&quot;]</code>, which
          Figma enforces. Details in the{" "}
          <a href="/privacy">privacy policy</a>.
        </p>

        <h2>Free and Pro</h2>
        <p>
          Scanning is free. One-click and batch fixes and the report export are
          Pro — $12 for 30 days or $120 for a year. Plans are compared{" "}
          <Link href="/#pricing">on the pricing section</Link>.
        </p>

        <h2>Something missing?</h2>
        <p>
          This page grows with the product. If it doesn&apos;t answer your
          question, <a href={`mailto:${site.email}`}>{site.email}</a> does.
        </p>
      </Container>
    </main>
  );
}
