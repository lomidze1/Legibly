import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { site } from "@/data/site";

/**
 * Buying on the website. The network is stubbed at `fetch`; what is asserted is
 * the contract with the API — credentials on every call, the duration sent, the
 * sign-in URL built — and what a buyer sees at each state.
 */

let billing = "monthly";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(`billing=${billing}`),
}));

const { CheckoutFlow, durationFrom } = await import("./CheckoutFlow");

const fetchMock = vi.fn();
const assign = vi.fn();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const signedIn = () => json({ success: true, license: { plan: "free", daysLeft: 0 }, email: "designer@example.com" });

beforeEach(() => {
  billing = "monthly";
  fetchMock.mockReset();
  assign.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("durationFrom", () => {
  it("defaults to monthly, which leads (D28)", () => {
    expect(durationFrom(null)).toBe("monthly");
    expect(durationFrom("nonsense")).toBe("monthly");
    expect(durationFrom("yearly")).toBe("yearly");
  });
});

describe("signed out", () => {
  it("offers Figma sign-in and comes back to the plan that was picked", async () => {
    billing = "yearly";
    fetchMock.mockResolvedValueOnce(json({ success: false }, 401));
    render(<CheckoutFlow />);

    fireEvent.click(await screen.findByRole("button", { name: "Continue with Figma" }));

    const url = new URL(assign.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(`${site.apiUrl}/api/auth/figma/login`);
    expect(url.searchParams.get("return_to")).toBe("/checkout?billing=yearly");
  });

  it("asks the API with credentials, because the session is a cookie", async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false }, 401));
    render(<CheckoutFlow />);

    await screen.findByRole("button", { name: "Continue with Figma" });
    expect(fetchMock).toHaveBeenCalledWith(`${site.apiUrl}/api/license/me`, { credentials: "include" });
  });
});

describe("signed in", () => {
  it("shows who is signed in before any money moves", async () => {
    fetchMock.mockResolvedValueOnce(signedIn());
    render(<CheckoutFlow />);

    expect(await screen.findByText("designer@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay $12" })).toBeInTheDocument();
  });

  it("opens Flitt for the chosen duration", async () => {
    fetchMock
      .mockResolvedValueOnce(signedIn())
      .mockResolvedValueOnce(json({ success: true, checkoutUrl: "https://pay.flitt.com/c/abc" }));
    render(<CheckoutFlow />);

    fireEvent.click(await screen.findByRole("radio", { name: /\$120/ }));
    fireEvent.click(screen.getByRole("button", { name: "Pay $120" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://pay.flitt.com/c/abc"));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`${site.apiUrl}/api/checkout/create`);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(init.body)).toEqual({ duration: "yearly" });
  });

  it("says why when the licence is already running", async () => {
    fetchMock
      .mockResolvedValueOnce(signedIn())
      .mockResolvedValueOnce(json({ success: false, error: "already_pro", remainingDays: 20, renewalOpensInDays: 13 }, 400));
    render(<CheckoutFlow />);

    fireEvent.click(await screen.findByRole("button", { name: "Pay $12" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already active for 20 more days/);
    expect(assign).not.toHaveBeenCalled();
  });

  it("never follows a checkout URL that is not https", async () => {
    fetchMock
      .mockResolvedValueOnce(signedIn())
      .mockResolvedValueOnce(json({ success: true, checkoutUrl: "javascript:alert(1)" }));
    render(<CheckoutFlow />);

    fireEvent.click(await screen.findByRole("button", { name: "Pay $12" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unavailable/);
    expect(assign).not.toHaveBeenCalled();
  });

  it("signs out through the API and goes back to the sign-in step", async () => {
    fetchMock.mockResolvedValueOnce(signedIn()).mockResolvedValueOnce(json({ success: true }));
    render(<CheckoutFlow />);

    fireEvent.click(await screen.findByRole("button", { name: "Not you? Sign out" }));

    expect(await screen.findByRole("button", { name: "Continue with Figma" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(`${site.apiUrl}/api/auth/me`, { method: "DELETE", credentials: "include" });
  });
});
