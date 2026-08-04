import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { WaitlistForm } from "@/components/WaitlistForm";
import { site } from "@/data/site";
import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "Get one email when Legibly launches on Figma Community, and nothing else. No newsletter, unsubscribe anytime.",
  alternates: { canonical: "/subscribe" },
};

export default function SubscribePage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Subscribe to updates</h1>
        <p className={styles.kicker}>Launching {site.launch}</p>

        {/*
          The form carries its own consent line — what you get, how to leave,
          what we store. Repeating any of it here just made the page say the
          same thing three times.
        */}
        <p>
          Legibly launches on Figma Community in {site.launch}. Leave your
          address and you will hear about it the day it happens.
        </p>

        <div className={styles.form}>
          <WaitlistForm />
        </div>
      </Container>
    </main>
  );
}
