import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { site } from "@/data/site";
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

  it("discloses the website's sign-in cookies and how long they live", () => {
    // Buying on the website sets a session cookie on the API host. This page
    // claims to match what the code does, so the cookie is named here.
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).toContain("lgb_session");
    expect(text).toContain("lgb_oauth");
    expect(text).toMatch(/24 hours/);
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

  it("identifies the controller by legal name and postal address", () => {
    // GDPR Art. 13(1)(a): an email address alone does not identify a
    // controller. Flitt asks for the same thing before it activates a
    // merchant, so this text is load-bearing twice over.
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).toContain(site.seller.entity);
    expect(text).toContain(site.seller.address);
    expect(text).toMatch(/data controller/i);
  });

  it("keeps a canonical URL", () => {
    expect(metadata.alternates?.canonical).toBe("/privacy");
  });
});
