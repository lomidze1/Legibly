# Claude Design Plugin — Research Notes

> Source: https://claude.com/plugins/design
> Date: 2026-05-26
> Researcher: Claude session via WebFetch
> Status: **Initial pass — needs deeper exploration when implementation phase starts**

---

## TL;DR

- **Claude Design plugin** = Anthropic-verified plugin on **Claude Cowork** platform
- Focuses on **design critique, UX writing, accessibility audit, research synthesis**
- **NOT** a Figma plugin — works within Claude's chat interface
- Pairs with sister plugins: **Frontend Design, Superpowers, Context7, Code Review**
- **არ არის ჩვენი competitor** — ეს არის Cowork ecosystem plugin Claude-ის გარემოში
- **შეიძლება ჩვენი own design-explorer agent-ის inspiration იყოს**

---

## Capabilities

| Feature | Available? | Notes |
|---------|------------|-------|
| Design critique ("review mockup for usability") | ✅ | Anthropic example |
| UX microcopy generation ("write checkout error states") | ✅ | Anthropic example |
| WCAG 2.1 AA audit (image input) | ✅ | Anthropic example — they use 2.1, **we target 2.2** |
| User research synthesis | ✅ | Qualitative analysis (interviews, surveys) |
| Design system management | ⚠️ | Mentioned as use case, capabilities unclear |
| Development handoff | ⚠️ | Mentioned, no specifics |
| **Figma integration** | ❌ | No Figma file API connection visible |
| **Canvas mutation** | ❌ | Read-only critique, not generation |

---

## Pricing

- **Not specified** in documentation
- Likely bundled with Claude Cowork subscription
- No free/pro tier distinction visible

---

## Strengths

1. **Anthropic-verified** = quality bar guaranteed
2. **Multi-capability bundle** — one plugin covers critique + writing + a11y + research
3. **Cowork ecosystem integration** — works with Frontend Design, Code Review, etc.
4. **Strong prompt engineering** — example queries are well-crafted

---

## Weaknesses (our wedge opportunity)

1. **No canvas integration** — Claude Design plugin **critiques** designs; {{PRODUCT_NAME}} **creates and mutates** them in Figma
2. **Read-only workflow** — user must export Figma → upload to Claude → read feedback → manually apply in Figma. {{PRODUCT_NAME}} is **in-canvas, native**.
3. **WCAG 2.1 only** (per public docs) — we target **2.2** (newer, more rigorous)
4. **No design system token enforcement** — Claude Design plugin doesn't know your tokens; ours does (via Figma MCP)
5. **Generic critique** — no brand-strict, no token-strict mode

---

## What we can leverage

### As reference for our own agents
- **`design-explorer` agent** — borrow query patterns from Claude Design's example prompts
- **`a11y-linter` agent** — Claude Design plugin uses similar WCAG framing (good consistency)
- **`brand-qa` agent** — Claude Design uses visual critique; we can use similar Opus 4.7 vision prompts

### As complementary tool
- **Users can use both** — Claude Design for **pre-Figma planning** (research synthesis), then {{PRODUCT_NAME}} for **Figma execution**
- **Position on our marketing:** "Pairs with Claude Design plugin in Cowork — use Design for ideation, {{PRODUCT_NAME}} for execution"

### As distribution insight
- Claude Cowork has its own plugin marketplace
- **Future opportunity:** publish {{PRODUCT_NAME}}'s MCP server as a **Cowork plugin** — same plugin available in Cowork AND Figma AND Cursor

---

## What we should AVOID copying

- ❌ **Don't position as "design critique plugin"** — Claude Design owns that lane
- ❌ **Don't make it Cowork-only** — Figma-native is our distribution moat
- ❌ **Don't try to bundle research synthesis** — out of scope, Claude Design does it better
- ❌ **Don't compete with Anthropic's own plugins** — be complementary, not duplicative

---

## Open questions

1. **What's the technical architecture of Claude Cowork plugins?** Are they MCP servers, custom skills, or something proprietary?
2. **Can we publish to Cowork?** Self-publish vs Anthropic-verified gates?
3. **Does Claude Design have a public API or just chat-based?** If API exists, we could call it from {{PRODUCT_NAME}}.
4. **Frontend Design plugin** — sister plugin, what does it do? Could be more relevant.
5. **Pricing structure** — does Cowork require subscription, or free?

---

## Decision: how {{PRODUCT_NAME}} relates to Claude Design plugin

### Strategy: **Complementary, Not Competitive**

| Concern | {{PRODUCT_NAME}}'s answer |
|---------|----------------------------|
| Are we replacing Claude Design? | No — we focus on **Figma execution**, they focus on **chat-based ideation/critique** |
| Should we integrate? | **Maybe** — research if Cowork has plugin-to-plugin APIs |
| Marketing co-positioning? | **Yes** — "Pairs with Claude Design plugin" in our Figma store listing |
| Should we publish to Cowork too? | **Phase 3** — after Figma plugin proves PMF |

---

## Action items (for next research session)

- [ ] **Deep dive on Frontend Design plugin** (sister plugin — might overlap more with us)
- [ ] **Research Cowork plugin SDK** — can we build for Cowork + Figma simultaneously?
- [ ] **Test Claude Design plugin** with actual Figma export — see if output quality is enough that users skip Figma plugins
- [ ] **Read Cowork pricing model** — if it's bundled with Pro tier, ALL Pro users get Claude Design "free" — relevant for our positioning
- [ ] **Find Claude Cowork plugin marketplace listing process** — for future publication

---

## Sources

- [Claude Design plugin overview](https://claude.com/plugins/design) — primary source
- [Claude Plugins index](https://claude.com/plugins) — sister plugins list (TODO: visit)
- [Anthropic plugins announcement](https://www.anthropic.com/news) — context (TODO: find relevant post)
