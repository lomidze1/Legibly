import type { Metadata } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/schema";
import { site } from "@/data/site";
import "./globals.css";

// Classical: Cormorant Garamond headings over Lora body. Self-hosted through
// next/font — no Google Fonts CDN request at runtime.
const heading = Cormorant_Garamond({
  variable: "--font-heading-src",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const body = Lora({
  variable: "--font-body-src",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
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
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SiteNav />
        {/* tabIndex -1 so the skip link actually moves focus, not just scroll. */}
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
