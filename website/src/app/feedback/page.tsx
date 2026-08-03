import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Feedback",
  description:
    "Report a wrong result, request a check, or tell us what to build next. Every mail is read by the people who write the code.",
  alternates: { canonical: "/feedback" },
};

const subject = encodeURIComponent("Legibly feedback");

export default function FeedbackPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Send feedback</h1>
        <p className={styles.kicker}>Read by the people who write the code</p>

        <p>
          Write to{" "}
          <a href={`mailto:${site.email}?subject=${subject}`}>{site.email}</a>{" "}
          — praise, complaints, and check requests all welcome.
        </p>

        <h2>Reporting a wrong result</h2>
        <p>
          Legibly&apos;s promise is zero false positives, so a wrong result is
          a bug by definition. Three things let us reproduce it:
        </p>
        <ul>
          <li>
            <strong>Which check</strong> — the issue title as the plugin shows
            it (for example &quot;Contrast — text&quot;).
          </li>
          <li>
            <strong>What you expected</strong> — flagged but correct, or a miss
            the scan should have caught.
          </li>
          <li>
            <strong>The frame</strong> — a screenshot, or a copy of the frame
            in a file you can share. The plugin sends us nothing on its own,
            so we only ever see what you choose to attach.
          </li>
        </ul>
      </Container>
    </main>
  );
}
