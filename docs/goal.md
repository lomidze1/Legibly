# goal.md — რა გვინდა და რატომ

> **მთავარი ფაქტი:** ეს არ არის "ვაკეთებთ AI plugin Figma-სთვის". ეს არის ბიზნესის გადაწყვეტილება ისეთ ბაზარზე, სადაც Figma-მ უკვე გამოუშვა საკუთარი უფასო AI Agent (2026 May 20).

---

## 1. Vision Statement (ერთი წინადადება)

**{{PRODUCT_NAME}} = AI Figma plugin, რომელიც გენერირებს და რედაქტირებს UI-ს **მკაცრად** მომხმარებლის საკუთარი design system-ის შესაბამისად, accessibility-ის გარანტიით.**

---

## 2. Mission (3 წინადადებად)

1. **დიზაინერი არ უნდა ცდილობდეს AI-ს მართვას** — AI-მ უნდა იცოდეს მისი design system და automatically შეასრულოს მისი წესები.
2. **Accessibility (WCAG 2.2 AA) უნდა იყოს გენერაციის ნაწილი**, არა post-hoc fix.
3. **{{PRODUCT_NAME}}-ი არ უნდა იყოს მხოლოდ Figma plugin** — MCP-first არქიტექტურა Cursor/Claude Code/Stitch-ისთვისაც გაუშვებს მუშაობას.

---

## 3. ბაზრის რეალობა (2026 May)

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
- **{{PRODUCT_NAME}}-ის value:** system-strict generation = no fix-up labor
- **Willingness to pay:** **HIGH** (saves real hours per project)
- **MVP priority:** ⭐⭐⭐⭐⭐

### Segment B — Designer Without Established System
- **ვინ:** freelancer, indie maker, small team
- **მტკივნეული:** ვერ ბრძანებს AI-ს "make it look professional"; a11y ცოდნა მცირე
- **{{PRODUCT_NAME}}-ის value:** opinionated defaults + a11y guarantee = "professional by default"
- **Willingness to pay:** MEDIUM
- **MVP priority:** ⭐⭐⭐⭐

### Segment C — PM / Non-Designer
- **ვინ:** Product Manager, Engineer, Founder writing first screens
- **მტკივნეული:** ვერ რხევლეფს Figma-ს learning curve-ს; Uizard/Visily-ი external tool
- **{{PRODUCT_NAME}}-ის value:** prompt-to-screen native Figma-ში, არ ვტოვებთ tool-ს
- **Willingness to pay:** LOW-MEDIUM
- **MVP priority:** ⭐⭐⭐

### Segment D — Dev / Designer via MCP
- **ვინ:** dev/designer ვინც Cursor-ში ან Claude Code-ში მუშაობს
- **მტკივნეული:** design იქმნება ცალკე, კოდი ცალკე — handoff აქვს
- **{{PRODUCT_NAME}}-ის value:** MCP server-ი იძახებს {{PRODUCT_NAME}}-ის generation-ს Figma-ის გარეთ
- **Willingness to pay:** HIGH (developer tools market premium)
- **MVP priority:** ⭐⭐⭐ (after Figma plugin proves PMF)

---

## 5. Success Criteria

### Phase 0 — Research/Planning (now)
- [ ] სრული research roadmap საიდანმე what to use/avoid (`docs/research-roadmap.md`)
- [ ] Brand name finalized
- [ ] Anthropic API key + backend infra plan
- [ ] MVP scope locked

### Phase 1 — MVP (target: 12 კვირა after planning)
- [ ] Figma plugin live in Community
- [ ] Generate flow: prompt → DesignSpec → rendered Figma node, with token validation
- [ ] Selection-based partial regen working
- [ ] WCAG 2.2 AA contrast + target-size enforced
- [ ] 100 active users in first month

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
