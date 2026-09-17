import { site } from "@/data/site";

export const SITE_URL = "https://legibly.design";

/** JSON-LD for the product. One SoftwareApplication node on the home page. */
export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web (Figma plugin)",
    url: SITE_URL,
    description: site.description,
    // The real price list — the same three numbers the pricing section shows.
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro — 30 days", price: "12", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro — 365 days", price: "120", priceCurrency: "USD" },
    ],
    publisher: {
      "@type": "Organization",
      name: "Glinc",
      url: site.links.glinc,
    },
  };
}
