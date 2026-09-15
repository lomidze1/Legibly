import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PricingTiers } from "./PricingTiers";

/**
 * The money. D23 is one-time purchases: $120 per year or $12 per 30 days,
 * nothing renews. D28 puts the monthly rate first. The card is the only place a
 * visitor reads those numbers, so the toggle has to move both the figure and
 * the sentence under it.
 */

const tierNamed = (name: string) => screen.getByRole("heading", { name }).closest("div")!.parentElement!;

describe("the billing toggle", () => {
  it("opens on the monthly rate, which is the one being recommended (D28)", () => {
    render(<PricingTiers />);

    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Yearly/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("$12")).toBeInTheDocument();
    expect(screen.getByText(/per 30 days/)).toBeInTheDocument();
  });

  it("switches the figure and the note together", () => {
    render(<PricingTiers />);

    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));

    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.queryByText("$12")).not.toBeInTheDocument();
    expect(screen.getByText(/billed yearly/)).toBeInTheDocument();
    expect(screen.getByText(/\$120 once for 365 days/)).toBeInTheDocument();
  });

  it("moves the pressed state with it, so the switch reads as a switch", () => {
    render(<PricingTiers />);
    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));

    expect(screen.getByRole("button", { name: /Yearly/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches back", () => {
    render(<PricingTiers />);

    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));

    expect(screen.getByText("$12")).toBeInTheDocument();
    expect(screen.getByText(/\$12 once for 30 days/)).toBeInTheDocument();
  });

  it("announces the price region, because the number changes without navigation", () => {
    const { container } = render(<PricingTiers />);
    expect(container.querySelectorAll('[aria-live="polite"]').length).toBeGreaterThan(0);
  });

  it("labels the pair as one group", () => {
    render(<PricingTiers />);
    expect(screen.getByRole("group", { name: "Billing period" })).toBeInTheDocument();
  });
});

describe("what each tier claims", () => {
  it("never moves the free tier when the billing period changes", () => {
    render(<PricingTiers />);
    expect(within(tierNamed("Free")).getByText("$0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));

    expect(within(tierNamed("Free")).getByText("$0")).toBeInTheDocument();
    expect(within(tierNamed("Free")).getByText("forever")).toBeInTheDocument();
  });

  it("marks exactly one tier as recommended", () => {
    render(<PricingTiers />);
    const badges = screen.getAllByText("Recommended");

    expect(badges).toHaveLength(1);
    expect(tierNamed("Pro")).toContainElement(badges[0]);
  });

  it("repeats the one-time claim on the paid tier, which is the whole pricing model", () => {
    render(<PricingTiers />);
    expect(within(tierNamed("Pro")).getByText(/nothing renews, nothing to cancel/i)).toBeInTheDocument();
  });

  it("gives both tiers somewhere to click", () => {
    render(<PricingTiers />);
    const ctas = screen.getAllByRole("link", { name: "Join the waitlist" });

    expect(ctas).toHaveLength(2);
    for (const cta of ctas) expect(cta).toHaveAttribute("href", "/#early");
  });

  it("says Pro includes Free rather than listing the same lines twice", () => {
    render(<PricingTiers />);
    expect(within(tierNamed("Pro")).getByText("Everything in Free")).toBeInTheDocument();
  });
});

describe("the arithmetic behind the copy", () => {
  it("the advertised 17% saving is the one the two rates actually produce", () => {
    // $10/month billed yearly against $12/month: 1 - 120/144 ≈ 16.7%, which
    // rounds to the 17% printed on the switch and in the yearly note.
    const saving = 1 - (10 * 12) / (12 * 12);
    expect(Math.round(saving * 100)).toBe(17);

    render(<PricingTiers />);
    expect(screen.getByRole("button", { name: /save 17%/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));
    expect(screen.getByText(/17% off the monthly rate/)).toBeInTheDocument();
  });

  it("prints the monthly total as $12 and the yearly one as $120", () => {
    render(<PricingTiers />);
    expect(screen.getByText(/\$12 once/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));
    expect(screen.getByText(/\$120 once/)).toBeInTheDocument();
  });
});
