# requirements.md — რა გვინდა MVP-ში

> **სტატუსი:** Draft. Research/planning phase-ში updated იქნება. MVP scope-ი ჯერ არ არის locked.

---

## 1. Functional Requirements (MVP v0.1)

### 1.1 Plugin Core
- **F1.** პლაგინი ბრუნდება Figma Community-ში (public listing)
- **F2.** UI iframe (React + Vite) გვაჩვენებს chat panel + selection inspector
- **F3.** Main thread (`figma.*` მხოლოდ) ასრულებს selection capture, font load, node mutation
- **F4.** Backend proxy holds Anthropic API key — plugin **არ აქვს** key-ს

### 1.2 Generation
- **F5.** "Prompt → Screen": user-ის prompt-ისთვის გენერდება DesignSpec JSON, შემდეგ Figma node-ები
- **F6.** Design System token snapshot გადაიცემა Claude-ისთვის ყოველი generation-ში
- **F7.** Closed enums enforced: spacing (`{0,4,8,12,16,20,24,32,40,48,64,80,96,128}`), font size, weight, radius — ARCHITECTURE.md §0.C
- **F8.** Generation streams to user (პროგრესის ჩვენებით)

### 1.3 Selection-based Editing
- **F9.** "Select + prompt" → modifies only selected nodes, preserves siblings
- **F10.** Undo grouping: ერთი edit = ერთი undo step
- **F11.** Re-edit preserves nodeIdMap — Claude იცის რომელი node-ი რომელია

### 1.4 Accessibility Guard (in-loop)
- **F12.** Contrast checker: body text ≥ 4.5:1, non-text ≥ 3:1, focus ≥ 3:1
- **F13.** Touch target ≥ 24×24 CSS px (44×44 iOS, 48×48 Android)
- **F14.** Generation retries if a11y fails — orchestrator-ის responsibility
- **F15.** User-facing toast: "Generation passed/failed a11y; reason: X"

### 1.5 Settings
- **F16.** BYO Anthropic API key option (Pro tier)
- **F17.** Theme: light/dark/auto via `figma.editorPreferences`
- **F18.** Disable/enable: brand-QA, a11y guard (advanced users only)

---

## 2. Non-Functional Requirements

### 2.1 Performance
- **NF1.** Time-to-first-token < 3s (P50)
- **NF2.** Time-to-rendered-screen < 30s for typical 1-screen prompt
- **NF3.** Selection capture < 500ms for selections ≤ 100 nodes

### 2.2 Reliability
- **NF4.** Tier 3 Anthropic rate limit target (2k RPM / 800k ITPM)
- **NF5.** Backend uptime ≥ 99.5% (Cloudflare Workers SLA)
- **NF6.** Generation failure → graceful retry, max 2 attempts

### 2.3 Security
- **NF7.** Anthropic API key NEVER lives in plugin code or clientStorage
- **NF8.** Backend uses JWT for user auth (Figma user ID as subject)
- **NF9.** `manifest.networkAccess.allowedDomains` strict — no `"*"`
- **NF10.** No PII in telemetry — only anonymized event types

### 2.4 Compatibility
- **NF11.** Figma Plugin API v `"1.0.0"`, `documentAccess: "dynamic-page"`
- **NF12.** Figma Desktop + Web (Chrome, Safari, Firefox)
- **NF13.** MCP spec 2025-11-25 baseline; ready to migrate to 2026-07-28

---

## 3. Constraints (ARCHITECTURE-ის ცნობილი ლიმიტები)

### Figma sandbox
- **C1.** Main thread არ აქვს `fetch` / `window` / DOM
- **C2.** UI iframe და main thread comms მხოლოდ `postMessage` (structured-clone)
- **C3.** `clientStorage` 5MB cap, **არ არის secret store**
- **C4.** Dynamic-page mode: only `*Async` getters work
- **C5.** `loadFontAsync` mandatory before text mutations

### Anthropic API
- **C6.** MCP connector tools-only (no resources, no prompts via connector)
- **C7.** Opus 4.7 returns 400 if `thinking.enabled` — use `effort` parameter
- **C8.** Prompt cache TTL: 5 min default, 1h available (2× write cost)
- **C9.** Vision: max 8000×8000 image, recommend ≤ 1568×1568 for cost

### MCP
- **C10.** Streamable HTTP / SSE only (no stdio via connector)
- **C11.** Not ZDR-eligible (no Zero Data Retention)
- **C12.** Not available on Bedrock / Vertex

---

## 4. რა **არ** არის MVP scope-ში

> "Don't build what you don't need." — discipline ბიზნესის discipline-ია.

- ❌ Multi-screen flow state machine (Phase 2)
- ❌ Brand-QA vision pass (Phase 2 — Pro tier)
- ❌ Code generation (out of scope — v0/Builder.io territory)
- ❌ Custom MCP server (Phase 3 — Enterprise)
- ❌ Multi-language UI (English only MVP)
- ❌ Collaboration features (figma-ი თვითონ აკეთებს)
- ❌ Version history of generations (browser localStorage enough)
- ❌ AI image generation (use Unsplash/Iconify MCP)
- ❌ Animation generation
- ❌ 3D / variable fonts

---

## 5. Open Questions (გადასაწყვეტი planning phase-ში)

| # | კითხვა | რომელ docs-ში გადაიჭრება |
|---|---------|---------------------------|
| Q1 | რა იქნება Anthropic key billing — BYO ან ჩვენი hosted? | `approach.md` decision log |
| Q2 | Backend hosting — Cloudflare Workers vs Fly vs Vercel? | `research-roadmap.md` |
| Q3 | Pro pricing — $10/mo, $15/mo, $20/mo? | `goal.md` + user research |
| Q4 | სახელი final-ი | `branding.md` |
| Q5 | Figma plugin manifest features (`networkAccess`, capabilities) | `architecture.md` §0.A |
| Q6 | Claude Design plugin (https://claude.com/plugins/design) — სად ჯდება? | `research/claude-design-plugin.md` |
| Q7 | Telemetry vendor — PostHog, Plausible, custom? | `research-roadmap.md` |
| Q8 | Auth provider — Clerk, Auth.js, custom JWT? | `research-roadmap.md` |
