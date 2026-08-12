import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScanDemo } from "./ScanDemo";

/**
 * The page audit, and the product's central honesty claim: pressing "Fix all"
 * repairs the violations and leaves the two findings it cannot stand behind
 * exactly where they were.
 *
 * jsdom has no matchMedia. Reduced motion is the default here because it makes
 * the scan land in one step; the staggered path gets its own test with fake
 * timers.
 */

let reducedMotion = true;

beforeEach(() => {
  reducedMotion = true;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const rows = () => screen.getAllByRole("listitem");
const scan = () => fireEvent.click(screen.getByRole("button", { name: "Run scan" }));

describe("before a scan", () => {
  it("measures nothing and says so", () => {
    render(<ScanDemo />);

    expect(screen.getByText(/Nothing has been measured yet/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("Nine checks · ready")).toBeInTheDocument();
  });
});

describe("after a scan", () => {
  it("reports six findings across the three verdicts", () => {
    render(<ScanDemo />);
    scan();

    expect(rows()).toHaveLength(6);
    expect(screen.getAllByText("Violation")).toHaveLength(4);
    expect(screen.getAllByText("Needs review")).toHaveLength(1);
    expect(screen.getAllByText("Not checked")).toHaveLength(1);
  });

  it("counts only the violations as fixable", () => {
    render(<ScanDemo />);
    scan();

    expect(screen.getByText("6 findings · 4 fixable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fix all 4" })).toBeInTheDocument();
  });

  it("announces the outcome for a reader who cannot see the list", () => {
    render(<ScanDemo />);
    scan();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Scan complete. 6 findings: 4 violations, one needs review, one not checked.",
    );
  });

  it("names the criterion behind every finding, never a verdict on its own", () => {
    render(<ScanDemo />);
    scan();

    for (const row of rows()) {
      expect(row.textContent).toMatch(/SC \d\.\d\.\d+/);
    }
  });

  it("carries a word, not only a colour — check 06 is about exactly that", () => {
    render(<ScanDemo />);
    scan();

    for (const row of rows()) {
      expect(row.textContent).toMatch(/Violation|Needs review|Not checked/);
    }
  });
});

describe("fixing", () => {
  it("repairs every violation and shows the measured result", () => {
    render(<ScanDemo />);
    scan();
    fireEvent.click(screen.getByRole("button", { name: "Fix all 4" }));

    expect(screen.getAllByText("Fixed")).toHaveLength(4);
    expect(screen.queryByText("Violation")).not.toBeInTheDocument();
    expect(screen.getByText("6.9:1 · text/secondary")).toBeInTheDocument();
    expect(screen.getByText("44 × 44 · touch/min")).toBeInTheDocument();
  });

  it("leaves the two findings it cannot stand behind untouched", () => {
    render(<ScanDemo />);
    scan();
    const gradient = rows().find((row) => row.textContent?.includes("SC 1.4.11"))!;
    const focusOrder = rows().find((row) => row.textContent?.includes("SC 2.4.3"))!;

    fireEvent.click(screen.getByRole("button", { name: "Fix all 4" }));

    expect(within(gradient).getByText("Needs review")).toBeInTheDocument();
    expect(within(gradient).getByText(/crosses 3:1/)).toBeInTheDocument();
    expect(within(focusOrder).getByText("Not checked")).toBeInTheDocument();
    expect(within(focusOrder).getByText(/Legibly never claims it/)).toBeInTheDocument();
  });

  it("says in the footer that two were deliberately left", () => {
    render(<ScanDemo />);
    scan();
    fireEvent.click(screen.getByRole("button", { name: "Fix all 4" }));

    expect(screen.getByText("4 fixed · 2 left for you, on purpose")).toBeInTheDocument();
  });

  it("undoes back to an unmeasured page, the way one undo does in the plugin", () => {
    render(<ScanDemo />);
    scan();
    fireEvent.click(screen.getByRole("button", { name: "Fix all 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByText(/Nothing has been measured yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run scan" })).toBeInTheDocument();
  });
});

describe("the staggered reveal", () => {
  it("uncovers the findings one at a time and only then offers the fix", () => {
    reducedMotion = false;
    vi.useFakeTimers();
    render(<ScanDemo />);

    scan();
    expect(screen.getByRole("button", { name: "Scanning…" })).toBeDisabled();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(rows()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Fix all/ })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(260 * 5);
    });
    expect(rows()).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Fix all 4" })).toBeInTheDocument();
  });

  it("shows the whole list at once when reduced motion is asked for", () => {
    render(<ScanDemo />);
    scan();

    // No timers were needed: the list is already complete.
    expect(rows()).toHaveLength(6);
  });
});
