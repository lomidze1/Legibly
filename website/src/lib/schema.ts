import { site } from "@/data/site";

export const SITE_URL = "https://legibly.app";

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
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free during public beta",
    },
    publisher: {
      "@type": "Organization",
      name: "Glinc",
      url: site.links.glinc,
    },
  };
}
