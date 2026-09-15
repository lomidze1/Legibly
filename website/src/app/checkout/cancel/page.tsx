import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "../../prose.module.css";

export const metadata: Metadata = {
  title: "Checkout cancelled",
  robots: { index: false, follow: false },
};

export default function CheckoutCancelPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Checkout cancelled</h1>
        <p className={styles.kicker}>Nothing was charged</p>

        <p>
          You stopped before paying, so no money moved and nothing changed.
          Close this tab and go back to Figma — scanning and fixing carry on
          exactly as before.
        </p>

        <h2>If you meant to buy</h2>
        <p>
          Open the <strong>Free &amp; Pro</strong> panel in the plugin footer
          and start again — or go back to <a href="/checkout">checkout</a>.
          If the payment page itself was the problem — it
          refused the card, or never loaded — tell us at{" "}
          <a href="mailto:billing@legibly.design">billing@legibly.design</a>{" "}
          and we will find out why.
        </p>

        <p>
          Anything else:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </Container>
    </main>
  );
}
