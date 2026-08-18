import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { site } from "@/data/site";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Legibly handles your data: your design never leaves Figma, the network is used only to check a Pro licence, and the website stores only the email you submit.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main>
      <Container className={styles.page}>
        <h1>Privacy</h1>
        <p className={styles.updated}>Last updated: August 12, 2026</p>

        <h2>The plugin</h2>
        <p>
          Legibly analyzes and fixes your designs entirely inside Figma, on
          your machine. Your layers, colors, styles, and variables are never
          uploaded to us. There is no server that receives your design data,
          and scanning and fixing work without an account.
        </p>
        <p>
          The network is used for exactly one thing: checking whether you have
          a Pro licence. The plugin&apos;s Figma manifest declares{" "}
          <code>
            &quot;allowedDomains&quot;: [&quot;https://api.legibly.design&quot;]
          </code>
          , which Figma enforces — the plugin cannot reach any other host, ours
          or anyone else&apos;s. You can read that line in the manifest before
          you install it, and we would rather you did.
        </p>
        <p>
          If you never buy Pro, the plugin never contacts us at all.
        </p>

        <h2>If you connect and buy Pro</h2>
        <p>
          Connecting uses Figma&apos;s own sign-in with the{" "}
          <code>current_user:read</code> scope — the narrowest one there is. It
          lets us read your Figma user id and nothing else: not your files, not
          your teams. We never see your Figma password, and the access token
          Figma issues is used once to read that id and then discarded rather
          than stored.
        </p>
        <ul>
          <li>
            <strong>What we store:</strong> your Figma user id, the email
            address you give the payment form, which plan you bought, and the
            dates your licence runs between. A record of each payment
            notification — its transaction and order reference, status and
            amount — so a repeated notification cannot charge you twice.
          </li>
          <li>
            <strong>What we never store:</strong> anything from your designs.
            No layers, no images, no measurements, no file names.
          </li>
          <li>
            <strong>Usage records:</strong> so we can tell whether anyone is
            using Legibly, we keep a line saying that your licence was checked
            on a given day, that a checkout was started, paid, refused or
            refunded. Each line holds the date,
            your Figma user id, which of those events it was, and whether it
            succeeded — nothing else. A licence check writes at most one line
            per day, however many times you open the plugin.
          </li>
          <li>
            <strong>Card details:</strong> handled by Flitt, a PCI-DSS Level 1
            payment provider, and never seen by us.
          </li>
          <li>
            <strong>Legal basis (GDPR Art. 6):</strong> performance of our
            contract with you — we cannot give you the licence you paid for
            without recording that you have one.
          </li>
          <li>
            <strong>Legal basis for the usage records (GDPR Art. 6):</strong>{" "}
            our legitimate interest in knowing whether the product works and is
            used. They are read by us alone, are never combined into a profile,
            and are never sold or shared.
          </li>
          <li>
            <strong>Retention:</strong> the licence record is kept while the
            licence runs and afterwards for as long as tax and accounting law
            requires us to keep proof of the sale.
          </li>
          <li>
            <strong>Rate limiting:</strong> our API counts requests per IP
            address for ten minutes at a time so it cannot be hammered. Those
            counters expire on their own and are not used for anything else.
          </li>
        </ul>
        <p>
          There is no account to create, no password to choose, and no profile
          behind any of this. Your Figma user id is the only identifier we
          hold.
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

        <h2>Who else touches this data</h2>
        <ul>
          <li>
            <strong>Vercel</strong> — hosts this website and our licence API.
          </li>
          <li>
            <strong>Flitt</strong> — takes the payment and tells our API that it
            succeeded.
          </li>
          <li>
            <strong>Resend</strong> — holds the waitlist.
          </li>
        </ul>
        <p>
          That is the whole list. There is no analytics service, no error
          tracker, and no advertising network in the plugin or on this site.
        </p>

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
        <p>
          The data controller is {site.seller.entity}. Registered address:{" "}
          {site.seller.address}.
        </p>
        <p>
          Questions about this policy, or any request above:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </Container>
    </main>
  );
}
