# Figma Community AI Design Plugins — Competitor Survey

> Source: Figma Community plugin pages (8 plugins) + third-party reviews/stats
> Date: 2026-06-14
> Researcher: Claude session via design-explorer
> Method note: Figma Community pages return HTTP 403 to WebFetch (bot-protected, JS-rendered). Data triangulated from third-party stats sites (fig-stats.com, figma.pluginsage.com), vendor sites, reviews, and HN/forum threads. Install/rating figures are point-in-time and should be re-verified before any pricing/positioning decision.

---

## TL;DR (5 bullets)

- The namespace is **crowded and converging**: nearly every plugin is "prompt → editable Figma layers," and many now bolt on "use your design system" + "clone a website/URL." Differentiation is thin.
- **Naming is keyword-stuffed**, not brand-led: titles pile up "AI + UI Generator + Wireframe + Design System + Co-Pilot/Agent" to win Community search. A clean brand name is rare (GenUI, SystemForge, Fluvara, Buddy are the exceptions).
- **Pricing norm = freemium with a daily/credit free tier**, Pro typically ~$6–$15/mo (UX Pilot), with credit-heavy outliers (Codia $49/mo). Free tiers are tight (5 prompts/day or ~90 one-time credits).
- **Table stakes:** text→UI, editable named layers (not raster), auto-layout, responsive variants, iterative refinement, design-system import, image/URL input. Two now lead with **Claude/multi-LLM** (Buddy by Anima).
- **The recurring GAP that validates our wedges:** none **hard-fail off-system primitives**, none run **in-loop WCAG 2.2 AA** as a gate, none do native **selection-based partial regen** as a first-class loop, none are **multi-screen state-machine-first**, and none ship a **vision-based Brand-QA pass**. "Design system" support across the field is *soft suggestion*, never *enforcement*.

---

## Per-plugin Capabilities

Legend: I/O = primary inputs → outputs. ✅ strong / ⚠️ partial-or-soft / ❌ absent.

| Plugin (link) | One-line | I/O | Key capability | Pricing (visible) | Main weakness vs our 5 wedges |
|---|---|---|---|---|---|
| [UX Pilot: AI UI Generator, Design System & Wireframe Generator](https://www.figma.com/community/plugin/1257688030051249633) | AI UX/UI platform (web + plugin) generating wireframes → hi-fi screens & flows | Text / image / PRD → wireframes, hi-fi UI, components, screen flows | Breadth: wireframe→hi-fi, Autoflow (screen mapping), Section Edit, predictive heatmaps & design reviews; "generate on-brand / with your design system" | Freemium: free ~90 one-time credits (~15 screens); Pro from ~$6/mo; Standard ~$15/mo (420 credits/~70 screens, Figma+code export). ~28k–100k+ installs (sources vary) | "On-brand" is a soft preference, not a hard gate; heatmaps/reviews ≠ WCAG 2.2 AA pass/fail; Section Edit is closest competitor to our selection-regen but not system-strict; no Brand-QA vision pass |
| [Codia AI DesignGen: Prompt-to-Design Magic](https://www.figma.com/community/plugin/1355208994639626356) | Prompt → fully editable, responsive UI components in Figma | Text → editable Figma components (mobile/tablet/desktop) | Real components (layers, constraints, auto-layout), auto multi-breakpoint, 200+ blocks/themes; also screenshot→design & design→code elsewhere in Codia suite | Freemium: free-forever 5 AI Transform credits/mo; Starter ~$49/mo (credit-based) | Generates *new* system/themes rather than enforcing *yours*; no a11y gate; no state-machine multi-screen modeling; no selection-scoped regen loop; no Brand-QA |
| [Text to Design - AI Assistant](https://www.figma.com/community/plugin/1234140943476658588) | Text/image → Figma designs via LLM-generated HTML/CSS converted to layers | Text / image (DALL·E v3) → Figma elements; also design→code | Pipeline: LLM emits HTML+CSS → converted into native Figma layer types; broad element coverage; design-to-code | Token-based subscription in-plugin (tiers not publicly detailed); ~40k+ designers claimed | HTML→layers pipeline ignores your component instances/tokens (off-system by construction); no WCAG gate; no selection regen; no multi-screen state model; no Brand-QA |
| [Fluvara.ai: AI Designer](https://www.figma.com/community/plugin/1550163197521237586) | Prompt → real editable UI screens directly on canvas | Text / image / URL / HTML → real Figma layers (auto-layout, named components) | "Production-ready" named layers, proper hierarchy/spacing; in-plugin upgrade; no account/card to start | Freemium: free 5 AI prompts/day; Pro upgrade in-plugin (price not public) | Clean output but system-agnostic (generates its own structure); no hard off-system fail; no a11y gate; no selection-based partial regen as core loop; no Brand-QA |
| [Buddy — Figma AI Design Agent / UX Co-Pilot](https://www.figma.com/community/plugin/1616481120325792817) (by Anima) | Agentic chat in canvas that generates, edits & takes actions across Figma | Chat / URL (clone site) → screens, flows, components, variants + canvas actions | Most agentic of the set: creates frames, *uses your components*, applies variables, sets auto-layout, builds variants, reorganizes pages; **multi-LLM (Claude Opus/Sonnet, GPT, Gemini, Codex)**; parallel chats; image-gen + web search tools | Freemium (Anima account); paid tiers via Anima (not itemized here) | Closest direct threat (agentic, uses components, Claude-backed) — but "uses your components" is best-effort, not hard-fail; no WCAG 2.2 AA gate; selection regen not the headline loop; no state-machine-first multi-screen; no dedicated Brand-QA vision pass |
| [Figr Identity — Generate Design Systems with AI](https://www.figma.com/community/plugin/1350743748296105581) | One-click generation/maintenance of a design system (tokens + components) | Params / brand inputs → tokens (color, type, spacing, effects, grid) + 80+ components + docs | Token engine with live updates (drag primary → cascade); 80+ production-grade components w/ variants; in-Figma preview/edit | Listed as free (premium tiers not clearly documented) | Builds a *new* system, doesn't enforce generation against an existing one; not a screen generator; no a11y gate beyond contrast hints; HN feedback flags spacing/grid/typography-preview gaps; no Brand-QA |
| [GenUI](https://www.figma.com/community/plugin/1554166484995009659) | Concise prompt → editable, structured UI explorations | Text brief → frames, layout, key components; partial sections | Iterative refinement ("tighter spacing", "add dark variant", "add onboarding step"); **partial-section generation** (hero/auth/footer); named layers; "accessible contrast guidance"; optional reasoning | Pricing not publicly visible (check listing) | Partial-section gen is conceptually near our selection-regen, but it's prompt-driven sections, not selection-scoped regen against a locked system; contrast guidance is advisory, not a WCAG 2.2 gate; no state-machine multi-screen; no Brand-QA |
| [SystemForge](https://www.figma.com/community/plugin/1603993781163260512) (by Joshua Vizzacco / SHOP FRONT) | Paste a URL → full design-system foundation in ~60s | URL → Figma variables, semantic tokens, text styles, Light/Dark architecture w/ real alias chains | Strong **token architecture**: semantic tokens + real alias chains + scalable Light/Dark; production-ready variables fast | Pricing not publicly confirmed (check listing) | Foundation-builder, not a screen generator and not a generation *guard*; no a11y gate; no selection regen; no multi-screen; no Brand-QA. (But its semantic-token/alias model is worth studying for our system layer.) |

---

## Pricing (cross-plugin)

- **Model:** Freemium is universal. Free tier is a hook with hard limits.
  - Daily-cap free tier: Fluvara (5 prompts/day).
  - Monthly-credit free tier: Codia (5 transform credits/mo), UX Pilot (~90 one-time credits ≈ 15 screens).
- **Paid bands:**
  - Low/indie: UX Pilot Pro ~$6/mo; Standard ~$15/mo.
  - Credit-heavy: Codia Starter ~$49/mo.
- **Free / unpriced:** Figr Identity (free), GenUI & SystemForge (not publicly confirmed — likely free or early-stage).
- **Implication:** market has anchored "AI design plugin Pro ≈ $6–$15/mo." Anything above ~$20/mo (Codia $49) reads as "for teams/code-gen," not solo designers.

---

## Strengths (what the field does well)

- Output quality has converged on **real, named, editable Figma layers with auto-layout** — raster output is dead.
- **Responsive/multi-breakpoint** generation is increasingly default (Codia, UX Pilot).
- **Multi-input** is normal: text + image + URL/HTML clone.
- **Agentic, multi-LLM** is the new frontier (Buddy/Anima leveraging Claude is the most advanced).
- **Token/system tooling** is mature on the dedicated side (Figr Identity, SystemForge alias chains).

---

## Weaknesses (our wedge opportunity)

Mapped to our 5 wedges — this is the validating gap:

1. **System-strict, hard-fail on off-system primitives — NONE.** Every generator either invents its own system (Codia, Fluvara, Text to Design, GenUI) or *softly* "uses your design system / on-brand" (UX Pilot, Buddy). No one *blocks* output that introduces off-system colors/spacing/components. This is our sharpest differentiator.
2. **In-loop WCAG 2.2 AA as a gate — NONE.** Best in field is advisory: "predictive heatmaps / design reviews" (UX Pilot), "accessible contrast guidance" (GenUI). No pass/fail a11y gate, and no one cites 2.2 specifically.
3. **Selection-based partial regen, native — only adjacent.** UX Pilot "Section Edit" and GenUI "partial sections" are the closest, but they're prompt-region edits, not selection-scoped regeneration that respects a locked system. No one treats Figma selection as the primary regen unit.
4. **Multi-screen, state-machine-first — NONE.** Tools generate screens and "flows/Autoflow" (UX Pilot) as collections of screens, but none model states/transitions as a state machine driving generation.
5. **Brand-QA vision pass — NONE.** No competitor ships a vision-model QA step that checks rendered output against brand rules. "Design reviews" (UX Pilot) are heuristic/predictive, not a vision-based brand-consistency gate.

---

## What we can leverage

- **SystemForge's semantic-token + alias-chain + Light/Dark architecture** is a strong reference for our internal system representation (the thing we'll enforce against).
- **Figr Identity's live-cascade UX** (drag primary → tokens update) is a good pattern for showing system changes propagate.
- **UX Pilot "Section Edit" + GenUI "partial sections"** validate appetite for sub-screen editing — we extend this to selection-scoped, system-strict regen.
- **Buddy/Anima proves Claude-in-Figma agentic UX is viable and accepted** — de-risks our model choice and the chat-panel-in-canvas pattern.
- **Pricing anchor ($6–$15/mo Pro)** gives us a defensible freemium band.

---

## What we should AVOID copying

- ❌ **Keyword-soup plugin titles.** The "AI UI Generator + Wireframe + Design System + Co-Pilot + God Mode + ..." title arms race is a race to the bottom and signals "generic." Our wedge lets us name with a brand + a sharp tagline.
- ❌ **"Generate a brand-new design system" as the headline.** That's a commodity (Figr, SystemForge, Codia themes). Our value is *enforcing the user's existing system*, not minting another.
- ❌ **Soft "on-brand" promises with no enforcement.** This is exactly the credibility gap; if we say system-strict, we must hard-fail.
- ❌ **Raster/HTML-to-layers shortcuts** (Text to Design's pipeline) that detach from component instances/tokens — incompatible with system-strict.
- ❌ **Over-broad credit pricing ($49/mo)** for a solo-designer MVP — wrong audience signal.

---

## Cross-plugin synthesis

### Naming patterns in the namespace
- **Two camps:**
  1. **Keyword-stack titles** (search-optimized): "UX Pilot: AI UI Generator, Design System & Wireframe Generator"; "Buddy — AI UI UX Generator, Claude Design to Figma, Co-Pilot Agent ... God Mode, Wireframe"; "Codia AI DesignGen: Prompt-to-Design Magic." Pattern = `Brand + : + [AI] + [UI/UX] + Generator/Designer + (Wireframe | Design System | Co-Pilot | Agent)`.
  2. **Clean brand names** (rarer): GenUI, SystemForge, Fluvara, Buddy, Figr.
- **Tagline verbs:** "Generate," "Prompt-to-Design," "AI Designer/Agent/Co-Pilot," "Magic," "God Mode." Heavy on speed + magic, light on *constraint/quality*.
- **Whitespace for us:** nobody owns **"strict / system-safe / accessible / on-system"** as the core promise. A name/tagline emphasizing *guardrails and correctness* (not just generation speed) is uncontested.

### Pricing norms
- Freemium default; free tier is intentionally tight (5/day or ~90 one-time credits).
- Pro band ≈ **$6–$15/mo** for solo; **~$49/mo** for credit/code-heavy team tiers.
- Several newer/brand-named entrants (GenUI, SystemForge) are free or unpriced — early-stage land-grab.

### Table stakes (must-haves to be credible)
1. Text → editable, **named** Figma layers (no raster).
2. **Auto-layout** + responsive/multi-breakpoint variants.
3. Multi-input: text + image + **URL/HTML clone**.
4. **Iterative refinement** via chat ("tighter spacing", "dark variant").
5. **Design-system import / "on-brand"** mode (even if soft).
6. In-plugin freemium upgrade, no-friction start.

### The recurring GAP none fills well
> **Generation without a quality gate.** Every plugin optimizes "prompt → plausible UI fast." None makes **correctness enforceable**: not system-conformance (hard-fail off-system), not accessibility (WCAG 2.2 AA pass/fail), not brand fidelity (vision QA). "Design system" support is universally a *suggestion*, never a *constraint*. Selection-scoped regen and state-machine multi-screen are barely touched.

### Implications for our naming + positioning + MVP scope
- **Naming:** Pick a real **brand name** + a sharp, constraint-led tagline (e.g., "system-strict UI generation," "on-system or it doesn't ship"). Avoid the keyword-soup pattern. Reserve a couple of high-value keywords for the Community subtitle only, not the brand.
- **Positioning:** Don't compete on "fastest prompt→UI" (saturated, includes Anima+Claude). Compete on **"the only generator that *can't* go off-system, fails accessibility loudly, and QAs against your brand."** Frame Figma's native Agent + Buddy as the "fast but unguarded" set; we are "fast *and* guaranteed correct."
- **MVP scope (focus the wedges that no one has):**
  1. **System-strict generation with hard-fail** — flagship, fully unique. (Highest priority.)
  2. **In-loop WCAG 2.2 AA gate** — second flagship, also unique and cited specifically as 2.2.
  3. **Selection-based partial regen** — extends a validated appetite (Section Edit / partial sections) into our differentiator.
  4. Defer/lite for v1: **state-machine multi-screen** and **Brand-QA vision pass** — high-value but heavier; ship as the v2 moat once 1–3 prove PMF.
- **Pricing:** Anchor freemium with a strict free tier; Pro in the **$10–$15/mo** band (premium-but-credible vs UX Pilot), justified by the guarantee (correctness), not raw generation volume.

---

## Open questions

- Exact current install counts & ratings per plugin (Figma pages are bot-blocked; numbers here vary by source and date — re-verify in-app).
- Confirmed Pro pricing for Fluvara, GenUI, SystemForge (not public at survey time).
- How strictly does Buddy/Anima actually bind to existing components vs. approximate them? (Direct test needed — it's our nearest competitor.)
- Does any plugin's "design review" (UX Pilot) include a real contrast/WCAG check we should benchmark against?
- SystemForge's alias-chain token model — worth a deeper teardown for our system layer.

---

## Sources

- [UX Pilot — Figma Community](https://www.figma.com/community/plugin/1257688030051249633) · [pluginsage stats](https://figma.pluginsage.com/plugins/1257688030051249633) · [UX Pilot review (Dupple)](https://dupple.com/tools/ux-pilot) · [UX Pilot Figma guide](https://uxpilot.ai/blogs/generate-ui-figma-ai)
- [Codia AI DesignGen — Figma Community](https://www.figma.com/community/plugin/1355208994639626356) · [Codia pricing](https://codia.ai/pricing) · [Codia AI design tool](https://codia.ai/ai-design-tool)
- [Text to Design - AI Assistant — Figma Community](https://www.figma.com/community/plugin/1234140943476658588) · [Building a Figma AI Assistant (Medium, Ollie The Dev)](https://medium.com/@olliethedev/building-a-figma-ai-assistant-a33a1c32a377) · [texttodesign.ai](https://www.texttodesign.ai/)
- [Fluvara.ai: AI Designer — Figma Community](https://www.figma.com/community/plugin/1550163197521237586) · [fluvara.ai](https://fluvara.ai/) · [Fig Stats](https://fig-stats.com/plugins/1550163197521237586)
- [Buddy — Figma Community](https://www.figma.com/community/plugin/1616481120325792817) · [Anima blog: Figma AI Design Agent](https://www.animaapp.com/blog/genai/figma-ai-design-agent/) · [Anima Figma AI](https://www.animaapp.com/figma-ai)
- [Figr Identity — Figma Community](https://www.figma.com/community/plugin/1350743748296105581) · [Show HN: Figr Identity](https://news.ycombinator.com/item?id=39837423) · [Figr Identity v2 (Fountn)](https://fountn.design/resource/figr-identity-v2-generate-design-systems-quickly/)
- [GenUI — Figma Community](https://www.figma.com/community/plugin/1554166484995009659)
- [SystemForge — Figma Community](https://www.figma.com/community/plugin/1603993781163260512) · [Fig Stats](https://fig-stats.com/plugins/1603993781163260512)
