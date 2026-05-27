# CLAUDE.md — {{PRODUCT_NAME}} Project Instructions

> **Claude — ეს ფაილი ავტომატურად ჩაიტვირთება ყოველი session-ში. წაიკითხე სრულად.**

---

## 1. პროექტის identity

- **სახელი:** {{PRODUCT_NAME}} (placeholder — იხილე [`docs/branding.md`](./docs/branding.md))
- **ეტაპი:** Planning / Research — კოდი ჯერ არ არის
- **Repo:** [github.com/lomidze1/Designer](https://github.com/lomidze1/Designer) (PRIVATE)
- **მთავარი მიზანი ახლა:** Research roadmap + docs ფუნდამენტი

---

## 2. პირველი ნაბიჯი ყოველი session-ში

1. წაიკითხე [`docs/README.md`](./docs/README.md) — navigation map
2. წაიკითხე [`docs/goal.md`](./docs/goal.md) — რა გვინდა და რატომ
3. წაიკითხე [`docs/approach.md`](./docs/approach.md) — სტრატეგია + decision log

---

## 3. სუბ-აგენტები და Skills

### Skills (`.claude/skills/`)
- **`prompter`** — გვეხმარება პრომპტის წერაში (Anthropic best practices)

### Sub-agents (`.claude/agents/`)
- **`spec-validator`** — DesignSpec JSON validation
- **`design-system-importer`** — Figma variables/components harvest
- **`a11y-linter`** — WCAG 2.2 AA enforcement
- **`brand-qa`** — Opus 4.7 vision-based brand consistency check
- **`figma-mcp-bridge`** — Figma Dev Mode MCP server integration
- **`design-explorer`** — Claude Design plugin + sister tools research

გამოიყენე ისინი proactively — სცადე agent-ი task-ის გადაცემამდე.

---

## 4. Git Workflow (CRITICAL)

### Branches
- **`main`** — production-protected. Claude **NEVER pushes here without explicit user approval**.
- **`dev`** — Claude აქ უშვებს ცვლილებებს თავისუფლად რასაც საჭიროდ მიიჩნევს.

### Default behavior
- ყოველი ცვლილება უნდა იყოს committed dev ბრანჩზე
- main-ზე merge — მხოლოდ user-ის explicit დადასტურებით
- არ გააკეთო force-push, არ წაშალო history

### Commit style
- მოკლე subject line (≤ 70 chars)
- რაც გავა commit-ში, ეს უნდა trace-დებოდეს user-ის request-ზე
- Co-author footer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

---

## 5. Decision-Making წესები (ბიზნესის ჭრილში)

1. **იყავი objective.** არასოდეს სუბიექტურად — ბიზნესის ლოგიკით.
2. **AskUserQuestion-ში ყოველთვის მონიშნე "Recommended"** ერთერთი ვარიანტი.
3. **არ delegate-ი understanding.** sub-agent-ს ცარიელ research task-ს არ მისცე — გადაცემამდე გაიგე და დაამზადე concrete instruction.
4. **MVP-driven.** არ ააშენო speculative features.
5. **Don't over-engineer.** ARCHITECTURE.md-ში არსებული გადაწყვეტილებები სანამდე საფუძვლიანი არგუმენტი არ გაქვს, არ ცვალე.

---

## 6. პროდუქტის ბიზნეს კონტექსტი (მოკლედ)

- **Market threat:** 2026 May 20 — Figma-მ გამოუშვა საკუთარი Design Agent (free during beta).
- **Defensible position:** არა "AI generates UI", არამედ **system-strict + a11y + selection-based + MCP-first**.
- **Target users:** ფართოა — designer w/ system, designer w/o system, PM/non-designer, dev/designer via MCP.
- **Monetization (future):** freemium plugin, Pro tier, Enterprise MCP server.

დეტალები — [`docs/goal.md`](./docs/goal.md).

---

## 7. გარე reference-ები (highlights)

- **Anthropic Messages API + MCP connector** — [docs](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
- **Figma Plugin API** — [docs](https://developers.figma.com/docs/plugins/)
- **Figma Dev Mode MCP Server** — [docs](https://developers.figma.com/docs/figma-mcp-server/)
- **MCP Spec 2025-11-25** — [WorkOS write-up](https://workos.com/blog/mcp-2025-11-25-spec-update)

სრული სია — [`docs/links.md`](./docs/links.md).

---

## 8. რა არ უნდა გააკეთო

- ❌ არ წაშალო `docs/architecture.md`-ის შინაარსი — ეს არის source of truth
- ❌ არ ცვალო literal "Designer" → `{{PRODUCT_NAME}}` `architecture.md`-ში (იხილე `branding.md`)
- ❌ არ პუშო main-ზე user approval-ის გარეშე
- ❌ არ წაშალო/გადააწერო `.claude/settings.local.json`
- ❌ არ შეცვალო ARCHITECTURE-ის ბირთვი decision-ები ერთობლივი განხილვის გარეშე
