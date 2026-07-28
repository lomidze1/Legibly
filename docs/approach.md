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
- **Money target:** $300K–$1M ARR for 1–2 people.
- **Outcome:** [goal.md §0](./goal.md) is the locked north-star. Naming + MVP scope follow this direction. The 5 wedges survive, repackaged "generator → correctness suite." `architecture.md` core is generation-centric and needs a correctness-first reframe in a separate joint session (CLAUDE.md §8). Next: research detection + remediation reliability ([research/wcag-detection-architecture.md], [research/a11y-remediation-methodology.md], [research/a11y-competitor-teardown.md]) before MVP scope lock.

### D8 — 2026-06-14 — Token-creation policy when no on-system token can satisfy a fix (user-approved)
- **Alternatives:** hard-block + escalate-only (never create a token); silent token creation (rejected — violates system-strict)
- **Why:** hard-block creates dead-ends (friction — the thing the a11y-first "auto-fix that helps" thesis exists to avoid); silent creation breaks system-strict trust. Proposing a minimal-change new token with explicit one-click accept keeps the user in control AND never dead-ends.
- **Decision:** when no existing token passes → **auto-propose a minimal-change new token, user one-click accepts** (the only sanctioned path to a novel value). Provide a **"strict mode" toggle** for governance-heavy teams that forbids new tokens (falls back to escalate-only). Deterministic on-system snap is always tried first; new-token proposal is the last resort before escalation.
- **MVP decision (build sequence):** spearhead = **"Contrast, fixed right"** — deterministic, client-side, **no AI/backend** (lowest cost, fastest, most trustworthy). Moat = effective-background resolution (gradients/images/opacity/stacked fills) where axe + Figma-native fail. Free = detect; Paid ($12/mo) = fix + batch + compliance report. Backend + Claude enter only at v0.3 (LLM-judgment tier: alt text/labels) and billing. Pricing: Pro $12/mo, Team $15/seat (Stark-anchored) — ⚠️ **Team ნაწილი superseded by D20** (მოხსნილია; Pro $12 ძალაშია).

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

### D16 — 2026-07-26 — Wave 1: variable-mode sweep (dark mode) + platform tap-target floor
- **Context:** v0.1–v0.3-ის ყველა დაგეგმილი SC ჩაბარდა ([checks-expansion.md §1](./checks-expansion.md)) — შემდეგი ნაბიჯი აღარ იყო roadmap-ში. კვლევამ ორი რამ აჩვენა: (1) `resolveVariableColor` მხოლოდ `collection.defaultModeId`-ს კითხულობდა, ანუ mode-ებიან ფაილში **მხოლოდ ერთ თემას ვამოწმებდით**; (2) იგივე ხარვეზი fix-ის მხარესაც არსებობდა — token-ის rebind Light-ს ასწორებდა და Dark-ს ჩუმად ტეხდა (NF3-ის ლატენტური დარღვევა, ჩვენი დეტექციისგან დამოუკიდებლადაც).
- **Alternatives:** (a) mode-ის დროებით გადართვა დოკუმენტზე და ხელახლა წაკითხვა — უარყოფილია, canvas-ის მუტაცია undo-history-სა და user-ის ხედვას ბინძურებს; (b) mode findings-ის auto-fix — გადავადებულია, იხ. ქვემოთ.
- **Decision — detection:** ცალკე `ModeProjection` — ყოველი mode-ისთვის variable-ები resolve-დება alias-ების გავლით (per-collection mode override), და იქმნება ხის **read-only mirror** (`shared/project.ts`), სადაც variable-ზე მიბმული solid paint-ები იმ mode-ის ფერით იცვლება. **ახალი judgment არ ჩნდება — მხოლოდ მეტი sample**, ზუსტად გრადიენტის კონტრაქტის ანალოგიით. მოწმდება მხოლოდ ფერზე დამოკიდებული SC — 1.4.3 და 1.4.11.
- **Zero-FP დაცვა:** subtree, რომელსაც `explicitVariableModes`-ით სხვა mode აქვს მიმაგრებული, mirror-ში **invisible-ად ინიშნება და არ სკანირდება** — ის canvas-ზე თავის mode-ს რენდერავს (base scan-მა უკვე გასამართლა), სხვა mode-ის პროექცია მასზე ისეთ ჩავარდნას გამოიგონებდა, რომელსაც user ვერასდროს ნახავს (F8).
- **Decision — fix safety (`ModeGuard`):** ფერის fix-ი commit-ის წინ ხელახლა იზომება **ყველა დანარჩენ mode-ში**; თუ რომელიმეში certain violation-ია — fix უარყოფილია და fill აღდგება (იგივე try/finally, რაც არსებულ commit-time verification-ს). Guard-ი მხოლოდ node-ის top-level frame-ს პროექცირებს (+ page-ის shallow mirror) — მთელი გვერდის პროექცია batch-ზე NF4-ს დაარღვევდა.
- **Deliberate deferral:** mode-ში ნაპოვნი finding-ი **არ არის one-click fixable** — fix engine ეკრანზე მოცემულ თემას ამოწმებს, ანუ იქ "დაფიქსირებული" შედეგი მეორე თემაზე გარანტიას არ იძლევა. ბარათი პატიოსნად ხსნის რა ვნახეთ და რა გააკეთოს user-მა. Mode-aware კანდიდატების გენერაცია (token-ის per-mode მნიშვნელობებით) — მომდევნო wave.
- **Also:** tap-target floor გახდა პარამეტრი — 24px = **SC 2.5.8** (AA, spacing exception ძალაშია), 44px = **SC 2.5.5** (AAA, ასევე iOS HIG; exception არ აქვს). რეპორტში SC ყოველთვის იმ წესს ემთხვევა, რომელიც რეალურად გამოვიყენეთ. Android-ის 48px არ დაემატა — ის WCAG კრიტერიუმი არ არის და "violation" tier-ს პატიოსნად ვერ დაიკავებდა.
- **Verify:** 257 tests green (ახალი: `project.test.ts` 10, `modes.test.ts` 5, target-floor 4), typecheck + build სუფთა.

### D17 — 2026-07-26 — Wave 2: SC 1.4.1 (use of colour) + clipped text
- **1.4.1 Use of Color (Level A, აქამდე 0% დაფარვა):** ვამოწმებთ **მხოლოდ ერთი text layer-ის შიგნით** — run, რომელიც ირგვლივ მდებარე body-სგან განსხვავდება და მას სხვა cue არ აქვს. ხმაურის ოთხი ფილტრი: underline/strikethrough · სხვა weight · სხვა size · italic — თითოეული ჩუმდება, რადგან non-colour cue არსებობს; **პლუს** candidate, რომელიც body-ს ფერის იმავე hue-ოჯახშია (±30°, fix engine-ის იგივე ტოლერანტობა) იგნორირდება — ეს tonal variant-ია (muted caption, emphasis), არა semantic ფერი (link-blue, error-red). Standalone label-ები, icon-ები, chart key-ები **საერთოდ არ სამართლდება** — მათი მნიშვნელობა ფაილში არ წერია (footer-ში).
- **Tier:** ყოველთვის `needsReview` — detection research §2.4-ის პირდაპირი შესრულება ("1.4.1 never hard-fail"). Precedent: 1.4.12-იც needsReview-ია და one-click fix მაინც აქვს.
- **Fix:** ერთი კლიკი — underline არჩეულ range-ებზე; verify = Figma-ში რეალურად ჩაწერილი decoration-ის ხელახლა წაკითხვა, ჩავარდნაზე revert (NF1). ერთი finding ერთ layer-ზე, თუნდაც რამდენიმე run იყოს — ერთი გადაწყვეტილება, არა ხუთი ბარათი.
- **Perf:** `getStyledTextSegments` per-node API call-ია, ამიტომ pre-filter — თუ layer-ის `fills` არ არის `figma.mixed`, ფერადი run ვერ იარსებებს და call საერთოდ არ ხდება (NF4).
- **Clipped text:** ტექსტი, რომელიც clip-ის მქონე ancestor-ის საზღვარს სცდება — სუფთა გეომეტრია, 2px sub-pixel დაშვებით. **Auto-fix შეგნებულად არ აქვს:** container-ის გაფართოება ან copy-ის შემოკლება layout-ის გადაწყვეტილებაა, ჩვენი გამოსაცნობი არა — ვაჩვენებთ რა იმალება და არჩევანს user-ს ვუტოვებთ.
- **SC labeling (პატიოსნება):** clipped text იწერება `1.4.10`-ზე, მაგრამ footer ცალსახად ამბობს — "we flag text clipped by its own container; real reflow behaviour at 320px cannot be tested from a static file". ეს ზუსტად ის ფორმულირებაა, რასაც detection research §1 გვირჩევდა 1.4.10-ზე; conformance verdict-ს არ ვაცხადებთ.
- **Coverage:** 5 → **8 SC** (1.4.3 · 1.4.12 · 1.4.11 · 1.1.1 · 2.5.8/2.5.5 · 1.4.1 · 1.4.10), + 1.4.3/1.4.11 ყველა variable mode-ზე (D16).
- **Verify:** 284 tests green (ახალი: `use-of-color.test.ts` 16, `clipped-text.test.ts` 9, scan integration 2), typecheck + build სუფთა.

### D18 — 2026-07-26 — Wave 3: მესამე tier (`advisory`) + 2.4.6 label presence + 2.4.7 focus capability
- **Advisory tier (არქიტექტურული ნაწილი):** `Tier` გახდა `violation | needsReview | advisory`. `advisory` **საერთოდ არ არის WCAG verdict** — ეს ჩვენი რჩევაა იქ, სადაც კრიტერიუმი არ არსებობს. რატომ ცალკე tier და არა უბრალოდ needsReview: detection research §1-ის მთავარი გაფრთხილება ზუსტად ესაა — best practice-ის conformance-ად გასაღება a11y-მარკეტინგის სტანდარტული არაპატიოსნებაა. Advisory finding-ს `sc` ველში კრიტერიუმის ნომრის ნაცვლად `"Best practice"` უწერია, CSV-ში result = **"Advisory (not WCAG)"**, UI-ში ცალკე სექცია "Legibly recommends" და **issue count-ებში არ ითვლება**.
- **A1 small text (advisory):** < 12px. WCAG-ს ფონტის მინიმუმი არ აქვს — 8px ტექსტი 1.4.3-ს გადის, თუ კონტრასტი უჭერს. ეს რეალური ხარვეზია "conformant"-სა და "legible"-ს შორის, და პროდუქტს Legibly ჰქვია.
- **A2 line length (1.4.8 AAA) — უარვყავი:** სტრიქონის სიგრძე Figma-დან მხოლოდ შეფასებით იზომება (box width ÷ fontSize × შრიფტზე დამოკიდებული 0.45–0.6 კოეფიციენტი) — 80-სიმბოლოიან ზღვართან ეს ±20% ცდომილებაა, ანუ ~64–100 რეალურ სიმბოლოს დავაფლაგებდით. მიახლოებითი advisory, რომელიც არასწორად ირთვება, უარესია ვიდრე მისი არარსებობა.
- **S5 — SC 2.4.6 label presence (needsReview):** placeholder-as-label. Field-ს ვცნობთ **მხოლოდ სახელით** (იგივე პატიოსნების იარუსი, რაც 2.5.8-ს აქვს), label-ს — ტექსტით, რომელიც უშუალოდ ზემოთ ან მარცხნივ დგას (≤40px, ორი ancestor-ის სიღრმეზე). Field-ის შიგნით მდებარე ტექსტი label-ად **არ ითვლება** — სწორედ ისაა ბაგი. Footer-ში 2.4.6 "not checked"-იდან გადავიდა "ნაწილობრივ" — presence ვამოწმებთ, wording-ის აღწერითობას არა.
- **S6 — SC 2.4.7 focus capability (needsReview):** component set, რომელსაც state-ღერძი აქვს (hover/pressed/…), მაგრამ focus ვარიანტი არა. Noise-ის საწინააღმდეგოდ: ღერძი state-ად ითვლება მხოლოდ თუ მისი მნიშვნელობების **უმრავლესობა** state-სიტყვაა — "Type=Default|Danger|Ghost|Primary" ერთი დამთხვევის გამო არ ჩაითვლება. Size/icon-ღერძები საერთოდ არ სამართლდება. Runtime-focus რომ არ გვიმოწმებია — footer-ში წერია.
- **Coverage:** 8 → **10 SC** + advisory tier. Auto-fix არცერთს არ აქვს შეგნებულად: label-ის ტექსტი, focus-ring-ის დიზაინი და ფონტის ზომა შინაარსობრივი/დიზაინის გადაწყვეტილებებია, არა deterministic snap — "fix" აქ გამოცნობა იქნებოდა (D7-ის #1 წესი).
- **Verify:** 310 tests green (ახალი: form-label 12, focus-state 9, advisory 4, scan tier-order 1), typecheck + build სუფთა.

### D19 — 2026-07-27 — ვალის დახურვა + interactive scope + mode-aware fix
თანმიმდევრობა user-ის არჩევანით: ჯერ ბაგები, მერე ღირებულება.

**1. Wave 0 ვალი დაიხურა.**
- **B2/D15:** `harvestTokens` ახლა გამორიცხავს "Legibly" collection-ის ვარიაბლებს. კონსტანტა `PROPOSAL_COLLECTION` გადავიდა `tokens.ts`-ში და `apply.ts` იქიდან იღებს — ორივე მხარე ერთ წყაროზეა, drift შეუძლებელია. ამის გარეშე plugin საკუთარ ნაწარმს მომდევნო scan-ზე user-ის სისტემად კითხულობდა და "only use my existing colors" ჩუმად კარგავდა აზრს.
- **B6:** bg-fix-ის ხილვადობა — ბარათზე owner-ის სახელი clickable გახდა (select/zoom canvas-ზე) + before→after swatch-ები hex-ებით; applied-record-ის `changeDescription`-ში დაემატა `(#FFFFFF → #F1F1F1)`. Background-ის ცვლილება იმ ბარათზე, საიდანაც გაუშვი, უხილავია — ჩანაწერმა უნდა თქვას რა რად იქცა.

**2. Interactive scope გაფართოვდა (2.5.8 + 1.4.11 ერთდროულად).** ორივე check `collectTargets`-ზე დგას, ანუ scope ერთი ადგილიდან იმართება. `certain` უცვლელია (მხოლოდ prototype reaction). Suspect-ს დაემატა:
- **State VARIANT ღერძი** instance-ზე — კომპონენტი აშენებულია რეაქციისთვის. `Status` **განზრახ არ ითვლება** (badge-ის კონვენციაა: Status=Success).
- **form-field სახელები** (`FIELD_HINT`, გაზიარებული 2.4.6-თან) — input-ის ჩარჩო UI component boundary-ია და 1.4.11 სწორედ ამას ზომავს.
- **⚠️ შეგნებულად არ დავამატე** სტრუქტურული "ღილაკს ჰგავს" ევრისტიკა (fill+radius+ტექსტი+ზომის ჭერი). Imported ფაილებზე (`div`/`span` სახელები, reaction-ების გარეშე) სწორედ ის იმუშავებდა, მაგრამ ის დაფუძნებულია გამოცნობაზე და badge/tag/card-ებზე ხმაურს დაბადებდა. საჭიროა ჯერ რეალურ ფაილზე გაზომვა, მერე გადაწყვეტა — არა პირიქით.

**3. Mode-aware auto-fix (D16-ის deferral დაიხურა).** ადრე dark mode-ის finding მხოლოდ ჩანდა; ახლა სწორდება.
- **მოდელი:** verification განზოგადდა **კონტექსტებზე** — `FixContext = { mode, bgs }`. გრადიენტი ერთ კონტექსტში რამდენიმე sample-ია, თემა — ცალკე კონტექსტი. კანდიდატის ვერდიქტი = **worst ratio ყველა კონტექსტზე**.
- **მონაცემები:** `TokenCandidate.colorsByMode` (ტოკენის მნიშვნელობა თითო თემაზე, `attachModeColors`) + `Finding.bgByMode` (ფონი თითო თემაზე; `''` = ეკრანზე მოცემული). bgByMode ივსება scan-ის დროს, თითო mode-ის mirror-ის **ერთი** id-ინდექსით — O(findings), არა O(nodes × findings).
- **Proposal-ის განსხვავება:** ახალი ფერი ერთი ლიტერალია, ყველა თემაზე იგივე — ამიტომ ის ყველა კონტექსტის ფონების **გაერთიანებას** უნდა გაუძლოს.
- **ორმაგი დაცვა:** planFix ირჩევს კანდიდატს, რომელიც ყველა თემას გადის; commit-ის წინ `ModeGuard` (D16) იმავეს ხელახლა ამოწმებს რეალურ canvas-ზე. Planner ცდება — guard მაინც აბრუნებს.
- **Verify:** ტესტი, რომელიც ყველაზე მეტს იცავს: near-black ტოკენი, რომელიც Light-ზე 18:1-ია და Dark-ზე 1.1:1 — **არ უნდა შემოთავაზდეს**. `fix-modes.test.ts` 12 ტესტი.

**Verify:** 328 tests green, typecheck + build სუფთა.

### D20 — 2026-07-28 — Team tier მოხსნილია launch-იდან; ორი tier (Free / Pro $12) — user-approved
- **Context:** საიტი სამ სვეტს აჩვენებდა, მაგრამ Team-ის ორივე bullet ("Shared token rules across the team", "Priority support") არაფერს არ ეყრდნობოდა — არც კოდი, არც backend, არც support-პროცესი. Plugin-ის PlansPanel უკვე მხოლოდ Free/Pro-ს აჩვენებდა, ანუ საიტი და პროდუქტი ერთმანეთს ეწინააღმდეგებოდა.
- **Alternatives:** (b) Team-ს რეალური seat-value მიეცეს ახლა — უარყოფილია: shared policy / audit trail backend-ს ითხოვს (Q1/Q5 ჯერ ღიაა), ანუ launch-ს გადაავადებდა.
- **Decision:** launch = **ორი tier — Free (detect) და Pro $12/mo (fix + batch + CSV report + strict mode)**. Team ბრუნდება მაშინ და მხოლოდ მაშინ, როცა seat-ს რეალური ღირებულება ექნება: org-დონეზე ჩაკეტილი strict mode, project-level audit trail, sanctioned token allow-list. მაშინ ფასი $19–24/seat უნდა იყოს, არა $15 — governance-ის მყიდველი (design lead / compliance owner) სხვა budget-ია, და $12→$15 delta seat-motion-ს არ ამართლებდა.
- **Why $12 რჩება (და არა $9 ან $15):** Stark-ის Pro anchor-ია ზუსტად $12 ([a11y-competitor-teardown §pricing](./research/a11y-competitor-teardown.md)) — ზემოთ Team-ის გარეშე $15 გვხდის კატეგორიის ყველაზე ძვირად კომოდიტიზებულ ბაზარზე; $9 კი "იაფი checker"-ის სიგნალია მაშინ, როცა ჩვენი Pro მკაცრად მეტს აკეთებს (fix + verify + report vs detect + suggestion), და ფასის მერე აწევა ადრეულ subscriber-ებთან trust-ს ჭამს. $12 ასევე უკვე ჩაწერილია plugin-ის PlansPanel-ში — ცვლილება ნულოვანია.
- **#1 quality rule-თან კავშირი:** ცარიელი სვეტი იგივე კლასის არაპატიოსნებაა, რაც best-practice-ის conformance-ად გასაღება (D18) — ვყიდით მხოლოდ იმას, რაც არსებობს.
- **Outcome:** `website/src/app/page.tsx` (tiers 3→2), `page.module.css` (`.tiers` grid 3→2 სვეტი), README, `docs/website.md`, `docs/requirements.md` F19, Open-questions checklist. Plugin ცვლილებას არ საჭიროებდა — უკვე Free/Pro $12 ეწერა.
- **Follow-up (user-approved, იმავე დღეს):** Team ამოღებულია **რედიზაინის handoff-იდანაც** (`website-new-design/` — `.dc.html` ბარათი + `recommendedPlan` enum + `teamMarked` binding + README spec; zip ხელახლა აეწყო, რომ სტალე spec-მა ვერ იაღორძინოს), და **ARR-ის მიზნიდანაც** ("team seats → $1M+" წაიშალა `goal.md`/`approach.md`-ში). მიზეზი: სამომავლო seat-upside-ის დღეს ჩაწერა იმავე ცარიელი დაპირების კლასია — მომავლის მიზნები მაშინ დაიწერება, როცა მათი საფუძველი გაჩნდება.

### D21 — 2026-07-29 — Billing = Paddle (MoR); Figma Payments გამორიცხულია; license binding OAuth-ის გარეშე — user-approved
- **Context:** "ვინ იხდის?" კითხვამ ორი დამოუკიდებელი საკითხი გააერთიანა — (ა) ვინ ამუშავებს ფულს, (ბ) plugin-მა როგორ იცის ვინ გადაიხადა. `launch-stack.md` Q1 ჯერ ღია იყო.
- **გადამწყვეტი ფაქტი:** Figma Community-ზე paid resource-ის გამოქვეყნება **მოითხოვს აქტიურ Stripe account-ს** ([Figma Help](https://help.figma.com/hc/en-us/articles/360042293394-Publish-plugins-to-the-Figma-Community)), Stripe კი საქართველოს merchant country-ად **არ უჭერს მხარს** (46 supported country, GEL არ არსებობს). გამყიდველი = **ქართველი ინდ. მეწარმე პირადი სახელით/ID-ით** (user-confirmed) ⇒ **`figma.payments` (launch-stack ვარიანტი A) გამორიცხულია.**
- **Alternatives:** (b) **Flitt** — უარყოფილია v1-სთვის: PSP და არა Merchant of Record, ე.ი. EU B2C digital services-ის VAT პირველივე ევროდან ჩვენზეა (OSS რეგისტრაცია + 27 იურისდიქცია), + უცხოელი დიზაინერისთვის უცნობი checkout = conversion-ის დანაკარგი. web2wireframe-ისთვის ლოგიკურია (ლოკალური აუდიტორია), Legibly-ის target გლობალურია. (c) **LemonSqueezy** — უარყოფილია: Stripe-ის შვილობილია, იგივე GE-ის ბლოკი.
- **Decision:** **Paddle (MoR)** — GE = supported seller country, payout wire/Payoneer, VAT/sales tax სრულად მათი ვალდებულებაა. ~5% + $0.50 fee = ცნობიერად გადახდილი ფასი იმისთვის, რომ $12/mo პროდუქტმა 27 ქვეყნის tax compliance არ იტვირთოს. Flitt რჩება როგორც შესაძლო **ლოკალური** არხი მოგვიანებით, არა v1.
- **License binding — Figma OAuth არ ვაშენებთ:** `figma.currentUser.id` (manifest `permissions: ["currentuser"]`) აძლევს სტაბილურ Figma user ID-ს პლაგინის შიგნიდან, OAuth-ის გარეშე. ნაკადი: Paddle checkout → webhook → license key → Resend email → user აწერს key-ს Settings-ში → `POST /activate {key, figmaUserId}` → seat binding (max 2) → signed token → `figma.clientStorage` cache + offline grace. `currentUser` შეიძლება იყოს `null` ⇒ fallback: key მარტო email-ზე იბმება.
- **რატომ ჰყოფნის:** `currentUser.id` client-reported-ია, ე.ი. spoof-ადი — მაგრამ $12-იან პლაგინზე მიზანი anti-piracy არაა, არის key-ის უაზრო გაზიარების შეჩერება; ამისთვის seat-limit საკმარისია და OAuth-ის სირთულე რისკს არაპროპორციულია. **Figma OAuth ბრუნდება მაშინ, როცა** website-ზე account portal ("Sign in with Figma") ან cross-device sync გვინდა — post-v1.
- **Outcome:** `launch-stack.md` §4/§5/§8 (Q1, Q3 დახურულია), `requirements.md` F20. **F20-ის "no server" ნაწილი ძალადაკარგულია** — Paddle-ს LemonSqueezy-ს მსგავსი built-in license API არ აქვს, ე.ი. მინიმალური backend სავალდებულოა; სამაგიეროდ Render Web Service ($7/თვე) არ გვჭირდება — webhook + `/activate` = Vercel serverless + KV free tier, ანუ website და API ერთ hosting-ზე (Q3 → **Vercel**).

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
- [x] **Backend hosting choice** — ✅ **Vercel serverless** (D21) — website + Paddle webhook + `/activate` ერთ hosting-ზე; long-running service v1-ს არ სჭირდება.
- [x] **Auth strategy** — ✅ **auth vendor არ გვჭირდება** (D21): license key + `figma.currentUser.id` seat binding + signed token. Clerk/Auth.js არარელევანტურია; Figma OAuth = post-v1.
- [ ] **Telemetry vendor** — PostHog / Plausible / custom?
- [x] **Pricing tier numbers** — ✅ Pro $12/mo (D8, Stark-anchored); free = detect-only. Team tier launch-იდან **მოხსნილია** (D20).
- [ ] **MCP server hosting** — same as backend or separate?
- [ ] **Claude Design plugin integration** — what do we leverage? (`research/claude-design-plugin.md`)
- [ ] **Anthropic billing** — BYO key from day 1 or our hosted only?

---

## 6. Claude-ისთვის როგორ მუშაობდეთ ამ ფაილით

- ყოველ session-ში დაგვმატე **ერთი ახალი Decision Log entry** თუ რაიმე ფუნდამენტური გადაწყვეტილება მიიღე.
- დაუმატე **რისკი** Risk Register-ში თუ ახალი threat იპოვე.
- "Open questions"-ში მონიშნე resolved-ი როცა გადაიჭრება.
