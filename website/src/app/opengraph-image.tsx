import { ImageResponse } from "next/og";

export const alt = "Legibly. Accessibility auto-fix for Figma.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Classical, at social-card scale: the ground, a hairline frame, the wordmark
 * over an accent rule. Satori has no Cormorant, so this sets in the generic
 * serif rather than shipping a font binary for one image.
 */
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
          padding: "84px",
          background: "#f3f2f2",
          color: "#201f1d",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#7d5411",
          }}
        >
          Coming soon to Figma Community
        </div>
        <div
          style={{
            marginTop: 44,
            paddingTop: 36,
            borderTop: "1px solid #b68235",
            fontSize: 78,
            lineHeight: 1.06,
          }}
        >
          Checkers tell you. Legibly fixes it.
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "#444141",
            maxWidth: 860,
            lineHeight: 1.5,
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
