import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Legibly handles your data: the plugin makes no network requests at all, and the website stores only the email you submit to the waitlist.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Privacy</h1>
        <p className={styles.updated}>Last updated: July 26, 2026</p>

        <h2>The plugin</h2>
        <p>
          Legibly analyzes and fixes your designs entirely inside Figma, on
          your machine. Your layers, colors, styles, and variables are never
          uploaded to us. We do not operate servers that receive your design
          data, and the plugin works without an account.
        </p>
        <p>
          The plugin makes no network requests of any kind. Its Figma manifest
          declares <code>&quot;allowedDomains&quot;: [&quot;none&quot;]</code>,
          which Figma enforces: no image, measurement, or piece of design data
          can leave the file, to us or to anyone else. You can verify this in
          the manifest before you install it.
        </p>

        <h2>This website</h2>
        <p>
          The site does not use advertising trackers or third-party analytics
          cookies. If you join the waitlist, we store the email address you
          submit and use it for one purpose: telling you about Legibly&apos;s
          availability.
        </p>
        <ul>
          <li>
            <strong>What we collect:</strong> the email address you type into
            the waitlist form, and nothing else. We do not collect a name, an
            IP-based profile, or any behavioural data.
          </li>
          <li>
            <strong>Legal basis (GDPR Art. 6):</strong> your consent, given by
            submitting the form. You can withdraw it at any time, which has no
            effect on processing carried out before you did.
          </li>
          <li>
            <strong>Processor:</strong> the list is held by Resend
            (transactional email), acting on our instructions under a data
            processing agreement.
          </li>
          <li>
            <strong>Retention:</strong> until Legibly launches and we have sent
            the launch email, or until you ask us to delete it — whichever is
            sooner. We delete the whole list no later than 12 months after
            launch.
          </li>
        </ul>

        <h2>Your rights</h2>
        <p>
          If you are in the EU, EEA, or UK you have the right to access,
          rectify, erase, restrict, and port your data, and to object to
          processing. Write to{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a> and we will answer
          within 30 days. You also have the right to complain to your national
          data protection authority.
        </p>

        <h2>Contact</h2>
        {/*
          TODO before launch: add the controller's registered legal name, legal
          form and postal address here. GDPR Art. 13(1)(a) requires the
          controller's identity, and an email address alone does not satisfy it.
        */}
        <p>
          Legibly is built by Glinc, which is the data controller for the
          waitlist. Questions about this policy, or any request above:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </Container>
    </main>
  );
}
