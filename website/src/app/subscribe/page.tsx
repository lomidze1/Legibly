import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { WaitlistForm } from "@/components/WaitlistForm";
import { site } from "@/data/site";
import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "Get one email when Legibly launches on Figma Community, and short notes when new checks ship. No spam, unsubscribe anytime.",
  alternates: { canonical: "/subscribe" },
};

export default function SubscribePage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Subscribe to updates</h1>
        <p className={styles.kicker}>Launching {site.launch}</p>

        <p>
          One email when Legibly goes live on Figma Community, and short notes
          when new checks ship. Nothing else — no spam, and you can
          unsubscribe with one click.
        </p>

        <div className={styles.form}>
          <WaitlistForm />
        </div>

        <p>
          How we handle your address is covered in the{" "}
          <a href="/privacy">privacy policy</a>: we store the email you submit
          and nothing else.
        </p>
      </Container>
    </main>
  );
}
