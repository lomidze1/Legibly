# glossary.md — ტერმინების ლექსიკონი

> **Claude — როცა docs-ში გვხვდება acronym ან domain-specific term, აქ მოძებნე.**

---

## A

**A11y** — Accessibility-ის შემოკლება ("a" + 11 ასო + "y"). ვებ/UI ხელმისაწვდომობა შშმ მომხმარებლებისთვის.

**Adaptive thinking** — Opus 4.7-ის ფიქრის რეჟიმი — სხვადასხვა "effort" დონეებით (low/medium/high/xhigh). განსხვავდება Sonnet-ის manual `budget_tokens`-ისგან.

**Anthropic** — Claude-ის შემქმნელი კომპანია. ჩვენი მთავარი API provider.

**API key** — Anthropic-ის authentication credential. **არასოდეს არ უნდა იყოს plugin-ში.**

**Autodesigner** — Uizard-ის AI feature, mass screen generation.

---

## B

**Backend proxy** — ჩვენი server (Cloudflare Workers) რომელიც API key-ს ფარავს და Anthropic-ისთვის Forward-ი ხდება.

**BYO key (Bring Your Own)** — User-ი თავის Anthropic key-ს იყენებს. Pro tier-ის option.

**Brand-QA** — Brand consistency check using Opus 4.7 vision pass before commit.

---

## C

**Cache (Anthropic prompt cache)** — System prompt-ის server-side caching. 5min TTL default, 1h paid option.

**clientStorage** — Figma plugin local storage. 5MB cap, **არ არის secret store**.

**CoT (Chain of Thought)** — Reasoning technique — Claude-ს ვთხოვთ step-by-step ფიქრს.

**Cowork** — Anthropic-ის platform for plugins (https://claude.com/plugins/...).

---

## D

**DesignSpec** — ჩვენი JSON intermediate representation generation-სა და render-ს შორის. Zod-ით validated.

**design-system-importer** — Sub-agent — Figma variables/components harvesting.

**Dev Mode (Figma)** — Figma-ის developer view, აქვს MCP server.

**Documents Access (dynamic-page)** — Figma manifest setting. Required for async getters.

---

## F

**FDS** — Figma Design System — user-ის own design system (vs. Material/Atlassian/etc.).

**figma.* API** — Plugin main thread-ის sole API surface. No `fetch`/`window`/`DOM`.

**Files API (Anthropic)** — Reusable file uploads (images) across requests.

---

## H

**HIG** — Human Interface Guidelines (Apple). 44×44 pt touch target standard.

---

## I

**Iframe (UI)** — Plugin-ის secondary context, has DOM + fetch + React.

**In-loop a11y** — A11y check წერისთვის ხდება generation-time, არა post-hoc.

**ITPM** — Input Tokens Per Minute. Anthropic rate limit metric.

---

## L

**`loadFontAsync`** — Mandatory function before any text mutation in Figma plugin.

---

## M

**MCP** — Model Context Protocol. Open standard for LLM ↔ external tools/data.

**MCP connector (Anthropic)** — Anthropic-ის built-in MCP client in Messages API. Tools-only, no resources/prompts.

**MCP server (Figma)** — Figma Dev Mode-ის MCP server: `use_figma`, `get_design_context`, `get_variable_defs`.

**MCP sidecar** — ჩვენი backend-ის MCP client for servers needing resources/prompts (connector-ის workaround).

**MTok** — Million tokens. Anthropic pricing unit (e.g., $3/MTok input).

---

## N

**`networkAccess.allowedDomains`** — Figma manifest's strict egress allowlist. `"*"` triggers review.

---

## O

**Opus 4.7** — Anthropic's premium model. 128K output, 3.75 MP vision, adaptive thinking. $5/$25 per MTok.

**OTPM** — Output Tokens Per Minute. Anthropic rate limit metric.

---

## P

**`postMessage`** — Browser API for cross-context messaging. Plugin main ↔ iframe-ის sole transport.

**PMF** — Product-Market Fit.

**Prompter** — ჩვენი Claude skill — Anthropic prompt engineering best practices applied to our project.

---

## Q

**QuickJS** — JavaScript engine that runs Figma plugin main thread (sandboxed, no fetch/DOM).

---

## R

**RPC** — Remote Procedure Call. Plugin main ↔ iframe-ის message pattern.

**RPM** — Requests Per Minute. Anthropic rate limit metric.

---

## S

**Sandbox (Figma)** — Main thread isolation, no network, no DOM.

**Selection-based partial regen** — Edit only selected nodes, preserve siblings. v0-ის pattern, native Figma-ში — ჩვენი wedge.

**Semantic color role** — `bg.surface`, `fg.default`, `action.primaryBg`. We don't accept raw hex.

**Sonnet 4.6** — Anthropic's mid-tier model. 1M context, 64K output. $3/$15 per MTok. **Default model.**

**SSE** — Server-Sent Events. Streaming protocol used by Anthropic Messages API.

**Stitch (Google)** — Galileo's successor, Gemini 3-based, has its own MCP server.

**spec-validator** — Sub-agent — DesignSpec JSON validation against Zod schema.

**Streamable HTTP** — MCP transport mode (vs. stdio). Required for connector.

---

## T

**Tier (Anthropic)** — Rate limit level. Tier 1 → 4. We target Tier 3 for production.

**Tokens (design)** — Reusable design values: spacing, color, type. **Closed sets in our schema.**

**Tokens (LLM)** — Text units (~4 chars). Pricing/rate unit.

**Tokens Studio** — Plugin/library for design-tokens-as-JSON, GitHub-based workflow.

**Tools (MCP)** — Callable functions LLM can invoke. (vs. Resources, Prompts — not supported by connector.)

---

## U

**`use_figma`** — Figma MCP server's write tool. We call it, don't reimplement.

---

## V

**Vision (Anthropic)** — Image input capability. Sonnet/Opus support. Max 8000×8000.

---

## W

**WCAG 2.2 AA** — Web Content Accessibility Guidelines, level AA. Our a11y target.

**Wedge** — Business term for defensible market position. Our wedges: system-strict, a11y, selection-based, multi-screen, brand-QA.

---

## Z

**ZDR** — Zero Data Retention. Anthropic feature. **MCP connector is NOT ZDR-eligible.**

**Zod** — TypeScript-first schema validation library. Used for DesignSpec validation.
