import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms for using Legibly and buying Pro: one-time payments, nothing renews, how refunds work, and which taxes are yours.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Terms</h1>
        <p className={styles.kicker}>Last updated: August 3, 2026</p>

        <p>
          These terms cover the Legibly Figma plugin and this website. Buying
          Pro means you accept them. They are written to be read, not to be
          survived — if something here is unclear, ask before you buy:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>

        <h2>What Legibly does</h2>
        <p>
          Legibly checks your Figma designs against WCAG 2.2 success criteria
          and applies fixes you choose. It is a tool that helps you find and
          correct problems. It is not a certification, an audit, or legal
          advice, and a clean scan is not a statement that your product
          complies with the EAA, the ADA, or any other law. Accessibility
          conformance depends on the built product and on judgements no
          automated tool can make; Legibly is explicit about which of its
          findings are measured and which need a human eye.
        </p>

        <h2>Free and Pro</h2>
        <p>
          Scanning is free and stays free. Pro adds one-click fixing, batch
          fixes across a file, and report export. During the public beta,
          fixing is unlocked for everyone — when that ends, it becomes a Pro
          feature and the plugin will say so before anything changes.
        </p>

        <h2>Payment</h2>
        <ul>
          <li>
            <strong>Pro is a one-time payment.</strong> $120 buys 365 days.
            $12 buys 30 days. There is no subscription, nothing renews
            automatically, and there is nothing to cancel.
          </li>
          <li>
            <strong>Buying again while you still have time left adds to it.</strong>{" "}
            Days stack onto the days you have, up to a limit shortly beyond one
            full period; the plugin shows how long you have.
          </li>
          <li>
            <strong>When your days run out</strong>, the plugin returns to Free.
            Nothing you fixed is undone, and nothing is taken away from your
            files — only the Pro features stop.
          </li>
          <li>
            <strong>Payments are processed by Flitt</strong>, a PCI-DSS Level 1
            payment provider. We never see or store your card details.
          </li>
        </ul>

        <h2>Taxes</h2>
        <p>
          Prices are exclusive of any local taxes, such as VAT, for which you
          may be responsible in your own jurisdiction. We are the seller of
          record, and the price shown is the price charged; any tax your
          country levies on the purchase is yours to account for.
        </p>

        <h2>Refunds</h2>
        <p>
          Write to <a href="mailto:billing@legibly.design">billing@legibly.design</a>{" "}
          and tell us what went wrong. Refunds are not automatic, but in
          practice we would rather refund you than argue: if Legibly did not
          do what you expected, ask and we will return the money.
        </p>
        <p>
          If you are a consumer in the EU, EEA, or UK you have a statutory
          right to withdraw from a distance purchase within 14 days. Because
          Pro unlocks immediately, starting to use it within that period counts
          as asking us to begin supply, which can reduce that right — but this
          does not remove any right the law gives you, and nothing in these
          terms is intended to.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Use Legibly on files you have the right to edit. Do not resell it,
          redistribute it, or present its output as an independent audit of
          your own work. Do not attempt to bypass the licence check — it costs
          us more to police than it costs you to pay, and the price is set for
          individuals.
        </p>

        <h2>What we do not promise</h2>
        <p>
          The plugin is provided as it is. We do not warrant that it finds
          every issue, that it is free of defects, or that it will always be
          available. Figma can change its plugin API, and a change there can
          break features here. To the extent the law allows, our liability for
          any claim connected to Legibly is limited to what you paid us in the
          twelve months before the claim. Nothing here limits liability that
          cannot lawfully be limited.
        </p>

        <h2>Ending</h2>
        <p>
          You can stop using Legibly at any time; uninstalling the plugin is
          enough, and there is no subscription left behind. We can suspend
          access if these terms are broken — if that ever happens for a paid
          licence, we refund the unused days.
        </p>

        <h2>Changes</h2>
        <p>
          If these terms change, the date at the top changes with them. A
          change never applies retroactively to a purchase already made: the
          terms you bought under are the terms that govern it.
        </p>

        <h2>Contact</h2>
        {/*
          TODO before launch, same gap as the privacy page: the seller's
          registered legal name, legal form and postal address belong here.
          An email address alone does not satisfy EU consumer-information
          rules, and this page is the one a buyer reads.
        */}
        <p>
          Legibly is built by Glinc. Questions about these terms:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>. Anything about a
          payment:{" "}
          <a href="mailto:billing@legibly.design">billing@legibly.design</a>.
        </p>
      </Container>
    </main>
  );
}
