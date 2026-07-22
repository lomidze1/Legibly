import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/schema";
import { site } from "@/data/site";
import "./globals.css";

// One family for everything. Atkinson Hyperlegible was designed by the
// Braille Institute for maximum legibility — for this brand, the typeface
// is the argument.
const sans = Atkinson_Hyperlegible({
  variable: "--font-sans-src",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Legibly — Accessibility Auto-Fix & WCAG 2.2 AA Checker for Figma",
    template: "%s — Legibly",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "figma accessibility",
    "WCAG checker figma",
    "contrast fixer",
    "accessibility auto-fix",
    "WCAG 2.2 AA",
    "design tokens",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: site.name,
    title: "Legibly — Accessibility Auto-Fix for Figma",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Legibly — Accessibility Auto-Fix for Figma",
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SiteNav />
        <div id="main-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
