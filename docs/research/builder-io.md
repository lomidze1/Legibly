# Builder.io Visual Copilot — Research Notes

> Source: https://www.builder.io/blog/figma-to-code-visual-copilot
> Date: 2026-06-14
> Researcher: Claude session via design-explorer

## TL;DR (3-5 bullets)
- **Design→code only, one-directional.** Visual Copilot exports Figma to React/Vue/Svelte/Angular/Qwik/Solid/HTML. The canvas/IDE is the destination; there is no native edit-back-into-Figma loop (a "push Figma changes to Builder content" sync is mentioned as coming, but Figma is never the editing surface). ([blog](https://www.builder.io/blog/figma-to-code-visual-copilot))
- **Component mapping = AI semantic matching repo→Figma, index-driven.** A repo scan (`index-repo`) builds a design-system index (components, tokens, icons) stored on Builder's servers; generation then "uses your existing code components." Stated **~70% mapping accuracy**, user can manually remap. ([component-indexing](https://www.builder.io/c/docs/component-indexing), [GA blog](https://www.builder.io/blog/visual-copilot))
- **Pipeline = 3 stages:** custom model (2M+ data points) → Mitosis compiler (open source) → fine-tuned LLM for framework/styling polish. Not a single LLM call. ([blog](https://www.builder.io/blog/figma-to-code-visual-copilot))
- **Pricing:** Free (75 credits/mo, Figma plugin included) → Pro **$24/user/mo** → Team **$40/user/mo** (500 credits, $25 per extra 500) → Enterprise (custom; "Design System Intelligence" gated here). ([vitara](https://vitara.ai/builder-io-pricing-explained/), [pricing](https://www.builder.io/m/pricing))
- **Our opening:** they leave Figma to generate code for an external repo; we stay in Figma, edit bidirectionally, and enforce the design system + a11y *before* anything leaves the canvas. Component reuse for them is a code-gen concern; for us it's a design-construction constraint.

## Capabilities
| Feature | Available? | Notes |
|---------|------------|-------|
| Figma → code export | ✅ | React, Vue, Svelte, Angular, Qwik, Solid, HTML; CSS/Tailwind/Emotion/Styled Components |
| Map Figma selection → existing repo components | ✅ | AI semantic matching; "uses your existing code components when you have them"; user can remap |
| Repo component indexing | ✅ | `npx @builder.io/dev-tools index-repo` scans repo, builds MDX docs per component group, uploads index to Builder servers |
| Design token / icon mapping | ✅ | Index captures CSS/SASS/theme tokens + icon inventory (variants, import paths) |
| Props inference into existing components | ⚠️ | Generates "component with props" but no documented prop-from-Figma-property inference mechanism |
| Component mapping framework coverage | ⚠️ | Mapping feature beta-limited to **Next.js & Remix** at time of research |
| Mapping accuracy | ⚠️ | Self-reported **~70%** automated mapping accuracy → manual cleanup expected |
| Bidirectional (code/design ↔ Figma edit loop) | ❌ | One-directional design→code; Figma-push-to-Builder sync only "coming soon," and target is Builder content, not Figma |
| Stay inside Figma to do work | ❌ | Output lives in IDE/CLI/Builder; Figma is the source, not the workspace |
| In-loop WCAG / a11y enforcement | ❌ | Not a documented feature of the export pipeline |
| Brand/vision QA pass | ❌ | Not offered |
| Design-system-strict generation (refuse off-system) | ❌ | Reuses components when matched, but no enforcement that *output must* stay on-system; falls back to generic markup |

## Pricing
- **Free:** $0/user/mo, up to 5 users/space, 25 daily / 75 monthly Agent Credits. Includes GitHub/GitLab/Bitbucket connect, **Figma plugin**, VS Code extension.
- **Pro:** **$24/user/mo**, 500 monthly Agent Credits, credit rollover, on-demand credits at **$25 per 500**, built-in MCP servers.
- **Team:** **$40/user/mo**, up to 20 users, 500 credits (unlimited max), AI training opt-out, Slack/JIRA, custom MCP servers, roles.
- **Enterprise:** custom. **"Design System Intelligence,"** privacy mode, RBAC, SSO, SLAs, self-hosted git add-on. (The deepest design-system mapping value is effectively Enterprise-gated.)
- Visual Copilot / Figma-to-code is not separately metered in published material; consumption runs through Agent Credits.

## Strengths
- **Mature multi-framework code output** via the Mitosis compiler — genuinely broad target coverage few competitors match.
- **Repo-grounded mapping is real and CLI-native.** Indexing extracts tokens + icons + component groupings, plans token substitution and `"use client"` placement *before* generating — a thoughtful, deterministic-feeling integration step.
- **User stays in control** — explicit remap UX when AI guesses wrong, which is honest about the ~70% accuracy reality.
- **Strong free tier with the Figma plugin included** lowers trial friction; MCP servers built into Pro signal an MCP-forward posture.

## Weaknesses (our wedge opportunity)
- **One-directional.** Once code is generated it diverges from Figma; designers can't iterate in their tool of record. **Our wedge:** selection-based partial regen *native in Figma* + bidirectional edits keep Figma the source of truth.
- **Mapping is a code-gen afterthought, not a design constraint.** They map to repo components *to emit code*; off-system regions just become generic markup. **Our wedge:** system-strict *construction* — refuse/flag off-system primitives at design time, not at export.
- **~70% accuracy + manual remap = handoff tax.** Designers must hand off to a dev who reconciles the other 30%. **Our wedge:** the designer never leaves Figma; reuse happens against the live library via MCP `get_design_context` / `get_variable_defs`, no repo index export round-trip.
- **Deepest mapping ("Design System Intelligence") is Enterprise-gated** and mapping is framework-limited (Next.js/Remix beta). **Our wedge:** design-system-strict reuse is the *core* free behavior, not a paid enterprise tier, and it's framework-agnostic because we operate on Figma nodes, not code targets.
- **No a11y, no brand QA.** Entire WCAG 2.2 AA + Brand-QA vision pass surface is unoccupied here. Our in-loop a11y and vision pass are pure differentiation.
- **Repo source-of-truth assumption.** Their index lives in a code repo + Builder's servers; designers without a mapped repo get little. We bind to the *Figma* library/variables — the artifact designers already own.

## What we can leverage
- **Index-then-generate pattern.** Their `index-repo` → build a structured component/token/icon index → plan substitutions *before* generating is exactly the discipline we should mirror, but sourced from **Figma MCP** (`get_variable_defs` for tokens, `get_design_context` for component context) instead of a code repo. Pre-plan token substitution + component reuse before emitting any spec.
- **Explicit remap UX.** Surface AI's component-match guesses and let the user correct them — validates that "trust but verify" mapping UX is expected, not a weakness.
- **Honest accuracy framing.** Publishing a ~70% number sets a baseline; if our in-Figma library match beats this (we have ground-truth component IDs, not semantic guesses), that's a concrete marketing/benchmark claim.
- **MCP-forward positioning.** Built-in MCP servers from Pro tier confirm MCP-first is now table stakes — reinforces our MCP-first architecture bet.
- **Component grouping heuristic.** Their rule — group components with "mandatory compositional architecture" / "exclusive required context dependencies" — is a reusable idea for how we treat compound components in DesignSpec.

## What we should AVOID copying
- **Don't make the repo the source of truth.** Their value collapses without a mapped codebase; we must keep the *Figma library* as ground truth so designers-without-a-repo are first-class.
- **Don't ship one-directional.** A pure design→code exporter recreates Builder and concedes our strongest wedge. Bidirectional / in-canvas is non-negotiable.
- **Don't rely on semantic-match guessing where we have IDs.** We have exact Figma component/variable identities — use deterministic matching first, AI only for the ambiguous tail. Don't inherit their ~70% ceiling by guessing when we can know.
- **Don't gate design-system-strict behavior behind an enterprise tier.** That's our core free promise; paywalling it would erase the differentiator.
- **Don't over-couple to a compiler stack (Mitosis).** Our output is a DesignSpec for Figma nodes, not multi-framework code — adopting a code compiler would be scope creep against the architecture.

## Open questions
- How exactly does Visual Copilot infer **props** for a mapped component from Figma component properties/variants? (Docs assert "component with props" but no mechanism — needs verification, possibly via the GA video or CLI docs.)
- What happens to **unmatched regions** in a mapping export — generic divs, nearest-match, or skipped? Determines how much "system leakage" they tolerate vs. our strict refuse/flag.
- Is the "push Figma changes to Builder content" sync a *true* Figma round-trip or just re-import? (Affects how strongly we can claim "they're one-directional.") — needs verification.
- Does Enterprise "Design System Intelligence" add capability beyond `index-repo`, or just larger limits / governance?
- Credit cost per Figma-to-code generation — not published; matters for cost-comparison framing in our pricing intel.

## Sources
- [Introducing Visual Copilot: A Better Figma-to-Code Workflow](https://www.builder.io/blog/figma-to-code-visual-copilot)
- [Announcing Visual Copilot 1.0: GA, Bring Your Own Components](https://www.builder.io/blog/visual-copilot)
- [Builder | Design System Indexing (component-indexing docs)](https://www.builder.io/c/docs/component-indexing)
- [Introducing the Visual Copilot CLI: Smart & Granular Figma to Code](https://www.builder.io/blog/visual-copilot-cli)
- [Builder.io Pricing page](https://www.builder.io/m/pricing)
- [A complete guide to Builder.io pricing in 2026 (Vitara)](https://vitara.ai/builder-io-pricing-explained/)
- [Visual Copilot — The Best Figma to Code Plugin (blog)](https://www.builder.io/blog/best-figma-to-code-plugin)
</content>
</invoke>
