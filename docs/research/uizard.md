# Uizard Autodesigner 2.0 — Research Notes

> Source: https://uizard.io/autodesigner/ , https://uizard.io/pricing/
> Date: 2026-06-14
> Researcher: Claude session via design-explorer

## TL;DR (3-5 bullets)
- **Standalone web app** (acquired by Miro Labs, May 2024), not a Figma plugin. Text/sketch/screenshot → multi-screen editable prototype "in seconds." Output stays in Uizard's own drag-and-drop editor.
- **Pricing wedge:** Autodesigner 2.0 and any developer handoff are **fully paywalled** — Free tier gets only Autodesigner 1.5, 3 generations/month, and 1x raster export. Pro is $12/mo (annual) with 500 generations/mo.
- **Figma interop is one-way and lossy:** plugin imports Figma → Uizard only, **no export back to Figma**. Auto-layout, components, variables/tokens, gradients, rich text, SVGs are NOT preserved. There is no native auto-layout/token-aware Figma output at all.
- **Fidelity ceiling:** third-party review found ~60-70% usable first-pass output, "every screen looks like AI-generated UI" (generic stock components, default palettes), and code handoff is explicitly "not production-ready."
- **Our opening:** native-in-Figma, system-strict generation, real auto-layout + token preservation, selection-based partial regen, and in-loop WCAG — every one of these is structurally absent or weak in Uizard.

## Capabilities
| Feature | Available? | Notes |
|---------|------------|-------|
| Text prompt → multi-screen UI | ✅ | "Multi-screen, editable prototypes in seconds." Pick device (mobile/tablet/desktop). Most generations <1 min. |
| Sketch → design | ✅ | Bridges whiteboard ideation to digital wireframes. |
| Screenshot → design (Screenshot Scanner) | ✅ | Review: ~75% accuracy; card grid/search/nav translate, but carousels lose interactivity. |
| Theme / restyle generation | ✅ | Generates a new theme to instantly restyle a project. |
| Select component + describe change | ⚠️ | Exists, but layout logic gaps observed (misplaced nav bar, empty placeholder pages). Not Figma-node-granular. |
| Brand kit / design-system match | ⚠️ | Brand kit is **Business tier ($39/mo) only**; "match your design system" claimed but no token model exposed. |
| React / code handoff | ⚠️ | "Developer handoff in React CSS" (Pro+). Review: "not production-ready code… a concrete reference instead of a screenshot and a prayer." |
| Export TO Figma | ❌ | Plugin is **Figma → Uizard import only**. No reverse export. Workaround = messy SVG export + manual layer cleanup. |
| Preserve auto-layout on import | ❌ | Elements transferred **ungrouped**; auto-layout not preserved. |
| Preserve components / variables / tokens | ❌ | Not addressed/supported on import; tokens/variables lost. |
| Fidelity of Figma import | ❌ | Only first solid/image fill; only first drop shadow; no gradients, no rich text, no SVG/boolean/rotated/GIF; unmatched fonts → Open Sans. |
| In-loop WCAG / a11y checks | ❌ | No accessibility audit surface in the product. |
| Native Figma canvas operation | ❌ | Standalone web app; no operation on the user's live Figma file. |

## Pricing
- **Free** — $0. 2 projects, **Autodesigner 1.5 only**, **3 AI generations/month**, ≤5 screens/project, 400 components/org, 10 templates, export JPG/PNG/PDF at **1x only**, no developer handoff. Unlimited free viewers/commenters.
- **Pro** — **$12/mo billed annually** (~40% off monthly). Up to 100 projects, **Autodesigner 2.0**, **500 generations/mo**, unlimited screens & components, full template library, **developer handoff in React CSS**, private projects.
- **Business** — **$39/mo billed annually**. Unlimited projects, **5,000 generations/mo**, faster generation, **custom brand kit (NEW)**, priority support.
- **Enterprise** — Custom; 15+ user minimum, unlimited generations, design-system setup, AI data SLA, whiteglove onboarding.
- **Paywall takeaway:** the actual value engine (2.0 + handoff) is gated behind Pro. Free tier (3 gen/mo, 1.5 engine) is a demo, not a usable workflow.

## Strengths
- **Speed-to-mockup:** full multi-screen clickable flow in under a minute from one prompt — strong for early ideation, pitch visuals, rapid prototyping.
- **Multi-input flexibility:** text + sketch + screenshot in one tool; Screenshot Scanner ~75% structural accuracy.
- **Low barrier:** browser-based, ChatGPT-like conversational flow, drag-and-drop editor — approachable for PMs/non-designers.
- **Miro backing:** resources + distribution; still runs as its own branded product/pricing.

## Weaknesses (our wedge opportunity)
1. **No real Figma round-trip** → maps to **our wedge #3 (selection-based partial regen native in Figma)** and our MCP-first stance. Uizard cannot operate on a user's live Figma file or export back with fidelity; we live inside Figma.
2. **Auto-layout / components / tokens are destroyed** in interop → maps to **our wedge #1 (system-strict generation)**. We generate with real auto-layout + bound variables/tokens, not pixel mockups.
3. **No accessibility surface** → maps to **our wedge #2 (in-loop WCAG 2.2 AA)**. Uizard has zero a11y checking.
4. **Generic, off-brand output ("every screen looks like AI-generated UI")** → maps to **our wedge #5 (Brand-QA vision pass)** and #1. Brand-kit matching is shallow and tier-gated; we enforce brand consistency.
5. **Weak element-level / multi-screen layout logic** (misplaced nav, empty placeholder pages) → maps to **our wedge #4 (multi-screen state-machine-first)**. We model flows as state machines, not loose linked screens.
6. **Standalone-app friction:** designers with an existing Figma file must export-import-rework; tokens/components don't survive, so adoption means abandoning their system. Our target users (designer-with-system, dev-via-MCP) lose nothing because we never leave Figma.

## What we can leverage
- **Multi-input UX is table stakes** — text + sketch + screenshot. Worth supporting screenshot/sketch as seed inputs even if v1 is text-first.
- **Conversational, ChatGPT-style flow** lowers the barrier; mirror this in our chat panel UX (Track G).
- **Device-target selection up front** (mobile/tablet/desktop) is a clean, low-friction control to copy.
- **Sub-minute perceived speed** sets a streaming-progress expectation — our streaming UX must feel comparably fast.
- **Pricing anchor:** $12/mo Pro / $39/mo Business are useful reference points for our freemium tiering.

## What we should AVOID copying
- **Don't build a separate canvas/editor.** Uizard's whole friction story is leaving Figma; our defensible position is the opposite.
- **Don't ship pixel mockups without real auto-layout/tokens** — that's exactly the interop loss that frustrates Uizard users.
- **Don't gate the core engine so hard the free tier is a non-workflow** (3 gen/mo on the old engine). Free should demonstrate the actual wedge.
- **Don't over-promise "matches your design system"** without a real token-binding model behind it.
- **Don't claim "React" handoff if it isn't production-grade** — sets a credibility trap.

## Open questions
- Does Autodesigner 2.0 produce any token/variable structure internally, or purely styled primitives? (needs hands-on verification — no public token model documented)
- Business-tier "custom brand kit": how deep is brand matching (color/type only, or component-level)? Needs verification.
- React CSS handoff: per-screen or full-flow? Component reuse or flat markup? (review implies flat/reference-only)
- Exact Autodesigner 2.0 generation credit definition — per screen, per flow, or per prompt? Pricing page says "500/mo" without unit.

## Sources
- [Uizard Autodesigner page](https://uizard.io/autodesigner/)
- [Uizard pricing](https://uizard.io/pricing/)
- [Figma to Uizard plugin (import-only, fidelity loss)](https://uizard.io/blog/figma-to-uizard-figma-plugin/)
- [Autodesigner 2.0 launch blog](https://uizard.io/blog/autodesigner-2-0-is-here/)
- [AutoGPT.net — Uizard in-depth review (fidelity, code, export findings)](https://autogpt.net/ai-tool/uizard-ai/)
- [Sunset HQ — Uizard/Miro acquisition details](https://www.sunsethq.com/blog/uizard-acquisition)
- [Uizard Figma Community plugin listing](https://www.figma.com/community/plugin/1342400758082935751/uizard)
