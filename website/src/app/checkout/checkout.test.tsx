import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CheckoutCancelPage, { metadata as cancelMetadata } from "./cancel/page";
import CheckoutSuccessPage, { metadata as successMetadata } from "./success/page";

describe("checkout landing pages", () => {
  it("exist, because Flitt sends the buyer to them", () => {
    // The API redirects here after payment (backend-spec §7.7). Without these
    // pages the last step of a successful purchase is a 404.
    expect(typeof CheckoutSuccessPage).toBe("function");
    expect(typeof CheckoutCancelPage).toBe("function");
  });

  it("stay out of search results", () => {
    for (const metadata of [successMetadata, cancelMetadata]) {
      expect(metadata.robots).toMatchObject({ index: false });
    }
  });

  it("tell a buyer where Pro will appear", () => {
    render(<CheckoutSuccessPage />);
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/Payment received/i);
    expect(text).toMatch(/back to Figma/i);
    expect(text).toContain("billing@legibly.design");
  });

  it("repeat that the purchase does not renew", () => {
    render(<CheckoutSuccessPage />);
    expect(document.body.textContent).toMatch(/one-time payment, not a subscription/i);
  });

  it("say plainly that a cancelled checkout charged nothing", () => {
    render(<CheckoutCancelPage />);
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/Nothing was charged/i);
    expect(text).toMatch(/no money moved/i);
  });
});
