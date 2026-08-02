import { Button } from "@/components/Button";
import { Container } from "@/components/Container";
import { JsonLd } from "@/components/JsonLd";
import { ScanDemo } from "@/components/ScanDemo";
import { SpecimenPanel } from "@/components/SpecimenPanel";
import { WaitlistForm } from "@/components/WaitlistForm";
import { site } from "@/data/site";
import { softwareApplicationSchema } from "@/lib/schema";
import styles from "./page.module.css";

/**
 * Section order answers a skeptical designer in the order they ask.
 *
 * Trust now precedes Pricing: "is my file safe?" is the first objection for a
 * plugin with write access to a production library, and it used to sit at 78%
 * scroll depth, after the price.
 */
export default function Home() {
  return (
    <main>
      <JsonLd data={softwareApplicationSchema()} />
      <Container>
        <Hero />
        <Rule />
        <Stakes />
        <Rule />
        <HowItWorks />
        <Rule />
        <Comparison />
        <Rule />
        <Checks />
        <Rule />
        <Trust />
        <Rule />
        <Pricing />
        <Rule />
        <Faq />
        <Rule />
        <Closing />
      </Container>
    </main>
  );
}

/** The hairline that carries the structure between sections. */
function Rule() {
  return <hr className={styles.rule} />;
}

function Hero() {
  return (
    <section className={styles.hero}>
      <div>
        <span className={styles.kicker}>
          Private beta · Figma Community, {site.launch}
        </span>
        <h1 className={styles.h1}>
          <span>Checkers tell you.</span>
          <span>Legibly fixes it.</span>
        </h1>
        <p className={styles.heroLead}>
          An accessibility auto-fix for Figma. Scan a selection or a whole page
          against WCAG&nbsp;2.2 AA, then repair every violation in one click,
          using your own design tokens and never an invented color.
        </p>
        <div className={styles.heroForm}>
          <WaitlistForm />
        </div>
        <p className={styles.heroNote}>
          Ahead of the Figma Community launch. No newsletter, no pricing
          surprises.
        </p>
      </div>
      <SpecimenPanel />
    </section>
  );
}

function Stakes() {
  return (
    <section className={styles.split}>
      <h2 className={styles.h2Flush}>Unreadable design is now a legal risk.</h2>
      <p className={styles.stakesBody}>
        The European Accessibility Act has applied since June 2025, and ADA
        lawsuits keep climbing. The most common failure in every audit is
        contrast, and contrast is decided in the design file, months before an
        engineer can be blamed for it. Legibly moves the fix back to where the
        mistake was made.
      </p>
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
    body: "One click swaps every failing value for the nearest passing color in your own token set. Nothing off-system is ever invented, and one undo reverses it.",
  },
  {
    name: "Verify",
    body: "The same function that flagged the violation re-checks the fix and reports the new ratio. If nothing can pass, it says so instead of guessing.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className={styles.section}>
      <span className={styles.kicker}>How it works</span>
      <h2 className={styles.h2}>Scan. Fix. Verify.</h2>
      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li key={step.name} className={styles.step}>
            <span className={styles.index}>{`0${i + 1}`}</span>
            <h3 className={styles.stepName}>{step.name}</h3>
            <p className={styles.justified}>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Comparison() {
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>Flagging is the easy half</h2>
      <div className={styles.compare}>
        <div className={styles.compareThem}>
          <span className={styles.cardKicker}>A typical checker</span>
          <p className={styles.justified}>
            Flags dozens of issues, many of them false positives from gradients
            and overlaps it cannot read. The fixing is still on you, one layer
            at a time.
          </p>
        </div>
        <div className={styles.compareUs}>
          <span className={`${styles.cardKicker} ${styles.cardKickerAccent}`}>
            Legibly
          </span>
          <p className={styles.justified}>
            Flags only what is provably wrong, then fixes the whole page in one
            click with your tokens and re-verifies every change before it
            lands. One Cmd-Z undoes it all.
          </p>
        </div>
      </div>
    </section>
  );
}

const checks = [
  {
    name: "Text contrast",
    sc: "SC 1.4.3",
    body: "Measured against the background the text actually sits on, composited through fill stacks, opacity and gradients.",
  },
  {
    name: "Line spacing",
    sc: "SC 1.4.12",
    body: "Line height under 1.5× the type size, where copy stops holding together at reading distance.",
  },
  {
    name: "Target size",
    sc: "SC 2.5.8 · 2.5.5",
    body: "Controls under 24 by 24, or 44 in mobile mode, measured as geometry with the spacing exception included.",
  },
  {
    name: "Icon and border contrast",
    sc: "SC 1.4.11",
    body: "The parts you have to see in order to act: icon strokes, input edges, control borders.",
  },
  {
    name: "Image alt text",
    sc: "SC 1.1.1",
    body: "A presence check on every image, with somewhere to write the description or mark it decorative.",
  },
  {
    name: "Color-only links",
    sc: "SC 1.4.1",
    body: "Links that differ from the body copy by hue alone, with no underline to carry them.",
  },
  {
    name: "Clipped text",
    sc: "SC 1.4.10",
    body: "Copy that overflows its frame and is simply never read by anyone.",
  },
  {
    name: "Field labels",
    sc: "SC 2.4.6",
    body: "Inputs carrying only a placeholder where a visible label is the requirement.",
  },
  {
    name: "Focus states",
    sc: "SC 2.4.7",
    body: "Components given a hover state and no keyboard focus state to match it.",
  },
];

const roadmap = [
  "Design-system governance",
  "Brand QA",
  "An MCP server for Cursor and Claude Code",
];

function Checks() {
  return (
    <section id="checks" className={styles.section}>
      <span className={styles.kicker}>Coverage</span>
      <h2 className={styles.h2Tight}>Nine checks, one report</h2>
      <p className={styles.checksLead}>
        Every one of them decided by math rather than opinion, and each one
        named in the report whether it passed, failed or was left alone.
      </p>
      <ol className={styles.checks}>
        {checks.map((check, i) => (
          <li
            key={check.name}
            className={`${styles.check} ${i === 0 ? styles.checkFlagship : ""}`}
          >
            <span className={styles.checkIndex}>{`0${i + 1}`}</span>
            <div>
              {i === 0 && (
                <span className={styles.checkFlagshipLabel}>
                  The most common failure in every audit
                </span>
              )}
              <h3 className={styles.checkName}>
                {check.name} <span className={styles.checkSc}>{check.sc}</span>
              </h3>
              <p className={styles.checkBody}>{check.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {/*
        Outside the list: it is not a tenth check, and an item spanning both
        columns cannot be auto-placed inside a column-flow grid.
      */}
      <div className={styles.checkPlus}>
        <span className={styles.checkIndex}>+</span>
        <p>
          And checks 01 and 04 run again on every theme you ship, not only the
          one on screen. Dark mode is where fixed contrast quietly breaks.
        </p>
      </div>

      {/*
        The list says what the nine are; this says what they do together. It
        also carries the three verdicts, which used to be a static table in a
        section of their own — two of the six findings here are deliberately
        left standing after "Fix all", which is the entire argument.
      */}
      <div className={styles.demo}>
        {/* Not "Nine checks, one pass": the h2 above is "Nine checks, one
            report" and the pair read as a stutter. */}
        <h3 className={styles.demoName}>Run all nine at once</h3>
        <p className={styles.demoLead}>
          Zero false positives is a design constraint here, not a marketing
          line. Run it and watch two findings survive the fix: one the math
          cannot read safely, one Legibly never claims to check.
        </p>
        <ScanDemo />
      </div>
      <div className={styles.roadmap}>
        <h3 className={styles.roadmapName}>Next on the roadmap</h3>
        <ul className={styles.roadmapList}>
          {roadmap.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** One source of truth for the badge and the card's accent treatment. */
const RECOMMENDED_PLAN = "Pro";

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "Forever",
    items: [
      "Scan selections or whole pages",
      "Three honest verdicts on every layer",
      "Pixel-true deep check for composited backgrounds",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    cadence: "Per month",
    items: [
      "Everything in Free",
      "One-click and batch auto-fix with a single undo",
      "CSV compliance report export",
      "Strict mode: on-system tokens only",
    ],
  },
] as const;

function Pricing() {
  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.pricingHead}>
        <h2 className={styles.h2Flush}>Pricing</h2>
        <p className={styles.betaNote}>
          Everything is free during the beta, one-click fixes included. The
          prices below take effect at the {site.launch} Community launch.
        </p>
      </div>
      <div className={styles.tiers}>
        {tiers.map((tier) => {
          const featured = tier.name === RECOMMENDED_PLAN;
          return (
            <div
              key={tier.name}
              className={`${styles.tier} ${featured ? styles.tierFeatured : ""}`}
            >
              {featured && (
                <span className={styles.recommended}>Recommended</span>
              )}
              <div>
                <h3 className={styles.tierName}>{tier.name}</h3>
                <p
                  className={`${styles.tierPrice} ${
                    featured ? styles.tierPriceAccent : ""
                  }`}
                >
                  {tier.price}
                </p>
                <p className={styles.tierCadence}>{tier.cadence}</p>
              </div>
              <div className={styles.tierRule} />
              <ul className={styles.tierItems}>
                {tier.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {/* A reader who picks a tier had nowhere to click before this. */}
              <div className={styles.tierAction}>
                <Button href="/#early">Join the waitlist</Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const trustPoints = [
  {
    name: "Private by design",
    body: "The manifest declares zero network access, and Figma enforces it. Nothing about your file can be sent anywhere, to us or to anyone else.",
  },
  {
    name: "One source of truth",
    body: "The function that flags a violation is the function that verifies the fix. A report and the canvas cannot physically drift apart.",
  },
  {
    name: "Proof, not promises",
    body: "228 unit tests, including a 686-case properly-composited sweep, and a committed fix-never-fails check on every release.",
  },
];

function Trust() {
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>Built to be trusted</h2>
      <div className={styles.trust}>
        {trustPoints.map((point) => (
          <div key={point.name} className={styles.trustItem}>
            <h3 className={styles.trustName}>{point.name}</h3>
            <p className={styles.justified}>{point.body}</p>
          </div>
        ))}
      </div>
      <p className={styles.trustMaker}>
        Legibly is made by <a href={site.links.glinc}>Glinc</a>. If you want to
        know who is writing to your file before you install it, write to{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a> and you will get a
        person, not a form.
      </p>
    </section>
  );
}

const faqs = [
  {
    q: "Does it really fix, or just report?",
    a: "It fixes. Every violation with certain math gets a repaired value written back to the canvas from your token set, then re-measured. A single undo reverses a whole page.",
  },
  {
    q: "Will it invent colors outside my design system?",
    a: "No. Strict mode restricts every repair to your published tokens; when nothing in the set can pass, Legibly reports the gap rather than inventing a shade.",
  },
  {
    q: "What happens with gradients and image backgrounds?",
    a: "They are measured where the math is safe and marked “needs review” where it is not. You get the range and the worst case, never a confident number that isn’t one.",
  },
  {
    q: "Is my file private?",
    a: "Yes, and not as a promise. The plugin declares no network access in its Figma manifest, so nothing about your file can be transmitted anywhere — check the manifest yourself before installing.",
  },
  {
    q: "Which criteria do you not check?",
    a: "Anything that needs runtime behaviour or human judgement: focus order, keyboard traps, semantics, motion. The report names each one so silence is never mistaken for a pass.",
  },
];

/** 10×6 at stroke 1 — the same hairline language as every rule on the page. */
function Chevron() {
  return (
    <svg
      className={styles.chev}
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  );
}

function Faq() {
  return (
    <section id="faq" className={styles.split}>
      <div>
        <h2 className={styles.h2Flush}>Questions, answered</h2>
        <p className={styles.faqAside}>
          Anything else, ask a person:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
      <div className={styles.faqList}>
        {faqs.map((faq, i) => (
          <details
            key={faq.q}
            /* The first answer opens, so the section shows what one looks like. */
            open={i === 0}
            className={`${styles.faqItem} ${
              i === faqs.length - 1 ? styles.faqLast : ""
            }`}
          >
            <summary className={styles.faqSummary}>
              {faq.q}
              <Chevron />
            </summary>
            <p className={styles.faqAnswer}>{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section id="early" className={styles.closing}>
      <h2 className={styles.h2Closing}>Be first in line</h2>
      <div>
        <p className={styles.closingLead}>
          Legibly is in private beta ahead of its {site.launch} Figma Community
          launch. Leave your email and we will send you access, and nothing
          else.
        </p>
        <div className={styles.closingForm}>
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
