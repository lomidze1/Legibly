import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { Container } from "@/components/Container";
import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Get Legibly Pro",
  // A step in a purchase, not a page anyone should land on from a search.
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Legibly Pro</h1>
        <p className={styles.kicker}>
          One-click fixes, fix everything at once, and the compliance report
        </p>
        {/* useSearchParams needs a boundary for the page to render statically. */}
        <Suspense fallback={null}>
          <CheckoutFlow />
        </Suspense>
      </Container>
    </main>
  );
}
