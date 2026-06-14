# Visily — Research Notes

> Source: https://visily.ai/pricing/ , https://www.visily.ai/screenshot-editor-ai/
> Date: 2026-06-14
> Researcher: Claude session via design-explorer

## TL;DR (3-5 bullets)
- Visily is a **standalone, browser-based** AI design tool aimed squarely at **non-designers** (PMs, founders, devs) — Segment C. Core pitch: idea/screenshot/sketch → editable wireframe in seconds, no Figma skills required.
- **Screenshot-to-design is the flagship.** Accuracy is good on simple/static pages (one hands-on review claims a "100% replica" of a webpage in ~3 min) but **degrades on complex layouts / content hierarchy**, requiring manual cleanup ([Capterra](https://www.capterra.com/p/254704/Visily/reviews/), [LogRocket](https://blog.logrocket.com/ux-design/visilys-ai-wireframing-prototyping/)). No published benchmark numbers exist — claims are anecdotal.
- **Two documented weaknesses are directly our wedge:** (1) AI edits **regenerate the whole screen** instead of targeted/partial changes ("add my logo" → entirely new landing page that "looked worse" per LogRocket); (2) **no auto-layout**, so users hand-align elements — painful for the very non-designers it targets.
- **Pricing:** Free (300 AI credits/mo, 2 editable boards), Pro $11/editor/mo annual (3k credits, Figma export/import, export-to-code), Business $29/editor/mo (10k credits, SSO), Enterprise custom.
- Visily proves there is **real demand for "no design system, just make it pretty"** — but that is the opposite of our system-strict wedge. It is the clearest example of what we should *not* copy on output fidelity, and the clearest validation that non-designer onboarding UX matters.

## Capabilities
| Feature | Available? | Notes |
|---------|------------|-------|
| Screenshot → editable design | ✅ | PNG/JPG upload or QR/phone scan; Chrome extension to grab any site/Figma frame ([feature page](https://www.visily.ai/screenshot-editor-ai/)) |
| "Closely match" vs "Loosely match" toggle | ✅ | User picks easy-customization vs design-precision on import ([feature page](https://www.visily.ai/screenshot-editor-ai/)) |
| Sketch → design | ⚠️ | Supported but inconsistent — "sometimes the sketch-to-design doesn't work as expected" ([Capterra](https://www.capterra.com/p/254704/Visily/reviews/)) |
| Text → design | ⚠️ | Labeled **Beta** on the feature page |
| Lo-fi ⇄ hi-fi switch | ✅ | Switch "preserves all elements while adapting style"; available even on Free tier ([pricing](https://visily.ai/pricing/), [Banani](https://www.banani.co/blog/visily-ai-review)) |
| Lo-fi + hi-fi on same board | ⚠️ | It's a *toggle/conversion* of the same artwork, not both fidelities side-by-side simultaneously — single-board, switchable |
| Drag-and-drop / click-to-edit | ✅ | Manual edits are intuitive and **cost no AI credits** ([Banani](https://www.banani.co/blog/visily-ai-review)) |
| Auto-layout | ❌ | Missing — users manually align/group; flagged as a key weakness ([LogRocket](https://blog.logrocket.com/ux-design/visilys-ai-wireframing-prototyping/)) |
| Targeted / partial AI regen | ❌ | AI editing **regenerates entire screens** rather than the selected change ([LogRocket](https://blog.logrocket.com/ux-design/visilys-ai-wireframing-prototyping/), [Banani](https://www.banani.co/blog/visily-ai-review)) |
| Auto-prototype / multi-screen flows | ✅ | "Auto-Prototype feature creates interactive flows instantly" ([LogRocket](https://blog.logrocket.com/ux-design/visilys-ai-wireframing-prototyping/)) |
| Export to Figma | ✅ (paid) | One-way Visily→Figma via plugin; some components/fonts simplified or substituted on transfer ([help center](https://www.visily.ai/help-center/export-designs-to-figma/)) |
| Import from Figma | ✅ (paid) | Added in 2026 update, paid plans ([Banani](https://www.banani.co/blog/visily-ai-review)) |
| Export to code | ✅ (Pro+) | Listed on Pro tier ([pricing](https://visily.ai/pricing/)) |
| Design-system / token enforcement | ❌ | No JSON theme import or token discipline (UX Pilot has JSON themes; Visily does not) ([LogRocket](https://blog.logrocket.com/ux-design/visilys-ai-wireframing-prototyping/)) |
| WCAG / accessibility checks | ❌ | No accessibility features evaluated or advertised |
| Native in Figma | ❌ | Standalone web app, not a Figma-native plugin |

## Pricing
- **Starter (Free):** $0 — 300 AI credits/mo, 2 editable boards (unlimited view-only), 2,500 elements/board, lo-fi/hi-fi switch, color assistant, 24-hour data retention.
- **Pro:** $11/editor/mo billed annually (20% off) — 3,000 credits/editor/mo (+600/guest), unlimited boards/elements, AI deep design & design instructions, **Figma export & import**, **export to code**, 7-day version history, 30-day retention.
- **Business:** $29/editor/mo annually — 10,000 credits/editor/mo (+2,000/guest), SAML SSO, custom teams, workspace library, 30-day version history, 90-day retention, priority support.
- **Enterprise:** Custom — dedicated AM, custom credits, unlimited themes/templates.
- **Pricing signal:** Manual editing is free of credits; **AI generation is the metered/monetized unit.** Credit-based AI metering is the dominant model — relevant for our own pricing.

## Strengths
- **Lowest barrier to entry in the segment.** Browser-based, no install, "user-friendly workflow accessible to everyone, including non-designers" — consistently the most-praised attribute ([Capterra](https://www.capterra.com/p/254704/Visily/reviews/)).
- **Screenshot-to-design is genuinely fast and useful** for cloning/iterating on existing pages and competitor references — strong on simple/static layouts.
- **Manual edits don't burn credits** — reduces anxiety for non-designers experimenting (good pricing psychology).
- **Broad input surface** (screenshot + sketch + text + templates) lowers "blank canvas" friction.
- **Auto-prototype** turns static screens into clickable flows with no extra effort.

## Weaknesses (our wedge opportunity)
- **No targeted/partial regeneration.** Editing one element regenerates the whole screen and often makes it worse. → **Directly validates our Wedge #3 (selection-based partial regen native in Figma).** This is the single most damning, repeatedly-cited flaw.
- **No auto-layout / no system discipline.** Manual alignment burden + no token/design-system enforcement. → **Validates Wedge #1 (system-strict generation).** Output is "make it look nice," not "conform to my system."
- **No accessibility anywhere.** Zero WCAG features. → **Validates Wedge #2 (in-loop WCAG 2.2 AA).** Clean greenfield against Visily.
- **One-way / lossy Figma handoff.** Visily→Figma simplifies components, radii, shadows, fonts; can't round-trip cleanly. → **Validates our MCP-first, Figma-native posture** (we never leave Figma, so no lossy bridge).
- **Accuracy ceiling on complex pages.** Degrades exactly where real product work lives (dense hierarchy, data-heavy screens).
- **Standalone, not in Figma.** A designer with a Figma workflow must context-switch and re-import — friction we eliminate by being native.

## What we can leverage
- **Credit-metered-AI + free-manual-edit pricing model** is a proven, non-designer-friendly monetization pattern — strong candidate for our freemium tiers.
- **"Closely match vs loosely match" import toggle** is a smart UX primitive: let the user pick fidelity-vs-editability up front. We could offer an analogous knob (e.g., "strict to system" vs "creative") on generation.
- **Lo-fi/hi-fi switch** as a low-friction exploration affordance is worth borrowing for our multi-screen output.
- **Non-designer onboarding language** — Visily's plain, non-jargon copy and template-first blank-canvas escape are the bar for serving Segment C.
- **Their screenshot-to-design serves as a reference dataset of "what good-enough looks like"** for benchmarking our own vision pass (Brand-QA, Wedge #5).

## What we should AVOID copying
- **Whole-screen regeneration on every AI edit** — the cardinal sin. Our selection-based partial regen exists precisely to avoid this.
- **Shipping without auto-layout / structure.** For us, structure (auto-layout, tokens, state machine) is the product, not an afterthought.
- **Output that ignores the user's design system.** "Pretty but off-system" is the trap for Segment A/B users.
- **Lossy export bridges.** Avoid any architecture that requires re-importing/translating between tools — stay Figma-native via MCP.
- **Beta-quality text-to-design as a headline feature** without reliability — over-promising on input modes erodes non-designer trust fast.

## Open questions
- **No public benchmark for screenshot-to-design accuracy exists** — claims range from "100% replica" (simple page, Banani) to "needs manual cleanup on complex hierarchy" (Capterra/LogRocket). *Needs verification:* we should run our own controlled comparison (same screenshots) before citing any accuracy number externally.
- How does Visily's **multi-screen / auto-prototype** handle *state* (empty/loading/error states)? Likely shallow vs our state-machine-first wedge — needs hands-on confirmation.
- Exact **credit cost per AI action** (generation vs deep-design vs screenshot import) — pricing page gives monthly allotments, not per-action cost. Affects how we model competitive value-per-dollar.
- Does the Figma export produce **real auto-layout frames and component instances**, or flat groups? Help-center implies simplification — worth a hands-on export test if we ever interoperate.
- Visily's actual **non-designer retention/conversion** (do PMs stay, or churn after one clone job?) — unknown, would inform whether Segment C is a durable wedge or a top-of-funnel.

## Sources
- [Visily pricing](https://visily.ai/pricing/)
- [Visily screenshot-to-design feature](https://www.visily.ai/screenshot-editor-ai/)
- [Visily — export designs to Figma (help center)](https://www.visily.ai/help-center/export-designs-to-figma/)
- [Banani — hands-on Visily AI review (2026)](https://www.banani.co/blog/visily-ai-review)
- [Capterra — Visily verified reviews](https://www.capterra.com/p/254704/Visily/reviews/)
- [LogRocket — AI wireframe generators compared: Visily, UX Pilot, Uizard, Figma Make](https://blog.logrocket.com/ux-design/visilys-ai-wireframing-prototyping/)
- [Product Hunt — Visily reviews](https://www.producthunt.com/products/visily/reviews)
