import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { site } from "@/data/site";
import TermsPage, { metadata } from "./page";

describe("terms", () => {
  it("names the seller by legal name and postal address", () => {
    // A buyer reading this page is deciding who they are contracting with.
    // EU consumer-information rules want the trader identified, and Flitt
    // wants the same before it activates a merchant — an email is not enough.
    render(<TermsPage />);
    const text = document.body.textContent ?? "";

    expect(text).toContain(site.seller.entity);
    expect(text).toContain(site.seller.address);
  });

  it("keeps a canonical URL", () => {
    expect(metadata.alternates?.canonical).toBe("/terms");
  });
});
