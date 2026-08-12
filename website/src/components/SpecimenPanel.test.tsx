import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpecimenPanel } from "./SpecimenPanel";
import { contrastRatio, formatRatio, specimen } from "@/lib/contrast";

/**
 * The one place on the page where the product actually runs. The numbers are
 * computed from the same tokens the plugin gates fixes with, so what is
 * asserted here is that the panel prints the measurement rather than a literal
 * — and that it never strands a reader on "Fixing…".
 *
 * jsdom has no matchMedia, so the reduced-motion query is stubbed per test.
 */

let reducedMotion = true;

beforeEach(() => {
  reducedMotion = true;
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const reads = (theme: "light" | "dark", state: "failing" | "fixed") =>
  formatRatio(contrastRatio(specimen[theme][state], specimen[theme].ground));

describe("before the fix", () => {
  it("prints the measured failing ratio, not a literal", () => {
    render(<SpecimenPanel />);

    expect(screen.getByText(reads("light", "failing"))).toBeInTheDocument();
    expect(screen.getByText(/Fails AA · needs 4.5:1/)).toBeInTheDocument();
  });

  it("counts the violation it is about to repair", () => {
    render(<SpecimenPanel />);
    expect(screen.getByText("1 violation · 0 needs review")).toBeInTheDocument();
  });

  it("announces nothing until there is something to announce", () => {
    render(<SpecimenPanel />);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});

describe("pressing fix", () => {
  it("lands on the repaired ratio and flips the verdict", () => {
    render(<SpecimenPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Fix with my tokens" }));

    expect(screen.getByText(reads("light", "fixed"))).toBeInTheDocument();
    expect(screen.getByText(/Passes AA · needed 4.5:1/)).toBeInTheDocument();
    expect(screen.getByText("0 violations · 1 fixed")).toBeInTheDocument();
  });

  it("names the token it swapped in, because the claim is that nothing is invented", () => {
    render(<SpecimenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Fix with my tokens" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      `Fixed. Contrast on the light artboard is now ${reads("light", "fixed")}, which passes AA, using the token ${specimen.light.fixedToken}.`,
    );
  });

  it("skips the animation entirely when the reader asked for reduced motion", () => {
    render(<SpecimenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Fix with my tokens" }));

    // Never passes through "Fixing…" — the repaired state is immediate.
    expect(screen.queryByRole("button", { name: "Fixing…" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("puts the sample back when undone", () => {
    render(<SpecimenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Fix with my tokens" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByText(reads("light", "failing"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fix with my tokens" })).toBeInTheDocument();
  });
});

describe("a tab that stopped being served frames", () => {
  it("still lands the result on wall-clock time", () => {
    reducedMotion = false;
    vi.useFakeTimers();
    // A backgrounded tab gets no animation frames at all.
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => undefined);

    render(<SpecimenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Fix with my tokens" }));
    expect(screen.getByRole("button", { name: "Fixing…" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1_100);
    });

    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.getByText(reads("light", "fixed"))).toBeInTheDocument();
  });
});

describe("switching the artboard to dark", () => {
  it("re-runs the check and shows the same token failing", () => {
    render(<SpecimenPanel />);

    fireEvent.click(screen.getByRole("button", { name: "dark" }));

    // specimen.dark.failing is specimen.light.fixed — the point of the demo.
    expect(screen.getByText(reads("dark", "failing"))).toBeInTheDocument();
    expect(screen.getByText(/Fails AA · needs 4.5:1/)).toBeInTheDocument();
  });

  it("repairs to the dark token rather than reusing the light one", () => {
    render(<SpecimenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    fireEvent.click(screen.getByRole("button", { name: "Fix with my tokens" }));

    expect(screen.getByText(reads("dark", "fixed"))).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(specimen.dark.fixedToken);
  });

  it("resets a repaired panel back to the failure when the theme changes", () => {
    render(<SpecimenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Fix with my tokens" }));
    fireEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(screen.getByRole("button", { name: "Fix with my tokens" })).toBeInTheDocument();
    expect(screen.getByText(reads("dark", "failing"))).toBeInTheDocument();
  });

  it("marks which artboard is selected", () => {
    render(<SpecimenPanel />);
    expect(screen.getByRole("button", { name: "light" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(screen.getByRole("button", { name: "dark" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "light" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("the sample itself", () => {
  it("stays hidden from scanners, so the deliberate failure is not the site's own", () => {
    const { container } = render(<SpecimenPanel />);
    const svg = container.querySelector("svg")!;

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("role", "presentation");
    // SVG text, not DOM text: axe-core's colour-contrast rule does not reach it.
    expect(svg.querySelectorAll("text").length).toBeGreaterThan(0);
  });

  it("recolors the body text to the repaired token", () => {
    const { container } = render(<SpecimenPanel />);
    const body = () => container.querySelectorAll("svg text")[1];

    expect(body()).toHaveAttribute("fill", specimen.light.failing);
    fireEvent.click(screen.getByRole("button", { name: "Fix with my tokens" }));
    expect(body()).toHaveAttribute("fill", specimen.light.fixed);
  });
});
