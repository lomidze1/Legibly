# links.md — გარე References

> ARCHITECTURE-ში წერია 50+ ბმული. აქ ისინი დაჯგუფებულია კატეგორიების მიხედვით.
> **Claude — როცა გჭირდება გარე docs, ჯერ აქ მოძებნე — წინასწარ vetted.**

---

## 🤖 Anthropic / Claude

### Models
- [Anthropic models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Claude Opus 4.7 release](https://www.anthropic.com/news/claude-opus-4-7) — 128K output, 3.75 MP vision, adaptive thinking
- [Extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking) — Opus uses `effort`, Sonnet uses manual budget

### API Capabilities
- [Messages API + MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) — tools-only, HTTPS only
- [Tool use overview](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) — ~346 system tokens per request
- [Rate limits](https://platform.claude.com/docs/en/api/rate-limits) — Tier 3 target (2k RPM / 800k ITPM)
- [Prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching) — 5min default TTL, workspace-scoped
- [Vision capabilities](https://docs.claude.com/en/docs/build-with-claude/vision) — JPEG/PNG/GIF/WebP, max 8000×8000
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — GA, ≥ 98% schema adherence

### Prompt Engineering
- [Prompt engineering overview](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Use XML tags](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
- [Chain of Thought](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought)
- [Multishot prompting](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/multishot-prompting)
- [Long context tips](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/long-context-tips)
- [System prompts](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts)

### Claude Plugins / Cowork
- [Claude Design plugin](https://claude.com/plugins/design) — design critique, UX writing, a11y audit, research synthesis
- **საჭიროა შემდგომი კვლევა — იხილე `research/claude-design-plugin.md`**

---

## 🎨 Figma

### Plugin Development
- [Figma plugin docs root](https://developers.figma.com/docs/plugins/)
- [How plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/) — sandbox architecture
- [Plugin manifest](https://developers.figma.com/docs/plugins/manifest/) — `networkAccess.allowedDomains`
- [OAuth with plugins](https://developers.figma.com/docs/plugins/oauth-with-plugins/)
- [Making network requests](https://developers.figma.com/docs/plugins/making-network-requests/)
- [plugin-typings (`plugin-api.d.ts`)](https://github.com/figma/plugin-typings/blob/main/plugin-api.d.ts) — TypeScript types

### Plugin APIs (specific)
- [`figma.clientStorage`](https://www.figma.com/plugin-docs/api/figma-clientStorage/) — 5MB cap, NOT secret store
- [`loadFontAsync`](https://www.figma.com/plugin-docs/api/properties/figma-loadfontasync/) — mandatory before text mutations

### Figma MCP
- [Figma Dev Mode MCP server](https://developers.figma.com/docs/figma-mcp-server/) — `use_figma`, `get_design_context`, `get_variable_defs`
- [Figma MCP help center](https://help.figma.com/hc/en-us/articles/32132100833559) — rate limits per plan
- [Figma MCP catalog](https://www.figma.com/mcp-catalog/) — public MCP servers

### Figma AI / Design Agent (the threat)
- [The Figma Design Agent (blog, 2026-05-20)](https://www.figma.com/blog/the-figma-agent-is-here/) — **competitor #1**
- [TechCrunch on Figma AI](https://techcrunch.com/2026/05/20/figma-adds-an-ai-assistant-to-its-collaborative-canvas/)
- [LogRocket — Figma AI 2026 overview](https://blog.logrocket.com/ux-design/figma-ai-2026-quick-overview/)

---

## 🔌 MCP (Model Context Protocol)

- [MCP spec 2025-11-25 update (WorkOS)](https://workos.com/blog/mcp-2025-11-25-spec-update) — adds async Tasks
- [Anthropic MCP connector reference](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) — duplicate of above, Anthropic-side

---

## 🥷 Competitors (matrix from architecture.md §0.B)

### Wireframe / Lo-fi
- [Mureal Wireframe Designer](https://mureal.io/products/wireframe-designer/) — standalone, wireframe-only
- [Magician for Figma (Diagram)](https://aitools.inc/tools/magician-for-figma) — 150k+ users, one-shot spells

### Hi-fi Generators
- [Uizard pricing](https://uizard.io/pricing/) — Miro-owned, multi-input
- [Google Stitch (Gemini 3) blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-gemini-3/) — streaming canvas, multiplayer, MCP server
- [Visily pricing](https://visily.ai/pricing/) — screenshot-to-design

### Code-output
- [v0 (Vercel) Figma docs](https://v0.app/docs/figma) — select-and-reprompt for code
- [Builder.io Visual Copilot](https://www.builder.io/blog/figma-to-code-visual-copilot) — figma-to-code

---

## 🎨 Design Systems & Principles

### Industry Reference Systems
- [Material Design 3](https://m3.material.io/) — closed spacing scale source
- [Atlassian Design System](https://atlassian.design/) — closed type scale source
- [Primer (GitHub)](https://primer.style/) — semantic color role pattern
- [Polaris (Shopify)](https://polaris.shopify.com/) — token role discipline

### Books / Guides
- [Refactoring UI](https://refactoringui.com/) — visual hierarchy principles
- [Refactoring UI: Building your color palette](https://refactoringui.com/previews/building-your-color-palette/) — palette cardinality

### Accessibility
- [WCAG 2.2 Quickref](https://www.w3.org/WAI/WCAG22/quickref/) — full success criteria
- [Anna E. Cook — AI doesn't fix accessible systems](https://annaecook.com/writing/2026/ai-doesnt-fix-accessible-systems-it-depends-on-them) — design system + a11y argument

### UX / Visual Hierarchy
- [NN/g — Visual hierarchy UX definition](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)

---

## 📦 Libraries & Tooling (TBD — research-roadmap-ში)

> ეს section-ი ცარიელია — research-roadmap.md-ში გადაიწერება როცა ვირჩევთ.

- **Backend hosting:** Cloudflare Workers (likely) / Fly / Vercel?
- **Auth:** Clerk / Auth.js / custom JWT?
- **Validation:** Zod (planned in architecture)
- **Color math:** culori (planned in architecture)
- **Plugin scaffolding:** create-figma-plugin (planned in architecture)
- **Telemetry:** PostHog / Plausible / custom?

---

## 🏛 Legal / Brand Research (TBD)

- USPTO trademark search — საჭიროა brand name lock-მდე
- EUIPO trademark search — EU market
- Domain availability — .com / .app / .io priority
- npm name availability
- Figma Community name availability
