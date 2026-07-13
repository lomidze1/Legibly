# Figma Community Listing — Legibly v0.1 (beta) — DRAFT

> Prepared for step 9 of the build sequence ([requirements.md §7](./requirements.md)).
> Publish = user action (Figma account owner). Fix is FREE during public beta (F20).

## Store title
**Legibly — Accessibility Auto-Fix & WCAG 2.2 AA Checker**

## Tagline
Accessibility & design-system auto-fix for Figma — WCAG 2.2 AA, done right.

## Description

**Find contrast issues you can trust. Fix them in one click — with your own tokens.**

Legibly scans your selection or page for WCAG 2.2 AA text-contrast violations
and fixes them instantly — snapping to passing colors **from your own
variables and styles**, never inventing off-brand values.

**Why Legibly is different:**

- ✅ **Zero false positives.** A "violation" is mathematically certain. When the
  background is a gradient, image, or blend we say "needs review" — we never guess.
- ✅ **Effective-background resolution.** Legibly composites fill stacks, layer
  opacity and overlapping layers to find the *real* color behind your text —
  where other checkers silently get it wrong.
- ✅ **Provably correct fixes.** Every fix is re-verified by the same math that
  flagged it before it touches your canvas. If no on-system token can pass, we
  propose a minimal new token (one-click accept) or tell you honestly.
- ✅ **Batch fix, one undo.** Fix every violation on the page in one click —
  and undo it all with one Cmd-Z.
- ✅ **100% private.** No network, no AI, no account. Nothing leaves Figma
  (`networkAccess: none`).
- ✅ **Honest coverage.** We list exactly which WCAG criteria we did NOT check,
  so silence never reads as a pass.

**What it checks (v0.1):** SC 1.4.3 Contrast (Minimum) — AA and AAA, with
correct large-text rules. APCA Lc shown as an advisory readout.

**Coming next:** target size & text spacing (v0.2), alt-text assistance (v0.3).

## Tags
accessibility, wcag, contrast, a11y, checker, auto-fix, design-system, tokens, compliance, eaa

## Assets TODO (before publish)
- [ ] 128×128 icon + cover art (1920×960)
- [ ] 3–4 screenshots: scan results (3 tiers) · one-click fix diff · batch fix · strict mode
- [ ] 30s demo GIF: "Fix all 12 contrast issues in one click, on-system"
- [ ] Support contact + (optional) legibly domain (Track F: trademark/domain clearance)
