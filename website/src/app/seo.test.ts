import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";
import { SITE_URL } from "@/lib/schema";

/**
 * The sitemap is hand-written, so it drifts the moment a page is added. These
 * tests derive the truth from the app directory instead: every page that is
 * not deliberately kept out of search must be listed, and nothing may be
 * listed that does not exist.
 */

const APP_DIR = join(process.cwd(), "src/app");

function pageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "api" ? [] : pageFiles(full);
    return entry.name === "page.tsx" ? [full] : [];
  });
}

/** "src/app/privacy/page.tsx" → "/privacy"; "src/app/page.tsx" → "/". */
function routeOf(file: string): string {
  const segments = relative(APP_DIR, file).split("/").slice(0, -1);
  return `/${segments.join("/")}`;
}

const pages = pageFiles(APP_DIR).map((file) => ({
  route: routeOf(file),
  /** A page that asks not to be indexed has no business in the sitemap. */
  noindex: /index:\s*false/.test(readFileSync(file, "utf8")),
}));

describe("robots", () => {
  it("lets crawlers in and points them at the sitemap", () => {
    const rules = robots();

    expect(rules.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(rules.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("keeps the sitemap on the canonical origin, not a relative path", () => {
    expect(String(robots().sitemap).startsWith("https://")).toBe(true);
  });
});

describe("sitemap", () => {
  const entries = sitemap();
  const listed = entries.map((entry) => entry.url.replace(SITE_URL, "") || "/");

  it("finds pages to list at all", () => {
    expect(pages.length).toBeGreaterThan(0);
    expect(entries.length).toBeGreaterThan(0);
  });

  it("lists every page that is not explicitly kept out of search", () => {
    const shouldBeListed = pages
      .filter((page) => !page.noindex)
      .map((page) => page.route)
      .sort();

    expect(listed.slice().sort()).toEqual(shouldBeListed);
  });

  it("omits the checkout landing pages, which are noindex", () => {
    expect(pages.some((page) => page.route === "/checkout/success" && page.noindex)).toBe(true);
    expect(listed).not.toContain("/checkout/success");
    expect(listed).not.toContain("/checkout/cancel");
  });

  it("lists nothing twice", () => {
    expect(new Set(listed).size).toBe(listed.length);
  });

  it("keeps every URL absolute and on the canonical origin", () => {
    for (const entry of entries) {
      expect(entry.url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(new URL(entry.url).protocol).toBe("https:");
    }
  });

  it("ranks the home page above every other route", () => {
    const home = entries.find((entry) => entry.url === `${SITE_URL}/`);

    expect(home?.priority).toBe(1);
    for (const entry of entries.filter((e) => e !== home)) {
      expect(entry.priority ?? 0).toBeLessThan(1);
    }
  });

  it("gives every entry a priority inside the range the spec allows", () => {
    for (const entry of entries) {
      expect(entry.priority ?? 0).toBeGreaterThan(0);
      expect(entry.priority ?? 0).toBeLessThanOrEqual(1);
    }
  });
});
