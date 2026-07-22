import { ImageResponse } from "next/og";

export const alt = "Legibly. Accessibility auto-fix for Figma.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#fcfcfc",
          color: "#191c20",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="72" height="72" viewBox="0 0 22 22">
            <rect x="3" y="2" width="6" height="18" rx="2" fill="#1e40af" />
            <rect x="3" y="14" width="16" height="6" rx="2" fill="#1e40af" />
          </svg>
          <div style={{ fontSize: 64, fontWeight: 700 }}>Legibly</div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 44,
            fontWeight: 700,
            maxWidth: 900,
            lineHeight: 1.2,
          }}
        >
          Accessibility auto-fix for Figma
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: "#4b5158",
            maxWidth: 860,
            lineHeight: 1.4,
          }}
        >
          WCAG 2.2 AA violations, found and fixed in one click with your own
          design tokens.
        </div>
      </div>
    ),
    size,
  );
}
