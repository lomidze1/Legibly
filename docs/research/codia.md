# Codia AI — Deep-Dive Research Notes

> Source: https://codia.ai/ (explored live via browser MCP, Playwright)
> Date: 2026-06-14
> Researcher: Claude session (main)
> Status: Deep-dive — covers full product surface, pricing, and the DesignGen plugin specifically

---

## TL;DR

- **Codia is NOT a design generator first** — it is a **multi-product "Vision AI" platform for *editable reconstruction*** (screenshot / PDF / PSD / image / website → editable Figma / PPT / Canva / SVG). Generation ("Text to Design" = DesignGen) is one of ~11 Figma plugins, not the core.
- **Flagship = "Screenshot to Figma"** — "Trusted by 300,000+ designers." DesignGen (prompt→UI) is a **secondary** product: **55.9k users, 816 likes**, last updated Nov 2025.
- **The "free" question answered:** it is **classic capped freemium + viral loop**, not a time-limited beta. Free = **5 credits/month** only (tiny throttle). Real use needs paid credits. Extra free credits via **invite-a-friend**. The free tier is a **top-of-funnel loss-leader**, subsidized by the paid **Open API / enterprise / Studio** business.
- **Credit-metered everything:** `1 credit = 1 page/image/prompt`. This is the dominant monetization pattern in this whole category.
- **For us:** Codia validates that **conversion/reconstruction** (screenshot/PSD/PDF→Figma) has far more pull (300k) than **prompt→generation** (56k). It also confirms the credit-metered freemium pricing norm. Their "style-aware generation" is a **soft claim**, not a hard-fail system gate — our wedge #1 stays open.

---

## What Codia actually is

A family of products around **"editable reconstruction & format conversion"** — turning flat/locked visuals into editable files. Not a single tool.

| Layer | Products |
|-------|----------|
| **Apps/Studio** | Codia Studio (create/edit/refine), NoteSlide (NotebookLM PDF → editable PPT/Keynote), Codia Code (Figma→code), Codia AI Remix |
| **Figma plugins (11)** | Screenshot to Figma, **Prompt to UI / Text to Design (= DesignGen)**, Image to SVG, PDF to Figma, PSD (Photoshop) to Figma, HTML to Design, Illustrator to Figma, Office to Figma, Canva to Figma, Notion to Figma, AI Remix |
| **Canva plugins** | Figma → Canva, etc. |
| **Open API (the real business)** | Visual Struct API (UI image → JSON/SVG/Figma), PDF to Visual Schema, PSD Migration, Screenshot-to-X, Image to SVG API, Background Removal, Image Layering API |
| **Tech** | "Codia AI Vision" — decomposes input into text/shape/image/icon layers + layout grid, then reconstructs editable output |

---

## Capabilities (DesignGen / "Text to Design" plugin)

| Feature | Available? | Notes |
|---------|------------|-------|
| Prompt → editable UI in Figma | ✅ | Auto-layout, named layers, editable styles ("no blank canvas") |
| Style-aware generation (your tokens/brand) | ⚠️ | **Claimed** ("add your tokens/themes and AI will follow") but **soft** — no hard-fail on off-system primitives (our wedge #1 still open) |
| Smart iteration / Regenerate | ✅ | Refine prompt or click Regenerate for variants |
| Drag-and-drop refine + block library | ✅ | "Manual mode" = pre-made blocks you assemble without AI |
| Responsive breakpoints | ✅ | Desktop / Tablet / Mobile |
| In-loop WCAG / a11y gate | ❌ | None |
| Selection-based partial regen | ❌ | Block swapping, not system-strict selection regen |
| Multi-screen state machine / flow logic | ❌ | Single-screen/section generation |
| Brand-QA vision pass before commit | ❌ | None |

**Observed quality signal:** plugin comments show people using it for off-purpose requests (e.g. generating Eid greeting-card images), suggesting loose positioning / not anchored to serious product-UI work.

---

## Pricing (credit-metered freemium across all products)

> Prices below are the **annual (Save 40%)** figures Codia shows by default; monthly list prices are higher (shown in brackets where seen). `1 credit = 1 page / image / prompt`.

### DesignGen — "Text to Design" (the prompt→UI plugin)
| Tier | Price | Quota |
|------|-------|-------|
| Free | $0 | **5 AI Prompt Credits/mo**, 1 workspace / 3 pages, browse free blocks, export 5 blocks (manual) |
| Manual | $11/mo [$19] | No AI credits; full block library, unlimited manual exports, 10 workspaces/100 pages |
| Starter | $17/mo [$29] | **100 AI Prompt Credits/mo**, 10 workspaces/100 pages |
| Pro | $29/mo [$49] | **500 AI Prompt Credits/mo**, 50 workspaces/500 pages |

### Screenshot to Design (flagship plugin)
| Tier | Price | Quota |
|------|-------|-------|
| Free | $0 | 5 credits/mo, ≤1440×1440, ≤5MB, may wait at peak, **invite friends for more credits** |
| Starter | $29/mo [$49] | 200 credits, 4096×4096/20MB, batch ≤5 |
| Pro | $59/mo [$99] | 500 credits, 10000×10000/50MB, batch ≤20 |

### NoteSlide (PDF→deck)
Free (5/mo) · Starter $12/mo [$20] · Pro $29/mo [$49] · Ultra $120/mo [$200] (3000 credits)

**Team purchasing:** per-seat subscriptions with shared billing across all products.

---

## How / why is it free? (the question that prompted this research)

It is **not** a "free during beta" promo with an end date. It is **structural capped freemium**:

1. **Tiny free quota (5 credits/mo)** = a sampler. Enough to feel the value, far too little to actually work → forces upgrade or invite.
2. **Viral invite loop** ("get more credits by inviting friends") = cheap customer acquisition (lowers CAC).
3. **Multi-product platform economics** — the **Open API + enterprise + Studio** lines are where the money is; the free Figma plugins are **distribution / lead-gen** funneling into paid credits and API contracts ("300,000+ designers" is the top-of-funnel asset).
4. **Per-generation vision inference is cheap** relative to LTV, so a 5-credit giveaway is an affordable acquisition cost.

**How long will it stay free?** Indefinitely — but only at the **5-credit throttle**. The free tier is permanent *because* it is the funnel; the cap is the monetization lever, not a countdown.

---

## Strengths

1. **Breadth** — one platform covers convert + edit + reuse across Figma/Canva/PPT, plus an API business.
2. **Reconstruction is their moat** — Screenshot/PSD/PDF→editable-Figma has real, proven demand (300k).
3. **Credit model** is simple and scales with usage; viral loop drives growth.
4. **Editable, native output** (auto-layout, named layers) — table stakes they meet.

## Weaknesses (our wedge opportunity)

1. **Generation is a side product, and generic** — DesignGen (56k) is dwarfed by reconstruction (300k); its "style-aware" claim is soft, not enforced. **Wedge #1 (system-strict hard-fail) open.**
2. **Zero accessibility surface** — no WCAG gate anywhere. **Wedge #2 wide open.**
3. **No selection-based partial regen, no multi-screen flow logic, no Brand-QA vision pass.** Wedges #3–#5 open.
4. **Quality/positioning is loose** — off-purpose usage in comments; "magic" framing over correctness.
5. **Credit anxiety** — everything metered; heavy users pay a lot (Pro $59/mo on the flagship).

## What we can leverage

- **Pricing benchmark:** our $10–15/mo Pro band is *cheaper* than Codia's generation Pro ($29) and far below their flagship Pro ($59) — room to undercut while justifying on **correctness guarantee**, not volume.
- **Funnel design:** capped-free + (optionally) a viral/referral credit loop is the category norm — consider a small free tier as top-of-funnel.
- **Strategic read:** *reconstruction/conversion pulls harder than generation.* If we ever broaden, screenshot/PSD→**system-strict** Figma (reconstruction that snaps to the user's tokens + passes a11y) is an underserved combination Codia leaves open.

## What we should AVOID copying

- ❌ Don't spread thin across 11 products — we are 1–2 people; depth on the wedge beats breadth.
- ❌ Don't ship "magic" generation with soft style claims — that's the commoditized lane Codia already occupies.
- ❌ Don't make pricing pure usage-metered credit anxiety if we can offer predictable correctness value.

## Open questions

- Which model(s) power DesignGen? (not disclosed — likely their own Vision stack + an LLM)
- Real conversion rate free→paid on the plugins? (not public)
- Does "style-aware" actually read Figma variables, or just accept a pasted palette? (needs hands-on test)
- API revenue split vs plugin revenue? (private)

## Sources

- [Codia homepage](https://codia.ai/)
- [Codia pricing](https://codia.ai/pricing)
- [Codia DesignGen pricing — Text to Design](https://codia.ai/pricing/figma_plugin/ai_design_t2d)
- [Codia Screenshot-to-Design pricing](https://codia.ai/pricing/figma_plugin/ai_design)
- [Codia AI DesignGen on Figma Community](https://www.figma.com/community/plugin/1355208994639626356/codia-ai-designgen-prompt-to-design-magic) — 55.9k users, 816 likes
