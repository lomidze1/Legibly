# v0 (Vercel) — Figma Integration & Select-and-Reprompt Loop — Research Notes

> Source: https://v0.app/docs/figma (primary), https://v0.app/docs/design-mode
> Date: 2026-06-14
> Researcher: Claude session via design-explorer

## TL;DR (5 bullets)
- **v0 is a code generator, not a design tool.** Input modes: text, screenshots/files, and Figma link import. Output: React + Next.js + Tailwind CSS + shadcn/ui code. It lives *outside* Figma entirely.
- **Figma import is one-way (design → code) only.** "v0's output never becomes a design file. There's no Figma export, no editable screens to hand off to a designer." No round-trip, no Figma write-back. This is the single biggest structural gap vs. our in-Figma plugin.
- **Its select-and-reprompt loop ("Design Mode") is the pattern to study.** Click an element in the live preview → selection handles + style panel appear → either tweak via controls or type a natural-language instruction. v0 auto-attaches a *screenshot of the selected element* + your prompt to the model. This is the closest analog to our selection-based partial regen.
- **Figma import only extracts visual layout + design tokens (colors, spacing).** It does NOT round-trip Figma components, variants, prototype interactions, animations, auto-layout constraints, or variable bindings. "Too much content in one frame may reduce generation quality" — fidelity degrades on complex frames.
- **Pricing:** Free ($5 credits/mo, 7 msgs/day) → Team $30/user/mo → Business $100/user/mo → Enterprise custom. Token-based credit burn is unpredictable as chat history grows.

## Capabilities

| Feature | Available? | Notes |
|---------|------------|-------|
| Text prompt input | ✅ | "Describe your idea in your preferred language" |
| Screenshot / image input | ✅ | Visual references; lower fidelity than Figma link |
| Figma link import | ✅ | Paste link via attachment icon; extracts "visual layout and underlying design tokens like color palettes and spacing" |
| Output: React / Next.js | ✅ | "React and Next.js first" — deep ecosystem coupling |
| Output: Tailwind CSS | ✅ | Default styling layer (lock-in, see weaknesses) |
| Output: shadcn/ui | ✅ | Default component foundation |
| Custom Tailwind config | ✅ | Can incorporate custom config for team styles |
| Arbitrary npm packages | ✅ | "Supports working with any public npm packages" (MUI, React Aria, proprietary libs) |
| **Select element → reprompt (Design Mode)** | ✅ | Click element in preview → handles + design panel; `Cmd/Ctrl + I` toggles. **Auto-attaches a screenshot of the selected element + your instruction to the model.** |
| Visual style editing (no AI) | ✅ | Typography, color/bg, margin/padding all sides, borders, opacity, radius, shadows, inline text edits — pending until applied |
| Persistent conversational context | ✅ | Maintains chat history across turns; multi-turn refinement |
| Real-time preview | ✅ | Live preview + visual progress indicators |
| Auto error-fix | ✅ | "Intelligent diagnostics" identify and fix code errors |
| GitHub sync / PRs | ✅ | Import repos, sync env vars, open PRs from chat |
| Adaptive style learning | ⚠️ | "The more you use v0 with your Figma designs, the better it gets at understanding your style preferences" — opaque, unverifiable claim |
| **Figma export / write-back (round-trip)** | ❌ | No path from generated code back into Figma |
| Figma components / variants mapping | ❌ | Not extracted; only visual layout + tokens |
| Figma prototype interactions / animations | ❌ | Not processed (docs only mention "visual layout") |
| Figma auto-layout / constraints fidelity | ❌ | Not round-tripped; reconstructed as Tailwind guesses |
| Figma variable bindings | ❌ | Tokens read as values, not as bound variables |
| Design Mode on mobile viewport | ❌ | "Not available on read-only chats or on mobile viewports" |
| WCAG / a11y enforcement | ❌ | No in-loop accessibility checking |
| Multi-screen / state-machine modeling | ❌ | Per-frame component generation; no flow/state model |

## Pricing
- **Free:** $0/mo — $5 included monthly credits, visual editing, GitHub sync, **7 messages/day limit**
- **Team:** $30/user/mo (marked "Popular") — $30 credits/user/mo + $2 free daily credits on login, team collaboration, centralized billing
- **Business:** $100/user/mo — $30 credits/user/mo + $2 daily, **training opt-out by default**, team features
- **Enterprise:** Custom — data never used for training, SAML SSO, RBAC, priority access, guaranteed support
- **Caveat:** Separate per-token model pricing (v0 Mini / Pro / Max / Max Fast). Review note: "when you're mid-session with a growing chat history... costs add up faster than expected." Credit burn is unpredictable.

## Strengths
- **Mature select-and-reprompt loop.** Design Mode's element-click → screenshot-attach → natural-language reprompt is a polished, proven UX for localized AI edits. The screenshot-of-selection trick is clever (gives the model precise visual scope).
- **Clean idiomatic code output** for React/Tailwind/shadcn devs — scaffolds auth forms, data tables, API routes well.
- **Full-stack post-Feb-2026 rebuild:** server-side API routes, DB connections, sandbox previews, one-click Vercel deploy, GitHub PRs.
- **Real conversational persistence** — multi-turn refinement with retained context, live preview, auto error-fixing.
- **Flexible system mapping** via custom Tailwind config + arbitrary npm packages.

## Weaknesses (our wedge opportunity)
- **No round-trip — code is a dead end for designers.** v0 output "never becomes a design file." → **Our wedge #3 (selection-based partial regen *native in Figma*)**: we mutate the actual Figma node tree, so the designer's source of truth is never abandoned. v0 forces a one-way bridge; we keep the loop closed inside Figma.
- **Figma fidelity is lossy** — only visual layout + flat tokens extracted; components/variants/prototypes/auto-layout/variable bindings are dropped. → **Our wedge #1 (system-strict generation)**: we read variables/components via Figma MCP and *bind* to them rather than re-guessing values as Tailwind classes.
- **Tailwind + React + Next.js lock-in.** "Output doesn't drop cleanly into other frameworks without rework." → **Our MCP-first portable core**: we emit a tool-agnostic DesignSpec, not framework-coupled code.
- **Zero accessibility loop.** No WCAG checking anywhere. → **Our wedge #2 (in-loop WCAG 2.2 AA)** is a clean differentiator.
- **No multi-screen / state-machine model.** Per-frame, per-component generation; no concept of flows or states. → **Our wedge #4 (multi-screen state-machine-first)**.
- **Wrong tool for non-developers.** Review: "non-developers who need visual designs rather than components are better served by AI design tools built for that workflow." → confirms our broad target (PM/non-designer) is underserved by v0.
- **Unpredictable credit burn** tied to growing chat-history token counts — a UX/cost trust problem we can avoid with bounded, scoped operations.

## What we can leverage
- **The screenshot-of-selection pattern for partial regen.** When the user selects a Figma node, send a rendered image of *just that node* + its subtree context + the natural-language instruction to Claude vision. This scopes the model's attention precisely — directly portable to our selection-based regen (wedge #3).
- **Dual-mode editing on selection:** direct style controls (deterministic, no model call) *plus* a "describe the change" box (AI call). v0 splits cheap deterministic edits from expensive AI edits — good cost discipline we should mirror.
- **Pending-edits-until-applied UX** — changes preview live but stay staged until confirmed. Good fit for our selection feedback / error-retry UX (Track G).
- **"Break complex frames into components" guidance** — v0's own docs admit large frames degrade quality. Validates a per-node/per-component scoping strategy for our generation, and gives us onboarding copy to set user expectations.
- **Persistent conversational context** as a baseline expectation for our chat panel (Track G).

## What we should AVOID copying
- **Code-as-output as the primary artifact.** v0's terminal-state is framework-coupled code outside the design tool. Our deliverable is *Figma nodes bound to the design system* — never abandon the canvas. Emitting React/Tailwind would re-create v0's round-trip dead-end and forfeit our defensible position.
- **Tailwind/shadcn/Next.js coupling.** Locks users into one stack; contradicts our MCP-first portable-core thesis.
- **Token-metered, history-inflating credit model** as the *only* pricing lever — it erodes trust mid-session. Prefer bounded per-operation cost where possible.
- **"It learns your style over time" opaque claims** with no inspectability. We should make system-adherence explicit and auditable (variables/components shown), not a black box.
- **Screenshot-only ingestion of design systems.** We have Figma MCP + variables API — read structured tokens/components, don't flatten to pixels then re-infer.

## Open questions
- Does v0's Figma import read Figma *variables* as structured tokens or just sampled color/spacing values? Docs say "design tokens like color palettes and spacing" but mechanism is unverified — likely sampled, not bound. **Needs verification.**
- Exactly which model is invoked on a Design-Mode reprompt, and does it re-send the whole chat history or just the selected-element screenshot + local context? (Cost implication for our analog.)
- How does v0 handle a Figma frame with auto-layout — reconstruct as flex/grid Tailwind, or pixel-position? (Affects how we message our "system-strict + structural" advantage.)
- Is there any partial-import (single component/frame) vs. whole-file import distinction in the API surface?
- Free-tier "7 messages/day" — does a Design-Mode reprompt count as a message? (Affects competitive free-tier framing.)

## Sources
- [v0 Docs — Figma](https://v0.app/docs/figma)
- [v0 Docs — Design Mode](https://v0.app/docs/design-mode)
- [v0 Docs (overview)](https://v0.app/docs)
- [v0 Pricing](https://v0.app/pricing)
- [Vercel Blog — Working with Figma and custom design systems in v0](https://vercel.com/blog/working-with-figma-and-custom-design-systems-in-v0)
- [Flowstep — We Tried Vercel v0: Pricing Breakdown and Honest Review](https://flowstep.ai/blog/v0-pricing/)
- [Vercel Community — Import Figma to v0.dev](https://community.vercel.com/t/import-figma-to-v0-dev/27234)
- [Vercel Community — Advice on importing designs from Figma](https://community.vercel.com/t/advice-on-importing-designs-from-figma/9093)
</content>
</invoke>
