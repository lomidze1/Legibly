import { Container } from "@/components/Container";
import { FixDemo } from "@/components/FixDemo";
import { JsonLd } from "@/components/JsonLd";
import { RevealOnView } from "@/components/RevealOnView";
import { WaitlistForm } from "@/components/WaitlistForm";
import { softwareApplicationSchema } from "@/lib/schema";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main>
      <JsonLd data={softwareApplicationSchema()} />
      <Hero />
      <Problem />
      <HowItWorks />
      <Verdicts />
      <WhyLegibly />
      <Features />
      <Pricing />
      <Trust />
      <Faq />
      <FinalCta />
    </main>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <Container className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <p className={`${styles.heroBadge} reveal`}>
            Coming soon to Figma Community
          </p>
          <h1 className="reveal" style={{ "--d": "60ms" } as React.CSSProperties}>
            Checkers tell you. Legibly fixes it.
          </h1>
          <p
            className={`${styles.heroSub} reveal`}
            style={{ "--d": "120ms" } as React.CSSProperties}
          >
            Accessibility auto-fix for Figma. Scan any selection against WCAG
            2.2 AA, then repair every violation in one click with your own
            design tokens.
          </p>
          <div
            className={`${styles.heroFormWrap} reveal`}
            style={{ "--d": "180ms" } as React.CSSProperties}
          >
            <WaitlistForm />
          </div>
        </div>
        <div className="reveal" style={{ "--d": "240ms" } as React.CSSProperties}>
          <FixDemo />
        </div>
      </Container>
    </section>
  );
}

function Problem() {
  return (
    <section className={styles.problem}>
      <Container>
        <h2 className={styles.problemTitle}>
          Unreadable design is now a legal risk.
        </h2>
        <p className={styles.problemBody}>
          The European Accessibility Act has applied since June 2025, and ADA
          lawsuits keep climbing. The most common failure is contrast, and it
          starts in the design file.
        </p>
      </Container>
    </section>
  );
}

const steps = [
  {
    name: "Scan",
    body: "Select frames or a whole page. Legibly resolves the real background behind every layer: fill stacks, opacity, gradients, overlapping siblings.",
  },
  {
    name: "Fix",
    body: "One click swaps failing values for passing colors from your own variables and styles. Nothing off-system is ever invented.",
  },
  {
    name: "Verify",
    body: "The same function that flagged the violation re-checks the fix before it commits. If nothing can pass, it reverts and tells you.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section}>
      <Container>
        <h2 className={styles.sectionTitle}>Scan. Fix. Verify.</h2>
        <RevealOnView
          as="ol"
          className={styles.steps}
          activeClass={styles.stepsSeen}
        >
          {steps.map((step, i) => (
            <li
              key={step.name}
              className={`${styles.step} ${styles.stepReveal}`}
              style={{ "--d": `${i * 110}ms` } as React.CSSProperties}
            >
              <h3>{step.name}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </RevealOnView>
      </Container>
    </section>
  );
}

const verdicts = [
  {
    label: "Violation",
    tone: styles.verdictFail,
    body: "The math is certain, so a fix is offered. Contrast is arithmetic and target size is geometry; neither needs an opinion.",
  },
  {
    label: "Needs review",
    tone: styles.verdictReview,
    body: "Gradients, images, and blend modes that cannot be measured safely get flagged for a human instead of guessed at.",
  },
  {
    label: "Not checked",
    tone: styles.verdictNeutral,
    body: "The report lists every criterion Legibly did not evaluate, so silence never reads as a pass.",
  },
];

function Verdicts() {
  return (
    <section className={`${styles.section} ${styles.band}`}>
      <Container>
        <h2 className={styles.sectionTitle}>Three verdicts, no guessing</h2>
        <p className={styles.sectionLead}>
          Zero false positives is a design constraint, not a marketing line.
        </p>
        <dl className={styles.verdictList}>
          {verdicts.map((v) => (
            <div key={v.label} className={styles.verdictRow}>
              <dt>
                <span className={`${styles.verdictChip} ${v.tone}`}>{v.label}</span>
              </dt>
              <dd>{v.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

function WhyLegibly() {
  return (
    <section className={styles.section}>
      <Container>
        <h2 className={styles.sectionTitle}>Flagging is the easy half</h2>
        <div className={styles.compare}>
          <div className={styles.compareThem}>
            <h3>A typical checker</h3>
            <p>
              Flags dozens of issues, many of them false positives from
              gradients and overlaps it cannot read. The fixing is still on
              you, one layer at a time.
            </p>
          </div>
          <div className={styles.compareUs}>
            <h3>Legibly</h3>
            <p>
              Flags only what is provably wrong, fixes the whole page in one
              click with your tokens, and re-verifies every change before it
              lands. One Cmd-Z undoes it all.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

const checks = [
  {
    sc: "SC 1.4.3",
    name: "Text contrast",
    body: "Composites fill stacks, layer opacity, and overlapping layers to find the real background behind your text. Gradients are sampled across their whole range, where other checkers silently get it wrong.",
    wide: true,
    tinted: true,
  },
  {
    sc: "SC 1.4.11",
    name: "Non-text contrast",
    body: "Icons and borders on interactive controls, checked against their surroundings.",
  },
  {
    sc: "SC 2.5.8",
    name: "Target size",
    body: "24 by 24 minimum with the spacing exception, measured as geometry.",
    tinted: true,
  },
  {
    sc: "SC 1.4.12",
    name: "Text spacing",
    body: "Line-height floors that keep text readable when users increase spacing.",
  },
  {
    sc: "SC 1.1.1",
    name: "Alt text",
    body: "A presence check for every image, plus optional AI drafts using your own Anthropic key. Always reviewed by you before it lands.",
    wide: true,
  },
];

function Features() {
  return (
    <section id="features" className={`${styles.section} ${styles.band}`}>
      <Container>
        <h2 className={styles.sectionTitle}>What it checks today</h2>
        <ul className={styles.bento}>
          {checks.map((check) => (
            <li
              key={check.sc}
              className={`${styles.cell} ${check.wide ? styles.cellWide : ""} ${
                check.tinted ? styles.cellTinted : ""
              }`}
            >
              <p className={styles.cellSc}>{check.sc}</p>
              <h3>{check.name}</h3>
              <p>{check.body}</p>
            </li>
          ))}
        </ul>
        <p className={styles.roadmap}>
          Next on the roadmap: design-system governance, brand QA, and an MCP
          server for Cursor and Claude Code.
        </p>
      </Container>
    </section>
  );
}

const tiers = [
  {
    name: "Free",
    price: "$0",
    per: "forever",
    items: [
      "Scan selections or whole pages",
      "Three honest verdicts on every layer",
      "Pixel-true deep check for complex backgrounds",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    per: "per month",
    featured: true,
    items: [
      "Everything in Free",
      "One-click and batch auto-fix with single undo",
      "CSV compliance report export",
      "Strict mode: on-system tokens only",
    ],
  },
  {
    name: "Team",
    price: "$15",
    per: "per seat, per month",
    items: [
      "Everything in Pro",
      "Shared token rules across the team",
      "Priority support",
    ],
  },
];

function Pricing() {
  return (
    <section id="pricing" className={styles.section}>
      <Container>
        <h2 className={styles.sectionTitle}>Pricing</h2>
        <p className={styles.betaBanner}>
          Everything is free during the public beta, including one-click fixes.
          Prices below take effect at launch.
        </p>
        <div className={styles.tiers}>
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`${styles.tier} ${tier.featured ? styles.tierFeatured : ""}`}
            >
              <h3>{tier.name}</h3>
              <p className={styles.tierPrice}>
                {tier.price}
                <span> {tier.per}</span>
              </p>
              <ul>
                {tier.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

const trustPoints = [
  {
    name: "Private by design",
    body: "Scanning and fixing run entirely on your machine. The only optional network call is AI alt-text drafting, sent straight to Anthropic with your own key.",
  },
  {
    name: "One source of truth",
    body: "The function that flags a violation is the function that verifies the fix. A bad fix cannot physically stay on the canvas.",
  },
  {
    name: "Proof, not promises",
    body: "228 unit tests, including a 500-case property sweep showing that a committed fix never fails its own check.",
  },
];

function Trust() {
  return (
    <section className={`${styles.section} ${styles.band}`}>
      <Container>
        <h2 className={styles.sectionTitle}>Built to be trusted</h2>
        <div className={styles.trustGrid}>
          {trustPoints.map((point) => (
            <div key={point.name} className={styles.trustItem}>
              <h3>{point.name}</h3>
              <p>{point.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

const faqs = [
  {
    q: "Does it really fix, or just report?",
    a: "It fixes. One click repairs a single violation, batch fix repairs a whole page, and a single Cmd-Z undoes everything. Reporting-only tools leave the slow part to you.",
  },
  {
    q: "Will it invent colors outside my design system?",
    a: "No. Fixes snap to your own variables and styles. If no on-system value can pass, Legibly proposes one minimal new token for you to accept, or in strict mode simply tells you nothing passed.",
  },
  {
    q: "What happens with gradients and image backgrounds?",
    a: "Gradients are sampled across their whole range. Backgrounds that cannot be measured safely are marked as needs review instead of being guessed. A pixel-true deep check can also export the frame and sample real pixels.",
  },
  {
    q: "Is my file private?",
    a: "Yes. Analysis runs inside Figma on your machine. The one optional exception is AI alt-text drafting, which sends the image to Anthropic using an API key you provide. Skip it and nothing ever leaves Figma.",
  },
  {
    q: "Which criteria do you not check?",
    a: "Plenty, and the report says so explicitly: every WCAG criterion outside the five checks above is listed as not checked. An honest audit beats a silent one.",
  },
];

function Faq() {
  return (
    <section id="faq" className={styles.section}>
      <Container>
        <h2 className={styles.sectionTitle}>Questions, answered</h2>
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details key={faq.q} className={styles.faqItem}>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="waitlist" className={styles.finalCta}>
      <Container className={styles.finalCtaInner}>
        <h2>Be first in line</h2>
        <p>
          Legibly is in private beta ahead of its Figma Community launch. Leave
          your email and we will send you access, nothing else.
        </p>
        <WaitlistForm />
      </Container>
    </section>
  );
}
