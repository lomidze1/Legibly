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

### D3 — 2026-05-26 — Product name = placeholder token (superseded by D9)
- **Alternatives:** lock "Designer" name, use literal "TBD" everywhere
- **Why:** "Designer" generic, trademark-conflict-prone, SEO-impossible. ბრენდინგი წინ უსწრებს კოდს.
- **Outcome:** `docs/branding.md` central config + placeholder token, `scripts/rename-product.sh` for bulk replace. **Final name locked in D9 → "Legibly".**

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

### D7 — 2026-06-14 — Pivot: generator → accessibility-first "correctness layer" (LOCKED, user-approved)
- **Alternatives:** (B) standalone AI design generator (original hypothesis, scored 18/30), (C) broad governance gate (build all 5 wedges at once)
- **Why:** Track A + opportunity research ([research/figma-plugin-opportunity.md](./research/figma-plugin-opportunity.md), scored A11y/correctness gate **27/30** vs generator 18/30) — generator lane is saturated AND nativized by Figma's free Agent; a 1–2 person team has no distribution edge there. Demand shifted from *making* to *trusting* designs. Founder refinement over the raw "governance gate" rec: lead with a **focused accessibility auto-fix spearhead** (clear legal wallet: EAA/ADA → compliance budget) rather than a broad/abstract gate, because (a) a11y is the only correctness pain with a wallet that reliably opens, (b) "auto-fix that helps" beats "gate that blocks/nags", (c) demoable/viral hook aids distribution (the real risk).
- **Product:** accessibility-first correctness plugin. Free = detect/flag (funnel). Paid ($12–19/mo) = one-click auto-fix + compliance report + system-strict enforcement + brand-QA (v2). Spearhead = a11y; expansion modules = system-strict / design-system governance, brand-QA. Generation kept only as an internal "fix it for me" action, never the headline.
- **#1 quality rule:** TRUST. No "bad-AI-from-bad-AI." Detection deterministic-first; remediation correctness-by-construction (fix → re-verify deterministic check → commit only if it passes; else escalate); system-strict (snap to user's tokens, never invent off-system values). LLM only for content-judgment fixes (alt text/labels) with verification + "review recommended" labeling.
- **Money target:** $300K–$1M ARR for 1–2 people (team seats → $1M+).
- **Outcome:** [goal.md §0](./goal.md) is the locked north-star. Naming + MVP scope follow this direction. The 5 wedges survive, repackaged "generator → correctness suite." `architecture.md` core is generation-centric and needs a correctness-first reframe in a separate joint session (CLAUDE.md §8). Next: research detection + remediation reliability ([research/wcag-detection-architecture.md], [research/a11y-remediation-methodology.md], [research/a11y-competitor-teardown.md]) before MVP scope lock.

### D8 — 2026-06-14 — Token-creation policy when no on-system token can satisfy a fix (user-approved)
- **Alternatives:** hard-block + escalate-only (never create a token); silent token creation (rejected — violates system-strict)
- **Why:** hard-block creates dead-ends (friction — the thing the a11y-first "auto-fix that helps" thesis exists to avoid); silent creation breaks system-strict trust. Proposing a minimal-change new token with explicit one-click accept keeps the user in control AND never dead-ends.
- **Decision:** when no existing token passes → **auto-propose a minimal-change new token, user one-click accepts** (the only sanctioned path to a novel value). Provide a **"strict mode" toggle** for governance-heavy teams that forbids new tokens (falls back to escalate-only). Deterministic on-system snap is always tried first; new-token proposal is the last resort before escalation.
- **MVP decision (build sequence):** spearhead = **"Contrast, fixed right"** — deterministic, client-side, **no AI/backend** (lowest cost, fastest, most trustworthy). Moat = effective-background resolution (gradients/images/opacity/stacked fills) where axe + Figma-native fail. Free = detect; Paid ($12/mo) = fix + batch + compliance report. Backend + Claude enter only at v0.3 (LLM-judgment tier: alt text/labels) and billing. Pricing: Pro $12/mo, Team $15/seat (Stark-anchored).

### D9 — 2026-06-14 — Brand name LOCKED = "Legibly" (user-approved; supersedes D3)
- **Alternatives:** Passly (rejected — dead Kaseya IAM brand, polluted SEO, existing TM), Accessly (too close to "Accessibly", a real a11y brand/TM), Remedy (common word, TM-crowded), Contrastly (photography brand + narrow scope), Designer (original placeholder — generic).
- **Why:** "Legibly" says the function (legible/clear/readable = accessibility-first correctness), scales across the whole correctness layer (a11y → system-strict → brand-QA), is brandable/coined-ish, and is the cleanest verified option (no existing software brand, free on Figma Community, indicatively TM-clear).
- **Outcome:** `branding.md` updated; `rename-product.sh "Legibly" "legibly"` expanded `{{PRODUCT_NAME}}` tokens across 14 files. Tagline: *"Accessibility & design-system auto-fix for Figma — WCAG 2.2 AA, done right."* Figma store title: *"Legibly — Accessibility Auto-Fix & WCAG 2.2 AA Checker."*
- **⚠️ Open:** web-checks are indicative, NOT legal clearance. Formal USPTO/EUIPO search + domain acquisition (legibly.com is parked; .app/.io as fallback) = Track F before public launch. `architecture.md` literal "Designer" left as legacy alias (joint reframe later).

### D10 — 2026-07-13 — v0.1 engine implemented; scaffold = raw Vite (resolves requirements Q4)
- **Alternatives:** `create-figma-plugin` (F2-ის თავდაპირველი ვარაუდი)
- **Why:** `create-figma-plugin` რეალურად Preact+esbuild-ზეა (არა React+Vite, როგორც F2 უშვებდა) და ერთი მცირე plugin-ისთვის ზედმეტ framework lock-in-ს შემოიტანდა. Raw dual-bundle Vite (IIFE main + singlefile ui) იძლევა სრულ კონტროლს + native vitest-ს.
- **Outcome:** `plugin/` package: culori WCAG-2 gate + APCA advisory, effective-background resolver (fill stacks / opacity / z-order siblings; gradient/image/blend → needsReview), 3-tier classify/scan, token harvester (variables+styles, alias-resolved), fix engine (same-ramp → hue-filtered nearest → any token → D8 proposal → escalate) verification loop-ით, commit-time re-verify + revert, batch fix single undo-თი, strict mode, React UI. **120 unit tests green** (მ.შ. 500-case property sweep: committed candidate ვერასდროს ჩავარდება — NF1).
- **⚠️ Deliberate deferral:** F13-ის "adjust background token" საფეხური v0.1-ში escalation guidance-ია და არა ავტო-კანდიდატი — გაზიარებული background-ის მუტაციამ შეიძლება sibling ტექსტების კონტრასტი დაამტვრიოს; უსაფრთხო ავტო-fix-ს სჭირდება dependent re-verification (v0.2 scope).

### D11 — 2026-07-14 — Gradient backgrounds resolved by whole-range sampling (user feedback)
- **Context:** Real-file testing-მა აჩვენა, რომ gradient → უპირობო needsReview ბლოკავდა იმ საიტებს, სადაც გრადიენტი ფართოდ გამოიყენება — plugin "ვერ ეხმარებოდა" (user-ის top შენიშვნა).
- **Decision:** გრადიენტი deterministic-ად წყდება sampling-ით (stops + dense grid, geometry ignored = conservative): **ყველა sample გადის → pass · ყველა ჭარბობს → violation · straddle → needsReview range-ით** ("2.1:1–6.3:1"). Fix-კანდიდატი მთელ range-ზე მოწმდება (`minRatioOver`). Zero-FP კონტრაქტი უცვლელი — geometry-ს იგნორი მხოლოდ under-decide-ს იძლევა, mis-decide-ს ვერასდროს.
- **Also:** rendered-but-invisible ტექსტი (0% fill — import artifact) აღარ იჩქმალება → needsReview `invisible-text`.

### D12 — 2026-07-14 — v0.2 checks shipped: target size (2.5.8), text spacing (1.4.12), non-text contrast (1.4.11)
- **Scope per requirements §2 deferred roadmap** (user-approved "შეასრულე 2 შემდეგი ფაზა"). Honesty tiers detection research §2.2–2.3-ის მიხედვით:
  - **2.5.8:** interactive = prototype reactions (certain → violation-eligible) vs სახელით მიხვედრილი (suspect → needsReview). 24×24 + სრული spacing exception (24px circle геометрия); nested targets collapse outermost-ზე. Fix: auto-layout min-size, commit-time re-verify + revert; non-auto-layout → guidance.
  - **1.4.12:** capability check only — authored line-height < 1.5× → **ყოველთვის needsReview** (runtime adaptability static ფაილიდან არ დგინდება); one-click "150%" fix explicit user action-ით. AUTO/letter-spacing არ იფლაგება (noise).
  - **1.4.11:** მხოლოდ interactive target-ების icons/strokes (meaningful-vs-decorative judgment-ის პატიოსანი შემოფარგვლა); certain target + all-samples-fail → violation, სხვა ყველაფერი needsReview. Fix = იგივე token-snap engine (planFix) paintTarget-ით.
- **Engine:** applyFix გაფართოვდა min-size/line-height/shape-fill/stroke სახეობებით — თითო fix-ს თავისი verifier-judge აქვს (იგივე ფუნქცია რაც detector-ს, NF1). 178 tests green.

### D13 — 2026-07-14 — v0.2 wave 2: pixel deep-check, CSV report, bg-adjust fix
- **Deep check (pixel-true):** "check by eye" ქეისებზე (ფოტო/რთული ფონი) — ტექსტი დროებით opacity=0 (visible=false-ის ნაცვლად — reflow-ს არ იწვევს), top-level frame → exportAsync PNG, რეალური პიქსელების sampling. Პიქსელი = ground truth: all pass → verified · all fail → confirmed · mixed → range. Ნახევრად გამჭვირვალე რენდერი → refuse to guess. **AI-ის დეტერმინისტული ალტერნატივა** (detection research §2.1.5) — $0, offline. LLM-vision იარუსი (v0.3) მხოლოდ content-judgment-ისთვის რჩება.
- **Compliance report (F19):** CSV (Q3: CSV ჯერ) — meta preamble (ფაილი, თარიღი, დონე, coverage + not-checked პატიოსანი სია) + row per finding/fix, RFC 4180. Სრულად client-side, beta-ში უფასო (F20).
- **Background-adjust fix (F13 step 3 — ხურავს D10-ის deferral-ს):** unfixable ვარდნებზე ვეძებთ bg-owner-ს (ერთადერთი გაუმჭვირვალე solid layer) და ვცდით user-ის ტოკენებს probing-ით. Commit-კრიტერიუმი **frame-wide**: target გადის **და** ფრეიმზე არცერთი მანამდე-გამავალი ტექსტი/icon-probe არ ვარდება; probe ყოველთვის აღადგენს საწყის fill-ს. Strict mode-ს არ ეხება (მხოლოდ არსებული ტოკენები).
- 202 tests green.

### D14 — 2026-07-14 — v0.3 shipped: alt-text tier (1.1.1) BYOK-first, hosted backend გადავადებული
- **Context:** requirements-ის v0.3 = LLM tier (backend + Claude). Hosted backend-ს სჭირდება deploy + key vault + billing (Q1/Q5 ღია) — ავტონომიურად ვერ კეთდება და distribution-first ლოგიკითაც ნაადრევია.
- **Decision:** **BYOK-first** — architecture-ის sanctioned fallback გზა ("BYOK direct: key in memory only, plugin → api.anthropic.com, allowlisted"). Manifest allowedDomains = ["https://api.anthropic.com"] reasoning-ით; privacy story განახლდა პატიოსნად: "ყველა შემოწმება on-device; optional AI assist შენი key-თ მხოლოდ არჩეულ სურათს აგზავნის". Hosted proxy → billing-ის გადაწყვეტისას (v0.4+).
- **Implementation:** 1.1.1 presence check deterministic-ია (sharedPluginData "legibly" store + decorative flag; <32px images skipped as noise) → ყოველთვის needsReview. AI assist: claude-opus-4-8, forced strict tool (emit_alt_text: decision/altText/confidence/rationale), deterministic validator gate (length/prefix/decorative-empty), **always review-required** — low confidence აიძულებს edit-ს; canvas-ს პირდაპირ ვერასდროს წვდება (research §3 trust discipline). Manual entry + decorative marker AI-ის გარეშეც მუშაობს. 228 tests green.

### D15 — 2026-07-16 — Legibly-ის proposal ტოკენები არ ითვლება user-ის ფერებად
- **Context:** რეალურ ფაილზე ტესტირებამ (v0.3 field test) აჩვენა: წინა run-ზე შექმნილი `legibly/contrast-fix-*` ვარიაბლები harvest-მა user-ის "existing tokens"-ად დაითვალა და მომდევნო scan-ზე fix-კანდიდატებად შესთავაზა — plugin-ი საკუთარ ნაწარმს საკუთარ ჭეშმარიტებად კითხულობდა. Პლუს, "Legibly" collection-ის არარსებობისას proposal user-ის პირველ collection-ში იწერებოდა.
- **Decision:** proposal ვარიაბლები ცხოვრობენ **მხოლოდ** dedicated "Legibly" collection-ში (fallback user-ის collection-ზე იკრძალება — collection ყოველთვის იქმნება) და **გამოირიცხებიან token harvest-იდან** — არც fix-კანდიდატებში, არც "Only use my existing colors" strict pool-ში არ ჩანან. System-strict positioning: ჩვენი შემოთავაზება user-ის სისტემა არ არის, სანამ user-მა თავად არ გადაიტანა.
- **Status:** ჩასაწერი კოდში v0.3 field-test batch fix-თან ერთად (იხ. `docs/test-findings-v03.md`).

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

- [x] **Brand name final** — ✅ **Legibly** (D9, 2026-06-14). Formal trademark/domain clearance = Track F before launch.
- [ ] **Backend hosting choice** — Cloudflare Workers ან Fly ან Vercel? (research) — *note: MVP v0.1 (deterministic contrast) needs no backend; defer to v0.3*
- [ ] **Auth strategy** — Clerk / Auth.js / custom JWT?
- [ ] **Telemetry vendor** — PostHog / Plausible / custom?
- [x] **Pricing tier numbers** — ✅ Pro $12/mo, Team $15/seat (D8, Stark-anchored); free = detect-only.
- [ ] **MCP server hosting** — same as backend or separate?
- [ ] **Claude Design plugin integration** — what do we leverage? (`research/claude-design-plugin.md`)
- [ ] **Anthropic billing** — BYO key from day 1 or our hosted only?

---

## 6. Claude-ისთვის როგორ მუშაობდეთ ამ ფაილით

- ყოველ session-ში დაგვმატე **ერთი ახალი Decision Log entry** თუ რაიმე ფუნდამენტური გადაწყვეტილება მიიღე.
- დაუმატე **რისკი** Risk Register-ში თუ ახალი threat იპოვე.
- "Open questions"-ში მონიშნე resolved-ი როცა გადაიჭრება.
