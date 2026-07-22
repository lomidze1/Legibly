import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Legibly handles your data: design analysis runs on your machine, and the only optional network call is AI alt-text drafting with your own API key.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Privacy</h1>
        <p className={styles.updated}>Last updated: July 22, 2026</p>

        <h2>The plugin</h2>
        <p>
          Legibly analyzes and fixes your designs entirely inside Figma, on
          your machine. Your layers, colors, styles, and variables are never
          uploaded to us. We do not operate servers that receive your design
          data, and the plugin works without an account.
        </p>

        <h2>Optional AI alt-text</h2>
        <p>
          The alt-text assistant is off by default and requires an Anthropic
          API key that you provide. When you use it, the selected image is
          sent directly from your machine to Anthropic
          (api.anthropic.com) under your key and{" "}
          <a href="https://www.anthropic.com/legal/privacy">
            Anthropic&apos;s privacy policy
          </a>
          . We never see the image, the generated text, or your key. Skip the
          feature and nothing leaves Figma.
        </p>

        <h2>This website</h2>
        <p>
          The site does not use advertising trackers or third-party analytics
          cookies. If you join the waitlist, we store the email address you
          submit and use it for one purpose: telling you about Legibly&apos;s
          availability. Ask us to delete it at any time at{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Legibly is built by Glinc. Questions about this policy:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </Container>
    </main>
  );
}
