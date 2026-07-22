export const site = {
  name: "Legibly",
  tagline: "Accessibility auto-fix for Figma",
  description:
    "Legibly scans Figma designs against WCAG 2.2 AA and fixes violations in one click, using your own design tokens. Zero false positives, every fix re-verified.",
  email: "hello@glinc.io",
  /**
   * Set this to the Figma Community listing URL at launch.
   * While null, the primary CTA is the waitlist form.
   */
  figmaCommunityUrl: null as string | null,
  links: {
    glinc: "https://glinc.io",
    web2wireframe: "https://web2wireframe.design",
  },
} as const;
