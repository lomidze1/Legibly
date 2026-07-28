# Figma Plugin UI Conventions (UI3, 2026) — Research Notes + Legibly Audit

> Source: https://developers.figma.com/docs/plugins/css-variables/
> Date: 2026-07-16
> Researcher: Claude session via design-explorer
> Scope: STEP 1 = verifiable facts about Figma plugin UI conventions. STEP 2 = audit of `plugin/src/ui/*` against them.

---

## TL;DR (5 bullets)

- **The variable *names* in `styles.css` are all real** — I verified all 9 against Figma's authoritative 174-token table. No typos. But **7 of 9 fallback hex values are wrong**, and more importantly **3 are semantically miscast**: `--figma-color-icon-*` tokens are used as **text** colors.
- **Legibly's own badges fail the contrast check Legibly ships.** `.badge-review` computes to **1.41:1** in light theme (needs 4.5:1). `.badge-violation` 3.06:1, `.badge-fixed` 2.51:1. An accessibility plugin that its own scanner would flag is the single highest-severity finding here.
- **Verified tension, not a bug:** Figma's *own* palette fails WCAG AA. `--figma-color-text-secondary` on `--figma-color-bg` = **4.00:1** (light), and Figma's own primary button (white on `#0d99ff`) = **2.99:1**. "Native-feeling" and "AA-compliant" are in genuine conflict, and Legibly is the one product that cannot ignore this.
- **380×560 is fine and conventional; non-resizable is the real gap.** Verified: `showUI` defaults are 300×200 (min 70×0), official samples range 300–600, and Figma publishes **no** sizing/typography style guide. But "the UI window is *not* resizable by default; this must be implemented by the plugin itself" — and 0 of Figma's official samples do it. Resizing is a justified community pattern, not a convention violation.
- **Emoji icons (⚙ ✕ ✓ ✨) are not native** — Figma's UI and both live component libraries use 16px SVG that inherits `currentColor`. Emoji can't take `--figma-color-icon`, and `⚙` U+2699 renders as a colored glyph on some platforms.

---

## STEP 1 — Verified facts

### 1.1 `themeColors: true` — what it actually does

Verified from [CSS Variables and Theming](https://developers.figma.com/docs/plugins/css-variables/):

- Adds a `figma-light` or `figma-dark` class to `<html>` in the plugin iframe.
- Injects `<style id="figma-style">` containing the variables.
- Variables **update live** when the user switches theme.
- Naming schema: `--figma-color-{type}-{color role}-{prominence}-{interaction}`. Type is required and is one of `bg`, `text`, `icon`, `border`.
- Caveats (both **do not affect Legibly**): theme support is unavailable for externally-hosted UIs; FigJam is light-only with a purple `-brand`. Legibly's manifest is `"editorType": ["figma"]` with a local `dist/ui.html`, so neither applies.

Docs guidance, quoted: *"We strongly recommend using the `themeColors` option in `figma.showUI()` and using the CSS variables that it provides."* ([Creating a User Interface](https://developers.figma.com/docs/plugins/creating-ui/))

### 1.2 The authoritative token table

The docs page renders the light/dark/FigJam values in a client-side tab, so they are **not** in the static HTML. I extracted them from the page's webpack chunk (`/assets/js/0336f8dc.2a6c492b.js`, resolved via chunk id `70210` from the route map in `main.js`) — this is the same data the docs page renders. **174 tokens total.** Values relevant to Legibly:

| Token | Light | Dark |
|---|---|---|
| `--figma-color-bg` | `#ffffff` | `#2c2c2c` |
| `--figma-color-bg-secondary` | `#f5f5f5` | `#383838` |
| `--figma-color-bg-tertiary` | `#e6e6e6` | `#444444` |
| `--figma-color-bg-hover` | `#f5f5f5` | `#383838` |
| `--figma-color-bg-pressed` | `#f5f5f5` | `#383838` |
| `--figma-color-bg-selected` | `#e5f4ff` | `#4a5878` |
| `--figma-color-bg-disabled` | `#d9d9d9` | `#757575` |
| `--figma-color-bg-brand` | `#0d99ff` | `#0c8ce9` |
| `--figma-color-bg-brand-hover` | `#007be5` | `#0a6dc2` |
| `--figma-color-bg-danger-tertiary` | `#ffe2e0` | `#7c2622` |
| `--figma-color-bg-warning-tertiary` | `#fff1c2` | `#c58011` |
| `--figma-color-bg-success-tertiary` | `#cff7d3` | `#0a4c2d` |
| `--figma-color-text` | `#000000e5` | `#ffffff` |
| `--figma-color-text-secondary` | `#00000080` | `#ffffffb2` |
| `--figma-color-text-tertiary` | `#0000004d` | `#ffffff66` |
| `--figma-color-text-disabled` | `#0000004d` | `#ffffff66` |
| `--figma-color-text-onbrand` | `#ffffff` | `#ffffff` |
| `--figma-color-text-danger` | `#dc3412` | `#fca397` |
| `--figma-color-text-warning` | `#b86200` | `#f7d15f` |
| `--figma-color-text-success` | `#009951` | `#79d297` |
| `--figma-color-icon` | `#000000e5` | `#ffffff` |
| `--figma-color-icon-secondary` | `#00000080` | `#ffffffb2` |
| `--figma-color-icon-danger` | `#f24822` | `#e03e1a` |
| `--figma-color-icon-warning` | `#ffcd29` | `#f3c11b` |
| `--figma-color-icon-success` | `#14ae5c` | `#198f51` |
| `--figma-color-border` | `#e6e6e6` | `#444444` |
| `--figma-color-border-strong` | `#2c2c2c` | `#ffffffe5` |
| `--figma-color-border-selected` | `#0d99ff` | `#0c8ce9` |

Docs' own stated intent for the roles (quoted):
- `--figma-color-border` — *"Our default border color for dividers between sections."*
- `--figma-color-border-strong` — *"The darker border color we use for secondary outline buttons."*
- `--figma-color-text-warning` — *"Yellow text used to warn users about a potential problem."*
- `--figma-color-icon-warning` — a **fill/icon** hue, not a text hue. (`#ffcd29` is a saturated yellow.)

### 1.3 Component library: is there an official one?

**No Figma-official plugin component library exists** — verified: the Creating-UI docs recommend only `themeColors`, and name no library. Current landscape (npm + GitHub, checked 2026-07-16):

| Library | Latest | Published | Repo activity | DL/month | Verdict |
|---|---|---|---|---|---|
| `figma-plugin-ds` (Thomas Lowry) | 1.0.1 | **2021-05-16** | pushed 2024-07-02, 756★, not archived | 6,132 | **Dormant** — 5 years since release. Do not adopt. |
| `@create-figma-plugin/ui` (yuanqing) | 4.0.3 | 2025-08-22 | pushed 2026-03-21, 1,115★ | 19,940 | Active. **Preact**, part of a full build framework. |
| `figma-kit` (tigranpetrossian) | `1.0.0-beta.23` | 2026-04-27 | pushed 2026-05-29, 76★ | 22,516 | Active, **React**, but beta and small. `latest` dist-tag is stale at `0.0.0`; real work is under the `beta` tag. |
| `@figma/plugin-typings` | 1.131.0 | **2026-07-16** | — | 932,747 | Official typings, shipping the same day as this research — the API surface is actively moving. |

So: `figma-plugin-ds` is effectively dead, and its successors are community-run. **Nothing obligates Legibly to adopt any of them.** Hand-rolled CSS against `--figma-color-*` is a legitimate, common choice.

### 1.4 Sizing and resizing

Verified from [figma.showUI](https://developers.figma.com/docs/plugins/api/properties/figma-showui/) and [figma.ui](https://developers.figma.com/docs/plugins/api/figma-ui/):

- `width` — *"Defaults to 300. Minimum is 70."*
- `height` — *"Defaults to 200. Minimum is 0."*
- `figma.ui.resize(width, height)` — minimum 70×0. **No documented maximum.**
- Other: `reposition()`, `getPosition()`, `hide()`, `show()`.

Sizes actually used by Figma's **official** samples (`figma/plugin-samples`):

| Sample | showUI |
|---|---|
| `snippet-saver` | `{ width: 400, height: 450 }` |
| `document-change` | `{ height: 600, width: 600 }` |
| `webpack-react`, `esbuild-react` | `{ themeColors: true, height: 300 }` |
| `piechart`, `text-search`, `barchart` | `showUI(__html__)` (bare defaults) |

**There is no official sizing convention.** 380×560 sits comfortably inside the observed range.

On resizability — `@create-figma-plugin` states it plainly: *"The plugin/widget UI window is **not** resizable by default; this must be implemented by the plugin/widget itself."* ([Recipes](https://yuanqing.github.io/create-figma-plugin/recipes/)). I verified via GitHub code search that **`figma.ui.resize` appears 0 times in `figma/plugin-samples`** — Figma ships no official resizable-UI example. The community pattern is a custom corner drag handle → `figma.ui.resize()` → persist via `figma.clientStorage` ([Figma Forum](https://forum.figma.com/ask-the-community-7/drag-corner-to-resize-plugin-window-16022), [Sonny Lazuardi gist](https://gist.github.com/sonnylazuardi/e55300f28fbe109db052f6568fee5a04)). `useWindowResize` in `@create-figma-plugin/ui` wraps it with `minWidth/minHeight/maxWidth/maxHeight`.

### 1.5 Typography and spacing

Figma publishes **no** typography spec for plugins — verified: the Creating-UI docs contain no font or sizing guidance. The de-facto scale comes from the libraries. `@create-figma-plugin/ui@4.0.3` `base.css` defines the **entire** type scale as:

```
--font-family: 'Inter', 'Helvetica', sans-serif;
--font-size-11: 11px;
--font-size-12: 12px;      /* there is no 9px or 10px */
--font-weight-regular: 400;
--font-weight-bold: 600;   /* there is no 500 */
--line-height-16: 16px;
--space-4/6/8/12/16/20/24
--border-radius-2/4/6/12   /* there is no 8 */
```

`figma-plugin-ds` likewise uses `font-family: 'Inter', sans-serif`.

**So "Inter, 11px base" is confirmed as the convention** — but note it is a *community/library* convention, not a documented Figma rule.

### 1.6 What I could NOT verify

- **Whether Figma injects Inter into the plugin iframe.** I found no documentation either way. `figma-plugin-ds` bundles Inter via `@font-face`, which *suggests* it is not automatic. If it is not, Legibly's `font-family: 'Inter', -apple-system, …` silently renders in **SF Pro** on macOS — which matches the supplied renders. **Needs verification** (inspect `document.fonts` inside a real plugin iframe). Legibly's `networkAccess.allowedDomains` is `["https://api.anthropic.com"]` only, so a CDN webfont **would be blocked** — self-hosting would be required.
- **"UI3 design language for plugins."** UI3 is Figma's *editor* redesign. I found **no** Figma-published UI3 spec for plugin authors, and I will not invent one. The only concrete, Figma-authored "native" contract for plugin UI is the `--figma-color-*` token set. Treat any "UI3 plugin rules" claim (including from me) as unverified.
- **Config 2026 relevance:** verified that Figma said *"we're investing more in new plugin APIs and new plugin UI; these investments will be available to both generative plugins and classic plugins"* and *"Classic plugins aren't going anywhere"* ([Config 2026 recap](https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026)). **What that new plugin UI actually is has not shipped/been specced publicly.** Worth re-checking before any large UI investment.

---

## STEP 2 — Audit of Legibly

### 2.1 Is the `--figma-color-*` subset in `:root` correct and complete?

**Correct in naming: yes.** All 9 referenced tokens exist in the 174-token table. No typos, no invented names.

**Accurate in fallback values: mostly no.** 7 of 9 are wrong:

| Declaration in `styles.css` | Fallback | Real Figma light | |
|---|---|---|---|
| `--figma-color-bg` | `#ffffff` | `#ffffff` | ✅ |
| `--figma-color-bg-secondary` | `#f5f5f5` | `#f5f5f5` | ✅ |
| `--figma-color-text` | `#1e1e1e` | `#000000e5` | ❌ |
| `--figma-color-text-secondary` | `#666666` | `#00000080` | ❌ |
| `--figma-color-border` | `#e0e0e0` | `#e6e6e6` | ❌ |
| `--figma-color-bg-brand` | `#0d66d0` | `#0d99ff` | ❌ noticeably darker/duller blue |
| `--figma-color-text-onbrand` | `#ffffff` | `#ffffff` | ✅ |
| `--figma-color-icon-danger` | `#d63d3d` | `#f24822` | ❌ |
| `--figma-color-icon-warning` | `#ad5f00` | `#ffcd29` | ❌ (not even the same hue family) |
| `--figma-color-icon-success` | `#12752e` | `#14ae5c` | ❌ |

**Severity: low in production, real in dev.** Because `themeColors: true` is set, Figma always supplies these, so fallbacks are dead code *inside Figma*. But they are exactly what renders **outside** Figma — which is what `legibly-01-empty.png` shows: that button is the `#0d66d0` fallback, not Figma's `#0d99ff`. So every browser-based render, Playwright snapshot, and design review is being judged against a palette that is not Figma's. Fixing the fallbacks costs nothing and makes the dev harness truthful.

**Complete: no.** Missing tokens the UI demonstrably needs:

| Need | Current approach | Native token |
|---|---|---|
| Secondary button border | `--figma-color-border` (a *divider* color, `#e6e6e6`) | `--figma-color-border-strong` — docs literally say it is *"for secondary outline buttons"* |
| `.btn:hover` | `--bg-secondary` | `--figma-color-bg-hover` (coincidentally the **same value** in both themes — visually fine, semantically wrong, will drift) |
| `.btn-primary:hover` | `opacity: 0.9` hack | `--figma-color-bg-brand-hover` |
| `.btn:disabled` | `opacity: 0.5` hack | `--figma-color-bg-disabled` / `--figma-color-text-disabled` |
| `.btn-active` (⚙ toggled) | `--bg-secondary` | `--figma-color-bg-selected` (+ `--figma-color-border-selected`) |
| Icon buttons | inherit `--text` | `--figma-color-icon` / `--figma-color-icon-secondary` |
| Input placeholders | none | `--figma-color-text-tertiary` |
| Badge/banner fills | `color-mix(… 14%, transparent)` | `--figma-color-bg-{danger,warning,success}-tertiary` |

The `color-mix(in srgb, var(--danger) 14%, transparent)` construction is an invention. Figma ships `-tertiary` background tokens for exactly this job, and they are theme-tuned (e.g. success tertiary is `#cff7d3` light but `#0a4c2d` dark — a *dark green*, which a 14% tint cannot reproduce).

**Semantic miscast — the important one.** Three tokens are used as text colors when they are icon/fill hues:

```css
--danger:  var(--figma-color-icon-danger,  …);  /* used as color: in .badge-violation, .error-bar */
--warning: var(--figma-color-icon-warning, …);  /* used as color: in .badge-review */
--success: var(--figma-color-icon-success, …);  /* used as color: in .badge-fixed, .diff .ok */
```

### 2.2 Legibly fails its own check

Computed with the WCAG 2.1/2.2 relative-luminance formula, using **real** Figma token values, on the exact pairings in `styles.css`. Badges are `font-size: 9px; font-weight: 600` → normal text → **4.5:1 required** (large-text exemption starts at 18.66px bold).

| Element | Theme | Current | Ratio | |
|---|---|---|---|---|
| `.badge-review` | light | `#ffcd29` on 14% tint | **1.41:1** | ❌ |
| `.badge-fixed` | light | `#14ae5c` on 14% tint | **2.51:1** | ❌ |
| `.badge-violation` | light | `#f24822` on 14% tint | **3.06:1** | ❌ |
| `.badge-violation` | dark | `#e03e1a` on 14% tint | **2.89:1** | ❌ |
| `.badge-fixed` | dark | `#198f51` on 14% tint | **2.92:1** | ❌ |
| `.badge-review` | dark | `#f3c11b` on 14% tint | 6.05:1 | ✅ |
| `.diff .ok` | light | `#14ae5c` on `#f5f5f5` | **2.66:1** | ❌ |
| `.error-bar` | light | `#f24822` on 12% tint | **3.14:1** | ❌ |

`.badge-review` at **1.41:1** is the headline: a WCAG plugin whose "CHECK BY EYE" badge is nearly invisible. **Legibly's scanner would flag Legibly.** This is a credibility risk, not just a polish issue — it is the exact failure mode the product sells against, visible in `legibly-03-results-full.png` and `legibly-04-settings.png`.

Swapping to the correct `text-*` token helps but **does not fully fix light theme**, because the 14% tint is too pale:

| | light, `text-*` token | dark, `text-*` token |
|---|---|---|
| violation | 3.76:1 ❌ | 5.39:1 ✅ |
| review | 3.67:1 ❌ | 6.68:1 ✅ |
| fixed | 3.12:1 ❌ | 5.65:1 ✅ |

And Figma's own native pairing (`text-{role}` on `bg-{role}-tertiary`) **also** misses 4.5:1 in light theme (danger 3.79:1, warning 3.89:1, success 3.15:1) and fails badly for dark warning (2.20:1). **There is no Figma-native badge recipe that passes AA.** This must be a deliberate override.

### 2.3 The strategic tension (read this before "fixing" anything)

Figma's own palette, measured:

| Token | Light | Dark |
|---|---|---|
| `--figma-color-text` on `bg` | 17.40:1 ✅ | 13.97:1 ✅ |
| `--figma-color-text-secondary` on `bg` | **4.00:1 ❌** | 7.62:1 ✅ |
| `--figma-color-text-tertiary` on `bg` | **2.12:1 ❌** | **3.56:1 ❌** |
| `text-onbrand` on `bg-brand` (primary button) | **2.99:1 ❌** | **3.53:1 ❌** |

This matters because `--text-secondary` carries most of Legibly's body copy (`.detail`, `.microtext`, `.footer`, `.summary`, `.empty`, `.escalation`) — much of it at **10px**. In light theme that is 4.00:1 at 10px: a fail on both contrast and size.

**So "be native" and "be AA" cannot both be fully satisfied.** This is a positioning decision for the human, not a mechanical fix. Options:

1. **Native-first** — accept Figma's values, ship a UI that fails your own scanner. Cheapest; indefensible for this product if a reviewer ever runs Legibly on Legibly.
2. **AA-first, native-shaped** (recommended) — keep Figma's tokens everywhere they pass; override only where they fail. Concretely: use `--figma-color-text` instead of `text-secondary` for 11px body copy in light theme, and give badges a deliberate AA-safe pairing. Looks ~native, passes.
3. **Full custom palette** — abandons the theming contract. Not worth it.

Option 2 is also a **marketing asset**: "Legibly passes its own audit" is a claim no competitor makes. The cheapest enforcement is a unit test that runs the existing `shared/contrast.ts` over the UI's own token pairs — dogfooding for near-zero cost.

### 2.4 380×560 and resizability

**380×560 is right as a default.** Within the range of official samples (300–600), above the 300×200 default, sensible for a results panel.

**Non-resizable is a real gap for this specific UI.** `legibly-03-results-full.png` shows a results list that scrolls well past the viewport, with three stacked scroll regions (`.results` `overflow-y:auto`, `.footer` `max-height:130px; overflow-y:auto`, plus the settings panel pushing content down — visible in `legibly-04-settings.png`, where opening ⚙ shrinks the already-short results area). Long triage lists are exactly the case where users want a taller window.

**Recommendation: yes, add `figma.ui.resize`** — with the honest caveat that this is a **community convention, not a Figma requirement**, and Figma ships no official example. Suggested: corner drag handle, `minWidth: 320, minHeight: 400`, persist to `clientStorage`, restore on launch. Moderate effort (~1 pointer-events handler + 1 RPC + 1 storage key). Worth it; not urgent relative to §2.2.

Cheaper interim win: the `.footer` `max-height: 130px` on a 560px window spends up to 23% of vertical space on a disclaimer. Collapsing it by default would reclaim more usable list space than resizing would.

### 2.5 Emoji icons

`⚙` (U+2699), `✕` (U+2715), `✓` (U+2713), `✨` (U+2728) — **not native.** Figma's UI uses 16px SVG.

Concrete problems:
- **Cannot be themed.** Emoji-presentation glyphs render as color bitmaps and ignore `color` / `--figma-color-icon`. The ⚙ button can't respond to theme or hover.
- **Platform-inconsistent.** `⚙` U+2699 and `✨` U+2728 have emoji presentation on Windows (Segoe UI Emoji) but often text presentation on macOS — the same build looks different per OS. `⚙` in `legibly-01-empty.png` renders as a thin monochrome glyph on macOS; it will not on Windows.
- **Metrics drift.** Emoji don't align to the 16px icon grid; `.btn-icon { padding: 6px 9px }` is compensating by hand.
- **A11y.** These buttons carry `title` but no `aria-label`; screen readers may announce the emoji's Unicode name ("gear", "sparkles"). For this product that's an own-goal.

**Recommendation: replace with inline 16px SVG using `fill="currentColor"`**, colored via `--figma-color-icon` / `--figma-color-icon-secondary`, plus `aria-label`. Both `@create-figma-plugin/ui` and `figma-kit` ship Figma-matched SVG icon sets to copy shapes from (MIT). `✓` inside badges and `✨` on the AI button are lower priority than the two toolbar buttons.

### 2.6 Type scale and radius drift

| Legibly | Library scale | |
|---|---|---|
| `font-size: 11px` (base) | `--font-size-11` | ✅ correct |
| `font-size: 10px` (`.microtext`, `.btn-sm`, `.footer`) | not in scale | ⚠️ off-scale |
| `font-size: 9px` (`.badge`) | not in scale | ❌ off-scale + legibility |
| `font-weight: 500` (`.btn`) | only 400 / 600 | ⚠️ off-scale |
| `border-radius: 8px` (`.card`, `.banner`) | 2 / 4 / 6 / 12 | ⚠️ off-scale |
| `border-radius: 6px` (`.btn`) | `--border-radius-6` | ✅ |
| padding `8px` / `12px`, gap `6px` / `8px` | `--space-6/8/12` | ✅ |

Spacing is largely conformant. Type is the drift: **9px badges in an accessibility product** are hard to defend, and moving them to 11px also relieves the contrast math (11px bold still needs 4.5:1, but the text becomes legible).

### 2.7 Manifest

No UI-relevant issues. `"editorType": ["figma"]` correctly scopes out FigJam (so the purple-brand and light-only caveats don't apply). `networkAccess` is tight and well-reasoned — but note it **would block a webfont CDN**, which constrains the Inter question in §1.6.

---

## Capabilities

| Convention | Legibly today | Verdict |
|---|---|---|
| `themeColors: true` | ✅ set | ✅ correct |
| Real `--figma-color-*` names | ✅ all 9 valid | ✅ |
| Accurate fallback values | 2 of 9 | ❌ |
| Correct semantic role (text vs icon) | icon-* used as text | ❌ |
| Hover / pressed / disabled / selected tokens | opacity hacks | ❌ |
| Inter, 11px base | ✅ base correct | ⚠️ 9/10px drift |
| Panel size in normal range | 380×560 | ✅ |
| Resizable window | ❌ | ⚠️ recommended |
| SVG icons | emoji | ❌ |
| Passes its own WCAG check | badges 1.41–3.14:1 | ❌ **critical** |

## What we can leverage

- The **full 174-token table** is now extracted and cited — no more guessing at values.
- `figma-kit` (React, MIT) icon shapes — copy the SVGs, skip the dependency.
- **"Legibly passes its own audit"** — a differentiator, enforced by a cheap unit test over `shared/contrast.ts`.

## What we should AVOID copying

- `figma-plugin-ds` — dormant since 2021.
- Figma's own `text-secondary` (light) and primary-button contrast — natively non-compliant.
- Adopting `@create-figma-plugin` wholesale — it is a Preact build framework, and Legibly is React with a working build.

## Open questions

- Does the plugin iframe ship Inter? (**needs verification** — determines whether to self-host.)
- What is the "new plugin UI" from Config 2026, and does it obsolete hand-rolled CSS? (Unspecced; re-check before large UI work.)
- Is AA-first vs native-first a product decision the user wants to make explicitly? (§2.3 — recommend option 2.)

## Sources

- [CSS Variables and Theming — Figma](https://developers.figma.com/docs/plugins/css-variables/) (+ its chunk `/assets/js/0336f8dc.2a6c492b.js` for the light/dark table)
- [Creating a User Interface — Figma](https://developers.figma.com/docs/plugins/creating-ui/)
- [figma.showUI — Figma](https://developers.figma.com/docs/plugins/api/properties/figma-showui/)
- [figma.ui — Figma](https://developers.figma.com/docs/plugins/api/figma-ui/)
- [figma/plugin-samples](https://github.com/figma/plugin-samples)
- [create-figma-plugin Recipes — useWindowResize](https://yuanqing.github.io/create-figma-plugin/recipes/)
- [`@create-figma-plugin/ui@4.0.3` base.css](https://unpkg.com/@create-figma-plugin/ui@4.0.3/lib/css/base.css)
- [figma-plugin-ds](https://github.com/thomas-lowry/figma-plugin-ds) · [figma-kit](https://github.com/tigranpetrossian/figma-kit)
- [Drag corner to resize plugin window — Figma Forum](https://forum.figma.com/ask-the-community-7/drag-corner-to-resize-plugin-window-16022) · [Resizable plugin window gist](https://gist.github.com/sonnylazuardi/e55300f28fbe109db052f6568fee5a04)
- [What's new from Config 2026 — Figma Help](https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026)
- [WCAG 2.2 — Contrast (Minimum) 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
