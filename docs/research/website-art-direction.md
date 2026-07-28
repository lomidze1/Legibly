# Legibly Marketing Site — Art Direction ("Darkroom")

> Source: `website/src/app/v2/**`, `website/src/components/v2/**`, live at `http://localhost:3500/v2`
> Date: 2026-07-26
> Author: Claude session (art direction + build)
> Brief: the site owner's verdict on the shipped page was "the site is very ugly, it's overloaded with text", and asked why it is not animated. The previous pass ([`website-design-critique.md`](./website-design-critique.md)) was briefed to treat the brand's visual decisions as fixed, so it audited correctness and argued *against* motion. This pass corrects that brief: aesthetics and copy length are in scope, motion is in scope, the WCAG outcomes are not.
> Method: three directions written and critiqued, one committed to, built as a parallel route at `/v2` so the owner can compare against `/` on the same server. The shipped page, its CSS module and every component it uses are untouched. `globals.css` gained one additive block, scoped so it cannot apply to any page that does not render `[data-theme="darkroom"]`.

---

## 1. What was actually wrong

The shipped page is technically excellent and visually inert. Nine full-width sections, each one a left-aligned heading over a paragraph, on one light surface, with one blue, one type size for almost all body copy, and a single 420px demo card as the only image on a page selling a visual tool. Nothing is broken. Nothing is memorable either. 811 words of prose with no visual relief reads as "overloaded" even when each sentence is good, because the eye has nowhere to rest between them.

The three failures, ranked:

1. **No compositional variety.** One layout family repeated nine times. The page has no rhythm, so it has no shape.
2. **No product.** It sells a scanner and shows a scan exactly once, small, below the fold on most screens.
3. **No hierarchy in type or surface.** 17px body everywhere, one tint, one accent. Nothing is loud, so nothing is quiet either.

Motion was never the root problem, but its absence is the symptom people name.

---

## 2. Three directions

### A. Darkroom
**Idea in one sentence.** The page is the room the scan happens in: near-black, the product's own light sweeping across a design and finding what cannot be read.

- **Typography.** Atkinson Hyperlegible stays as body, because the typeface is the brand's argument. A second, expressive voice for headlines: Archivo, a wide engineered grotesque, at 4.75rem with -0.03em tracking and 108% width. System mono for every measured value, tabular.
- **Color and light.** `#0a0c10` base, three elevations above it, one periwinkle accent, and translucent accent glow behind the hero and the closing CTA. Verdict colours stay semantic-state-only.
- **Layout logic.** Full-measure headline, then a full-width product stage. Below it, seven different layout families: a date-stamp split, a three-track rail, a chip-and-rule data list, a two-panel comparison, an asymmetric bento, a metric strip, an accordion.
- **Motion behaviour.** A scan beam crossing the artboard once on load, findings landing in sequence behind it, the fix tweening on click with the real ratio climbing. Below the fold, a rail drawing across the three process beats, and content rising in as it enters view.
- **The screenshot moment.** The beam mid-sweep with a violation pin landing on the design and the panel filling in beside it.

### B. Field notes
**Idea in one sentence.** The page is the audit report the tool produces: bright paper, hairline rules, huge Atkinson set at poster scale, and measurements annotated in the margin like a spec sheet.

- **Typography.** Atkinson only, pushed hard: 6rem headlines, 900-weight, tight tracking, marginalia at 12px mono.
- **Color and light.** The existing light palette, plus paper texture and a single ink-blue. No depth, no glow. Rules and whitespace do all the structural work.
- **Layout logic.** A strict two-column editorial grid with a wide left column and a measurement gutter carrying live ratio callouts next to the text they describe.
- **Motion behaviour.** Measurement lines drawing themselves; numbers counting to their value; nothing that moves for its own sake.
- **The screenshot moment.** The H1 with a contrast callout drawn against it, measuring the page's own headline live.

### C. Canvas
**Idea in one sentence.** The page is a Figma file: an infinite dotted canvas, content in named frames with selection handles, and the Legibly panel docked at the right, reporting on whatever section you are scrolled to.

- **Typography.** Inter-ish UI type at Figma's own sizes for the chrome, Atkinson for the content inside the frames.
- **Color and light.** Figma's dark canvas grey, blue selection outlines, the panel in the product's real colours.
- **Layout logic.** Frames of different sizes laid out on a canvas, scroll moving between them.
- **Motion behaviour.** Selection marquees, layer names appearing on hover, the docked panel re-scanning as each frame enters view.
- **The screenshot moment.** The panel calling a violation on the marketing page you are currently reading.

---

## 3. Critique, and the commitment

**C is out.** It is the most fun to describe and the worst to own. A marketing site pretending to be Figma is a costume, and a costume reads as a student exercise to exactly the audience being sold to: working designers who will spot every place the imitation is wrong. It also fights the hard constraints, since fake selection chrome and a docked panel are where keyboard order, reflow at 320px and heading structure go to die. And it borrows Figma's brand to carry Legibly's, which is the opposite of what a product that has to look independent of Figma needs.

**B is out, reluctantly.** It is credible, it is buildable, and it would be handsome. It is also what the site already is, plus better typography. The owner's complaint was not "the type is undersized"; it was that the page is ugly and dead. A direction whose entire delta is a bigger headline and finer rules does not answer that. B is a safe blend of the current page with better craft, and this brief explicitly asked for a committed direction over a safe one.

**A is the commitment.** Three reasons, in the order they matter:

1. **It is on-argument, not just on-trend.** The product's job is to find what cannot be read. A dark page is where contrast becomes something you feel rather than something you are told, and it lets the page prove the claim it makes: every text pair on it still clears AAA, measured, on a surface where that is harder to achieve, not easier.
2. **It is where the product visuals actually live.** The target user stares at a dark Figma canvas all day. An artboard floating on a dark surround with a plugin panel beside it is a picture of their screen. On the light page, the same mock reads as a marketing illustration.
3. **It gives the page depth to compose with.** Four elevations and one glow are enough to build hierarchy without adding a second colour, which keeps the verdict palette semantic and the accent single.

What A borrows from B, deliberately: the measurement motif. Every number on the page is set in mono with tabular figures, the meter in the bento is a real contrast scale with the AA threshold marked, and the demo's readout is computed live rather than written down. That is B's rigour used as A's detail language, which is not the same thing as averaging the two.

**The risk, stated plainly.** `docs/website.md §7` locked the brand as "light, high-contrast", and §8 lists dark mode as an open decision that belongs to the owner because it changes brand identity. This direction takes that decision to its logical end so it can be judged as a finished thing rather than as an abstraction. If the owner wants light, direction B is the fallback and most of this page's structure, copy and motion survives the move.

---

## 4. Type specimen

| Role | Face | Size | Treatment |
|---|---|---|---|
| H1 | Archivo | `clamp(2.6rem, 6.4vw, 4.75rem)` | 700, `font-stretch: 108%`, -0.03em, line-height 0.98, balanced |
| H2 | Archivo | `clamp(1.9rem, 4.2vw, 3.1rem)` | same, capped at 18ch so every section head breaks to two lines |
| Metric | Archivo | `clamp(3rem, 6.5vw, 4.75rem)` | -0.04em, tabular figures |
| H3 | Atkinson | 1.1875rem | 700, -0.01em |
| Body | Atkinson | 17px | 1.6, capped by `--measure-*` |
| Lead | Atkinson | `clamp(1.0625rem, 1.4vw, 1.1875rem)` | muted |
| Data, SC numbers, labels | system mono | 13px | 700, +0.04em, tabular |

Archivo is loaded through `next/font/google` with the `wdth` axis, self-hosted at build time. No stylesheet link, no CDN, no third-party request at runtime. It was chosen over a display serif or a condensed poster face for one reason: a product whose entire claim is legibility cannot set its headlines in something that trades legibility for personality. Archivo is signage-derived, opens wide, and reads clean at 4.75rem and at 2.6rem.

---

## 5. Color specimen

All values measured on the rendered page with the same WCAG function the plugin gates fixes with, not chosen by eye.

| Token | Value | Measured |
|---|---|---|
| `--bg` | `#0a0c10` | base |
| `--surface` / `--tint` | `#12151b` | 1.07:1 on base, elevation only |
| `--v2-raised` | `#1a1e26` | second elevation |
| `--v2-canvas` | `#0e1116` | the artboard surround |
| `--text` | `#f4f6f9` | 18.0:1 on `--bg` |
| `--text-muted` | `#b9c1cd` | 10.6:1 on `--bg`, 7.1:1 at the brightest glow peak |
| `--accent` | `#a8c4ff` | 11.6:1 on `--bg`, 7.4:1 at the brightest glow peak |
| `--v2-edge` | `#697384` | 3.9:1 on the input it bounds, 4.1:1 on `--bg` (SC 1.4.11) |
| `--v2-dim` | `#8d96a4` | 6.3:1, placeholder only, never a label |
| `--fail` | `#ff9a90` | 9.5:1 on `--bg` |
| `--review` | `#f5c470` | 12.1:1 on `--bg` |
| `--pass` | `#79dfa5` | 12.0:1 on `--bg` |

Two findings from measuring rather than trusting. First, the first-pass accent (`#8bb0ff`) and muted ink (`#aeb7c4`) both fell to ~6.3:1 at the peak of the glows, because a translucent accent wash over a near-black surface lightens the background under the text. The inks moved and the glow alphas came down (0.16 over the page background, 0.10 over raised cards) rather than the AAA claim moving. Second, on a dark page a hairline that satisfies 3:1 against its surface looks like a hard white frame, so card edges here are elevation, not strokes; the 3:1 boundary is spent where SC 1.4.11 actually requires it, on the boundary of things you can operate.

The nav and footer are shared components that read the same token names, so the block in `globals.css` re-points those names under `:root:has([data-theme="darkroom"])` and the chrome comes along with the page. Two rules undo hard-coded `#fff` on top of `--accent` in the skip link and the nav CTA, which on a light accent measured 1.8:1.

---

## 6. Motion system

Four rules, and everything on the page obeys them.

1. **Motion means sequence, causality, state change or continuity.** Nothing loops, nothing floats, nothing parallaxes.
2. **The hidden state lives in a keyframe's `from`, never in a base rule that a script has to undo.** If the observer never fires, if JavaScript is off, if it is a crawler or a print, the content is simply there.
3. **`prefers-reduced-motion` neutralises all of it.** The CSS goes through the existing global guard. The one JS-driven tween checks `matchMedia` itself and applies its end state instantly.
4. **Durations 0.45s to 0.9s, `cubic-bezier(.16,1,.3,1)` for entrances, `(.33,1,.68,1)` for draws.**

| Moment | What it says | Mechanism |
|---|---|---|
| Scan beam crossing the artboard | the product is doing its one job | CSS keyframe in a base rule, runs on load, replayable via "Run again" |
| Findings landing one by one, pins dropping on the design | the scan is sequential and each finding has a location | staggered `animation-delay`, CSS only |
| Fix tween: colour mixing, ratio climbing, icon growing 20 to 24 | cause and effect, with real arithmetic | `requestAnimationFrame` + `contrastRatio()` per frame; the verdict flips at the true 4.5:1 crossing, not on a timer |
| The rail drawing across Scan / Fix / Verify | the order is the message | IntersectionObserver adds a class; the keyframe holds the hidden state |
| Sections rising in on entry | arrival, nothing more | same, staggered by `--i` |
| Meter filling to 8.8:1, past the 4.5:1 mark | the measurement is a measurement | same |
| Scroll position line | where you are | CSS `animation-timeline: scroll(root block)`, inside `@supports` and `prefers-reduced-motion: no-preference` |

**GSAP was not installed.** Every effect above is either one-shot (IntersectionObserver plus a keyframe), continuous but decorative (a CSS scroll timeline), or a real numeric tween that has to run through the WCAG function anyway and is 12 lines of `requestAnimationFrame`. GSAP earns its ~50KB when you need pinning and scrubbing, and pinning is precisely the technique that endangers three of this page's hard constraints at once: keyboard users stranded in a pinned section, reflow at 320 CSS px, and content that stops being perceivable when the script does not run. Choosing not to pin is the reason the motion here could be built additively; adding GSAP to do the same work would have bought weight and risk and no additional meaning.

---

## 7. Copy

Prose was cut 45%; total visible words, including the product panel's own UI text, 37%.

| | Shipped `/` | `/v2` |
|---|---|---|
| Words in `<main>` (FAQ expanded) | 811 | 512 |
| Words excluding the product stage | 811 | 445 |
| Sections | 10 | 10 |
| Distinct layout families | 3 | 8 |

Sections were not deleted wholesale, they were compressed: the FAQ went from five questions to three, every check description lost a clause, the trust section became three numbers with one line each, and the "why us" comparison became two sentences instead of two paragraphs. The voice is unchanged, including the lines worth keeping: "silence never reads as a pass", "Zero false positives is a design constraint, not a marketing line", "Two are arithmetic. The third is a photograph, so it is yours."

---

## 8. The product visual

The hero stage is the thing the old page did not have: an artboard on a Figma-like canvas, three findings, and a panel that repairs two of them.

The specimen text is painted to a `<canvas>`, for the same reason the shipped `FixDemo` is. The "before" body copy is deliberately 2.4:1, and as live DOM text it makes axe, Lighthouse and WAVE report a genuine SC 1.4.3 violation on the homepage of a WCAG product. It is a picture of someone else's broken design, so it is drawn as a picture, with the whole of it in the canvas's accessible name and every finding repeated as real, server-rendered text in the panel beside it.

**The third finding never resolves.** A play control sitting on a photograph cannot be measured, so it stays "Review" after the fix runs, and the panel says so: "Two are arithmetic. The third is a photograph, so it is yours." That is the brand's whole argument, animated, in the first screenful.

---

## 9. Verification

Run against the production build (`next build`, served on :3600), not the dev server.

- `npm test` 23 passed, `npx tsc --noEmit` clean, `npx eslint` clean, `npm run build` clean.
- Rendered contrast sweep: **129 text nodes at 1440px, 125 at 375px, minimum 7.09:1, nothing below 7:1**, with the worst-case glow peak composited into the background under every element that sits on the page surface.
- Reflow: no horizontal scroll at 320 CSS px or at 305 CSS px, and no unclipped overflow at either.
- Keyboard: 25 tab stops, all with a 3px accent focus ring, DOM order matching visual order, nothing landing under the sticky header, no trap.
- Structure: one `<h1>`, 25 headings, no skipped levels, no duplicate ids.
- `prefers-reduced-motion: reduce`: 0 running animations, all 129 text nodes visible, the scroll line stays at zero, and the fix still applies instantly on click.
- Console: no errors.

---

## 10. Open

- **Nav anchors.** `SiteNav` and `SiteFooter` link to `/#how-it-works` and friends, so on `/v2` those links navigate back to the shipped page. `/v2` carries the matching ids, so this resolves itself the moment the direction is adopted at `/`. It was left alone because the brief forbids editing shipped components.
- **The light fallback.** If dark is rejected, direction B keeps the structure, the copy, the motion system and the product stage, and needs a new palette pass plus a rethink of the glows.
- **OG image and `/privacy`.** Both still carry the light brand. They follow whichever direction is adopted.
