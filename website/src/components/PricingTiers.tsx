"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import styles from "./PricingTiers.module.css";

/** One source of truth for the badge and the card's accent treatment. */
const RECOMMENDED_PLAN = "Pro";

type Billing = "year" | "month";

/**
 * $120 used to be the only number on the card. It is the cheaper of the two
 * ways to pay, but a yearly total reads as the price of entry and prices the
 * plugin next to a year of Figma rather than next to a coffee. Both cadences
 * now lead with the per-month figure and keep the total in the line beneath.
 *
 * The money itself is unchanged (D23): $120 per year or $12 per 30 days, both
 * one-time. $12 × 12 = $144, so the year saves 17%.
 */
const pro: Record<Billing, { price: string; cadence: string; note: string }> = {
  year: {
    price: "$10",
    cadence: "per month · billed yearly",
    note: "$120 once for 365 days — 17% off the monthly rate.",
  },
  month: {
    price: "$12",
    cadence: "per 30 days",
    note: "$12 once for 30 days. Buying again stacks the days.",
  },
};

const freeItems = [
  "Scan selections or whole pages",
  "Three honest verdicts on every layer",
  "Pixel-true deep check for composited backgrounds",
];

const proItems = [
  "Everything in Free",
  "One-time payment — nothing renews, nothing to cancel",
  "One-click and batch auto-fix with a single undo",
  "CSV compliance report export",
  "Strict mode: on-system tokens only",
];

export function PricingTiers() {
  const [billing, setBilling] = useState<Billing>("year");

  const tiers = [
    {
      name: "Free",
      price: "$0",
      cadence: "forever",
      note: null,
      items: freeItems,
    },
    { name: RECOMMENDED_PLAN, ...pro[billing], items: proItems },
  ];

  return (
    <>
      <div className={styles.switch} role="group" aria-label="Billing period">
        {(
          [
            ["month", "Monthly"],
            ["year", "Yearly · save 17%"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`${styles.switchOption} ${
              billing === value ? styles.switchOptionActive : ""
            }`}
            aria-pressed={billing === value}
            onClick={() => setBilling(value)}
          >
            {label}
          </button>
        ))}
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
              {/* The price changes under the toggle, so it is announced. */}
              <div aria-live="polite">
                <h3 className={styles.tierName}>{tier.name}</h3>
                <p
                  className={`${styles.tierPrice} ${
                    featured ? styles.tierPriceAccent : ""
                  }`}
                >
                  {tier.price}
                </p>
                <p className={styles.tierCadence}>{tier.cadence}</p>
                {tier.note && <p className={styles.tierNote}>{tier.note}</p>}
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
    </>
  );
}
