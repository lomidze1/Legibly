# Figma Design Agent (native) — Research Notes

> Source: https://www.figma.com/blog/the-figma-agent-is-here/
> Date: 2026-06-14
> Researcher: Claude session via design-explorer

## TL;DR (5 bullets)
- **Threat #1 is real and native.** Figma's Design Agent launched 2026-05-20, runs directly on canvas, does text→design, parallel/multi-agent prompting, bulk edits, design-system-aware editing, and feedback synthesis. Free during beta (no credit consumption); AI credits apply at GA.
- **Its design-system fidelity is "soft," not "strict."** It is *steered* by @mentioning tokens/components and by "Skills" (markdown convention files), and seeds from your most-used components — but it does not hard-fail when it invents off-system primitives. Reviewers report layout/spacing/hierarchy misreads even on clean auto-layout files. **This is our wedge #1 (system-strict).**
- **No in-loop accessibility, no brand-QA.** No source describes a WCAG pass, contrast enforcement, or a vision-based brand consistency gate. Figma's own code outputs are repeatedly called "neither accessible, semantic, nor clean." **Wedges #2 and #5 are wide open.**
- **Weak on multi-screen flow logic and code export.** First Draft can't build whole apps or wire prototype connections; the Agent routes code work to Figma Make rather than emitting editable React in Figma Design. No state-machine-first flow planning. **Wedges #3 and #4 open.**
- **Pricing roadmap is a moat-killer for heavy users.** Credit enforcement starts 2026-03-18 (already live). Full seats: Pro 3,000 / Org 3,500 / Ent 4,250 credits/mo (~50–70 prompts). Starter/Edu/Gov excluded entirely from the Agent. Overage add-ons start $120/mo (+5,000); pay-as-you-go ~$0.03/credit, Q2 2026. (Note: conflicting beta-start dates across sources — see Open Questions.)

## Capabilities
| Feature | Available? | Notes |
|---------|------------|-------|
| Text → canvas (generate screens) | ✅ | Natural-language prompts produce designs directly on canvas |
| Edit existing designs in place | ✅ | Strong: bulk rename variables, swap components, padding changes across files |
| Multi-agent / parallel prompting | ✅ | "Parallel prompt to play out multiple ideas at once"; edit while agent iterates |
| Style/direction variations | ✅ | Generates minimal/bold/playful variants for comparison |
| Design-system *awareness* | ⚠️ | Seeds from most-used components; @mention tokens/variables/components to steer; "Skills" markdown files encode conventions |
| Design-system *enforcement* (hard-fail on off-system) | ❌ | No fail-closed behavior; reviewers report spacing/hierarchy/layout misreads even on clean auto-layout |
| Multi-screen flow logic / state machine | ❌ | First Draft limited to components/sections/screens, "not whole apps"; no prototyping connections generated |
| Editable React/code inside Figma Design | ❌ | Routes to Figma Make; not a code-export tool. Figma Make code "not production-ready," "look every bit AI-generated" |
| In-loop WCAG 2.2 AA accessibility | ❌ | No source describes a11y enforcement; Figma outputs "neither accessible nor semantic" |
| Selection-based partial regeneration | ⚠️ | Can edit selected elements/bulk-edit, but not framed as a deliberate select→regenerate primitive |
| Brand-QA vision pass before commit | ❌ | Not mentioned anywhere |
| Custom fonts / image support (in MCP "for Agents") | ❌ | "No image support or custom fonts yet" |
| Feedback / comment synthesis | ✅ | Summarizes comment threads into themes |
| Convert to dark mode / set component states | ✅ | Listed design-system editing capability |
| URL/HTML → editable Figma layers | ⚠️ | Design Agent itself can't; separate `generate_figma_design` MCP tool converts live HTML→layers |
| MCP / programmatic access | ✅ | `use_figma` MCP tool: create/read/update files; requires Pro+ (no Starter MCP) |

## Pricing (verified, cross-sourced)
- **Beta:** Agent consumes **0 credits** during beta. "AI credits will apply at general availability." (Figma blog)
- **Credit enforcement live since 2026-03-18** (all seat credit limits enforced).
- **Full-seat monthly allocations:** Starter 500 · Professional 3,000 · Organization 3,500 · Enterprise 4,250. Dev/Collab/View seats: 500/mo on all plans. Starter + View seats also capped at 150 credits/day.
- **Per-action cost (variable by complexity):** simple text edit ~10–20 credits; complex generation ~100–340 credits; First Draft / Make prototype ~20 credits each. AI search / rename layers / FigJam stickies are free. (banani.co / vibecodingacademy)
- **Practical throughput:** ~50–70 prompts/month for a Full seat before exhaustion.
- **Add-on subscriptions (admins):** $120/mo → +5,000 · $180/mo → +7,500 · $240/mo → +10,000 (shared).
- **Pay-as-you-go:** 5,000=$150 / 7,500=$225 / 10,000=$300 (≈$0.03/credit); rolling out **Q2 2026**. Credits reset monthly, no rollover.
- **Plan eligibility for the Agent:** Full seats on Professional/Organization/Enterprise. Collab + Dev seats can use it in drafts. **Starter, Education, Government excluded.**

## Strengths
- **Zero-friction native integration** — runs on the canvas/left rail, no external tool, no export round-trip. This is the structural advantage we can never match on Figma's home turf.
- **Best-in-class bulk editing** — rename/swap/restyle across many screens at once; genuinely useful and hard to beat.
- **Multiplayer + multi-agent** — parallel exploration while collaborating; fits existing team workflows and comments.
- **Distribution** — bundled into Figma seats teams already pay for; massive default-tool advantage.
- **"Skills" markdown convention files** — a real attempt at steering toward team standards (worth studying, see leverage).

## Weaknesses (= our opening)
- **System-strict gap (our wedge #1):** steering is advisory (@mention + Skills + recency seeding), not enforced. It will still emit off-system primitives, and reviewers report it misreads spacing/hierarchy on clean systems. **We hard-fail when the model invents off-system primitives — Figma does not.**
- **No in-loop a11y (our wedge #2):** no contrast/semantic/WCAG gate anywhere in the pipeline; Figma's broader output is openly criticized as inaccessible. **We make WCAG 2.2 AA a blocking step.**
- **No selection-native partial regeneration as a first-class primitive (our wedge #3):** bulk edit exists, but not a deliberate "regenerate just this selected region against the system" loop. **We make this the core interaction.**
- **No multi-screen state-machine planning (our wedge #4):** can't build whole flows or wire prototypes; generates screens, not flow logic. **We plan a state machine first, then render per-screen.**
- **No brand-QA vision pass (our wedge #5):** nothing reviews the rendered result for brand consistency before commit. **We add an Opus vision gate.**
- **Pricing creates an exit ramp:** ~50–70 prompts/mo before paying overages; Starter/Edu/Gov fully locked out. A focused, predictable plugin can serve the excluded segment and heavy users priced out of credits.
- **Code path is a dead-end for devs:** routes to Figma Make (non-production code); no editable React in Figma Design. Our MCP-first portable core can serve dev/designer-via-MCP better.

## What we can leverage
- **Study "Skills" markdown files** as a UX pattern for encoding design conventions — but make ours *enforced* (validation/hard-fail) rather than advisory. Our `spec-validator` + DesignSpec is the strict counterpart.
- **Positive-sum on MCP:** Figma exposes `use_figma` and `generate_figma_design` MCP tools (HTML→editable layers). Our MCP-first core can interoperate — we can position as the strict/a11y/brand layer *on top of* Figma's canvas, not purely against it.
- **Pricing arbitrage messaging:** Figma's credit ceiling (~50–70 prompts) + Starter exclusion is concrete, citable positioning for our freemium tier.
- **Bulk-edit is solved by Figma** — we should NOT compete there; concede it and focus the wedges.

## What we should AVOID copying
- **Don't build a general-purpose canvas agent** — we lose the native-integration battle by definition. Stay narrow on the 5 wedges.
- **Don't ship advisory-only system steering** — that's exactly Figma's weakness; if we copy "soft" steering we have no differentiation.
- **Don't route code to a black-box generator** — Figma Make's "AI-generated-looking, non-production" output is the anti-pattern. Keep system-strict + a11y in the loop.
- **Don't replicate the opaque credit model** as our pricing UX — predictability is a wedge against the ~340-credit-per-generation surprise bills.

## Open questions
- **Beta-start date conflict:** Figma blog/TechCrunch say 2026-05-20; MakerStack says "launched April 2026" and ties it to MCP "Figma for Agents." Are the canvas Agent and the MCP "for Agents" product the *same* launch or two tracks? Needs verification.
- **Will the Agent specifically consume credits at GA, and at what per-prompt rate?** Blog confirms credits apply at GA but no Agent-specific schedule is published yet.
- **Does GA bring any a11y/semantic guarantees?** No roadmap signal found — monitor.
- **Does "Skills" enforcement ever become fail-closed**, or remain advisory? If Figma adds hard validation, it narrows our wedge #1.
- **Custom font / image support timeline** in the MCP path (currently absent) — affects how complete a competing flow we must offer.

## Sources
- [The Figma Agent is here (official blog, 2026-05-20)](https://www.figma.com/blog/the-figma-agent-is-here/)
- [TechCrunch — Figma adds an AI assistant to its canvas](https://techcrunch.com/2026/05/20/figma-adds-an-ai-assistant-to-its-collaborative-canvas/)
- [LogRocket — Figma AI 2026 quick overview](https://blog.logrocket.com/ux-design/figma-ai-2026-quick-overview/)
- [Figma Help — How AI credits work](https://help.figma.com/hc/en-us/articles/33459875669015-How-AI-credits-work)
- [Figma Blog — Updates to AI credits in Figma](https://www.figma.com/blog/updates-to-ai-credits-in-figma/)
- [Anima — Figma Design Agent review: features, pros, cons](https://www.animaapp.com/blog/genai/figma-design-agent-review-features-pros-cons-best-alternative/)
- [MakerStack — Figma for Agents review (2026)](https://makerstack.co/reviews/figma-for-agents-review/)
- [banani.co — 2026 Figma pricing for Dev Mode, Make, FigJam](https://www.banani.co/blog/figma-pricing-and-credits)
- [Vibe Coding Academy — Figma AI credits explained](https://www.vibecodingacademy.ai/blog/figma-ai-credits-everything-you-need-to-know)
