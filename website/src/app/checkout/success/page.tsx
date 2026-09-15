import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "../../prose.module.css";

export const metadata: Metadata = {
  title: "Payment received",
  // Nobody should arrive here from a search result: this page only makes sense
  // as the last step of a checkout the buyer just completed.
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Payment received</h1>
        <p className={styles.kicker}>You can close this tab</p>

        <p>
          Thank you — Pro is being activated. Go back to Figma: the plugin
          checks for a few seconds after you return, and the footer switches
          from <strong>Free</strong> to <strong>Pro</strong> with the days you
          have left.
        </p>

        <p>
          Bought on this website? Open Legibly in Figma, choose{" "}
          <strong>Free &amp; Pro</strong> and press{" "}
          <strong>Connect to Figma</strong> with the same Figma account you
          signed in with here — Pro is already waiting on it.
        </p>

        <h2>If it still says Free</h2>
        <p>
          Card networks sometimes take a minute to confirm. Open the{" "}
          <strong>Free &amp; Pro</strong> panel in the plugin footer — that
          re-checks your licence. If it has not appeared after a few minutes,
          write to{" "}
          <a href="mailto:billing@legibly.design">billing@legibly.design</a>{" "}
          with the email address you paid with and we will sort it out.
        </p>

        <h2>What you bought</h2>
        <p>
          A one-time payment, not a subscription. Nothing renews, and there is
          nothing to cancel. When the days run out the plugin returns to Free
          and everything you already fixed stays fixed. The full terms are on
          the <a href="/terms">terms page</a>, and anything about a payment
          goes to{" "}
          <a href="mailto:billing@legibly.design">billing@legibly.design</a>.
        </p>

        <p>
          Questions that are not about billing:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </Container>
    </main>
  );
}
