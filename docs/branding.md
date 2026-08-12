# branding.md — სახელი + Naming Convention

> **სტატუსი:** ✅ **LOCKED — "Legibly"** (D9, 2026-06-14). სახელი არჩეულია; `{{PRODUCT_NAME}}` token-ები expand-ულია docs-ში rename script-ით.

---

## Current Product Name

```yaml
PRODUCT_NAME: Legibly
PRODUCT_NAME_SHORT: Legibly
PRODUCT_NAME_SLUG: legibly         # lowercase, no spaces — for file names, URLs
PRODUCT_NAME_NPM: legibly           # npm package name (if published)
TAGLINE: "Accessibility & design-system auto-fix for Figma — WCAG 2.2 AA, done right"
DOMAIN: legibly.design              # ✅ acquired 2026-08-01 (Namecheap, WHOIS privacy + auto-renew)
```

**Figma store title (SEO):** `Legibly — Accessibility Auto-Fix & WCAG 2.2 AA Checker`
(brand = short/clean; descriptor carries the keywords)

---

## რატომ "Legibly"

- **ფუნქციას ამბობს** — "legible / clear / readable" = accessibility-first correctness-ის გული; scales მთელ "correctness layer"-ზე (a11y → system-strict → brand-QA).
- **Clean** — ⚠️ **ეს ფორმულირება მოძველდა (D25, 2026-08-12).** ზუსტი სურათი: "LEGIBLY" **არსად არაა შეტანილი როგორც ნიშანი** (TMview: 0 შედეგი), მაგრამ **არსებობს იმავე სახელის ცოცხალი პროდუქტი** `legibly.app` (co-parenting legal-tech, დაურეგისტრირებელი), და **ჩვენ სახელს ვერ დავირეგისტრირებთ** — EU-ში `Logibly` (კლ. 9+42) და US-ში LEGIBLE-ის ოჯახი გვიკეტავს კლ. 42-ს. სრულად → [`research/trademark-legibly.md`](./research/trademark-legibly.md).
- **Brandable** — coined-ish adverb, მოკლე, pronounceable, friendly.

### Rejected candidates (2026-06-14)
| სახელი | რატომ უარი |
|--------|------------|
| **Designer** (original placeholder) | generic, SEO-impossible, trademark-prone |
| **Passly** | მკვდარი Kaseya IAM brand (EOL 2025), polluted SEO, არსებული TM |
| **Accessly** | ძალიან ახლოს "Accessibly"-სთან (რეალური a11y brand, TM) |
| **Remedy** | common word, trademark-crowded (game studio, healthcare) |
| **Contrastly** | photography brand (Lightroom presets); + ვიწრო scope |
| **GenUI / AI Designer** | Figma-ზე დაკავებული |

---

## Clearance status

| Check | Status |
|-------|--------|
| Figma Community name | ✅ free (indicative) |
| Existing software brand | ✅ none found (indicative) |
| `legibly.com` | ⚠️ registered but parked/empty (403, no active brand) |
| **`legibly.app`** | 🔴 **LIVE PRODUCT, same name** — "Legibly \| Legal clarity for peaceful parenting" (Vercel, 200 OK, checked 2026-08-01). Different sector (legal services ≈ Nice class 45) than ours (software ≈ class 9/42), so coexistence is plausible — **but this is no longer "no existing brand found"** |
| `legibly.io` · `legibly.ai` · `getlegibly.com` | ⚠️ all registered by third parties, parked (2025–2026) |
| **Formal USPTO/EUIPO clearance** | ✅ **შესრულდა 2026-08-12** → [`research/trademark-legibly.md`](./research/trademark-legibly.md). `.app`-ის მფლობელს **ნიშანი არ შეუტანია** — გადარქმევა იძულებითი **არაა** (D25). სამაგიეროდ აღმოჩნდა, რომ ჩვენც ვერ დავირეგისტრირებთ: 🇪🇺 `Logibly` EUTM `019231527` (კლ. **9+42**, რეგისტრირებული) · 🇺🇸 `LEGIBLE PLATFORM` `99627721` (კლ. 42, published for opposition) |
| **Domain acquisition** | ✅ **`legibly.design` acquired 2026-08-01** |

> ⚠️ ზემოთა web-checks **ინდიკატორია, არა legal clearance.** ფორმალური registry-ძებნა შესრულებულია
> ([`research/trademark-legibly.md`](./research/trademark-legibly.md)), მაგრამ **არც ის არის attorney-ს clearance opinion.**
> გადაწყვეტილება (**keep + mitigate**, rename trigger-ებით T1–T4 → **Conformly**) → [`approach.md` D25](./approach.md).

---

## სახელის შეცვლა (თუ ოდესმე დაგვჭირდა)

1. ცვალე `PRODUCT_NAME` ზემოთ.
2. `./scripts/rename-product.sh "NewName" "newslug"` — expand-ავს ნებისმიერ დარჩენილ `{{PRODUCT_NAME}}` token-ს (architecture.md-ს არ ეხება — manual/legacy).
3. Manual: README, architecture.md literal refs, GitHub repo name/description, Figma manifest, npm package.json.

---

## Legacy: `docs/architecture.md`

ისევ შეიცავს literal "Designer" references-ს (rename script განზრახ არ ეხება). ეს reframe-დება correctness-first ჭრილში ცალკე joint session-ში ([goal.md §0](./goal.md) TODO; CLAUDE.md §8). მანამდე "Designer" architecture.md-ში = legacy alias "Legibly"-სთვის.

---

## Token Convention (post-lock)

სახელი ჩაკეტილია — ახალ ფაილებში პირდაპირ **`Legibly`** გამოიყენე (slug: `legibly`). `{{PRODUCT_NAME}}` token საჭირო აღარ არის; დარჩა მხოლოდ ისტორიულად future-rename-ისთვის თუ მოგვინდა.
