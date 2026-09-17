import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a real button when there is nowhere to go", () => {
    render(<Button>Get Pro</Button>);
    const button = screen.getByRole("button", { name: "Get Pro" });

    expect(button.tagName).toBe("BUTTON");
    // Inside a form, an untyped <button> submits. The default has to be explicit.
    expect(button).toHaveAttribute("type", "button");
  });

  it("carries the submit type through, which is what a form needs", () => {
    render(<Button type="submit">Join</Button>);
    expect(screen.getByRole("button", { name: "Join" })).toHaveAttribute("type", "submit");
  });

  it("is genuinely disabled, not just styled as such", () => {
    render(
      <Button type="submit" disabled>
        Joining…
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Joining…" })).toBeDisabled();
  });

  it("renders an in-site link as a link, not a button", () => {
    render(<Button href="/checkout">Get Pro</Button>);
    const link = screen.getByRole("link", { name: "Get Pro" });

    expect(link).toHaveAttribute("href", "/checkout");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens an external link in a new tab and severs the opener", () => {
    render(<Button href="https://glinc.io">Glinc</Button>);
    const link = screen.getByRole("link", { name: "Glinc" });

    expect(link).toHaveAttribute("target", "_blank");
    // Without noopener the new tab can navigate this one via window.opener.
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("treats only an http(s) href as external", () => {
    render(
      <>
        <Button href="/privacy">Privacy</Button>
        <Button href="#faq">FAQ</Button>
      </>,
    );

    for (const name of ["Privacy", "FAQ"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute("target");
    }
  });

  it("marks the primary variant differently from the default one", () => {
    const { container: plain } = render(<Button>Plain</Button>);
    const { container: primary } = render(<Button variant="primary">Primary</Button>);

    const plainClass = plain.querySelector("button")?.className ?? "";
    const primaryClass = primary.querySelector("button")?.className ?? "";

    expect(primaryClass).not.toBe(plainClass);
    // The primary style is added to the base one, never instead of it.
    for (const token of plainClass.split(" ").filter(Boolean)) {
      expect(primaryClass.split(" ")).toContain(token);
    }
  });
});
