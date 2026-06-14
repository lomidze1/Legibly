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
DOMAIN_PLACEHOLDER: legibly.app     # not yet acquired (.com registered but parked/empty)
```

**Figma store title (SEO):** `Legibly — Accessibility Auto-Fix & WCAG 2.2 AA Checker`
(brand = short/clean; descriptor carries the keywords)

---

## რატომ "Legibly"

- **ფუნქციას ამბობს** — "legible / clear / readable" = accessibility-first correctness-ის გული; scales მთელ "correctness layer"-ზე (a11y → system-strict → brand-QA).
- **Clean** — არ მოიძებნა არსებული "Legibly" software brand; Figma Community-ზე თავისუფალია; trademark indicative-ად სუფთა.
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
| `legibly.com` | ⚠️ registered but parked/empty (403, no active brand) — acquire/negotiate or use alt TLD |
| **Formal USPTO/EUIPO clearance** | ⏳ **Track F to-do before public launch** |
| **Domain acquisition** (.app/.io/getlegibly) | ⏳ **Track F to-do** |

> ⚠️ ზემოთა web-checks **ინდიკატორია, არა legal clearance.** launch-ამდე საჭიროა proper trademark search + domain lock (`research/trademark-search.md`, `research/domains.md`).

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
