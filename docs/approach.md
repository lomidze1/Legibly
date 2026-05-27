# approach.md — სტრატეგია + Decision Log

> **ეს ფაილი არის "როგორ ვფიქრობთ".** ყოველი არქიტექტურული გადაწყვეტილება იწერება Decision Log-ში — შემდგომი Claude session-ის ისტორიული context.

---

## 1. სტრატეგიული პრინციპები

### 1.1 MCP-First Core
**წესი:** Generation engine არის TypeScript library, **არა** Figma-coupled module.
**რატომ:** Figma plugin = ერთი distribution surface. MCP server-ი ხსნის Cursor / Claude Code / Stitch / future canvas-ებს.
**შედეგი:** ერთხელ ვწერთ core-ს, ორ surface-ზე ვუშვებთ (plugin + MCP server).

### 1.2 Backend Proxy Mandatory
**წესი:** Anthropic API key **არასოდეს** არ არის plugin-ში.
**რატომ:** plugin code fully inspectable; clientStorage არ არის secret store.
**შედეგი:** ერთი backend service (Cloudflare Workers) — key vault + rate limit + telemetry.

### 1.3 Closed Enums Over Free Strings
**წესი:** Spacing, font size, weight, radius — closed token sets. Free hex colors rejected by schema.
**რატომ:** "System-strict" wedge ვერ იქმნება ღია string-ებით.
**შედეგი:** Zod schema-ში strict enums; lint pre-render.

### 1.4 In-Loop A11y, Not Post-Hoc
**წესი:** WCAG checks ხდება generation-დროს, არა შემდეგ.
**რატომ:** post-hoc audit = user-ის sense of "AI ploughs and I fix" — value proposition გვტყუებს.
**შედეგი:** Orchestrator retries when a11y fails. User-facing transparency.

### 1.5 Don't Replicate, Layer
**წესი:** Figma MCP-ის `use_figma` write tool ჩვენ **არ** ვაიმპლემენტირებთ. ვიყენებთ.
**რატომ:** ჩვენი value layer-ია (governance), არა underlying RPC.
**შედეგი:** ჩვენი generation core კოპირებაც კი არ უწერია canvas-mutation logic-ის.

### 1.6 Cache Aggressively
**წესი:** System prompt + tool definitions = `cache_control: {ttl:"5m"}` block.
**რატომ:** Tier 3 limits-ის შენარჩუნება; cost reduction.
**შედეგი:** Cache hit rate > 80% expected.

### 1.7 Two Models, Clear Roles
**წესი:** Sonnet 4.6 (default) + Opus 4.7 (vision/multi-screen/brand-QA).
**რატომ:** Sonnet = $3/$15 per MTok, fast. Opus = $5/$25, premium vision tasks only.
**შედეგი:** Model strategy abstraction in orchestrator.

---

## 2. Discovery → MVP-სა გზა (high-level)

```
[Now]
  ↓
Phase 0: Research/Planning (THIS PHASE)
  ├─ Tool/library landscape research (research-roadmap.md)
  ├─ Brand finalization (branding.md)
  ├─ Backend stack decision
  ├─ Sub-agents/skills bootstrap
  └─ Anthropic API access + Figma dev account
  ↓
Phase 1: MVP v0.1 (~12 weeks)
  ├─ Plugin scaffolding (Vite + create-figma-plugin)
  ├─ Backend proxy (Cloudflare Workers + KV)
  ├─ DesignSpec schema + validator
  ├─ Simple "prompt → screen" flow
  ├─ Selection-based partial regen
  ├─ A11y in-loop guard
  └─ Beta on Figma Community
  ↓
Phase 2: Pro v0.5 (~6 months)
  ├─ Brand-QA vision pass (Opus 4.7)
  ├─ Multi-screen flow state machine
  ├─ MCP server publish (Streamable HTTP)
  └─ Pro tier billing (Stripe)
  ↓
Phase 3: Enterprise v1.0 (~12 months)
  ├─ Private MCP server option
  ├─ SSO, audit logs, custom Brand Rules
  └─ First enterprise contracts
```

---

## 3. Decision Log

> ფორმატი: ნომერი, თარიღი, გადაწყვეტილება, alternatives considered, რატომ, რა შედეგი.

### D1 — 2026-05-26 — Hybrid docs language (EN structure, KA descriptions)
- **Alternatives:** all-EN, all-KA
- **Why:** AI-first context (Claude უკეთ მუშაობს EN სტრუქტურით), მაგრამ owner Georgian-speaker — descriptions KA-ში natural language flow-ს უწევს.
- **Outcome:** ყველა docs ფაილი hybrid. ARCHITECTURE.md as-is EN (legacy).

### D2 — 2026-05-26 — ARCHITECTURE.md → docs/architecture.md as-is
- **Alternatives:** keep at root, split into multiple files, fully rewrite
- **Why:** არ ვცადოთ refactor-ი ცარიელ ფაილზე. 902 ხაზიანი source of truth — split-ის ღირებულება არ აღემატება break-ის რისკს.
- **Outcome:** Single file move. Future split TBD if file becomes unwieldy.

### D3 — 2026-05-26 — Product name = placeholder "{{PRODUCT_NAME}}"
- **Alternatives:** lock "Designer" name, use literal "TBD" everywhere
- **Why:** "Designer" generic, trademark-conflict-prone, SEO-impossible. ბრენდინგი წინ უსწრებს კოდს.
- **Outcome:** `docs/branding.md` central config, `scripts/rename-product.sh` for bulk replace.

### D4 — 2026-05-26 — Sub-agents/skills approach (not monolithic)
- **Alternatives:** single huge agent, no agents at all
- **Why:** Claude Code-ის parallel sub-agents = better separation of concerns, easier testing, composable.
- **Outcome:** `.claude/agents/` ფაილები: spec-validator, design-system-importer, a11y-linter, brand-qa, figma-mcp-bridge, design-explorer. `.claude/skills/prompter/` skill.

### D5 — 2026-05-26 — Private repo, no open-source
- **Alternatives:** open-source from day 1, dual license
- **Why:** competitive moat in nascent market. Figma is well-funded; open-source ჩვენ self-undermining.
- **Outcome:** GitHub private throughout. No license file (private = all rights reserved).

### D6 — 2026-05-26 — Research-first, MVP-later
- **Alternatives:** start coding immediately, skip research
- **Why:** market მსურველის (Figma Agent free) — coding-ის წინ ღრმად ვუნდა გავერკვეთ ლანდშაფტში.
- **Outcome:** 1+ week research phase, docs/research-roadmap.md as live tracking doc.

---

## 4. Risk Register (ბიზნესის რისკები)

| # | რისკი | ალბათობა | ზიანი | Mitigation |
|---|--------|-----------|--------|-------------|
| R1 | Figma მოიცავს ჩვენი wedge-ს Design Agent-ში | მაღალი | მაღალი | Speed (MVP < 12 weeks); MCP-first portability |
| R2 | Anthropic-ი ცვლის pricing/API | საშუალო | მაღალი | Backend proxy abstracts model choice; multi-model ready |
| R3 | Figma plugin store review reject | დაბალი | მაღალი | Strict `allowedDomains`, no `"*"`, transparent telemetry |
| R4 | სახელის trademark conflict | საშუალო | საშუალო | Brand search USPTO/EUIPO before naming lock |
| R5 | A11y false positives frustrate users | საშუალო | საშუალო | Allow user to override with explicit confirm; learn from overrides |
| R6 | MCP spec breaks (2025-11-25 → 2026-07-28 migration) | მაღალი | საშუალო | Versioned transport; test against both during migration window |
| R7 | Backend cost runaway (cache miss storm) | დაბალი | მაღალი | Tier 3 limits, per-user rate limits, cost dashboard |
| R8 | მცირე team (1-2 dev) burnout | მაღალი | მაღალი | Aggressive scope cutting; MVP scope locked early |

---

## 5. რა გადასაწყვეტი დარჩა (planning phase-ის ბოლომდე)

- [ ] **Brand name final** — `branding.md`-ში ცვალე ცენტრალური config
- [ ] **Backend hosting choice** — Cloudflare Workers ან Fly ან Vercel? (research)
- [ ] **Auth strategy** — Clerk / Auth.js / custom JWT?
- [ ] **Telemetry vendor** — PostHog / Plausible / custom?
- [ ] **Pricing tier numbers** — $X/$Y/$Z?
- [ ] **MCP server hosting** — same as backend or separate?
- [ ] **Claude Design plugin integration** — what do we leverage? (`research/claude-design-plugin.md`)
- [ ] **Anthropic billing** — BYO key from day 1 or our hosted only?

---

## 6. Claude-ისთვის როგორ მუშაობდეთ ამ ფაილით

- ყოველ session-ში დაგვმატე **ერთი ახალი Decision Log entry** თუ რაიმე ფუნდამენტური გადაწყვეტილება მიიღე.
- დაუმატე **რისკი** Risk Register-ში თუ ახალი threat იპოვე.
- "Open questions"-ში მონიშნე resolved-ი როცა გადაიჭრება.
