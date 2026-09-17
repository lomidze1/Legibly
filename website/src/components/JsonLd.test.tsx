import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./JsonLd";
import { SITE_URL, softwareApplicationSchema } from "@/lib/schema";
import { site } from "@/data/site";

function scriptOf(container: HTMLElement): HTMLScriptElement {
  const script = container.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );
  if (!script) throw new Error("no JSON-LD block was rendered");
  return script;
}

describe("JsonLd", () => {
  it("emits the object as parseable JSON-LD", () => {
    const { container } = render(<JsonLd data={{ "@type": "Thing", name: "Legibly" }} />);
    const script = scriptOf(container);

    expect(JSON.parse(script.innerHTML.replace(/\\u003c/g, "<"))).toEqual({
      "@type": "Thing",
      name: "Legibly",
    });
  });

  /**
   * The standard JSON-LD escape. A "<" inside the block can close the script
   * element early, and everything after it is then parsed as markup.
   */
  it("escapes every < so the block cannot be closed from inside it", () => {
    const { container } = render(
      <JsonLd data={{ name: "</script><img src=x onerror=alert(1)>" }} />,
    );
    const html = scriptOf(container).innerHTML;

    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("\\u003c/script");
    expect(container.querySelector("img")).toBeNull();
  });

  it("escapes a < wherever it appears, not only the first one", () => {
    const { container } = render(<JsonLd data={{ a: "<", b: "<", c: "<" }} />);
    expect(scriptOf(container).innerHTML.match(/\\u003c/g)).toHaveLength(3);
  });
});

describe("softwareApplicationSchema", () => {
  it("describes the product with the same copy the page uses", () => {
    const schema = softwareApplicationSchema();

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("SoftwareApplication");
    expect(schema.name).toBe(site.name);
    expect(schema.description).toBe(site.description);
    expect(schema.url).toBe(SITE_URL);
  });

  it("advertises the real price list, which is what the pricing section says", () => {
    expect(softwareApplicationSchema().offers.map((offer) => offer.price)).toEqual(["0", "12", "120"]);
    for (const offer of softwareApplicationSchema().offers) expect(offer.priceCurrency).toBe("USD");
  });

  it("credits the publisher the footer credits", () => {
    expect(softwareApplicationSchema().publisher).toMatchObject({
      name: "Glinc",
      url: site.links.glinc,
    });
  });

  it("survives the JSON-LD escape unchanged — no markup hides in the copy", () => {
    const json = JSON.stringify(softwareApplicationSchema());
    expect(json.replace(/</g, "\\u003c")).toBe(json);
  });
});
