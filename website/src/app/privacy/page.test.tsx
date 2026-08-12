import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage, { metadata } from "./page";

describe("privacy policy", () => {
  it("no longer claims the plugin makes no network requests", () => {
    // It said exactly that until the licence check shipped. The manifest is
    // the one thing a sceptical reader can verify, so this page has to match
    // it rather than flatter it.
    render(<PrivacyPage />);
    expect(document.body.textContent).not.toMatch(/no network requests of any kind/i);
    expect(String(metadata.description)).not.toMatch(/no network requests/i);
  });

  it("names the single domain the plugin is allowed to reach", () => {
    render(<PrivacyPage />);
    expect(document.body.textContent).toContain("https://api.legibly.design");
  });

  it("still promises the design itself never leaves", () => {
    render(<PrivacyPage />);
    expect(document.body.textContent).toMatch(/never uploaded to us/i);
    expect(document.body.textContent).toMatch(/anything from your designs/i);
  });

  it("says what a Pro purchase actually stores", () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/Figma user id/i);
    expect(text).toMatch(/current_user:read/);
    expect(text).toMatch(/discarded/i);
  });

  it("discloses the usage records the admin panel's numbers come from", () => {
    // The panel counts daily-active users and the checkout funnel. That is a
    // record of behaviour, thin as it is, and the policy has to say so — this
    // page's whole claim is that it matches what the code does.
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/usage records/i);
    expect(text).toMatch(/at most one line\s+per day/i);
    expect(text).toMatch(/legitimate interest/i);
  });

  it("discloses the rate-limit counters, which are keyed by IP", () => {
    render(<PrivacyPage />);
    expect(document.body.textContent).toMatch(/per IP address/i);
  });

  it("lists every processor and claims no others", () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    for (const processor of ["Vercel", "Flitt", "Resend"]) {
      expect(text).toContain(processor);
    }
    expect(text).toMatch(/no analytics service, no error\s+tracker/i);
  });

  it("keeps a canonical URL", () => {
    expect(metadata.alternates?.canonical).toBe("/privacy");
  });
});
