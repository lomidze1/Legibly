# goal.md — რა გვინდა და რატომ

> **მთავარი ფაქტი:** ეს არ არის "ვაკეთებთ AI plugin Figma-სთვის". ეს არის ბიზნესის გადაწყვეტილება ისეთ ბაზარზე, სადაც Figma-მ უკვე გამოუშვა საკუთარი უფასო AI Agent (2026 May 20).

---

## 0. 🎯 LOCKED PRODUCT DIRECTION (2026-06-14) — ეს არასდროს უნდა დაიკარგოს

> **გადაწყვეტილება D7-ით ([approach.md](./approach.md)) ჩაკეტილია user-ის explicit დადასტურებით 2026-06-14. ეს არის north-star. ნებისმიერი შემდგომი work ამას უნდა ემსახურებოდეს.**

### რას ვაშენებთ (ერთი წინადადება)
**Accessibility-first "correctness layer" Figma plugin** — ამოწმებს და **ასწორებს** ნებისმიერ დიზაინს (AI-generated თუ human-made): hard-fails off-system primitives, blocks/auto-fixes WCAG 2.2 AA-ზე. **ვიწყებთ a11y one-click auto-fix-ით (paid spearhead), ვაფართოებთ system-strict + brand-QA-მდე.**

### რატომ ეს და არა generator (D7-ის ბირთვი)
1. **Generator lane დაკარგულია** — saturated 8+ funded competitor-ით + Figma-მ უფასოდ nativize-ა. 2 კაცი distribution-ში ვერ აჯობებს.
2. **Demand გადაინაცვლა "შექმნიდან" → "ნდობისკენ".** 2026-ის ტოპ ტკივილები: unreliable AI output, design-system drift, accessibility კოლაფსი — ეს **correctness/governance** პრობლემებია, არა generation.
3. **Defensible vs Figma** — Figma საკუთარ output-ს a11y-ზე არ დაბლოკავს; neutral guardrail (ნებისმიერი გენერატორის output-ს ამოწმებს, Figma-ს ჩათვლით) მათთვის სტრუქტურულად რთული copy-ია.
4. **2 კაცს უხდება** — audit/fix bounded პრობლემაა; full generation არა.
5. **Legal wallet** — EAA (EU, enforceable 2025) + ADA lawsuits = compliance budget. შიში ხსნის საფულეს — ეს ერთადერთი "correctness" ტკივილია, რომელიც *საიმედოდ* იხდის.

### 🔑 ხარისხის #1 წესი (TRUST = მთელი value)
**არასდროს "ერთი ცუდი AI შედეგიდან მეორე ცუდი AI შედეგი."** Fix თვითონ არ უნდა იყოს AI-გამოცნობა. ამიტომ:
- **Detection = deterministic-first** (contrast = math, target size = geometry); LLM მხოლოდ judgment-ზე, confidence level-ით.
- **Remediation = correctness-by-construction** — apply fix → re-run იგივე deterministic check → commit მხოლოდ თუ passes; თუ ვერ → escalate user-ს, არასდროს silently ship a fail.
- **System-strict fix** — snap to user-ის არსებულ token-ზე, არასდროს invent off-system value.

### 💵 Money model (value, არა სულ უფასოდ)
| | FREE (funnel/viral hook) | PAID ($12–19/mo) |
|---|---|---|
| Scan & **აჩვენე** პრობლემები | ✅ | ✅ |
| **One-click auto-fix** | ❌ | ✅ 🔑 |
| **Compliance/audit report** (export) | ❌ | ✅ 🔑 |
| Batch fix · system-strict enforcement · brand-QA (v2) | ❌ | ✅ |

Detection *აჩვენებs* ტკივილს (უფასო, viral) → Fix + Report *შლის* ტკივილს (paid). **Target: $300K–$1M ARR 2 კაცზე.**

### რა რჩება უცვლელი ძველი vision-იდან
5 wedge (system-strict, in-loop WCAG 2.2 AA, selection-based regen, multi-screen state-machine, brand-QA vision) — ❗ ისევ ძალაშია, ოღონდ **repackaged "generator"-დან "correctness suite"-ად.** MCP-first portable core, backend proxy, 2-model strategy — უცვლელი.

> ⚠️ **TODO (joint discussion):** `architecture.md`-ის ბირთვი generation-centric-ია; correctness-first reframe-ი ცალკე session-ში გადასახედია (CLAUDE.md §8 — არ შევცვალო ერთპიროვნულად).

---
---

## 0.1 🔧 MARKET CORRECTION (2026-08-18) — §0 ძალაშია, სამი პუნქტი შესწორებულია

> **სტატუსი:** ✅ user-approved 2026-08-18 · სრული დასაბუთება → [`approach.md` D26](./approach.md)
> §0 **არ უქმდება** — north-star იგივეა. ქვემოთ არის სამი შესწორება, რომელიც 2026 ივნისის შემდეგ ბაზრის ცვლილებამ გამოიწვია. კონფლიქტის შემთხვევაში **§0.1 ჭარბობს §0-ს.**

### 🔻 შესწორება 1 — "Legal wallet: შიში ხსნის საფულეს" (§0, პუნქტი 5) **ნახევრად მცდარია**

**იურიდიული საფულე იხსნება იმაზე, რაც გამოქვეყნებულია — არა Figma-ს ფაილზე.** არავინ ჩაებმევა სასამართლოში დიზაინის გამო; VPAT/ACR პროდუქტს ეხება, მონიტორინგი — live გვერდებს. სწორედ ამიტომ სხედან Level Access, Deque, Siteimprove **და ახლა Stark-იც** code/live ფენაზე.

⇒ **Design-stage ინსტრუმენტი შიშს ვერ ყიდის.** ის ყიდის ორ სხვა რამეს:
1. **Rework-ის ხარჯს** — "ერთი contrast bug დიზაინში = 4 საათი; იგივე production-ში = spec + ticket + PR + QA + regression"
2. **Governance-ს** — ბიბლიოთეკის დაცვას დროში

**ეს ცვლის messaging-ის ღერძს:** ჯარიმებზე/სარჩელებზე აპელირება ჩერდება. EAA/ADA რჩება **ICP-ის ფილტრად** (ვინ იყიდის), არა **გაყიდვის არგუმენტად** (რატომ იყიდის).

### 🔻 შესწორება 2 — ღირებულების 40% მოკვდა; ვყიდით ცოცხალ 60%-ს

Figma-მ ნატიურად გამოუშვა **AI Accessibility Checker** (contrast · text legibility · touch targets · CVD **+ suggested fixes**), ყველა ფასიან გეგმაზე, უფასოდ.

| ღირებულების ნაწილი | სტატუსი | ვყიდით? |
|---|---|---|
| Contrast detection | 🔴 Figma უფასოდ აკეთებს | ❌ |
| Target size detection | 🔴 Figma უფასოდ აკეთებს | ❌ |
| Per-element fix suggestion | 🟠 Figma-საც აქვს | ❌ |
| **Verify loop** (მათემატიკური გარანტია) | 🟢 Figma-ს AI-ფსონი ამ დაპირებას კრძალავს | ✅ |
| **Token write-back** (სისტემის შეკეთება) | 🟢 მათი fix კანვასზე ჯდება | ✅ |
| **Variable modes sweep** (dark mode) | 🟢 **არავის აქვს** | ✅ **headline** |
| **ნეიტრალური gate** (Figma Make-ის output-ზეც) | 🟢 მათთვის სტრუქტურულად შეუძლებელია | ✅ |
| **ნულოვანი egress** ([D22](./approach.md)) | 🟢 AI = ქსელი, განსაზღვრებით | ✅ |

**ერთი წინადადება, რომელიც messaging-ს განსაზღვრავს:**
> *"Figma's AI tells you it might be a problem. Legibly proves it's fixed — with your tokens, without your file ever leaving Figma."*

⚠️ **ღია ვალი:** Figma-ს checker **in-app გადამოწმებული არ არის** (წყარო = vendor-ის solutions page). ზუსტად რომელ გეგმებზეა, წერს თუ არა ტოკენზე, მუშაობს თუ არა variable modes-ზე — **launch-მდე სავალდებულოა.**

### 🔻 შესწორება 3 — Plugin არის **არხი**, არა ბიზნესი (ცვლის §4 სეგმენტებს და §7 ეკონომიკას)

Figma Community = შესანიშნავი უფასო მოზიდვის არხი და **საშინელი მონეტიზაციის ზედაპირი** (seller program დახურულია; მყიდველი = ცალკეული დიზაინერი). სამივე გამარჯვებულმა — **Anima** ($7.7M), **Stark** ($594–$21,000/წელი), **Tokens Studio** — plugin-ს **გაექცა**.

**არითმეტიკა, რომელიც ყველაფერს წყვეტს:**

| მოდელი | $300K ARR-ისთვის | საჭირო Figma installs | ორ კაცს ხელმისაწვდომია? |
|---|---|---|---|
| $120/წელი × დიზაინერი | **2,500 კლიენტი** | 80–250K (ტოპ-50) | ❌ |
| **$600–1,200/წელი × გუნდი** | **250 კლიენტი** | 10–25K | ✅ (~2 კლიენტი კვირაში) |

⇒ **შემზღუდავი რესურსი არის დისტრიბუცია, არა ფასი.** ღრმა ბაზარი + მაღალი ACV + დაბალი მოცულობა სჯობს.

**რაც აქედან გამომდინარეობს §4-ისთვის:** Segment C (PM/non-დიზაინერი) **ამოღებულია** — მას WCAG-ის კონფორმაცია არ სჭირდება. რეალური ICP სამია: 🥇 **US public sector + მათი ვენდორები/edtech** (ADA Title II ძალაშია **2026-04-24**-დან — WCAG 2.1 AA ფედერალური კანონია 50K+ მუნიციპალიტეტებზე) · 🥈 **EU e-commerce / fintech** (EAA; სარჩელების 79% e-commerce) · 🥉 **design system owner regulated ინდუსტრიაში**.

**რაც აქედან გამომდინარეობს §7-ისთვის:** `$300K–$1M ARR 2 კაცზე` რჩება მიზნად, მაგრამ **გზა იცვლება** — 2,500 დიზაინერიდან 250 გუნდზე. ფასის ახალი სტრუქტურა (Free single-fix / Pro / Team) და გადახდის მოდელი **ჯერ ღიაა** — user-მა 2026-08-18-ს განაცხადა, რომ გადახდას ცალკე დავუბრუნდებით.

### 🚨 და მთავარი — გაჩერების ზღვარი არსებობს

**T+8 კვირა launch-იდან:** 🟢 ≥30 გადამხდელი ან ≥3 გუნდური მოთხოვნა → გაგრძელება · 🟡 10–29 → ერთი პივოტი (Team tier + Drift Watch), კიდევ 8 კვირა · 🔴 <10 და 0 გუნდური → **გაჩერება**; plugin რჩება უფასოდ არხად, ძრავა გადადის CI/MCP-ზე.
**⛔ T+8-მდე არავითარი ახალი ფიჩა.** სრული ჩანაწერი → [`approach.md` D26](./approach.md).


## 1. Vision Statement (ერთი წინადადება)

**Legibly = accessibility-first "correctness layer" Figma plugin, რომელიც **ამოწმებს და ასწორებს** ნებისმიერ დიზაინს (AI-generated თუ human) — hard-fail off-system primitives, one-click WCAG 2.2 AA auto-fix — TRUST-ის გარანტიით (correctness-by-construction, არა AI-გამოცნობა).**

> 📌 ეს refined vision-ია (D7, 2026-06-14). სრული locked direction — იხ. §0 ზემოთ.

---

## 2. Mission (3 წინადადებად)

1. **დიზაინერი არ უნდა ცდილობდეს AI-ს მართვას** — AI-მ უნდა იცოდეს მისი design system და automatically შეასრულოს მისი წესები.
2. **Accessibility (WCAG 2.2 AA) უნდა იყოს გენერაციის ნაწილი**, არა post-hoc fix.
3. **Legibly-ი არ უნდა იყოს მხოლოდ Figma plugin** — MCP-first არქიტექტურა Cursor/Claude Code/Stitch-ისთვისაც გაუშვებს მუშაობას.

---

## 3. ბაზრის რეალობა (2026 May) — ⚠️ **მოძველებულია, იხ. [§0.1](#01--market-correction-2026-08-18--0-ძალაშია-სამი-პუნქტი-შესწორებულია)**

### ბაზრის ფანჯრები ღია არიან:

| Gap (Figma-ის Design Agent ვერ აკეთებს) | რატომ ღია |
|------------------------------------------|------------|
| **System-strict generation** | Figma Design Agent biased-ია მათი UI Kit-ისკენ — custom design system-ის strict fidelity არ აქვს |
| **In-loop a11y guard** | WCAG checks post-hoc-ია; ჩვენ generation-დროს ვაცხრობთ |
| **Selection-based partial regen** | მათ მხოლოდ "full screen regenerate" აქვს; v0-ის partial regen native-ი არ არის |
| **Multi-screen state machine first** | Figma generation screen-by-screen-ია, flow logic-ის გარეშე |
| **Brand-QA vision pass** | მათ vision-pre-commit საფეხური არ აქვს |

### ბაზრის რისკები:

| რისკი | რა გავაკეთოთ |
|-------|---------------|
| Figma უფასოა "core case"-ში | არ ვცადოთ "core case"-ის გადატანა; ვიყოთ premium positioning |
| Figma-მ ჩვენი wedge შეიძლება მოიპაროს | ვისწრაფოთ — MVP < 12 კვირაში; tech moat = MCP-first portable core |
| OpenAI/Google ანალოგი (Stitch-ში გადატანილი) | ჩვენი core ენაა Anthropic-ი; vision strategy lock-in |
| დაბალი retention plugin-ებში | Pro tier-ის value daily-use-ში უნდა იყოს, არა spike-ში |

---

## 4. Target Users (4 segment, ფართო)

> **მნიშვნელოვანი:** არ გვაქვს ერთი persona — გვაქვს 4 distinct user segment, თითო თავისი value proposition-ით.

### Segment A — Established Design System Owner
- **ვინ:** in-house designer in product company, design lead at agency
- **მტკივნეული:** AI generates inconsistent UI, breaks tokens, requires manual fixes
- **Legibly-ის value:** system-strict generation = no fix-up labor
- **Willingness to pay:** **HIGH** (saves real hours per project)
- **MVP priority:** ⭐⭐⭐⭐⭐

### Segment B — Designer Without Established System
- **ვინ:** freelancer, indie maker, small team
- **მტკივნეული:** ვერ ბრძანებს AI-ს "make it look professional"; a11y ცოდნა მცირე
- **Legibly-ის value:** opinionated defaults + a11y guarantee = "professional by default"
- **Willingness to pay:** MEDIUM
- **MVP priority:** ⭐⭐⭐⭐

### ~~Segment C — PM / Non-Designer~~ — ❌ **ამოღებულია 2026-08-18** ([§0.1](#01--market-correction-2026-08-18--0-ძალაშია-სამი-პუნქტი-შესწორებულია) · [D26](./approach.md)): correctness layer-ს არ სჭირდება ის, ვისაც WCAG-ის კონფორმაცია არ ევალება
- **ვინ:** Product Manager, Engineer, Founder writing first screens
- **მტკივნეული:** ვერ რხევლეფს Figma-ს learning curve-ს; Uizard/Visily-ი external tool
- **Legibly-ის value:** prompt-to-screen native Figma-ში, არ ვტოვებთ tool-ს
- **Willingness to pay:** LOW-MEDIUM
- **MVP priority:** ⭐⭐⭐

### Segment D — Dev / Designer via MCP
- **ვინ:** dev/designer ვინც Cursor-ში ან Claude Code-ში მუშაობს
- **მტკივნეული:** design იქმნება ცალკე, კოდი ცალკე — handoff აქვს
- **Legibly-ის value:** MCP server-ი იძახებს Legibly-ის generation-ს Figma-ის გარეთ
- **Willingness to pay:** HIGH (developer tools market premium)
- **MVP priority:** ⭐⭐⭐ (after Figma plugin proves PMF)

---

## 5. Success Criteria

### Phase 0 — Research/Planning (now)
- [ ] სრული research roadmap საიდანმე what to use/avoid (`docs/research-roadmap.md`)
- [ ] Brand name finalized
- [ ] Anthropic API key + backend infra plan
- [ ] MVP scope locked

### Phase 1 — MVP v0.1 "Contrast, fixed right" (LOCKED — [requirements.md](./requirements.md))
- [ ] Figma plugin live in Community (beta)
- [ ] Reliable text-contrast detection (effective-background resolution; 3-tier; zero false-positive)
- [ ] One-click + batch contrast fix — snap to on-system token, correctness-by-construction (verify loop)
- [ ] Before/after diff (ratio + token + SC); single-step undo
- [ ] Fully client-side (no backend/AI); deterministic
- [ ] Target: 1,000 installs + 4.5★, reviews mention "actually fixes / reliable" (8 weeks)
- [ ] *(v0.2+: target-size/spacing, paywall; v0.3: LLM tier alt-text)*

### Phase 2 — Pro (target: 6 თვის შემდეგ)
- [ ] Pro tier launch ($X/mo)
- [ ] Brand-QA pass (Opus 4.7 vision)
- [ ] MCP server published — Cursor/Claude Code integration
- [ ] 50 paying customers

### Phase 3 — Enterprise (target: 12 თვის შემდეგ)
- [ ] Private MCP server option
- [ ] SSO, audit log
- [ ] First $10K MRR enterprise contract

---

## 6. რა **არ** არის ჩვენი მიზანი (Non-Goals)

- ❌ Replicating Figma's Design Agent base case
- ❌ Becoming a generic ChatGPT-for-design wrapper
- ❌ Going open-source (private repo throughout)
- ❌ Building our own canvas (Figma + MCP outputs are enough)
- ❌ Supporting non-Figma design tools (Sketch, Adobe XD) in MVP — focus
- ❌ AI-generated images/illustrations as the focus (we use Unsplash/Iconify MCP)
- ❌ Code generation as primary output (v0/Builder.io territory)

---

## 7. ბიზნესის თვალით — რას ვუყურებთ ფინანსურად

> **ეს section-ი ჩვენი ფინანსური ხედვის discipline-ია. რეგულარულად update.**
>
> ⚠️ **2026-08-18:** ქვემოთ მოცემული revenue model generator-ის ეპოქიდანაა და **ნაწილობრივ მოძველებულია** — გზა $300K-მდე იცვლება 2,500 დიზაინერიდან **250 გუნდზე**, ხოლო free/paid ხაზი და გადახდის მოდელი ღიაა. იხ. [§0.1 შესწორება 3](#01--market-correction-2026-08-18--0-ძალაშია-სამი-პუნქტი-შესწორებულია) · [D26](./approach.md).

### Cost structure (rough)
- **Anthropic API costs:** ~$0.05-0.50 per generation (Sonnet 4.6) / $0.20-2.00 (Opus 4.7 brand-QA)
- **Backend hosting:** Cloudflare Workers $5/mo + KV $0.50/M reads = ~$50/mo light traffic
- **Figma Plugin listing:** $0 (Community is free)
- **Domain + branding:** ~$50/yr

### Revenue model (hypotheses to validate)
- **Free tier:** 10 generations/mo, capped to Sonnet 4.6, no brand-QA
- **Pro:** $15/mo — unlimited Sonnet, 50 brand-QA passes, BYO API key option
- **Enterprise:** $200+/user/mo — private MCP, SSO, custom Brand Rules

### Unit economics gut-check
- Free → Pro conversion target: 3%
- Pro churn target: < 5%/mo
- LTV/CAC target: > 3x
- **Break-even:** ~500 Pro users

---

## 8. რა გვიყვება ARCHITECTURE.md-ი

> ეს ფაილი არის "რა". `docs/architecture.md` არის "როგორ". თუ მცდელობაა "რა გვინდა"-ს გადახედვის, აქედან წავიდე. თუ "როგორ ვაშენებთ"-ის, იქიდან.

დეტალები:
- **Defensible wedges:** [`architecture.md` §0.B](./architecture.md)
- **Adopted design principles (7):** [`architecture.md` §0.C](./architecture.md)
- **State-of-the-art 2026 May:** [`architecture.md` §0.D](./architecture.md)
