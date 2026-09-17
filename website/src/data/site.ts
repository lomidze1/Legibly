export const site = {
  name: "Legibly",
  tagline: "Accessibility auto-fix for Figma",
  description:
    "Legibly scans Figma designs against WCAG 2.2 AA and fixes violations in one click, using your own design tokens. Zero false positives, every fix re-verified.",
  email: "hello@legibly.design",
  /**
   * Who the buyer is actually contracting with. The terms page needs it under
   * EU consumer-information rules, the privacy page under GDPR Art. 13(1)(a),
   * and Flitt asks for it before it activates a merchant. One string so the
   * two pages cannot drift into naming the seller differently.
   */
  seller: {
    entity:
      "Glinc, a project of Giorgi Lomidze, registered in Georgia as an Individual Entrepreneur",
    address: "Georgia, Shida Kartli, Khashuri, Borjomis st. N 106",
  },
  /**
   * The Figma Community listing URL. While null, the free tier's button
   * points at the docs instead.
   */
  figmaCommunityUrl: null as string | null,
  /** Where the website's own calls go: Figma sign-in, the licence, checkout. */
  apiUrl: "https://api.legibly.design",
  links: {
    glinc: "https://glinc.io",
    web2wireframe: "https://web2wireframe.design",
  },
} as const;
