import { Container } from "@/components/Container";
import { JsonLd } from "@/components/JsonLd";
import { SpecimenPanel } from "@/components/SpecimenPanel";
import { WaitlistForm } from "@/components/WaitlistForm";
import { softwareApplicationSchema } from "@/lib/schema";
import styles from "./page.module.css";

/**
 * The two knobs the design exposes, so the page can be tuned without editing
 * markup. Hard-coded here; lift them to config if a CMS ever appears.
 */
const RECOMMENDED_PLAN: (typeof tiers)[number]["name"] = "Pro";
const SHOW_TRUST_SECTION = true;

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
        <Verdicts />
        <Rule />
        <Comparison />
        <Rule />
        <Checks />
        <Rule />
        <Pricing />
        {SHOW_TRUST_SECTION && (
          <>
            <Rule />
            <Trust />
          </>
        )}
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
        <span className={styles.kicker}>Coming soon to Figma Community</span>
        <h1 className={styles.h1}>
          <span>Checkers tell you.</span>
          <span>Legibly fixes it.</span>
        </h1>
        <p className={styles.heroLead}>
          An accessibility auto-fix for Figma. Scan a selection or a whole page
          against WCAG&nbsp;2.2 AA, then repair every violation in one click —
          using your own design tokens, never invented color.
        </p>
        <div className={styles.heroForm}>
          <WaitlistForm />
        </div>
        <p className={styles.heroNote}>
          Private beta. No newsletter, no pricing surprises.
        </p>
      </div>
      <SpecimenPanel />
    </section>
  );
}

function Stakes() {
  return (
    <section className={`${styles.split} ${styles.splitStakes}`}>
      <h2 className={styles.h2Large}>Unreadable design is now a legal risk.</h2>
      <p className={styles.stakesBody}>
        The European Accessibility Act has applied since June 2025, and ADA
        lawsuits keep climbing. The most common failure in every audit is
        contrast — and contrast is decided in the design file, months before an
        engineer can be blamed for it. Legibly moves the fix back to where the
        mistake was made.
      </p>
    </section>
  );
}

const steps = [
  {
    name: "Scan",
    body: "Select frames or a whole page. Legibly resolves the real background behind every layer — fill stacks, opacity, gradients, overlapping siblings.",
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

const verdicts = [
  {
    label: "Violation",
    body: "The math is certain, so a fix is offered. Contrast is arithmetic and target size is geometry — neither needs an opinion.",
  },
  {
    label: "Needs review",
    body: "Gradients, images and blend modes that cannot be measured safely get flagged for a human instead of guessed at.",
  },
  {
    label: "Not checked",
    body: "The report lists every criterion Legibly did not evaluate, so silence never reads as a pass.",
  },
];

function Verdicts() {
  return (
    <section className={styles.split}>
      <div>
        <h2 className={styles.h2Tight}>Three verdicts, no guessing</h2>
        <p className={styles.splitLead}>
          Zero false positives is a design constraint here, not a marketing
          line.
        </p>
      </div>
      <table className={styles.table}>
        <tbody>
          {verdicts.map((verdict) => (
            <tr key={verdict.label}>
              <th scope="row">{verdict.label}</th>
              <td>{verdict.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    body: "Measured against the background the text actually sits on — composited through fill stacks, opacity and gradients.",
  },
  {
    name: "Line spacing",
    sc: "SC 1.4.12",
    body: "Line height under 1.5× the type size, where copy stops holding together at reading distance.",
  },
  {
    name: "Target size",
    sc: "SC 2.5.8 · 2.5.5",
    body: "Controls under 24 by 24 — or 44 in mobile mode — measured as geometry, spacing exception included.",
  },
  {
    name: "Icon and border contrast",
    sc: "SC 1.4.11",
    body: "The parts you have to see in order to act: icon strokes, input edges, control borders.",
  },
  {
    name: "Image alt text",
    sc: "SC 1.1.1",
    body: "A presence check on every image, with optional drafts written under your own API key.",
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

function Checks() {
  return (
    <section id="checks" className={styles.section}>
      <span className={styles.kicker}>Coverage</span>
      <h2 className={styles.h2Tight}>Nine checks, one honest report</h2>
      <p className={styles.checksLead}>
        Every one of them decided by math, not opinion — and each one named in
        the report whether it passed, failed or was left alone.
      </p>
      <ol className={styles.checks}>
        {checks.map((check, i) => (
          <li
            key={check.name}
            /* 01 is the flagship check, so its rule is accent, not divider. */
            className={`${styles.check} ${i === 0 ? styles.checkFlagship : ""} ${
              i === checks.length - 1 ? styles.checkLast : ""
            }`}
          >
            <span className={styles.checkIndex}>{`0${i + 1}`}</span>
            <div>
              <h3 className={styles.checkName}>
                {check.name} <span className={styles.checkSc}>{check.sc}</span>
              </h3>
              <p className={styles.checkBody}>{check.body}</p>
            </div>
          </li>
        ))}
        {/* Not a tenth check: 01 and 04 re-run on every theme. */}
        <li className={styles.checkPlus}>
          <span className={styles.checkIndex}>+</span>
          <p>
            And checks 01 and 04 run again on every theme you ship, not only
            the one on screen. Dark mode is where fixed contrast quietly
            breaks.
          </p>
        </li>
      </ol>
      <p className={styles.roadmap}>
        Next on the roadmap: design-system governance, brand QA, and an MCP
        server for Cursor and Claude Code.
      </p>
    </section>
  );
}

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
          Everything is free during the public beta, one-click fixes included.
          The prices below take effect at launch.
        </p>
      </div>
      <div className={styles.tiers}>
        {tiers.map((tier) => {
          const featured = tier.name === "Pro";
          return (
            <div
              key={tier.name}
              className={`${styles.tier} ${featured ? styles.tierFeatured : ""}`}
            >
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
              {tier.name === RECOMMENDED_PLAN && (
                <span className={styles.recommended}>Recommended</span>
              )}
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
    body: "Scanning and fixing run entirely on your machine. The only optional network call is AI alt-text drafting, sent straight to Anthropic with your own key.",
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
    a: "Yes. Nothing leaves your machine except the alt-text drafts you explicitly request, and those go directly to Anthropic under your own API key.",
  },
  {
    q: "Which criteria do you not check?",
    a: "Anything that needs runtime behaviour or human judgement — focus order, keyboard traps, semantics, motion. The report names each one so silence is never mistaken for a pass.",
  },
];

function Faq() {
  return (
    <section id="faq" className={styles.split}>
      <h2 className={styles.h2Flush}>Questions, answered</h2>
      <div className={styles.faqList}>
        {faqs.map((faq, i) => (
          <details
            key={faq.q}
            className={`${styles.faqItem} ${
              i === faqs.length - 1 ? styles.faqLast : ""
            }`}
          >
            <summary className={styles.faqSummary}>
              {faq.q}
              <span className={styles.chev} aria-hidden="true">
                ▾
              </span>
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
      <p className={styles.closingLead}>
        Legibly is in private beta ahead of its Figma Community launch. Leave
        your email and we will send you access — nothing else.
      </p>
      <div className={styles.closingForm}>
        <WaitlistForm />
      </div>
    </section>
  );
}
