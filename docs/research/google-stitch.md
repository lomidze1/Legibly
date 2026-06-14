# Google Stitch (Gemini 3) — Research Notes

> Source: https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-gemini-3/
> Date: 2026-06-14
> Researcher: Claude session via design-explorer

## TL;DR (3-5 bullets)
- Stitch is now an **agentic, streaming-canvas, multiplayer** design tool on Gemini 3 — it renders UI live as you type/speak, added Google-Docs-style co-editing (May 20, 2026), and ships voice control ("Vibe Design"). It is **free** (no paid tier), which is what made it a market event.
- It exposes an **MCP server + SDK + 14 open "skills"** (Apache-2.0, [`google-labs-code/stitch-skills`](https://github.com/google-labs-code/stitch-skills)) that turn Stitch into a programmatically-callable design surface for Claude Code, Cursor, Gemini CLI, Antigravity, Codex, OpenCode.
- The MCP flow is **predominantly Stitch → code (design-to-code)**: a coding agent auto-pulls layout/colors/HTML/screenshots from a Stitch project. There IS an inbound path too (`generate-design`, `code-to-design`), making Stitch usable as an **output/render surface** for an external generator — directly relevant to our MCP-first portability thesis.
- **Output is "strong first draft, generic finish."** Users report AI-looking results, no in-tool fine-tuning (must re-prompt to tweak a font/bg), opaque hangs, and inconsistent cross-screen components. Figma export gives Auto Layout + named layers + editable text but is "not pixel-perfect."
- Net assessment: **Both threat and opportunity.** Threat to the "AI generates a hi-fi first draft" market (free + Google scale). Opportunity for us: Stitch has **no system-strict guarantee, no in-loop a11y, no selection-based partial regen, weak design-system depth** — and its MCP surface lets our core target it as one more positive-sum output canvas.

## Capabilities
| Feature | Available? | Notes |
|---------|------------|-------|
| MCP server exposed | ✅ | `npx @_davideast/stitch-mcp proxy`; configured via `.mcp.json`. Setup via `gcloud auth login` + enable API. ([Pillitteri](https://pasqualepillitteri.it/en/news/647/google-stitch-mcp-export-claude-code-design-to-code)) |
| MCP "skills" (machine-callable) | ✅ (14) | Design: `code-to-design`, `generate-design`, `manage-design-system`, `extract-design-md`, `extract-static-html`, `upload-to-stitch`. Build: `react-components`, `react-native`, `remotion`, `shadcn-ui`. Utils: `design-md`, `enhance-prompt`, `stitch-loop`, `taste-design`. ([repo](https://github.com/google-labs-code/stitch-skills)) |
| Inbound generation (we drive Stitch) | ✅ | `generate-design` = create/modify screens from text or images; `code-to-design` = HTML/React → Stitch. Lets external agent push designs IN. |
| Outbound (Stitch → code) | ✅ | Agent auto-retrieves layout/colors/HTML/screenshots from project; primary documented direction. |
| Streaming canvas | ✅ | Renders components live as you type/speak, reflows mid-generation; steerable before completion (replaced turn-based flow). ([TechTimes](https://www.techtimes.com/articles/316903/20260520/google-stitch-launches-real-time-ai-agent-multiplayer-editing-figma-charges-15-seat.htm)) |
| Infinite canvas | ✅ | Images, text, code, UI components in one workspace; screenshots/snippets as context. ([SFAI](https://sfailabs.com/guides/google-stitch-vs-figma)) |
| Multiplayer co-editing | ✅ (new) | Launched May 20, 2026, "like Google Docs." NOTE: March-2026 guides still listed it single-user — feature is recent, **needs verification it's GA not beta-flagged**. |
| Voice control | ✅ | "Vibe Design" via Gemini Live ("increase the header font size"). |
| Agent Manager | ✅ | Logs project evolution; parallel exploration of design directions. |
| Figma export | ⚠️ | Exports Auto Layout + named layers + editable text; "not pixel-perfect"; users report cross-screen nav inconsistencies. |
| Other exports | ✅ | HTML/CSS/Tailwind, React, React Native, AI Studio, Netlify deploy. |
| `DESIGN.md` brand-rule format | ✅ | Apache-2.0 open format carrying brand rules across Claude Code / Cursor / Copilot. |
| Placeholder image gen | ✅ | "Nano Banana 2" — context-aware realistic placeholders. |
| In-tool fine-tuning (post-gen tweak) | ❌ | Users must re-prompt to change font/background; "no friendly interface to tweak minor stuff." |
| System-strict / token-locked generation | ❌ | No guarantee output stays within an imported design system's tokens/components. |
| In-loop WCAG 2.2 AA enforcement | ❌ | No accessibility pass found. |
| Selection-based partial regen | ❌ | Steer-mid-stream exists, but not native "select node → regen just this" on a finished design. |
| Multi-screen state-machine modeling | ⚠️ | "Prototypes" stitches screens into flows/interactions; not an explicit state machine. |
| Brand-QA vision pass | ❌ | No vision-based brand-consistency audit. |

## Pricing (if applicable)
- **Free to all users**, launched via Google Labs; **no paid tier exists** despite ~6 months of user requests for higher limits.
- **Generation cap:** ~**350 generations/month** (some sources cite 150–400/day, resets midnight UTC — **figure is disputed, needs verification**). No credit card.
- Two generation tiers: **Standard** (Gemini 2.5 Flash) and **Experimental** (Gemini 2.5 Pro); blog headline touts **Gemini 3** for higher-quality UI generation.
- Direct contrast used in coverage: Figma **$15/editor/mo** (up to $75/seat for teams). Figma stock dropped ~8–10% on the announcement.

## Strengths
- **Free + Google distribution + Gemini 3** = enormous top-of-funnel; sets the "AI hi-fi first draft" price floor at zero.
- **Streaming, steerable canvas** is genuinely ahead of turn-based generators — strong perceived responsiveness.
- **Open, well-factored MCP skill set** (14 skills, Apache-2.0) makes it a clean, scriptable surface; `DESIGN.md` is a portable brand-rule artifact.
- **End-to-end reach**: design → React/RN/Tailwind → Netlify deploy, plus Antigravity coding handoff.
- Multiplayer + voice close two classic single-player AI-tool gaps.

## Weaknesses (our wedge opportunity)
- **No system-strict guarantee** → our wedge #1. Output drifts from an imported system; "generic AI look," inconsistent components across screens.
- **No in-loop WCAG 2.2 AA** → our wedge #2. No accessibility enforcement at generation time.
- **No selection-based partial regen on finished designs** → our wedge #3. Tweaking a finished element means full re-prompt; users explicitly complain there's no "tweak minor stuff" UI.
- **Multi-screen = prototype stitching, not a state machine** → our wedge #4. Flows are visual links, not modeled states/transitions.
- **No Brand-QA vision pass** → our wedge #5. No automated brand-consistency check.
- **Figma export is one-way and lossy** ("not pixel-perfect," nav drift) — it leaves Figma, doesn't live and edit *inside* Figma like we do.
- **Opaque execution** — "hangs indefinitely," "no visibility into what Stitch is doing." UX trust gap.
- **Design-system depth is shallow** vs Figma (variables, tokens, component variants) — Stitch does first 80%, hands the production 20% to Figma.

## What we can leverage
- **Target Stitch as an output surface (positive-sum).** Our MCP-first core can call `generate-design` / `code-to-design` to render our system-strict, a11y-checked spec into a Stitch project — making Stitch one more canvas reachable from our portable core (alongside Figma). Worth a spike on the inbound MCP path + auth model (`gcloud`/Google Cloud API enablement is a friction point to evaluate).
- **Adopt/interop with `DESIGN.md`** (Apache-2.0) as a brand-rule interchange artifact — our brand system could emit/consume it for cross-tool portability.
- **Streaming-canvas UX as a benchmark** for our own streaming/progress UX (Track G `streaming-ux.md`): live reflow + mid-stream steer + stop is the bar to match perceptually inside Figma.
- **Skill taxonomy** (design / build / utilities split) is a clean mental model for organizing our own agent/skill surface.

## What we should AVOID copying
- **The "generate, can't tweak, re-prompt" loop.** This is exactly the pain our selection-based partial regen solves — don't replicate full-regen-only editing.
- **Opaque agent execution** (silent hangs, no visibility). Our streaming + selection feedback must always show state and offer retry (Track G `error-ux.md`).
- **"Looks-good-generic" output without system fidelity.** Free + generic is a race to the bottom we can't win on price; our differentiation is fidelity, not speed-of-draft.
- **One-way Figma export as the integration story.** Our value is *native in-Figma* editing, not dumping a lossy file into Figma to rebuild.
- **No-paid-tier strategy** — Stitch's lack of monetization isn't a model for us; note it as the free-tier price pressure we design our freemium against.

## Open questions
- **Exact MCP wire-level tool surface** (tool names/JSON schemas the server advertises, vs the 14 "skills" which are client-side prompt packs). Needs a direct read of `@_davideast/stitch-mcp` / live `tools/list`.
- **Auth for programmatic inbound generation** — does driving Stitch via MCP require per-user Google Cloud project + API enablement? That gates whether we can offer it to non-Google users.
- **Generation quota truth** — 350/mo vs 150–400/day conflict; and what counts as a "generation."
- **Multiplayer GA status** — May-20 coverage says shipped free; confirm it's not Labs-flagged/limited.
- **Figma export round-trip** — does re-importing edited Figma back into Stitch work, or is it strictly one-way?
- **ToS for using Stitch's MCP as a downstream render target in a commercial product** — any restriction on programmatic/commercial use of Google Labs APIs.
- **Gemini 3 vs 2.5 tiering** — blog says Gemini 3; tier copy says 2.5 Flash/Pro. Which model actually serves which path?

## Sources
- [Google blog — Stitch with Gemini 3](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-gemini-3/)
- [google-labs-code/stitch-skills (GitHub, Apache-2.0)](https://github.com/google-labs-code/stitch-skills)
- [Pillitteri — Stitch MCP: design to code with Claude Code](https://pasqualepillitteri.it/en/news/647/google-stitch-mcp-export-claude-code-design-to-code)
- [TechTimes — Stitch real-time agent + multiplayer (May 20, 2026)](https://www.techtimes.com/articles/316903/20260520/google-stitch-launches-real-time-ai-agent-multiplayer-editing-figma-charges-15-seat.htm)
- [Geeky Gadgets — Stitch "Vibe Design" update](https://www.geeky-gadgets.com/gemini-vibe-design/)
- [SFAI Labs — Stitch vs Figma (March 2026 update)](https://sfailabs.com/guides/google-stitch-vs-figma)
- [Superdesign — Google Stitch review: what users actually say](https://www.superdesign.dev/blog/google-stitch-review)
