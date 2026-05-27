# research-roadmap.md — რა გვინდა გამოვიკვლიოთ

> **სტატუსი:** Live tracking doc. ყოველი research-ის შედეგი `docs/research/`-ში გადადის.
> **მთავარი წესი:** არ ვაშენებთ MVP-ის სანამ research roadmap-ი არ დასრულდება. discipline.

---

## 1. რატომ ჯერ research?

ბაზარი მონაცემთა მზის: 2026 May-ში Figma-მ გამოუშვა საკუთარი Design Agent (free). თუ ჩვენ ბრმად ვიწყებთ კოდს, ვაშენებთ ისეთს, რასაც Figma-მ უკვე ან მალე გააკეთებს. **საუკეთესო leverage = ცოდნა**.

ARCHITECTURE.md უკვე გვაძლევს არქიტექტურულ ჩარჩოს. რაც აკლია — **ლანდშაფტის ემპირიული მტკიცებულება**:
- რომელი tools/libraries რეალურად ღირს გამოყენებად
- რომელ wedge-ებში არიან ჩვენი competitors-ი ფაქტობრივად სუსტი
- რა free libraries / templates / patterns შეგვიძლია ვისარგებლოთ
- რა საფრთხეები არსებობს (legal, technical, market)

---

## 2. Research Tracks

### Track A — Direct Competitors (deep dive)

| ხელსაწყო | რა გვინდა ვიცოდეთ | სტატუსი | ფაილი |
|----------|--------------------|---------|-------|
| Figma Design Agent (native) | რა capabilities-ი აქვს today? რა გაუჭირდება? რა pricing-ის roadmap-ი? | TODO | `research/figma-design-agent.md` |
| v0 (Vercel) Figma import | რა scope-ში მუშაობს? რა Figma-features-ი ვერ ხედავს? | TODO | `research/v0-figma.md` |
| Google Stitch (Gemini 3) | რა MCP tools-ი აქვს? Figma integration? | TODO | `research/google-stitch.md` |
| Uizard Autodesigner 2.0 | Pricing tiers, output fidelity, Figma export quality | TODO | `research/uizard.md` |
| Magician (Diagram) | "Spells" UX pattern — რა ვისწავლოთ? | TODO | `research/magician.md` |
| Visily | Screenshot-to-design accuracy benchmarks | TODO | `research/visily.md` |
| Builder.io Visual Copilot | Component mapping logic | TODO | `research/builder-io.md` |
| Mureal Wireframe Designer | Why so niche? Tier 1 lessons | TODO | `research/mureal.md` |

### Track B — Claude / Anthropic Capabilities

| საკითხი | რა გვინდა ვიცოდეთ | სტატუსი | ფაილი |
|---------|--------------------|---------|-------|
| Claude Design plugin | რა ხელსაწყოები მოაქვს? როგორ ვაკავშირებთ ჩვენი plugin-ისთვის? | DRAFT | `research/claude-design-plugin.md` |
| Claude Cowork plugins matrix | Frontend Design, Superpowers, Context7, Code Review — როგორ მუშაობენ? | TODO | `research/claude-cowork-plugins.md` |
| MCP connector limits (tools-only) | რა work-arounds გვაქვს resources/prompts-ისთვის? | TODO | `research/mcp-connector-workarounds.md` |
| Structured outputs reliability | რა error rate-ი Sonnet 4.6 vs Opus 4.7? | TODO | `research/structured-outputs.md` |
| Vision API cost optimization | Files API caching, downsample strategies | TODO | `research/vision-cost.md` |

### Track C — Figma Platform Deep Dive

| საკითხი | რა გვინდა ვიცოდეთ | სტატუსი | ფაილი |
|---------|--------------------|---------|-------|
| Figma Plugin Store review process | რა triggers რცა, რა approval timeline | TODO | `research/figma-plugin-review.md` |
| `create-figma-plugin` scaffold | რა boilerplate ხდის work-around | TODO | `research/create-figma-plugin.md` |
| Figma MCP rate limits per plan | Starter 6/mo vs Enterprise 600/day — fallback strategy | TODO | `research/figma-mcp-limits.md` |
| Figma variables API surface | რა შემიძლია harvest-ი თუ user არ მისცემს Org MCP | TODO | `research/figma-variables-api.md` |
| Figma Make + Design Agent integration | რა შეუძლია ჩვენი plugin-ისთვის (positive sum) | TODO | `research/figma-make-integration.md` |

### Track D — Backend Stack

| საკითხი | რა გვინდა ვიცოდეთ | სტატუსი | ფაილი |
|---------|--------------------|---------|-------|
| Cloudflare Workers vs Fly vs Vercel | latency, cost at scale, SSE support | TODO | `research/backend-hosting.md` |
| Auth: Clerk vs Auth.js vs custom JWT | Figma user identity flow | TODO | `research/auth-providers.md` |
| Telemetry: PostHog vs Plausible vs custom | PII handling, cost | TODO | `research/telemetry.md` |
| Stripe vs LemonSqueezy vs Paddle | tax handling, EU VAT, indie-friendliness | TODO | `research/billing-providers.md` |
| Vector DB (if needed for memory) | pgvector vs Pinecone vs Turbopuffer | TODO | `research/vector-db.md` |

### Track E — Free Libraries / Assets

| რესურსი | რა გვინდა ვიცოდეთ | სტატუსი | ფაილი |
|---------|--------------------|---------|-------|
| Iconify catalog | რა icon sets free + license terms | TODO | `research/iconify.md` |
| Unsplash API | rate limits, attribution, license | TODO | `research/unsplash.md` |
| Heroicons / Lucide / Tabler | Best fit for plugin defaults | TODO | `research/icon-sets.md` |
| Google Fonts API | რა fonts safe to embed, licensing | TODO | `research/google-fonts.md` |
| Tokens Studio JSON spec | data model, GitHub integration | TODO | `research/tokens-studio.md` |
| Open color palettes (Coolors, Realtimecolors, Huemint) | API access? | TODO | `research/color-palettes.md` |

### Track F — Legal / Brand

| საკითხი | რა გვინდა ვიცოდეთ | სტატუსი | ფაილი |
|---------|--------------------|---------|-------|
| Trademark search USPTO/EUIPO | candidate name conflicts | TODO | `research/trademark-search.md` |
| Domain availability check | .com .app .io for finalists | TODO | `research/domains.md` |
| Figma plugin name policy | naming restrictions in store | TODO | `research/figma-naming.md` |
| EU AI Act / Accessibility Act implications | what we must disclose/comply | TODO | `research/eu-regulations.md` |
| Anthropic ToS for resellers | can we BYO key vs hosted | TODO | `research/anthropic-tos.md` |

### Track G — UX Patterns Research

| საკითხი | რა გვინდა ვიცოდეთ | სტატუსი | ფაილი |
|---------|--------------------|---------|-------|
| Plugin chat panel UX patterns | best plugins on store — what works? | TODO | `research/chat-panel-ux.md` |
| Streaming progress UX | how to show "AI is thinking" in plugin | TODO | `research/streaming-ux.md` |
| Selection feedback UX | how to show "this part will be edited" | TODO | `research/selection-ux.md` |
| Error/retry UX | a11y failed → what does user see? | TODO | `research/error-ux.md` |

---

## 3. პრიორიტეტიზაცია (ბიზნესის ჭრილში)

> **წესი:** რა გადაწყვეტს MVP scope-ს, ის წინ. რა "nice to know", ის შემდეგ.

### სასწრაფო (1-2 კვირაში)
1. **Track A** — Figma Design Agent, v0, Stitch (#1, #2, #3 threats)
2. **Track B** — Claude Design plugin (immediate integration question)
3. **Track D** — Backend hosting (cost-defining decision)
4. **Track F** — Trademark + domain (blocks naming)

### Mid-priority (3-4 კვირაში)
5. **Track C** — Figma plugin specifics (blocks scaffolding)
6. **Track E** — Free libraries (defines manifest `allowedDomains`)

### Lower-priority (გასცდე planning)
7. **Track G** — UX patterns (could be done in parallel with MVP build)

---

## 4. Research-ის ფორმატი (per-file template)

```markdown
# [tool/topic] — Research Notes

> Source: [URL]
> Date: YYYY-MM-DD
> Researcher: Claude session

## TL;DR (3-5 bullets)
- ...
- ...

## Capabilities
| Feature | Available? | Notes |
|---------|------------|-------|
| ...     | ✅/❌/⚠️    | ...   |

## Pricing (if applicable)
- ...

## Strengths
- ...

## Weaknesses (our wedge opportunity)
- ...

## What we can leverage
- ...

## What we should AVOID copying
- ...

## Open questions
- ...

## Sources
- [Link 1](url)
- [Link 2](url)
```

---

## 5. Research-ის Claude-მ როგორ აწარმოოს

1. **WebFetch** — სტრუქტურირებული extraction ერთი URL-დან
2. **WebSearch** — landscape view, ახალი ხელსაწყოების ძიება
3. **`design-explorer` sub-agent** — Track A და Track G-სთვის (deep dives)
4. შედეგი ყოველთვის → `docs/research/<topic>.md`
5. ფაილი იქმნება template-ით (#4)
6. shotgun research — paralelizable: გაუშვი 3-5 WebFetch ერთად სხვადასხვა URL-ებზე

---

## 6. Decision Points (research-ის შემდეგ)

რა გადაწყვეტილებები მოყვება ამ research-ს:

- [ ] **Brand name finalized** (Track F + branding.md)
- [ ] **Backend stack chosen** (Track D)
- [ ] **MVP scope lock-დაცული** (Track A + Track C)
- [ ] **Pricing tiers numerated** (Track A pricing intel)
- [ ] **Anthropic billing model** (Track F: ToS)
- [ ] **Claude Design plugin integration plan** (Track B)
- [ ] **Free library allowlist** (Track E — manifest `allowedDomains`)

---

## 7. Cadence

> ბიზნესის discipline: research-ი არ უნდა გრძელდებოდეს უსაზღვროდ. დასრულდება criteria-ით.

**Definition of Done — Research Phase:**
- ყველა "სასწრაფო" Track-ი დასრულებული ✅
- 80%-ი "Mid-priority" Track-ის დასრულებული ✅
- Decision Points-ის 70%-ი resolved ✅
- MVP scope `requirements.md`-ში locked ✅

**ვადა (soft):** 1-2 კვირა. თუ მეტი დაიკავა, **მიზეზი უნდა იყოს ცნობილი** (e.g., Figma changed pricing mid-research).
