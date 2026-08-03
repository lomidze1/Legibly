import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions about Legibly, the checks it runs, or your plan — write to us and we answer within two business days.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Contact</h1>
        <p className={styles.kicker}>We answer within two business days</p>

        <p>
          Questions about Legibly, the checks it runs, accessibility in
          general, or your plan — write to{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a> and a person will
          answer. There is no ticket system and no bot on the other end.
        </p>

        <h2>Found a wrong result?</h2>
        <p>
          If a check flagged something it shouldn&apos;t have — or missed
          something it should have caught — that&apos;s the most valuable mail
          we get. Use <a href="/feedback">the feedback page</a> so it reaches
          us with the details we need to reproduce it.
        </p>
      </Container>
    </main>
  );
}
