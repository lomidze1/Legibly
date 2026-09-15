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

### D21 — 2026-07-29 — `figma.payments` გამორიცხულია; identity = **Figma OAuth**
> ℹ️ ამ ჩანაწერის billing-vendor-ის ნაწილი **გადაწყდა [D23](#)-ში (Flitt)**. აქ რჩება ის ორი დასკვნა, რომელიც D23-მდე დადგინდა და ძალაშია.

**1. `figma.payments` გამორიცხულია — და ეს დანაკარგი არ არის.**
Figma Community-ზე paid resource-ის გამოქვეყნება **მოითხოვს აქტიურ Stripe account-ს**
([Figma Help](https://help.figma.com/hc/en-us/articles/360042293394-Publish-plugins-to-the-Figma-Community)),
Stripe კი საქართველოს merchant country-ად **არ უჭერს მხარს**. გამყიდველი = ქართველი ინდ. მეწარმე ⇒ არხი დახურულია.
სამაგიეროდ Figma-ს [review guidelines](https://help.figma.com/hc/en-us/articles/360039958914-Plugin-and-widget-review-guidelines)
პირდაპირ უშვებს გარე მონეტიზაციას: listing რჩება **Free**-დ, ფასი ცხოვრობს plugin-ის UI-სა და საიტზე,
და **Figma 0%-ს იჭერს**. w2w ზუსტად ასე მუშაობს ⇒ გარე checkout ისედაც გვერჩია.

**2. Identity = Figma OAuth, არა შიშველი `currentUser.id`.**
w2w-ის `licenseClient.ts:44-52` აფიქსირებს რეალურ, უკვე გასწორებულ დაუცველობას: ძველი `/api/auth/init`
ტოკენს ჭრიდა ნებისმიერი body-ში მითითებული `figmaUserId`-ისთვის, **მტკიცებულების გარეშე რომ caller ამ
account-ს ფლობს** ⇒ ნებისმიერს შეეძლო სხვისი Pro-ს იმიტაცია. გასწორდა Figma OAuth-ით
(`scope=current_user:read`, `figmaAuth.ts:137-144`). რეგისტრაცია/პაროლი არ არსებობს — `figmaUserId`
primary key-ია, email მხოლოდ checkout-იდან, receipt-ისთვის.

**3. Backend სავალდებულოა, მაგრამ პატარა.** `requirements.md` F20-ის "no server" ძალადაკარგულია —
license state-ს store სჭირდება. სამაგიეროდ Legibly-ს **Chromium არ სჭირდება** (fix პლაგინში სრულდება),
ე.ი. w2w-ის $25/თვე Render Standard არარელევანტურია — serverless ჰყოფნის.
### D22 — 2026-08-02 — AI alt-text + BYOK key **წაშლილია**; plugin-ს ნულოვანი ქსელი აქვს — user-approved
- **Context:** BYOK (მომხმარებელი წერს საკუთარ `sk-ant-…` key-ს Settings-ში) ერთადერთ ფუნქციას ასაზრდოებდა — SC 1.1.1-ის alt-ტექსტის მონახაზს. User-ის კითხვა იყო პირდაპირი: "ვაიძულებთ მომხმარებელს key ჰქონდეს?" — და პასუხი, რომ დიზაინერების უმრავლესობას ის არ აქვს, ფუნქციას **de facto მკვდრად** აქცევდა.
- **Alternatives:** (a) დროებით დამალვა UI-დან, კოდის შენარჩუნებით — უარყოფილია: manifest მაინც `api.anthropic.com`-ს გამოაცხადებდა, ე.ი. მთავარი მოგება (ნულოვანი egress) არ მიიღწეოდა; (b) დატოვება — უარყოფილია: ცარიელი ფუნქცია იმავე კლასის არაპატიოსნებაა, რაც D20-ის ცარიელი tier.
- **Decision:** სრული წაშლა. `shared/ai-client.ts` + `tests/ai-client.test.ts` წაშლილია, `export-image` RPC handler-იც (მისი ერთადერთი მომხმარებელი AI იყო), UI-დან key-ის ველი და "Suggest with AI" ღილაკები. **Manifest: `"allowedDomains": ["none"]`.**
- **რატომ ეს მოგებაა, არა დანაკარგი:** privacy-განაცხადი ხარისხობრივად იცვლება — "თითქმის არაფერი გადის" → "**არაფერი გადის, და ამას Figma აღასრულებს**". ეს **გადამოწმებადია** ნებისმიერის მიერ manifest-ში, ე.ი. აღარაა ჩვენი დაპირება. Compliance-პროდუქტისთვის, რომელსაც production ბიბლიოთეკებზე ჩაწერის უფლება აქვს, ეს გასაყიდი არგუმენტია. Figma review-ზეც ერთი კითხვა ნაკლები.
- **რა არ დაზარალდა:** SC 1.1.1 სრულად რჩება — presence check დეტერმინისტულია, ხელით ჩაწერა და decorative marker უცვლელია. **10 SC რჩება 10.**
- **მომავალი (user-ის განზრახვა):** თუ AI დაბრუნდება, ის იქნება **ჩვენი მხრიდან, pay-as-you-go**, hosted proxy-ით. BYOK-ის plumbing იქ არაფერში გამოდგებოდა (სხვა auth, სხვა quota), ხოლო ღირებული ნაწილი — prompt, strict tool schema, ვალიდატორი — git-ის ისტორიაშია და აღდგება.
- **Verify:** plugin 312 tests green (328−16 = AI-ის ტესტები), typecheck + build სუფთა; website 32 tests green, typecheck სუფთა. განახლდა: `manifest.json`, `App.tsx`, `guide.ts`, `main/index.ts`, საიტის trust/FAQ/checks/ScanDemo/privacy, `launch-stack.md §6`, `requirements.md`, `checks-expansion.md`, `website.md`, `pre-launch-checklist.md`.

---

### D23 — 2026-08-02 — Billing = **Flitt**, ერთჯერადი გადახდა, წლიური-first — user-approved
- **Context:** [D21](#) ვენდორს ღიად ტოვებდა. გამოკვლეულ იქნა Merchant-of-Record ალტერნატივები (VAT-ს თავის თავზე იღებენ, auth-renew აქვთ) — ტექნიკურად ჯდებოდნენ, **ეკონომიკურად არა ჩვენს დღევანდელ მოცულობაზე**.
- **გადამწყვეტი არითმეტიკა:** Flitt = **4% flat, ფიქსირებული საკომისიოს გარეშე**. ალტერნატივები ამატებდნენ per-transaction ფიქსირებულს (~$0.40–0.50) **და** თვიურ payout ხარჯს (~$30, გაყიდვებისგან დამოუკიდებლად). 10 გამომწერზე ($120): Flitt **4%** vs ალტერნატივები **~34%**; ისინი მხოლოდ **~100 გამომწერიდან** ხდებიან კონკურენტული. ის მოცულობა ჯერ არ გვაქვს.
- **დანარჩენი სამი არგუმენტი იმავე მიმართულებით:** ფული **~1 დღეში** (ალტერნატივები: 20–50 დღე) · **approval-ის რისკი ნული** — merchant account და KYC უკვე გვაქვს, launch სექტემბერშია (შიდა deadline 30 აგვისტო) · **კოდი დაწერილია** — w2w-ის `flittService`, webhook handler + dedup, `License` model, admin endpoint-ები, სამი runbook. გადმოტანაა, არა წერა.
- **Decision — ერთჯერადი, ორი tier:** **`$120/წელი` (მთავარი)** + `$12/30 დღე`. auto-renewal არ არსებობს, გასაუქმებელი არაფერია, განახლება დღეებს სტეკავს.
- **რატომ წლიური მთავარი:** ერთჯერადი მოდელის ერთადერთ სუსტ წერტილს — ყოველთვიურ ხელახალ ყიდვას — სტრუქტურულად ხსნის. და ისედაც სჯობდა: **break-even ≈ 10.3 თვე**, ანუ თუ საშუალო გამომწერი 10 თვეზე ნაკლებს რჩება (indie $12-ზე თითქმის ყოველთვის), წლიური მეტს ტოვებს. ⚠️ **არა საკომისიოს გამო** — ეს შეცდომა ერთხელ დავუშვით: ფასდაკლება უფრო მეტს ჯდება, ვიდრე საკომისიოზე იზოგება. ერთადერთი რეალური არგუმენტი churn-ია.
- **რასაც შეგნებულად ვიღებთ — VAT ჩვენზე რჩება.** Flitt PSP-ია, არა MoR. w2w-ის ზუსტი მიდგომა: ფასი tax-exclusive, Terms-ში disclaimer, **re-evaluate trigger ~$30K EU revenue**. მიღებული და ზღვრით შემოსაზღვრული რისკი.
- **Recurring — გადადებული, არა დაკარგული.** Flitt ჩართავს გაყიდვების დაფიქსირების შემდეგ; **რიცხვი მათ არ დაუსახელებიათ** (user-ის დაზუსტება 2026-08-02 — `$1000` ჩვენი trigger-ია, არა მათი ზღვარი). ბლოკერი არასდროს ყოფილა: ერთჯერადით სწორედ იმ გაყიდვებს ვაფიქსირებთ. და როცა ჩართავენ, აშენება არ დაგვჭირდება — w2w-ის recurring კოდი დაწერილი და გატესტილია, route-ის დონეზეა გამორთული (`PAYMENT-SYSTEM.md §1`).
- **Outcome:** [`launch-stack.md §4`](./launch-stack.md) გადაწერილია **Flitt-only**-დ სრული დასაბუთებით; `requirements.md` F19/F20; `pre-launch-checklist.md §5` = ნაბიჯ-ნაბიჯ Flitt; `plugin/src/ui/FooterBar.tsx`; `website/src/app/page.tsx`. **Q1, Q9 დახურულია.** ალტერნატიული ვენდორების spike და შედარებები **წაშლილია** (git history: `9528d9a`, `789baa3`) — რომ დახურული კითხვა ხელახლა არ გაიხსნას.
- **✏️ ნაწილობრივ შეცვლილია [D28](#)-ით (2026-09-16):** tier-ის ხაზგასმა — მთავარი ახლა თვიურია. ფასები, Flitt და ერთჯერადი მოდელი უცვლელია.
---

### D24 — 2026-08-02 — **AI Designer Judge**: შენდება ახლავე, launch-ს არ ბლოკავს (cutoff 1 სექტემბერი) — user-approved
- **Context:** user-ს უნდა vision-ფუნქცია — მონიშნული დიზაინი → Claude აფასებს ("judge"). Figma-ში inter-plugin API არ არსებობს, ე.ი. Claude Design-თან პირდაპირი ინტეგრაცია ტექნიკურად შეუძლებელია; ერთადერთი გზა = **ჩვენი proxy → Anthropic Messages API (vision)** — ზუსტად ის hosted მოდელი, რომელსაც D22 "თუ ოდესმე დავაბრუნებთ"-ად აღწერდა.
- **ღირებულების ობიექტური შეფასება:** ბირთვი დეტერმინისტული engine-ია — judge არის advisory layer + კონვერსიის მექანიზმი (~15-20% პროდუქტული ღირებულება), მაგრამ **მაღალი აღქმული სიახლით** listing-ის screenshot-ში. "50% ფუნქციის დაკარგვა" არ არის — მაგრამ მარკეტინგული წონა რეალურია.
- **არქიტექტურა არ იცვლება:** დაგეგმილი backend (serverless + Figma OAuth + License store, D21/D23) საკმარისია — judge = **+1 endpoint `/api/judge`** + quota counter იმავე License row-ში. OAuth **სავალდებულოა**: judge = ჩვენი Anthropic ბილინგი, იმიტაცია პირდაპირი ხარჯია (§5-ის ცნობილი რისკი).
- **Decision (timing):** შენდება ბლოკირების ჯაჭვის (deploy → email → Flitt/OAuth) **თავზე**, feature flag-ით. **Cutoff 2026-09-01:** მზადაა და eval-ი კარგია → launch build-შია და listing-ის მთავარი screenshot-ია; ვერა → launch მის გარეშე გადის, judge = v1.1 (~2 კვირა post-launch). **Launch-ის თარიღი judge-ზე არასდროს იბმევა.** განხილული ალტერნატივები: hard blocker (უარყოფილია — ერთ ფუნქციაზე მიბმული deadline-რისკი) და მხოლოდ post-launch (უარყოფილია — listing-ის პირველი ტალღა ფუნქციას ვერ ნახავდა, თუ დროზე მზადაა).
- **Gating:** Pro-only + free user-ს **3 საცდელი judge** — launch-ის დღეს Pro user 0-ია, საცდელის გარეშე ფუნქციას ვერავინ ნახავდა; საცდელი = upsell-ის კარი.
- **Trust story-ის კორექცია:** D22-ის `["none"]` **ისედაც იცვლება paywall-თან ერთად** (OAuth + `/license/me` ⇒ manifest += ჩვენი API დომენი) — ე.ი. judge-ის მარგინალური privacy-ფასი მხოლოდ დიზაინის snapshot-ის egress-ია, **per-click, opt-in**. ახალი ფორმულირება privacy/listing-ისთვის: *"network only for license checks — your design leaves Figma only when you click Judge."*
- **ხარისხის რისკი (cutoff-ის კრიტერიუმი):** generic-ფიდბექიანი judge უარესია, ვიდრე მისი არქონა. rubric + eval pass სავალდებულოა "მზადაა"-ს განსაზღვრებაში.
---

### D25 — 2026-08-12 — სახელი **"Legibly" რჩება** + mitigation; rename-ის trigger-ები წინასწარაა დაფიქსირებული — user-approved

- **Context:** D9-ის lock ეყრდნობოდა ინდიკატურ web-check-ს. Track F-ის ფორმალურმა ძებნამ ([`research/trademark-legibly.md`](./research/trademark-legibly.md), TMview = USPTO + EUIPO + WIPO + ~75 ოფისი, USPTO TSDR, RDAP) სურათი **შეაბრუნა**.
- **რისკი, რომელსაც ველოდით, არ არსებობს:** "legibly"-ს შემცველი განაცხადი მსოფლიოში **ნულია**. `legibly.app` (Legibly Inc.) 2025-10-22-ს დარეგისტრირდა, არქივში ერთი capture-იც არ აქვს, forwarding-ზეა, ნიშანი არ შეუტანია. მისი common-law scope = ოჯახური სამართლის დოკუმენტები, არა დიზაინის ხელსაწყოები.
- **რეალური რისკი სხვაა — სახელს ვერ დავიკავებთ:** 🇪🇺 **Logibly** = **რეგისტრირებული** EUTM `019231527`, **კლ. 9 + 42**, 27 ქვეყანა, opposition დახურული (რეგ. 2026-01-17). 🇺🇸 **LEGIBLE PLATFORM** (`99627721`, კლ. 42) published for opposition 2026-07-14, "PLATFORM" disclaimed ⇒ დაცული ელემენტი **LEGIBLE**; + `LEGIBLE` (`97227987`, კლ. 9 + 42, LIVE). ე.ი. LEGIBLY-ის განაცხადს ორივე მხარეს სანდო დაბრკოლება ხვდება.
- **Decision:** ვრჩებით **Legibly**-ზე. განხილული ალტერნატივები: (ა) გადარქმევა ახლავე **Conformly**-ზე (0 TM hit მსოფლიოში, `conformly.design` თავისუფალი) — უარყოფილია, რადგან ვცვლით სახელს, რომელსაც არავინ გვედავება, სახელზე, რომლის brand equity ნულიდან იწყება; (ბ) clearance opinion publish-მდე — გადადებულია შემოსავლამდე.
- **⚠️ რაც გეგმიდან ამოდის:** LEGIBLY-ის trademark-ის **რეგისტრაცია აღარ იგეგმება**. უარი სრულ ბაჟს ჯდება და წერილობით ჩანაწერს ტოვებს ჩვენს წინააღმდეგ; ფული clearance opinion-ს ჯობია მოხმარდეს.
- **Mitigation (M1–M8, სრულად → `research/trademark-legibly.md §6`):** ყველგან **"Legibly for Figma"** (Figma-ს მიერ ნებადართული ფორმულირება, და სწორედ ის market-qualifier-ია, რაც co-parenting აპისგან გვმიჯნავს) · footer-ის disclaimer · `hello@legibly.design` plugin-შიც და ქვითარზეც (მათი `hello@legibly.com` mail-misdirection-ის ვექტორია) · TMview-ს კვარტალური გადამოწმება.
- **🚨 Rename trigger-ები — წინასწარ შეთანხმებული, ხელახლა არ განიხილება:** **T1** LEGIBLY-ის განაცხადი/რეგისტრაცია კლ. 9 ან 42-ში სადმე გამოჩნდა · **T2** cease-and-desist ან Figma-ს IP complaint · **T3** `legibly.app` general-purpose software-ის პოზიციონირებაზე გადავიდა · **T4** clearance opinion უარყოფითია. ⇒ **Conformly** (სათადარიგო: **Squintly**).
- **რატომ ახლა და არა მერე:** გადარქმევა დღეს ~1 დღეა და <$100 (84 ფაილი, 360 შემთხვევა, **0 მომხმარებელი**). Launch-ის შემდეგ — 10–20×, პლუს ქვითრები/card-descriptor-ები ძველი სახელით და chargeback-ის ექსპოზიცია GE ინდ. მეწარმის checkout-ზე. თუ trigger ჩაირთვება, ვმოქმედებთ დაუყოვნებლივ — სწორედ ამიტომაა (ბ) დასაცავი პოზიცია და არა უბრალოდ ინერცია.
- **გადაუმოწმებელი, რაც გადაწყვეტილებას ცვლიდა:** Logibly-ის **რეალური goods & services** კლ. 9/42-ში (EUIPO მიუწვდომელი იყო) — ყველაზე ღირებული უცნობი; და შეინარჩუნებს თუ არა Figma Community URL slug-ს გადარქმევისას.
---

### D26 — 2026-08-18 — **Kill / Continue criteria** launch-მდე ფიქსირდება; plugin = არხი, არა ბიზნესი — user-approved

- **Context:** ბაზრის გადამოწმებამ (2026-08-18) ორი ფაქტი გამოავლინა, რომელიც [`research/a11y-competitor-teardown.md`](./research/a11y-competitor-teardown.md)-ის (2026-06-14) შემდეგ შეიცვალა და მის pricing/positioning დასკვნებს ანულირებს:
  1. **Figma-მ ნატიურად გამოუშვა AI Accessibility Checker** ([figma.com/solutions/ai-accessibility-checker](https://www.figma.com/solutions/ai-accessibility-checker/)) — contrast · text legibility · touch targets · CVD, **+ "suggested fixes"**, ყველა ფასიან გეგმაზე, open beta, AI credits არ ხარჯავს. ე.ი. **F18-ის უფასო detection funnel-ს pull აღარ აქვს.**
  2. **Stark წავიდა upmarket** — teardown-ის `$12/mo` anchor **აღარ არსებობს**: Premium Pack **$198/user/წელი (min 3 seat = $594)**, პლატფორმა **$2,500 / $8,000 / $21,000 წელიწადში** (live-გვერდების მონიტორინგი) + auto-generated VPAT. ე.ი. ჩვენი `$120/წელი` ველი **ზემოდან და ქვემოდან იკუმშება**, და დაგეგმილი CSV report კონკურენტულად სუსტია auto-VPAT-ის გვერდით.
- **გადამწყვეტი კითხვა იყო — შევწყვიტოთ თუ არა.** უარყოფილია, სამი დათვლადი პრეცედენტის გამო: **Tokens Studio** (Figma-მ Variables გამოუშვა 2023-ში — ისინი დღემდე ფასიანები არიან), **Anima** ($7.7M შემოსავალი მაშინ, როცა Dev Mode ნატიურია), **Stark** (native contrast checker-ის გვერდით არა მოკვდა, არამედ გაძვირდა). წესი, რომელიც სამივეს აერთიანებს: **პლატფორმა კლავს იმას, ვინც მისსავე ფიჩას უკეთესად აკეთებს; ვერ კლავს იმას, ვინც სიღრმეს, მმართველობას ან დროში მდგომარეობას ფლობს.**
- **Decision A — ვაგრძელებთ launch-მდე.** დასაბუთება არის **ოფციის ფასი, არა sunk cost**: დარჩენილი ~3 კვირა, ფულადი რისკი ≈ $0, სანაცვლოდ კი ერთადერთი უცნობი, რომელსაც კვლევა ვერ პასუხობს — **გადაიხდის თუ არა ვინმე.**
- **Decision B — ვყიდით ცოცხალ 60%-ს, არა მკვდარ 40%-ს.** 🔴 მკვდარია (Figma უფასოდ აკეთებს): contrast detection · target detection · per-element suggestion. 🟢 ცოცხალია: **verify loop** (მათემატიკური გარანტია — Figma-ს AI-ფსონი ამ დაპირებას კრძალავს) · **token write-back** (მათი fix კანვასზე ჯდება) · **variable modes sweep** (არავის აქვს) · **ნეიტრალური gate Figma Make-ის output-ზეც** (მათთვის სტრუქტურულად შეუძლებელი) · **ნულოვანი egress** (D22).
- **Decision C — plugin არის არხი, არა ბიზნესი.** Figma Community = შესანიშნავი უფასო მოზიდვის არხი და საშინელი მონეტიზაციის ზედაპირი (seller program დახურულია, მყიდველი = ცალკეული დიზაინერი). სამივე გამარჯვებული plugin-ს **გაექცა**. ⇒ მყიდველი და ფასი გუნდზე ინაცვლებს — `$120/წელი × 2,500 კაცი` (ჩვენი დისტრიბუციის მიღმაა) → `$600–1,200/წელი × 250 გუნდი` (ხელით მისაწვდომია ორი კაცისთვის).
- **🚨 Decision D — KILL / CONTINUE ზღვარი, ფიქსირდება ახლა, T+8-ზე ხელახლა არ განიხილება:**

  | T+8 კვირა launch-იდან | კრიტერიუმი | მოქმედება |
  |---|---|---|
  | 🟢 **გაგრძელება** | ≥ **30 გადამხდელი** **ან** ≥ **3 გუნდური მოთხოვნა** (Contact us) | Team tier + Drift Watch შენდება |
  | 🟡 **ერთი პივოტი** | **10–29 გადამხდელი** | Team tier + Drift Watch, კიდევ **8 კვირა**, შემდეგ იგივე ზღვარი |
  | 🔴 **გაჩერება** | < **10 გადამხდელი** **და** 0 გუნდური მოთხოვნა | plugin რჩება უფასოდ Community-ზე (არხად და ვიზიტკად); ძრავა გადადის **CI/MCP** მიმართულებაზე |

- **⛔ T+8-მდე არავითარი ახალი ფიჩა.** მხოლოდ მარკეტინგი, outbound და bug fix. **დამფუძნებელს არასწორი იდეა არ კლავს — სიგნალის გარეშე შენება კლავს.** ეს პუნქტი D26-ის ყველაზე მნიშვნელოვანი ნაწილია.
- **რატომ ფიქსირდება ზღვარი *ახლა*:** T+8-ზე ორივე შემფასებელი მიკერძოებულია — დამფუძნებელი ემოციურად (11 კვირა ჩადებული), ანალიზი კი მონაცემების არასრულობით (Figma-ს checker in-app **ჯერ არაა გადამოწმებული**; §6-ის ალბათობები შეფასებაა, არა გაზომვა). წინასწარ ჩაწერილი რიცხვი ორივეს ანეიტრალებს.
- **Escape route (v2, არა ახლა):** Deque-ს 2026 ივლისის კვლევა — AI-ით გენერირებული კოდი მკვეთრად ზრდის "accessibility debt"-ს; WebAIM Million 2026: იგივე ექვსი ჩავარდნა, უარესი რიცხვები. იგივე თეზისი **კოდზე უფრო მართალია**: მყიდველი = engineering (მაღალი WTP), სახლი = CI (**განმეორებადობა ჩაშენებულია**), პლატფორმის მფლობელი არ არსებობს, მტკიცებულებას იურიდიული წონა აქვს. ⚠️ **გულწრფელი კონტრარგუმენტი:** `axe-core` უფასოა და დომინანტი — კომოდიტიზებულია *detection*, არა **გარანტირებული fix** და **ტოკენის დონე**. ეს მიმართულება იხსნება **მხოლოდ 🔴 ან 🟡 შედეგზე**, არა ადრე.
- **რაც ამ გადაწყვეტილებამ ღიად დატოვა:** [D24-ის](#) AI Judge-ის cutoff (1 სექტემბერი) — რეკომენდაცია იყო launch-იდან მოხსნა (ეწინააღმდეგება D22-ის ნულოვან egress-ს, me-too გაჯერებულ ველში, და ხარჯავს იმავე 3 კვირას) — **user-ის გადასაწყვეტია, D26 მას არ ცვლის.** ასევე ღიაა ფასის ახალი სტრუქტურა (Free single-fix / Pro $144 / Team $600–1,200) და გადახდის მოდელი — **user-მა 2026-08-18-ს განაცხადა, რომ გადახდას ცალკე დავუბრუნდებით.**
- **Verify:** ზღვრის შესრულებადობა მოითხოვს, რომ `T+8` თარიღი და გადამხდელთა counter გაზომვადი იყოს launch-ის დღიდან — იხ. `pre-launch-checklist.md` (telemetry / license counter ღიაა).
---

### D27 — 2026-08-18 — **AI Judge: cutoff დახურულია** — launch გადის Judge-ის გარეშე; კოდი რჩება, ბნელი — user-approved

- **Context:** [D24](#)-ის cutoff იყო **1 სექტემბერი**. [D26](#)-ის 3-კვირიან ფანჯარაში ეს ერთადერთი პუნქტია, რომელიც **კალენდარს ჭამს** — დანარჩენი გადაწყვეტილებები 1 დღეზე ნაკლებია.
- **რეალური მდგომარეობა (გადამოწმებული კოდში, 2026-08-18):** `/api/judge` ✅ · `judgeRubric.ts` ✅ · ეკონომიკა ✅ (`≈$0.08`/ზარი, quota 30/თვე). **მაგრამ:** eval 🔴 არ გაშვებულა, `JUDGE_ENABLED` **default = false** (`config/judge.ts:64`), plugin-ის UI **განზრახ არ დაწერილა**, საიტი Judge-ს **არსად არ ჰპირდება**. ე.ი. ფუნქცია **უკვე ბნელია** — გამორთვა კოდურ ცვლილებას არ საჭიროებს.
- **ბლოკერი ტექნიკური არ არის:** eval მოითხოვს `ANTHROPIC_API_KEY`-ს **და 10–15 რეალურ Figma fixture-ს წინასწარ ცნობილი პრობლემებით** ([`judge-eval.md §1`](./judge-eval.md)) — fixture-ები **კოდით არ იწერება**, ე.ი. ეს ხელით სამუშაო კვირაა, launch-ის კვირაში.
- **Decision:** **cutoff დახურულია — Judge launch-ში არ შედის.** კოდი **არ იშლება** (დაწერილია, გამორთულია, ზღვრული ხარჯი ნულია — D22-ის წაშლისგან განსხვავებით, სადაც manifest-ის egress იყო ფასი). eval, plugin UI და listing screenshot ბრუნდება **მხოლოდ D26-ის 🟢 შედეგზე**.
- **ბიზნეს-დასაბუთება (რატომ არა უბრალოდ "ვერ მოვასწარით"):**
  1. **ეწინააღმდეგება ჩვენს ერთადერთ გადამოწმებად დაპირებას.** D22-მა მოიპოვა `allowedDomains: ["none"]` — რასაც ნებისმიერი ამოწმებს manifest-ში. ბაზარზე, სადაც Figma-ს agent-ზე ჩივიან "half the time incorrect", **"ჩვენ AI არ ვართ" უფრო ღირებული სიგნალია, ვიდრე კიდევ ერთი AI ღილაკი.**
  2. **Me-too ყველაზე გაჯერებულ ველში** — Community-ში უკვე არსებობს "AI Design Reviewer: UI/UX, Accessibility, Design System Linter".
  3. **D26-ის 🟢/🔴 ტესტს არ ცვლის.** T+8 კითხულობს "იხდის თუ არა ვინმე **გარანტირებულ fix-ში**". Judge ამ კითხვას არ პასუხობს — ის მას **აბინდავს**.
- **⚠️ Launch-ის პირობა:** `JUDGE_ENABLED` **არ დაყენდეს** prod-ზე. `startupChecks` — გადასამოწმებელია, რომ არარსებული `ANTHROPIC_API_KEY` boot-ს არ აგდებს.
- **Outcome:** `pre-launch-checklist.md §5.1` 🟡 → ✅ დახურული (გამოდის launch-ის სამუშაოდან); privacy-დან ეშვება წინადადება AI Judge-ის audit-ჩანაწერზე — **D20/D22-ის იგივე წესი: არ ვწერთ იმას, რაც არ არსებობს**; ჩანაწერი ბრუნდება ფუნქციასთან ერთად.
---

### D28 — 2026-09-16 — Pro-ს **მთავარი ფასი = თვიური `$12/30 დღე`**; წლიური `$120` რჩება არჩევანად — user-approved
- **Context:** plugin-ის Plans modal-ში Pro-ს ბარათზე პირველი ციფრი `$120/yr` იყო, primary ღილაკი კი `Get Pro — $120/yr`. user-ის შეფასება: `$120`-ის მოთხოვნა პირველივე შეხვედრაზე ზედმეტია — მთავარი უნდა იყოს თვიური ყიდვა, წლიური — ოფცია.
- **Decision:** ყველგან, სადაც ფასი ჩანს, **თვიური წამყვანია**: plugin-ის ბარათი და primary ღილაკი → `$12 / 30 days`, წლიური → მეორადი ღილაკი `$120 / year`; საიტის toggle იხსნება `Monthly`-ზე; Terms-ში რიგი შებრუნებულია. **ფასები, Flitt, ერთჯერადი მოდელი და stacking — უცვლელია** (D23).
- **რას ვიღებთ შეგნებულად:** D23-ის churn-ის არგუმენტი ძალაშია — auto-renew არ არსებობს, ე.ი. თვიურ მყიდველს **ყოველი 30 დღე ახალი გადაწყვეტილებაა**. ეს ფასია შესვლის დაბალი ბარიერისთვის. R9 (spike-tool churn) ამით უფრო ცხელდება — renewal-ის შეხსენება თვიურზე უფრო კრიტიკულია, ვიდრე წლიურზე.
- **დამხმარე არგუმენტი:** D26-ის T+8 კითხულობს „იხდის თუ არა ვინმე". `$12` ამ კითხვას უფრო სწრაფად პასუხობს — პირველი გადახდა იაფია, ე.ი. ცოტა გაყიდვაზეც მეტი სიგნალია.
- **Outcome:** `plugin/src/ui/FooterBar.tsx` · `website/src/components/PricingTiers.tsx` (+ ტესტები) · `website/src/app/terms/page.tsx` · `launch-stack.md §4` · `backend-spec.md` · `requirements.md` F19/F20 · `pre-launch-checklist.md §5`. **Backend-ს ცვლილება არ სჭირდება** — ორივე duration უკვე მიიღება.
---

## 4. Risk Register (ბიზნესის რისკები)

| # | რისკი | ალბათობა | ზიანი | Mitigation |
|---|--------|-----------|--------|-------------|
| R1 | ~~Figma მოიცავს ჩვენი wedge-ს Design Agent-ში~~ → **✅ MATERIALIZED 2026-08-18**: native AI Accessibility Checker (contrast · text · targets · CVD + suggested fixes), ყველა ფასიან გეგმაზე | — | **მაღალი** | D26: detection-ის გაყიდვა ჩერდება; ვყიდით verify loop + token write-back + modes sweep + ნეიტრალურ gate-ს. ⚠️ **in-app გადამოწმება ღიაა** |
| R2 | Anthropic-ი ცვლის pricing/API | საშუალო | მაღალი | Backend proxy abstracts model choice; multi-model ready |
| R3 | Figma plugin store review reject | დაბალი | მაღალი | Strict `allowedDomains`, no `"*"`, transparent telemetry |
| R4 | სახელის trademark conflict | დაბალი (შეტევა) · **მაღალი (ვერ დავირეგისტრირებთ)** | საშუალო | ✅ ძებნა შესრულდა (D25): "LEGIBLY" არსად არაა შეტანილი, მაგრამ EU-ს `Logibly` (კლ. 9+42) და US-ის LEGIBLE-ის ოჯახი ჩვენს რეგისტრაციას კეტავს. Mitigation = "Legibly for Figma" + T1–T4 trigger-ები → Conformly |
| R5 | A11y false positives frustrate users | საშუალო | საშუალო | Allow user to override with explicit confirm; learn from overrides |
| R6 | MCP spec breaks (2025-11-25 → 2026-07-28 migration) | მაღალი | საშუალო | Versioned transport; test against both during migration window |
| R7 | Backend cost runaway (cache miss storm) | დაბალი | მაღალი | Tier 3 limits, per-user rate limits, cost dashboard |
| R8 | მცირე team (1-2 dev) burnout | მაღალი | მაღალი | Aggressive scope cutting; MVP scope locked early |
| R9 | **Spike-tool churn** — იყიდა, გაასწორა, აღარ გახსნა. ერთჯერადი ლიცენზია ჩუმად კვდება | **ძალიან მაღალი** | **კრიტიკული** | **Drift Watch** (baseline + დელტა ეკრანი) = ერთადერთი სტრუქტურული წამალი; renewal email T-30/T-7 launch-იდანვე |
| R10 | **ფასის ველის კოლაფსი** — ქვემოდან უფასო Figma, ზემოდან Stark $594+ | მაღალი | მაღალი | D26: მყიდველი გუნდზე ინაცვლებს ($600–1,200/წელი × 250), არა დიზაინერზე ($120 × 2,500) |
| R11 | **სიგნალის გარეშე დრეიფი** — launch-ის შემდეგ 12 თვე შენება მონაცემის გარეშე | **მაღალი** | **კრიტიკული** | D26/Decision D — kill ზღვარი წინასწარ ჩაწერილია; T+8-მდე ახალი ფიჩა აკრძალულია |

---

## 5. რა გადასაწყვეტი დარჩა (planning phase-ის ბოლომდე)

- [x] **Brand name final** — ✅ **Legibly** (D9, 2026-06-14). Formal trademark/domain clearance = Track F before launch.
- [x] **Backend hosting choice** — ✅ **serverless ჰყოფნის** (D21): w2w-ს Render Standard $25/თვე **მხოლოდ Chromium-ის RAM-ისთვის** სჭირდება; Legibly-ის API = license CRUD + webhook, მძიმე პროცესის გარეშე. კონკრეტული ვენდორი (Vercel functions vs სხვა) vendor-ის არჩევის შემდეგ.
- [x] **Auth strategy** — ✅ **auth vendor არ გვჭირდება** (D21): **Figma OAuth** (`current_user:read`) → backend-issued HMAC token → `figma.clientStorage`. რეგისტრაცია/პაროლი არ არსებობს. Clerk/Auth.js არარელევანტურია.
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
