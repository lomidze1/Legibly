# Figma Community Listing — Legibly v0.4 (beta) — DRAFT

> Prepared for step 9 of the build sequence ([requirements.md §7](./requirements.md)).
> Publish = user action (Figma account owner). Fix is FREE during public beta (F20).
>
> **განახლდა 2026-08-12 (Phase 6).** ორი რამ შეიცვალა v0.1-ის დრაფტიდან: ათი SC ჩამოთვლილია
> ერთის ნაცვლად, და **`networkAccess: none` აღარ არის სიმართლე** — paywall-თან ერთად manifest
> ხდება `["https://api.legibly.design"]`. ძველი "100% private, no network" ფორმულირება წაშლილია;
> ახალი დაპირება ვიწროა და მაინც ძლიერი: *ლიცენზიის შესამოწმებლად ქსელი გამოიყენება, დიზაინი
> არსად არ იგზავნება.*
> AI Designer Judge **განზრახ არ არის ნახსენები** — ჯერ არ არსებობს (Phase 4, cutoff 1 სექტ.).

## Store title
**Legibly — Accessibility Auto-Fix & WCAG 2.2 AA Checker**

> ⚠️ D25-ის M1: სადაც სახელი მარტო დგას, იყოს **"Legibly for Figma"**. store-ის title-ს
> descriptor ისედაც აქვს, ე.ი. წესი site-ის H1-სა და OG-ტეგებს ეხება.

## Tagline
Accessibility & design-system auto-fix for Figma — WCAG 2.2 AA, done right.

## Description

**Find the issues you can trust. Fix them in one click — with your own tokens.**

Legibly scans your selection or page against WCAG 2.2 and fixes what it finds —
snapping to passing values **from your own variables and styles**, never
inventing off-brand ones.

**Why Legibly is different:**

- ✅ **Zero false positives.** A "violation" is mathematically certain. When the
  background is a gradient, image, or blend we say "needs review" — we never guess.
- ✅ **Effective-background resolution.** Legibly composites fill stacks, layer
  opacity and overlapping layers to find the *real* color behind your text —
  where other checkers silently get it wrong.
- ✅ **Every theme, not just the one on screen.** Colour checks re-run in each
  variable mode, so a file that passes in Light cannot hide a failure in Dark.
- ✅ **Provably correct fixes.** Every fix is re-verified by the same math that
  flagged it before it touches your canvas — and reverted if it would break
  another layer, or the same layer in another mode.
- ✅ **Batch fix, one undo.** Fix every violation on the page in one click —
  and undo it all with one Cmd-Z.
- ✅ **Your design never leaves Figma.** No AI, no analytics, no error tracking,
  no account to create. The plugin reaches exactly one domain, and only to check
  a Pro licence — `allowedDomains: ["https://api.legibly.design"]`. You can read
  that line in the manifest before you install.
- ✅ **Honest coverage.** We list exactly which WCAG criteria we did NOT check,
  so silence never reads as a pass.

**What it checks (10 success criteria):**

| SC | What |
|---|---|
| 1.4.3 | Contrast (Minimum) — AA and AAA, correct large-text rules |
| 1.4.11 | Non-text Contrast — icons, borders, controls |
| 1.4.1 | Use of Color — meaning carried by colour alone |
| 1.4.10 | Reflow — text clipped by its own frame |
| 1.4.12 | Text Spacing — line height |
| 2.5.8 | Target Size (Minimum) — AA |
| 2.5.5 | Target Size (Enhanced) — AAA |
| 2.4.6 | Headings and Labels — a form field with no label |
| 2.4.7 | Focus Visible — missing focus state |
| 1.1.1 | Non-text Content — alt text recorded on the layer |

Plus an **advisory tier**: things worth fixing that no standard mandates. They
are marked as advice and never counted as violations.

APCA Lc is shown as an advisory readout alongside the WCAG ratio.

## Tags
accessibility, wcag, contrast, a11y, checker, auto-fix, design-system, tokens, compliance, eaa

## Assets TODO (before publish)
- [ ] 128×128 icon + cover art (1920×960)
- [ ] 3–4 screenshots: scan results (3 tiers) · one-click fix diff · batch fix · strict mode
- [ ] 30s demo GIF: "Fix all 12 contrast issues in one click, on-system"
- [x] Support contact + domain — `hello@legibly.design` ✅ (Track F დახურულია, [D25](./approach.md))
