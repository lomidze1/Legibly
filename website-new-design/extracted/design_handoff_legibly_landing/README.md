# Handoff: Legibly — product landing page

## Overview
A one-page marketing site for **Legibly**, a Figma plugin that scans a design
selection or page against WCAG 2.2 AA, then repairs every provable violation in
one click using the file's own design tokens. The page's job is to convert
designers into private-beta signups. Its argument is: *checkers tell you,
Legibly fixes it* — and, crucially, the page itself passes all nine checks the
plugin performs. That self-consistency is a deliberate product claim and must
survive implementation.

## About the design files
The files in this bundle are **design references authored in HTML** — a
prototype of the intended look and behaviour, not production code to copy.
Recreate the design in the target codebase's existing environment (React, Vue,
Astro, Next, SwiftUI, whatever is already there) using its established
component and styling patterns. If no environment exists yet, pick the most
appropriate framework for a static marketing page and implement it there.

Two mechanical notes about the prototype format:

- `Legibly Landing.dc.html` is written for a component runtime (`support.js`).
  Markup lives between `<x-dc>` tags, `{{ name }}` are data holes, `<sc-if>` is
  conditional rendering, and `<helmet>` holds head content. Read it as markup;
  do not port the runtime.
- Every style in the prototype is an inline `style` attribute. That is a
  constraint of the prototyping tool, **not** a design instruction. In the real
  codebase use whatever the project uses — CSS modules, Tailwind, styled
  components. Values are the deliverable; inline style is not.

## Fidelity
**High fidelity.** Colors, type, spacing, copy and states are final. Recreate
pixel-accurately. All values below are exact.

The one incomplete area: **responsive layout was not designed.** The prototype
targets a 1180px content column on desktop. Every multi-column grid needs a
mobile treatment — see *Responsive behaviour* below for the intended collapse.

## Design system
The page is built on **Classical**, an editorial design system: Cormorant
Garamond headings over Lora body, a soft near-white ground, a single gold
accent applied as *stroke, never fill*, and hairline rules carrying the
structure. `_ds/classical-.../styles.css` in this bundle is the token source of
truth and `readme.md` beside it is the system's own guide — read it before
implementing. If the target codebase already has a design system, map the
tokens below onto it rather than importing this stylesheet wholesale.

House rules that must not be violated:

- Buttons are **outlined**, never solid-filled with accent.
- Cards are **bordered and unfilled**. No large color fields.
- No bold. Headings cap at semibold (600); the larger the type, the lighter it
  sets — display sizes use the 400 cut.
- Body copy is justified with hyphenation at a comfortable measure.
- Photographs (none on this page yet) go through the `.plate` mat treatment.
- Elevation is a whisper. No heavy shadows.

## Design tokens

### Color
| Token | Hex | Used for |
| --- | --- | --- |
| `--color-bg` | `#f3f2f2` | Page ground, sticky nav background |
| `--color-surface` | `#eae9e9` | The failing-sample card inside the hero panel |
| `--color-text` | `#201f1d` | Headings and primary text — 14.7:1 on ground |
| `--color-accent` | `#b68235` | Rules, borders, focus ring, large numerals only |
| `--color-accent-600` | `#a06f24` | Link hover |
| `--color-accent-700` | `#7d5411` | **All accent-colored text** — 6.0:1 on ground |
| `--color-divider` | `#201f1d` @ 16% | Every hairline rule and card border |
| `--color-neutral-100` | `#f8f4f4` | Hero panel background |
| `--color-neutral-500` | `#9b9797` | The intentionally-failing sample text (2.4:1) |
| `--color-neutral-700` | `#605d5d` | Small/secondary text — 5.8:1 on ground |
| `--color-neutral-800` | `#444141` | Body paragraphs — 8.9:1 on ground |

**Contrast rule, non-negotiable.** `--color-accent` (#b68235) is 3.0:1 on the
ground: legal for borders, icons and text at 24px+, illegal for anything
smaller. Small accent text uses `--color-accent-700`. `--color-neutral-600`
(#7d7979) is 3.85:1 and is **banned for text anywhere on this page** — it was
removed during design review. Use `neutral-700`.

### Type
- Heading face: `"Cormorant Garamond", system-ui, sans-serif` — weights 300/400/500/600.
- Body face: `"Lora", system-ui, sans-serif` — 400/500/600 plus 400 italic.
- Loaded from Google Fonts with `preconnect`; self-host in production.

| Role | Family / weight | Size | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Hero h1 | Cormorant 400 | `clamp(46px, 5.6vw, 82px)` | 1.06 | -0.012em |
| Section h2 | Cormorant 400 | `clamp(30px, 3.2vw, 42px)` | 1.12 | -0.008em |
| Closing h2 | Cormorant 400 | `clamp(34px, 4vw, 54px)` | 1.08 | — |
| Card / list h3 | Cormorant 500 | 21–26px | 26–30px | — |
| FAQ summary | Cormorant 500 | 21px | — | — |
| Price figure | Cormorant 400 | 46px | 1 | tabular |
| Lead paragraph | Lora 400 | 17px | 28px | — |
| Body paragraph | Lora 400 | 15.5–16.5px | 26–28px | — |
| Small print | Lora 400 | 13–14px | 22–25px | — |
| Kicker / eyebrow | Lora 400 uppercase | 11–12.5px | — | 0.08–0.1em |

All headings carry `margin-left: -0.042em` for optical flush-left alignment —
Cormorant's side bearings otherwise leave the column edge looking ragged. Keep
it. Numerals in kickers, list indices, prices and the hero ratio set tabular
(`font-feature-settings: 'tnum' 1`); running prose does not.

### Spacing, radius, elevation
- Scale (density 1.15×): 4.6 / 9.2 / 13.8 / 18.4 / 27.6 / 36.8px. Section
  padding is 76px vertical; the hero is 84px top / 70px bottom; the closing
  section 76px top / 84px bottom.
- Content column: `max-width: 1180px`, 24px side gutters, centered.
- Radius: sm 2px, md 4px, lg 7px. Nothing on this page is more rounded than 4px.
- Shadow: only `--shadow-sm` (`0 1px 2px rgba(45,43,43,.14)`), only on the hero
  panel.

## Page structure
Sections are separated by a full-width 1px `--color-divider` rule inside the
content column. In order:

### 1. Nav (sticky)
Flex row, 14px vertical padding, bottom hairline, `z-index: 20`, background
`--color-bg` so content scrolls under it. 27.6px gap. Brand "Legibly" in
Cormorant 500 / 24px, `margin-right: auto`. Then four 14px anchor links in
`--color-neutral-700` (How it works, What it checks, Pricing, FAQ) hovering to
`--color-accent-700`, then the outlined CTA. Horizontal padding is
`max(24px, calc((100% - 1180px) / 2 + 24px))` so the bar is full-bleed while
its contents align to the content column.

### 2. Hero
Two columns, `6.5fr / 5fr`, 56px gap, `align-items: start`.

Left: uppercase kicker "Coming soon to Figma Community" in `--color-accent-700`;
h1 in two `display: block` lines — "Checkers tell you." / "Legibly fixes it.";
a 17px lead paragraph at 52ch; the signup form; and a 13px note "Private beta.
No newsletter, no pricing surprises."

Right: a **specimen** of the plugin panel. 1px divider border, 4px radius,
`--color-neutral-100` background, `--shadow-sm`. Header strip: 6px accent-outlined
circle plus uppercase "Legibly · selection audit" over a hairline. Body, 20px
flow gap:
1. A caption "Sample under audit — intentionally failing" (11px uppercase,
   neutral-700), above a bordered card on `--color-surface` containing "Order
   #2381" and a paragraph in `--color-neutral-500`. **This card measures exactly
   2.4:1 and is marked `aria-hidden="true"`.** It is a deliberate failing
   specimen — the thing the plugin catches. It must be excluded from the page's
   own accessibility surface, and if the palette ever changes, its ratio must be
   recomputed to keep matching the "2.4:1" printed beside it.
2. The verdict: "2.4:1" in Cormorant 400 / 34px / `--color-accent` (legal at
   this size), with "Fails AA · needs 4.5:1" beside it and an explanatory line
   under.
3. Hairline, then a footer row: "1 violation · 0 needs review" and a
   "Fix with my tokens" button.

### 3. Stakes
Two columns `5fr / 6fr`, 72px gap. h2 "Unreadable design is now a legal risk."
against one justified paragraph (EAA since June 2025, rising ADA suits,
contrast decided in the design file).

### 4. How it works
Kicker + h2 "Scan. Fix. Verify." then a 3-column `<ol>`, 40px gap. Each item:
1px **accent** top border, 20px top padding, tabular index (01/02/03) in
accent-700, Cormorant 500 / 25px h3, justified 15.5px body.

### 5. Three verdicts
Two columns `4fr / 7fr`. Left: h2 "Three verdicts, no guessing" plus a 34ch
supporting line. Right: a `.table` with three rows — Violation / Needs review /
Not checked — row label as `<th scope="row">` in Cormorant 500 / 20px at 34%
width, description justified. Hairline top on each row, plus a bottom hairline
on the last.

### 6. Comparison
h2 "Flagging is the easy half", then two equal cards, 28px gap. Left ("A typical
checker"): divider border, transparent. Right ("Legibly"): **accent** border and
a 6% accent tint (`color-mix(in srgb, var(--color-accent) 6%, transparent)`) —
this is the single largest tint on the page and the only place the accent
appears as a field. Both 4px radius, 28–30px padding.

### 7. Nine checks  (`#checks`)
Kicker "Coverage", h2 "Nine checks, one honest report", a 54ch lead, then a
2-column `<ol>`, 72px column gap. Each item is a `grid-template-columns: auto 1fr`
row, 20px gap, 18px vertical padding, hairline top:

| # | Name | SC | One-line description |
| --- | --- | --- | --- |
| 01 | Text contrast | 1.4.3 | Measured against the background the text actually sits on — composited through fill stacks, opacity and gradients. |
| 02 | Line spacing | 1.4.12 | Line height under 1.5× the type size. |
| 03 | Target size | 2.5.8 · 2.5.5 | Controls under 24×24 — or 44 in mobile mode — spacing exception included. |
| 04 | Icon and border contrast | 1.4.11 | The parts you have to see in order to act. |
| 05 | Image alt text | 1.1.1 | Presence check, optional drafts under your own API key. |
| 06 | Color-only links | 1.4.1 | Links differing by hue alone, no underline. |
| 07 | Clipped text | 1.4.10 | Copy that overflows its frame. |
| 08 | Field labels | 2.4.6 | Inputs with only a placeholder. |
| 09 | Focus states | 2.4.7 | A hover state with no matching keyboard focus state. |

Item 01's top border is **accent**, not divider — it is the flagship check.
Item 09 also carries a bottom hairline. A tenth full-width row follows, indexed
"+" instead of a numeral: dark mode, framed as checks 01 and 04 re-run on every
theme rather than as a separate check. Then a 14px roadmap line
(design-system governance, brand QA, MCP server for Cursor and Claude Code).

### 8. Pricing  (`#pricing`)
Header row: h2 "Pricing" with, right-aligned, a beta note in `--color-accent-700`
carrying a 1px accent **left border** and 16px left padding. Then two equal
cards, 28px gap, 30px padding, flex column with 18px gap: plan name (Cormorant
500 / 22px), price (Cormorant 400 / 46px, tabular), a uppercase cadence line,
a hairline, then a feature `<ul>` at 12px gap.

- Free — $0 / Forever — scans, three verdicts, pixel-true deep check.
- Pro — $12 / Per month — **accent border, price in `--color-accent`** — batch
  auto-fix with single undo, CSV export, strict token mode.

Exactly one card shows a "Recommended" mark (uppercase, accent top border);
which one is data-driven — see *State* below.

### 9. Built to be trusted  (optional section)
h2 plus three columns, 56px gap, each with an accent top rule: Private by design
(local execution; only optional alt-text drafting leaves the machine, under the
user's own key) / One source of truth (the function that flags is the function
that verifies) / Proof, not promises (228 unit tests, a 686-case composited
sweep, a committed fix-never-fails check per release). Toggleable — see *State*.

### 10. FAQ  (`#faq`)
Two columns `4fr / 7fr`. Right column is five native `<details>` elements.
`<summary>` is a flex row, 18px padding, hairline top, Cormorant 500 / 21px,
with a "▾" chevron in `--color-accent` that rotates 180° in 160ms ease when open
(`details[open] summary .chev`). Default marker removed
(`list-style: none` + `::-webkit-details-marker { display: none }`). Answers are
justified, 62ch. Questions: does it really fix or just report / will it invent
colors outside my system / gradients and image backgrounds / is my file private
/ which criteria do you not check.

### 11. Closing  (`#early`)
h2 "Be first in line", a 54ch paragraph, the signup form, and a conditional
thank-you line in `--color-accent-700`.

### 12. Footer
Grid `6fr / 3fr / 3fr`, 56px gap. Brand plus a 46ch line; Product and Company
link columns under 12px uppercase headings; then a full-width legal line above a
hairline, including the Figma trademark disclaimer.

## Components

### Button (`.btn.btn-primary`)
1px `--color-accent` border on transparent, 4px radius, `min-height: 40px`
(exceeds the 24px target minimum with room to spare), label in
**`--color-accent-700`** at 13.5–14px. Never filled. Hover tints from the accent
ramp; pressed goes one step further; focus is the global ring.

> The label color is an explicit override of the system default, which paints
> the label `--color-accent` (3.0:1 — failing at these sizes). Keep the override.

### Input (`.input`)
1px divider border, 4px radius, `min-height: 40px`, transparent, body face.
Placeholder `you@studio.com`.

### Signup form (appears twice: hero and closing)
A **visible** `<label>` above the field — 12.5px uppercase, 0.08em tracking,
`--color-neutral-700`, 8px bottom margin — then a flex row (13.8px gap) holding
the input (`flex: 1`) and the submit button. The label is visible rather than
screen-reader-only precisely because check 08 forbids placeholder-only fields;
do not "clean this up" back into a placeholder.

### Focus ring (global)
`*:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`
Required by check 09 — every interactive element needs a focus state, not only
a hover.

### Links
Body links: `--color-accent-700`, underlined with
`text-decoration-thickness: 1px` and `text-underline-offset: 3px`, hover
`--color-accent-600`. **The underline is load-bearing** — check 06 is exactly
about links distinguished by color alone. Nav and footer links are
`text-decoration: none` but sit in link-shaped positions, which is acceptable;
inline prose links must stay underlined.

## Interactions & behaviour
- **Nav links** are same-page anchors to `#how`, `#checks`, `#pricing`, `#faq`;
  the nav CTA targets `#early`. Offset the scroll target for the sticky bar.
- **FAQ** uses native `<details>`/`<summary>` — keyboard and screen-reader
  behaviour comes free. Only the chevron rotation is custom (160ms ease).
- **Signup** intercepts submit, prevents default, and sets `submitted`. A
  thank-you line then appears under the closing form: "Thank you — you are on
  the list." In production, POST to the beta list, and add pending/error states
  (the prototype has neither) plus `aria-live="polite"` on the confirmation.
- **Hover** on nav and footer links shifts color to `--color-accent-700`.
  Everything with a hover must also have a focus state.
- No scroll-triggered animation, no carousels, no parallax.

## State
Only three pieces of state exist:

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `submitted` | boolean (component state) | `false` | Reveals the thank-you line after the closing form. Set by either form's submit. |
| `recommendedPlan` | `'Free' \| 'Pro'` (prop) | `'Pro'` | Which pricing card shows the "Recommended" mark. |
| `showTrustSection` | boolean (prop) | `true` | Renders or omits section 9. |

The two props exist so the page can be tuned without editing markup; expose
them as config/CMS fields, or hard-code `'Pro'` and `true` if that is simpler.

## Responsive behaviour  (not yet designed — implement to this intent)
The prototype is desktop-only at 1180px. Suggested collapse, to be reviewed
against a real build:

- **≤ 900px** — hero goes single-column with the specimen panel below the copy;
  the 3-column "How it works" and "Nine checks" grids go to one column;
  pricing goes to one column with the recommended card first; footer stacks.
- **≤ 600px** — signup forms stack the button under the input at full width;
  reduce section padding from 76px to ~48px; the sticky nav needs a menu
  treatment (five items will not fit).
- Type already uses `clamp()`, so headings scale without extra work.
- Under check 03, touch targets must be 44px in mobile contexts — the 40px
  buttons need to grow on small viewports.

## Accessibility — the page's own compliance
This page was audited against the same nine checks and currently passes. Treat
that as an acceptance criterion, not a nicety. What was fixed during design
review, and must not regress:

1. All small text moved off `--color-neutral-600` (3.85:1) onto
   `--color-neutral-700` (5.8:1).
2. All button labels moved off `--color-accent` (3.0:1) onto
   `--color-accent-700` (6.0:1); the accent border stays (3:1 is legal for
   non-text).
3. Both signup forms gained visible labels.
4. The failing hero sample was set to a true 2.4:1, captioned as a specimen,
   and marked `aria-hidden="true"`.
5. Body line-height is 1.7 throughout — comfortably past the 1.5 floor.
6. Buttons and inputs are 40px tall.
7. Prose links keep their underline.
8. A global `:focus-visible` ring is defined.

Ratios on `#f3f2f2`: text `#201f1d` 14.7:1 · neutral-800 8.9:1 ·
neutral-700 5.8:1 · accent-700 6.0:1 · accent `#b68235` 3.0:1 (large text and
non-text only). Re-verify with a real checker after implementation, and
re-verify again if any color changes.

## Assets
No images, photographs or icon files. The only non-text marks are a CSS circle
in the specimen header and a "▾" character for the FAQ chevron. If the FAQ
chevron becomes an icon, the Classical system specifies **Lucide**
(https://lucide.dev). Fonts are Cormorant Garamond and Lora from Google Fonts —
self-host for production.

## Copy
All copy in the prototype is final and reviewed. Voice: plain, declarative,
slightly austere; short sentences; no exclamation marks, no emoji, no growth-
marketing register. Claims are specific and falsifiable ("228 unit tests",
"686-case sweep", "one Cmd-Z undoes it all") — if any becomes untrue, change the
number rather than softening the sentence.

## Files in this bundle
- `Legibly Landing.dc.html` — the design reference. Read the markup; ignore the runtime.
- `support.js` — the prototype runtime, included only so the HTML opens in a browser. Not for production.
- `_ds/classical-.../styles.css` — the Classical token sheet and component classes. Token source of truth.
- `_ds/classical-.../readme.md` — the design system's own guide.
- `_ds/classical-.../theme.json` — machine-readable theme parameters.
- `_ds/classical-.../_ds_bundle.js` — the system's component bundle (prototype-only).

To view the prototype, open `Legibly Landing.dc.html` in a browser from this
folder — the relative paths to `support.js` and `_ds/` are preserved.
