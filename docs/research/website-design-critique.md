# Legibly Marketing Site — Design Critique

> Source: `http://localhost:3000` (local dev, Next.js 16 + Turbopack) and `website/src/**`
> Date: 2026-07-26
> Researcher: Claude session (read-only design review)
> Method: Chromium via Playwright MCP + the Claude Browser pane. Viewports 1440x900, 900x1000, 768x1024, 375x812, 320 CSS px. Pages `/` and `/privacy`. Computed-style probes, a rendered contrast sweep over 39 text pairs, a WCAG 2.2 SC 2.5.8 target-size sweep over 28 targets, a 26-stop tab sweep, and interaction tests on `FixDemo` and `WaitlistForm`. No files under `website/` were modified.
> Grounding: judged against the intent recorded in `docs/website.md §7` and `docs/branding.md`, not against a generic SaaS template. The documented brand constraints (AAA body pairs, Atkinson Hyperlegible, one accent blue, semantic-only verdict colors, light high-contrast surface) are treated as fixed; only their execution is critiqued.

---

## 1. Verdict

This is a careful, honest, well-built site that is not yet doing its one job. The craft floor is genuinely high — uniform 128px vertical rhythm, a real audited palette, a proper focus ring, a skip link, reduced-motion handled globally, and a hero demo that runs actual WCAG math rather than faking it — and the copy is more honest than almost any marketing page in this category. But the conversion path is the weakest part of the page: the waitlist has no persistence behind it, the hero's primary CTA renders smaller and less prominent than the demo's throwaway "Fix with my tokens" button, and the headline states a category rather than a value. **It is not launchable as-is**, because the single action the site exists to capture is fire-and-forget (see SEV-1) — but it is roughly one focused day from being launchable.

The single highest-leverage change is to **rebuild the hero as a conversion unit**: make the waitlist form the largest, most prominent blue thing on the screen (it currently is not), demote the demo's action button to a secondary treatment, and promote the page's sharpest sentence — "Checkers tell you. Legibly fixes it.", currently buried five sections down — into or beside the H1. That one move addresses message clarity, CTA prominence, and visual hierarchy at the same time.

---

## 2. Scorecard

| # | Dimension | Score | Justification |
|---|-----------|-------|---------------|
| 1 | First impression & message clarity | **6/10** | In five seconds you know it is a Figma accessibility tool, but "Accessibility auto-fix for Figma" is a category label; the differentiating sentence is buried in section 5. |
| 2 | Visual hierarchy & layout | **5/10** | Vertical rhythm is genuinely uniform (128px everywhere), but nine different content measures, one section that breaks the shared left axis by 160px, and a persistently empty right third. |
| 3 | Typography | **6/10** | Right typeface, sensible scale, `text-wrap: balance` on headings — undermined by measure caps that overshoot by ~1.5x and two cells that run to 131 characters per line. |
| 4 | Color & surface | **7/10** | Disciplined single accent, a real (not default) palette, tints used with restraint. Loses points for verdict green leaking into pricing decoration and for zero dark-mode handling. |
| 5 | Motion | **6/10** | Restraint is the correct call for this brand and `prefers-reduced-motion` is handled properly — but the one moment that must move (before to after) barely does. |
| 6 | Conversion path | **4/10** | CTA out-weighed by a demo toy, form wraps into an unintended 3-row stack, pricing helps more than it hurts, and the capture endpoint stores nothing. |
| 7 | Craft & polish (anti-slop) | **6/10** | Focus, hover, active, honeypot, error and success states all exist and are designed. Dragged down by an accidental nav underline, the browser's default disclosure marker, ragged pricing bottoms and a real breakpoint seam. |
| 8 | Self-consistency (highest stakes) | **5/10** | Genuinely AAA on every audited pair and admirably honest in copy — but it ships 2.41:1 text on its own homepage, fails Reflow at 305 CSS px, and has two body strings below the AAA floor it publicly claims. |

---

## 3. Findings

**The genuine top five, ranked by business impact:** SEV-1 (waitlist stores nothing) → SEV-4 (hero CTA hierarchy inverted) → SEV-2 (homepage fails its own contrast scan) → SEV-5 + SEV-6 (hero does not sell) → SEV-3 (Reflow at 305px).

### Critical — blocks launch or breaks trust

**[SEV-1] The waitlist does not store anything**
- **Observed:** `POST /api/waitlist` validates the address and then sends a single email to `hello@glinc.io` via Resend. There is no database, no list, no queue, no retry. The sender is `onboarding@resend.dev` — Resend's shared sandbox address, which in test mode only delivers to the account owner's own verified address. If the send fails the user is told "Could not save your signup" and the lead is gone with no record anywhere.
- **Why it costs:** This is the site's *only* conversion goal. Every other finding in this report is downstream of it. A dropped or spam-filtered email is an unrecoverable lost lead, and there is no way to export the list at launch to actually mail the people who signed up.
- **Fix:** Persist first, notify second. Write the address to durable storage (Vercel KV / Postgres / a Resend Audience via `resend.contacts.create`) and treat the notification email as best-effort. Replace `onboarding@resend.dev` with a verified sender on the real domain before launch. (`website/src/app/api/waitlist/route.ts:33-57`)
- **Effort:** M

**[SEV-2] The homepage ships text at 2.41:1 and will fail any automated scan a prospect runs**
- **Observed:** The `FixDemo` "before" state renders real body copy ("Payment due in 3 days. Update your billing details…") in `#999da4` on `#f1f1ee` — measured 2.41:1 against a 4.5:1 requirement. It is deliberate and the demo says so. But it is live DOM text, so axe-core, Lighthouse, WAVE and every browser extension will report a serious SC 1.4.3 violation on the hero of a WCAG-compliance product. My own rendered sweep of 39 text pairs found exactly one AA failure, and this is it.
- **Why it costs:** Trust, and asymmetrically so. The positioning is "we are the honest, correct one." The first thing a skeptical designer or a competitor does is run a scanner on `legibly.app`. "1 contrast violation" on the hero is a screenshot that writes itself.
- **Fix:** Two honest options. (a) Render the "before" specimen as an image or `<canvas>` with a text alternative, keeping the ratio math live in the readout — the demo stays truthful, the scanner sees a picture of a violation rather than a violation. (b) Keep it live and pre-empt the story: publish your own axe result and a one-line caption explaining the intentional specimen. Do not leave it un-addressed. (`website/src/components/FixDemo.tsx:14-15`, `:36-39`)
- **Effort:** M

**[SEV-3] Reflow (SC 1.4.10, AA) fails at 305 CSS px — the nav CTA overflows**
- **Observed:** At exactly 320 CSS px the page passes with **zero** headroom (`scrollWidth === clientWidth === 320`), but the nav CTA already breaks its own gutter: the wordmark keeps its 20px left margin while the CTA's right edge sits at 312px, i.e. 8px from the viewport edge instead of 20px (screenshot confirms the asymmetry). At 305 CSS px — what Windows Chrome gives you at 1280 × 400% zoom with a classic scrollbar — `scrollWidth` becomes 312 against a 305 client width, producing 7px of horizontal scrolling. The overflowing element is `.cta`, which is `white-space: nowrap` at 165px inside a flex row that cannot shrink it.
- **Why it costs:** SC 1.4.10 is a WCAG 2.2 **AA** criterion. The site sells AA conformance. Failing it at a standard zoom configuration is the most quotable possible defect.
- **Fix:** Let the nav CTA shrink or shorten below ~360px: reduce its horizontal padding at a small breakpoint, allow the label to shorten to "Join", or drop it in favour of the in-page form under ~400px. (`website/src/components/SiteNav.module.css:10-18`, `:41-49`)
- **Effort:** S

### High — costs conversion

**[SEV-4] The hero's conversion hierarchy is inverted: the demo's toy button out-weighs the real CTA**
- **Observed:** In the hero, the `FixDemo` action button ("Fix with my tokens" / "Undo") renders 393px wide in `--accent`. The actual conversion button ("Get early access") renders 177px wide in the *same* `--accent`. On top of that, the form does not render as designed: `.form` has `max-width: 460px` and `.row` is a flex row, but under `justify-items: start` the form shrink-to-fits to **385.3px**, which is narrower than the row's max-content, so the button wraps below the input. Verified at 1440, 900 and 768 (`formWrapped: true` at all three).
- **Why it costs:** The single-accent rule means the two buttons are chromatically identical, so size is the only hierarchy signal — and the throwaway one is 2.2x larger. Meanwhile the CTA renders as a small button at the bottom of a three-row stack. The page's most important click is its least prominent blue element.
- **Fix:** Give the form an explicit width (`width: min(100%, 460px)` rather than relying on shrink-to-fit) so the input and button sit inline as intended, and demote the demo action to the ghost variant that already exists. (`website/src/components/WaitlistForm.module.css:1-5`, `:12-17`; `website/src/app/page.module.css:14-18`; `website/src/components/FixDemo.module.css:69-81`; `website/src/components/Button.module.css:37-45`)
- **Effort:** S

**[SEV-5] The headline states a category; the differentiating sentence is buried in section 5**
- **Observed:** H1 is "Accessibility auto-fix for Figma" — accurate, but it is the product's category, and it is a phrase Stark, Adee or axe could each put on their own page. The sharpest, most defensible sentence on the entire site is the section-5 heading "Checkers tell you. Legibly fixes it." (`page.tsx:152`), which sits roughly 2,400px down the page.
- **Why it costs:** Per `docs/a11y-competitor-teardown.md`, the whole wedge is fix-versus-flag. The hero currently does not make that argument; a visitor who bounces at the fold never learns the one thing that separates this product from eight free competitors.
- **Fix:** Promote the fix-versus-flag contrast into the hero — either as the H1 itself or as the subhead — and let the sub-paragraph carry the mechanism (tokens, re-verification). (`website/src/app/page.tsx:34-44`, `:152`)
- **Effort:** S

**[SEV-6] The money shot does not land: before/after is a gray-to-darker-gray text swap**
- **Observed:** Clicking "Fix with my tokens" changes one paragraph's color from `#999da4` to `#3d4450` over a 0.35s `transition: color`. The readout correctly jumps 2.4:1 → 8.6:1. But the visual delta on the canvas is subtle enough that a casual visitor reads it as "text got slightly darker"; the verdict chip is doing all the persuasive work, and the chip is text.
- **Why it costs:** `docs/website.md §4` explicitly names the before/after as the *money shot*. The one interaction on the page that has to sell "we actually fix it" currently under-delivers, which is a large part of why the CTA feels weak next to it.
- **Fix:** Widen the demonstrated delta and choreograph it (see §4 Motion, moment 1): animate the ratio number counting up, cross-fade the verdict chip fail → pass, and consider showing the token name that was chosen. Optionally demonstrate a second, more visible failure type (a target-size fix has a geometric delta the eye can actually see). (`website/src/components/FixDemo.tsx:13-15`, `:42-54`; `website/src/components/FixDemo.module.css:29-32`)
- **Effort:** M

**[SEV-7] No dark-mode handling at all**
- **Observed:** `grep -r "prefers-color-scheme\|color-scheme" src/` returns nothing. With `prefers-color-scheme: dark` emulated, the page renders identically light (`bodyBg: rgb(252,252,252)`, `bodyColor: rgb(25,28,32)`), `color-scheme` computes to `normal`, and there is no `<meta name="color-scheme">`.
- **Why it costs:** This is a scope call, not a WCAG violation, and the light AAA palette is a real brand argument — so I would not call it Critical. But the audience is specifically low-vision and accessibility-conscious users, a population that disproportionately includes people for whom a full-brightness white page is physically uncomfortable, and the product's own pitch is "respect the user's own system." Shipping a page that ignores the user's stated OS preference undercuts that argument at zero technical difficulty.
- **Fix:** At minimum, add `color-scheme: light` so UA widgets and scrollbars are consistent and there is no surprise. Better: add a `@media (prefers-color-scheme: dark)` block re-mapping the six surface and text tokens, and extend `contrast.test.ts` to audit the dark pairs to the same AAA bar. The token architecture already supports this — every color is a variable in one `:root` block. (`website/src/app/globals.css:8-43`)
- **Effort:** M

**[SEV-8] The privacy page is honest but legally thin for a page that leads with the EAA**
- **Observed:** `/privacy` covers the plugin, the optional AI call, and the waitlist email clearly and honestly. It does not state the controlling legal entity, an address, a legal basis for processing, a retention period, or any data-subject rights beyond "ask us to delete it."
- **Why it costs:** The homepage's opening argument is "The European Accessibility Act has applied since June 2025" (`page.tsx:64-68`). A compliance-positioned product whose own privacy page would not satisfy a GDPR reviewer is a soft target, especially for enterprise or EU buyers who will read that page precisely because of the headline.
- **Fix:** Add controller identity and address, legal basis (legitimate interest / consent for the waitlist), retention period, and the standard access/erasure/portability line. (`website/src/app/privacy/page.tsx:41-54`)
- **Effort:** S

### Medium — craft

**[SEV-9] One section breaks the page's left alignment axis by 160px**
- **Observed:** Eight of nine `<h2>` elements start at x=209. "Questions, answered" starts at x=369, because `.faqContainer` sets `max-width: 800px` on a container that is `margin-inline: auto`, so the FAQ centres itself while every other section is left-aligned in the 1120px container. The same break repeats on `/privacy` (h1 at x=416, footer wordmark at x=216) — visible in the full-page screenshot.
- **Why it costs:** It is the most visible single alignment defect on a site whose product is alignment-adjacent correctness.
- **Fix:** Cap the FAQ's *content* rather than its container — keep the container at `--maxw` and apply `max-width: 800px` to `.faqList` — so the heading stays on the shared axis. (`website/src/app/page.module.css:348-350`; `website/src/app/privacy/privacy.module.css:1-4`)
- **Effort:** S

**[SEV-10] Nine different content measures with no shared scale**
- **Observed:** Measured content widths at 1440: hero copy 501, final-CTA paragraph 573, steps 640, problem body 689, verdict list 760, FAQ 800, bento 1008, tiers 1008, container 1120. These come from a mix of `px` maxima (640, 760, 800) and `ch` maxima (44ch, 52ch, 56ch, 58ch, 62ch, 64ch) chosen ad hoc.
- **Why it costs:** The right edge of the content ragged-edges differently in every section, which is what produces the "page sags in the middle" feeling. Section rhythm is otherwise excellent — vertical padding is a uniform 128/128 on all nine non-hero sections.
- **Fix:** Define two or three named measures as tokens (e.g. `--measure-narrow`, `--measure-body`, `--measure-wide`) alongside `--maxw` and use only those. (`website/src/app/globals.css:38-43`; `website/src/app/page.module.css` throughout)
- **Effort:** M

**[SEV-11] `ch`-based measure caps overshoot by ~1.5x in Atkinson Hyperlegible; two cells run to 131 characters per line**
- **Observed:** In Atkinson at 17px the `0` glyph (which defines `1ch`) measures **11.02px** while the average character in the actual copy measures **7.25px** — a ratio of **1.52**. So `max-width: 64ch` on FAQ answers computes to 705px and renders about **95** characters per line, not 64. Canvas-measured characters per line: FAQ answers 95, problem body 83, step bodies 79, and the two wide bento cells (SC 1.4.3, SC 1.1.1) **131** at 1008px wide.
- **Why it costs:** 45–75 characters is the readability range this product literally sells. A legibility brand rendering 131-character lines is a self-inflicted wound, and it is invisible to the author because the CSS *says* 64ch.
- **Fix:** Either divide every `ch` value by ~1.5, or switch measure caps to `px`/`rem` derived from the two-or-three-token scale in SEV-10. Give `.cellWide` an inner content cap so the wide bento cells do not inherit the full 1008px. (`website/src/app/page.module.css:225-227`, `:249-253`, `:373-377`; `website/src/app/globals.css`)
- **Effort:** S

**[SEV-12] Nav links are underlined by an accidental cascade leak; the page has three link treatments, one unintended**
- **Observed:** `globals.css:77-82` styles `p a, li a` as accent + underline for body copy. The nav items are `<a>` inside `<li>`, so they inherit `text-decoration: underline` while `.link`'s higher-specificity `color` keeps them gray. Computed: nav link = `rgb(75,81,88)` + `underline`; footer column link = `rgb(75,81,88)` + `none`; footer body link = `rgb(30,64,175)` + `underline`. The footer explicitly opts out at `SiteFooter.module.css:44-47` — proving the leak was noticed there and missed in the nav.
- **Why it costs:** Gray underlined nav items read as unintentional, and having three distinct link treatments on one page (one of them accidental) is exactly the inconsistency the product exists to catch.
- **Fix:** Scope the global rule to body content (`main p a`, or a `.prose` class), or add `text-decoration: none` to `.link`. (`website/src/app/globals.css:77-82`; `website/src/components/SiteNav.module.css:31-39`)
- **Effort:** S

**[SEV-13] Verdict colors leak into decoration, against the documented brand rule**
- **Observed:** `docs/website.md §7` states verdict colors are semantic-state-only. Two uses are decorative: the pricing feature bullets are CSS-drawn checkmarks in `--pass` (`page.module.css:313-323`) — they are feature list markers, not a pass verdict — and the beta banner renders marketing copy in `--pass` on `--pass-tint` (`page.module.css:257-265`). The `WaitlistForm` success state in `--pass` is a legitimate state and is fine.
- **Why it costs:** It is a self-authored rule broken in the product's own shop window, and it dilutes the signal: by the time a reader reaches the FixDemo, green has already been established as "nice thing" rather than "passes."
- **Fix:** Neutral or accent checkmarks in pricing; neutral or accent-tint treatment for the beta banner. (`website/src/app/page.module.css:257-265`, `:313-323`)
- **Effort:** S

**[SEV-14] Single breakpoint at 860px leaves 861–1120px as the weakest zone**
- **Observed:** `page.module.css:404-425` is the only media query. At 900px the three pricing tiers are cramped: "$15 per seat, per / month" wraps mid-phrase with "month" orphaned onto its own line, and Free's bullets wrap to three lines each (screenshot). Card heights measure 304 / 343 / 277 at desktop, so the bottoms are ragged by 66px. At 768px the bento collapses straight to one column (each `.cell` spans both of two columns), wasting the available width.
- **Why it costs:** Pricing is where a serious evaluator lingers; it is the section that most needs to look composed.
- **Fix:** Add an intermediate breakpoint around 1024px that drops tiers to 2-up (or stacks them) and lets the bento go 2-up at tablet, and put `.tierPrice span` on its own line so the per-unit label cannot break mid-phrase. (`website/src/app/page.module.css:289-299`, `:404-425`)
- **Effort:** S

**[SEV-15] The Open Graph card is off-brand in both typeface and weight**
- **Observed:** `opengraph-image.tsx:20` sets `fontFamily: "sans-serif"`, so the card renders in the OG renderer's bundled fallback, not Atkinson Hyperlegible — and `fontWeight: 700` has no effect because the fallback ships one weight, so "Legibly" and the headline both render at regular. Rendered screenshot confirms: a generic geometric sans at regular weight, next to a site whose wordmark is bold Atkinson. Roughly 40% of the card is empty and it carries no product visual.
- **Why it costs:** For a brand whose central argument is "we chose the typeface designed for low-vision readers," the most-shared brand asset is the one place that does not use it. Every Slack, X and LinkedIn share is off-brand.
- **Fix:** Load the Atkinson Hyperlegible woff via the `fonts` option of `ImageResponse`, and consider putting the before/after specimen on the card. (`website/src/app/opengraph-image.tsx:8-56`)
- **Effort:** S

**[SEV-16] Form error state is text-only and does not move focus**
- **Observed:** On a rejected submission the error text appears with `role="alert"` and `aria-describedby` is wired correctly — good. But `aria-invalid` is never set, the input's border stays `--border` (`rgb(227,228,225)`, unchanged), focus stays on `<body>` (`document.activeElement.tagName === "BODY"`), and because the row wraps (SEV-4) the error text renders *below* the submit button rather than adjacent to the field it describes.
- **Why it costs:** SC 3.3.1 is technically met, but a sighted keyboard user has to hunt back up to the field, and there is no visual binding between the message and the input.
- **Fix:** Set `aria-invalid` on error, tint the input border to `--fail`, and `focus()` the input when the error state is set. (`website/src/components/WaitlistForm.tsx:28-38`, `:55-64`, `:82-86`; `website/src/components/WaitlistForm.module.css:18-36`, `:74-77`)
- **Effort:** S

**[SEV-17] FAQ uses the browser's default disclosure marker**
- **Observed:** `#faq summary` computes `list-style-type: disclosure-closed` — the unstyled UA triangle, rendered at the browser's own size and color. There is no custom marker, no rotation on open, and no hover affordance beyond a color change.
- **Why it costs:** It is the one control on the page that looks like nobody designed it, and it appears five times in a row.
- **Fix:** Style `summary::marker` (or `::-webkit-details-marker`) with a custom chevron in `--accent` that rotates on `[open]`, and keep the rotation behind the existing reduced-motion block. (`website/src/app/page.module.css:357-377`)
- **Effort:** S

**[SEV-18] Anchor navigation lands headings against the sticky nav below ~800px**
- **Observed:** No `scroll-padding-top` on `html` and no `scroll-margin-top` on any anchor target; the sticky header is 65px. At 1440 the residual gap after an anchor jump is a comfortable 63px (section padding 128 minus 65), but at 768px it drops to **12px** — the heading sits almost flush against the nav.
- **Why it costs:** Nav links are visible down to 720px, so this is reachable on tablets and small laptops; it reads as a layout bug.
- **Fix:** `html { scroll-padding-top: calc(65px + 1rem); }`. One line. (`website/src/app/globals.css:56-59`)
- **Effort:** S

### Low — polish

**[SEV-19] Success state drops focus to `<body>`.** Verified: with focus on the submit button, a successful submission unmounts the whole form and `document.activeElement` becomes `BODY`. `role="status"` handles the announcement, but a keyboard user loses their place. Render the confirmation *in place of the row* while keeping a focusable element, or move focus to the confirmation with `tabindex="-1"`. (`website/src/components/WaitlistForm.tsx:41-47`) — **S**

**[SEV-20] Two independent form instances never sync.** Signing up in the hero leaves the final-CTA form still asking for the same email (verified: after the hero form entered its success state, a second `<form>` remained in the DOM). Lift the "already joined" state to a shared context or `sessionStorage`. (`website/src/app/page.tsx:46`, `:387`) — **S**

**[SEV-21] `.reveal { opacity: 0 }` has no fallback if the animation never runs.** The only thing restoring opacity is the `reveal-up` keyframe. Reduced-motion is correctly handled (`globals.css:156-158` sets `opacity: 1`), but any context where animations do not run — most obviously print — leaves the hero blank. Add an `@media print { .reveal { opacity: 1 } }` guard. Not verified in print emulation. (`website/src/app/globals.css:127-159`) — **S**

**[SEV-22] `contrast.test.ts` does not cover a pair used for body text in three places.** `--text-muted` on `--accent-tint` is used in `.compareUs p`, `.finalCta p` and `.cellTinted p`, and is absent from both `bodyPairs` and `labelPairs`. It measures **7.17:1**, so it passes AAA — by 0.17. A coverage gap on a claim the footer makes publicly. Add it to `bodyPairs`. (`website/src/lib/contrast.test.ts:29-38`) — **S**

**[SEV-23] Two body-sized strings sit below the AAA floor the brand claims for body text.** The beta banner (17px/700, full sentences) renders `--pass` on `--pass-tint` at **6.65:1**, and the FixDemo verdict line (17px/700) renders `--fail` on `--fail-tint` at **5.95:1**. Both are classified as `labelPairs` (AA) in the test suite, but both are sentence-length body text in practice. Either darken the two foregrounds to clear 7:1 or reclassify the usage. (`website/src/app/page.module.css:257-265`; `website/src/components/FixDemo.module.css:39-57`; `website/src/lib/contrast.test.ts:40-49`) — **S**

**[SEV-24] Skip-link target is not focusable.** `#main-content` is a plain `<div>` with no `tabindex="-1"`. Chrome sets the sequential focus navigation starting point so it works in practice, but it is a fragile pattern with uneven support. Add `tabindex="-1"`. (`website/src/app/layout.tsx:55-59`) — **S**

**[SEV-25] Footer carries no copyright or legal entity line.** No `© 2026 Glinc`, no company identity — a small trust gap on a page that already links to a privacy policy. (`website/src/components/SiteFooter.tsx:8-57`) — **S**

**[SEV-26] The only icon on the site is a CSS border-rotation checkmark.** `.tier li::before` draws the tick with two borders and a `rotate(-45deg)`. It renders acceptably, but it means the pricing list has no real icon system and cannot be extended (there is no "not included" state, for instance). (`website/src/app/page.module.css:313-323`) — **S**

---

## 4. Motion recommendation

**Does this site need motion? Mostly no — and that is the right answer for this brand.** A page arguing for calm, readable, non-hostile interfaces should not hijack scroll, pin sections, or parallax anything. The current near-zero state (five `reveal-up` fades in the hero at 0/60/120/180/240ms, plus ten hover/active transitions) is defensible and I would not increase the overall motion budget. But there is exactly **one** place where the absence of motion is actively costing money, and one where a small amount would help comprehension.

**Do not install GSAP.** ScrollTrigger earns its weight when you need pinning, scrubbing, or `containerAnimation` for fake horizontal scroll. This site has none of those and should not acquire them. Even `ScrollTrigger.batch()` — which the GSAP docs themselves position as an alternative to IntersectionObserver — buys nothing over a plain IntersectionObserver for one-shot fades, while adding a runtime dependency, a `registerPlugin` call, and React cleanup discipline (`useGSAP()` or `gsap.context().revert()`) to a codebase that currently ships **zero** animation JavaScript. The cost is not just bundle size; it is the ongoing obligation to call `ScrollTrigger.refresh()` after font and layout changes on a page whose whole selling point is that it does not break.

Everything proposed below is a discrete state change (CSS transition) or a one-shot entry (IntersectionObserver plus the existing keyframe). All of it is already covered by the global reduced-motion block at `globals.css:145-159`, which zeroes `animation-duration` and `transition-duration` with `!important` — note that this guard automatically catches anything added later, so it does not need per-component work.

| # | Moment | Why it carries meaning | Call | Cost |
|---|--------|------------------------|------|------|
| **1** | **`FixDemo` before → after** (`FixDemo.tsx:29-54`) | This is the product's entire argument compressed into one click, and right now it is a 0.35s color fade that reads as "text got slightly darker." Choreograph it as one ~500ms sequence: the ratio number counts 2.4 → 8.6, the verdict chip cross-fades fail → pass, the body text eases to the new token, and the chosen token name fades in. The motion is doing *storytelling* — it makes the causal chain (fix → re-verify → pass) legible instead of instantaneous. | **CSS only.** Transitions on `color`, `background-color` and `opacity`, plus a registered `@property` custom property to tween the ratio number, or a short `requestAnimationFrame` counter in the existing `useState` component. Single element, no scroll coupling, no timeline nesting — GSAP would be pure overhead. | **S.** No new dependency. |
| **2** | **Section entry for the three steps** (`page.tsx:89-105`) | The `Scan → Fix → Verify` rail is a sequence, and revealing it in order reinforces that it *is* a sequence rather than three parallel features. This is *hierarchy plus storytelling*, the one place on the page where order carries information. | **CSS + IntersectionObserver.** Reuse the existing `.reveal` keyframe and `--d` delay variable; add `once: true` so it never re-fires. Or `animation-timeline: view()` where supported with IO as the fallback. Not GSAP. | **S.** ~15 lines. |
| **3** | **Verdict chip width change in `FixDemo`** | Considered and **rejected.** The chip text changes length between states ("2.4:1 Fails AA (needs 4.5:1)" → "8.6:1 Passes AA"), which normally warrants a layout transition — but I verified there is no layout shift today: the detail line stays on one line in both states and the card height does not change. Animating it would be decoration. | **None.** Leave it. | — |
| **4** | **Bento / pricing card entry** | Considered and **rejected.** Staggering ten cards into view is the reflexive move and it communicates nothing — the cards are a set, not a sequence. Adding it here would make moment 2 stop reading as meaningful. | **None.** Leave it static. | — |

**Net recommendation:** implement moments 1 and 2 only, in CSS, with no new dependency. If moment 1 alone were the only change made from this entire report's motion section, that would still be the correct outcome — restrained motion, applied to the one thing that has to persuade.

---

## 5. Taste notes (non-blocking, subjective)

These are opinions, not findings. Take or leave them.

- The step rail — blue vertical line, dots at each node — is the most confidently designed element on the page, and it appears exactly once. The rest of the page does not have that much conviction anywhere else, which is why it stands out.
- "Three verdicts, no guessing" is the most intellectually differentiated idea on the site (nobody else admits what they did not check) and it gets a plain definition list. I would give it the most visual weight of any section, not the least.
- The tinted bento cells pick SC 1.4.3 and SC 2.5.8 seemingly at random. If tint means "most important," it should track importance; if it means "rhythm," it currently reads as arbitrary.
- I would cut the Problem section or fold it into the hero. It occupies 476px to deliver one headline and one paragraph, and "Unreadable design is now a legal risk" is strong enough to live above the fold.
- The wordmark's L, at 22px, reads as a generic corner bracket rather than a letter. It works, but it is not adding anything the bold Atkinson "Legibly" is not already doing.
- The copy voice is genuinely good and I would resist the urge to make it more "marketing." Lines like "silence never reads as a pass" are the reason this page feels trustworthy.

---

## 6. What is already good

Being specific rather than generous:

- **Vertical rhythm is genuinely uniform.** Measured: every one of the nine non-hero sections is exactly 128px top and bottom at 1440px, driven by a single `--section-y` clamp. Very few hand-built sites hold this.
- **The palette audit holds up under a rendered sweep.** I checked 39 distinct foreground/background pairs as actually composited in the DOM, not as tokens. Every pair except the deliberate demo specimen passes AA. Body pairs measure 16.66 (text on bg), 7.82 (muted on bg), 7.21 (muted on tint), 8.50 (accent on bg), 7.79 (accent on accent-tint) — all above the 7:1 the brand publicly claims.
- **The translucent sticky nav does not break its own contrast.** I checked the worst case (dark content scrolling under a 92%-opacity backdrop): the muted nav text still clears ~7:1. This was worth verifying and it is fine.
- **Focus is properly handled.** 3px ring at 3px offset in `--accent`, measuring 8.50:1 against the page background and 7.84:1 against the tint bands. Because of the offset it sits on the surface rather than on the button, so it stays visible on accent-colored buttons too.
- **The tab sweep is clean.** 26 stops, DOM order, no traps, no surprises, and nothing obscured by the sticky header — I instrumented every `focusin` and measured header overlap on each. SC 2.4.11 (Focus Not Obscured) did not reproduce.
- **Target size passes.** I ran the product's own SC 2.5.8 check against the live page: 28 targets, 15 under 24x24, and **all 15 satisfy the spacing exception** (nearest-neighbour centre distances 37.7px to 275.5px, all ≥ 24). The nav and footer links are small but correctly spaced.
- **The demo is not faked.** `FixDemo` imports the same `contrastRatio` the site's own test suite audits the brand palette with. The code comment claims this and the claim is true.
- **The copy is unusually honest for a marketing page.** "Not checked" as a first-class verdict, "Zero false positives is a design constraint, not a marketing line," and a privacy page that says "the only optional call is alt-text to api.anthropic.com with your key" instead of the easier lie. This is a real competitive asset.
- **Reduced motion is handled globally, not per-component**, and the guard uses `!important` on both duration properties — so it will keep working as motion is added.
- **The bento has exact cell count and real rhythm.** Five items, five cells, arranged wide / three-up / wide. No filler tile, no empty cell.
- **Form hygiene is right.** Real `<label>` (not placeholder-as-label), `autoComplete="email"`, `type="email"`, a hidden honeypot, server-side validation independent of the client, and a designed loading label ("Joining…") rather than a spinner.
- **Console is clean.** Only the React DevTools notice and the HMR connection on a fresh load.
- **Heading order is correct** on both pages: single h1, no skipped levels, 28 headings in a sane outline.

---

## 7. Appendix

### What I tested

| Area | Coverage |
|------|----------|
| Viewports | 1440x900, 900x1000, 768x1024, 375x812, 335x800 (=320 CSS px), 320x800 (=305 CSS px) |
| Pages | `/`, `/privacy`, `/opengraph-image` |
| Color scheme | `prefers-color-scheme: dark` emulated and computed styles compared against light |
| Screenshots | Full-page desktop and mobile; per-section captures of hero, nav, features, pricing at three widths; OG card; hero in the post-fix state |
| Contrast | Rendered sweep of 39 composited fg/bg pairs with size and weight classification against AA and AAA; plus a token-level sweep of pairs missing from `contrast.test.ts` |
| Target size (SC 2.5.8) | 28 interactive targets, bounding boxes plus nearest-neighbour centre distances for the spacing exception |
| Keyboard | 26-stop tab sweep with per-stop header-overlap instrumentation; skip link; focus ring computed values |
| Reflow (SC 1.4.10) | `scrollWidth` vs `clientWidth` at 320 and 305 CSS px, with per-element overflow attribution |
| Anchors | `scroll-padding-top` / `scroll-margin-top` audit plus measured post-jump gap at 1440 and 768 |
| `FixDemo` | Click through both states; verified ratio math, `aria-live` readout content, button label swap, and absence of layout shift |
| `WaitlistForm` | Empty submit (native validation), server-rejected submit (real 400 path, no email sent), success state (via a stubbed `fetch`, no network call), focus after each, `aria-*` wiring, computed error styling |
| Motion inventory | Every element with a non-`none` `animation-name` and every element with a non-zero `transition-duration` |
| Typography | Canvas-measured characters-per-line for six representative blocks; `ch` glyph width vs average character width in Atkinson |

### Console output

Clean on every page load. Full log across the session:

```
[INFO] Download the React DevTools for a better development experience...
[LOG]  [HMR] connected
[ERROR] Failed to load resource: the server responded with a status of 400 (Bad Request) @ /api/waitlist
```

The single error is from my own deliberate invalid-email test, not a site defect.

### What I could NOT verify

- **Live waitlist delivery.** I could not read the local env files (permission denied), and I did not submit a real address, so the end-to-end Resend path is unverified. The success UI was exercised with a stubbed `fetch`; the 400 validation path was exercised against the real route. SEV-1 is based on reading `route.ts`, not on observing a failed delivery.
- **Screen-reader announcement behaviour.** No AT was available. `role="status"`, `role="alert"` and `aria-live="polite"` are correctly authored, but I verified the markup, not what a user hears.
- **Real devices and non-Chromium engines.** Everything was Chromium. Safari's `backdrop-filter`, `text-wrap: balance` and `@property` behaviour differ and were not checked.
- **Print rendering** of `.reveal { opacity: 0 }` (SEV-21) — reasoned from the CSS, not observed.
- **Core Web Vitals.** The dev server runs Turbopack with HMR; LCP/INP/CLS measured against it would be meaningless. Run Lighthouse against a production build before launch.
- **Font loading behaviour** on a throttled connection. `next/font` self-hosts Atkinson, and no FOUT was observed, but it was not measured under throttling.
- **Unrelated observation:** `plugin/src/main/index.ts` showed as modified in `git status` partway through this session. I did not touch it — flagging it in case another session or process is writing to the repo.

### Artifacts

Screenshots and measurement output are in the session scratchpad at
`/private/tmp/claude-501/-Users-giorgi-Desktop-Legibly/4fc67b86-c1b5-4966-9638-e679256a5814/scratchpad/`
(`desktop-full.png`, `mobile-full.png`, `privacy.png`, `og.png`, `nav320.png`, `demo-fixed.png`, per-section captures). They are outside the repo and will not be committed.
