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
   * The public launch window, in one place so the hero kicker, the pricing
   * note and the closing copy cannot drift apart — they used to say "coming
   * soon", "private beta" and "public beta" on the same page.
   *
   * Internal plan: everything but payments is due 15 August 2026, payments
   * by the 30th. September is the month that stays true if the second half
   * of that slips, which is the half that historically does.
   */
  launch: "September 2026",
  /**
   * Set this to the Figma Community listing URL at launch.
   * While null, the primary CTA is the waitlist form.
   */
  figmaCommunityUrl: null as string | null,
  /** Where the website's own calls go: Figma sign-in, the licence, checkout. */
  apiUrl: "https://api.legibly.design",
  links: {
    glinc: "https://glinc.io",
    web2wireframe: "https://web2wireframe.design",
  },
} as const;
