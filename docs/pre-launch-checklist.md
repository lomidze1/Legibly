# pre-launch-checklist.md — რა გვაკლია გამოქვეყნებამდე

> **სტატუსი:** 🔴 LIVE CHECKLIST — შექმნილია 2026-07-29. ეს არის **ერთადერთი ფაილი, სადაც
> გაშვებამდე დარჩენილი საქმეები ცხოვრობს.** როცა პუნქტი სრულდება — მონიშნე `[x]` აქვე.
>
> - ვენდორების დეტალები/ფასები/ალტერნატივები → [`launch-stack.md`](./launch-stack.md)
> - პროდუქტის scope → [`requirements.md`](./requirements.md) · გადაწყვეტილებები → [`approach.md`](./approach.md)
> - Community listing-ის ტექსტი → [`listing-v0.1.md`](./listing-v0.1.md)
>
> **Owner ლეგენდა:** 👤 = user-ს სჭირდება (ანგარიში, ბარათი, ხელმოწერა) · 🤖 = Claude-ს შეუძლია კოდში

---

## 0. ბლოკირების ჯაჭვი (რიგითობა მნიშვნელოვანია)

```
დომენი ──┬──> website deploy ──> plugin-ის ლინკები ცოცხლდება
         ├──> Resend domain verification ──> waitlist form მუშაობს
         └──> (თუ დაგვჭირდა) OAuth redirect URI

გადახდის მოდელი ──> paywall ჩართვა ──> Pro რეალურად იყიდება
```

**ერთი წინადადებით:** დღეს plugin-ის ხუთივე ლინკი 404-ია, waitlist form 503-ს აბრუნებს,
და Pro-ს ყიდვის გზა არ არსებობს. სამივე ერთ ფესვზე დგას — **დომენი და გადახდის მოდელი.**

---

## 1. 🔴 დომენი — ბლოკავს ყველაფერს

- [ ] 👤 შევამოწმოთ ხელმისაწვდომობა: `legibly.app` · `legibly.io` · `getlegibly.com`
  - `legibly.com` **დაკავებულია** მესამე პირზე (parked, 403) — [`branding.md`](./branding.md)
- [ ] 👤 შევიძინოთ + WHOIS privacy
- [ ] 👤 DNS: `A`/`CNAME` → hosting, `MX`/`TXT` (SPF/DKIM/DMARC) → Resend
- [ ] 👤 **Trademark clearance (Track F)** — web-search ≠ იურიდიული შემოწმება. USPTO/EUIPO
      ფორმალური ძებნა **გამოქვეყნებამდე**, თორემ rebrand launch-ის შემდეგ ხდება

---

## 2. 🔴 გატეხილი ლინკები — ზუსტად რომელი

### 2.1 Plugin → ვებ (ხუთივე 404)
[`plugin/src/ui/links.ts`](../plugin/src/ui/links.ts)-ში `SITE = 'https://legibly.app'` — **placeholder,
დომენი არ არსებობს.** ამ ერთი კონსტანტის შეცვლა ხუთივეს ასწორებს:

| ღილაკი plugin-ში | სად მიდის | გვერდი არსებობს? |
|---|---|---|
| Plans modal → "Subscribe" | `/subscribe` | ❌ არა |
| Help → "Compare plans" | `/pricing` | ⚠️ მხოლოდ `#pricing` anchor მთავარ გვერდზე |
| Help → "Read the docs" | `/docs` | ❌ არა |
| Help → "Contact" | `/contact` | ❌ არა |
| Footer → "Send feedback" | `/feedback` | ❌ არა |

- [ ] 🤖 `SITE` განახლდეს რეალურ დომენზე (1 ხაზი)
- [ ] 🤖 შევქმნათ დაკლებული routes, ან ლინკები გადავამისამართოთ არსებულებზე
      (`/pricing` → `/#pricing`, `/feedback` → `mailto:` ან form). **გადასაწყვეტია: რომელი 5-დან
      მართლა გვჭირდება v1-ზე** — `/docs`-ის დაწერა ცალკე სამუშაოა

### 2.2 საიტზე არსებული routes (დღეს)
`/` · `/privacy` · `/api/waitlist` · `/robots.txt` · `/sitemap.xml` · `/opengraph-image` — სულ ეს.

- [ ] 🤖 **Terms of Service** გვერდი — გადახდების ჩართვამდე სავალდებულოა
- [ ] 🤖 Privacy policy გადავამოწმოთ BYOK-ის ტექსტზე (Anthropic-ს რა მიდის)

---

## 3. 🔴 Email / waitlist — ახლა არ მუშაობს

[`website/src/app/api/waitlist/route.ts`](../website/src/app/api/waitlist/route.ts) `RESEND_API_KEY`-ის
გარეშე **503-ს აბრუნებს** ("The waitlist is not configured yet").

- [ ] 👤 Resend account + domain verification (⇒ დომენი, §1)
- [ ] 👤 env vars deploy-ზე: `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `WAITLIST_FROM`
      - default sender ახლა `onboarding@resend.dev` — **Resend-ის sandbox, real launch-ზე არ გამოდგება**
- [ ] 🤖 `site.email` = **`hello@glinc.io`** — ეს სხვა ბრენდის მისამართია
      ([`website/src/data/site.ts`](../website/src/data/site.ts)). შესაცვლელია `hello@<ჩვენი დომენი>`-ზე
- [ ] 🤖 double opt-in confirmation (GDPR — EU დიზაინერები target-ია)

---

## 4. 🟠 Hosting / deploy

- [ ] 👤 **გადაწყვეტილება: Vercel თუ Render?** (launch-stack Q3 — რეკომენდაცია: website → Vercel)
- [ ] 👤 deploy + custom domain + auto-TLS
- [ ] 🤖 production build-ის შემოწმება deploy-ის შემდეგ (OG image, sitemap, robots)

---

## 5. 🔴 გადახდები — Pro-ს ყიდვა შეუძლებელია

- [ ] 👤 **Q1 (უპირველესი): Figma Payments API** — ხელმისაწვდომია? commission %? საქართველოში payout?
      **დადებითი პასუხი მთლიანად შლის Flitt-სა და OAuth-ს** ([`launch-stack.md §4`](./launch-stack.md))
- [ ] 👤 თუ არა → LemonSqueezy/Paddle (MoR, VAT მათი პრობლემაა) vs Flitt (PSP, VAT ჩვენი)
- [ ] 🤖 paywall-ის ჩართვა — დღეს fix **უფასოა beta-ში** (F20). ეს განზრახაა, მაგრამ
      `Plans` modal-ში ასე წერია და ორივე ერთდროულად უნდა შეიცვალოს
- [x] ~~ფასების სტრუქტურა~~ — ✅ **Free + Pro $12/mo** (D20, 2026-07-28). Team მოხსნილია

---

## 6. 🟠 Figma Community listing

- [ ] 👤 **publish = user action** (Figma ანგარიშის მფლობელი). Claude ვერ გამოაქვეყნებს
- [ ] 🤖 listing copy → [`listing-v0.1.md`](./listing-v0.1.md) განახლდეს v0.4-ის რეალობაზე
      (10 SC, advisory tier — draft ჯერ v0.1-ის ტექსტია)
- [ ] 🤖 cover art + screenshots (Figma Community-ს სავალდებულო აქვს)
- [ ] 🤖 `site.figmaCommunityUrl` = `null` → რეალური URL. სანამ null-ია, hero-ს CTA waitlist-ია
- [ ] 🤖 manifest-ის `networkAccess.allowedDomains` = მხოლოდ `api.anthropic.com` — review-ზე
      ეს ჩვენი უპირატესობაა, არ გავაფართოვოთ

---

## 7. 🟠 კონტენტი, რომელიც აკლია

- [x] 🎬 **Before/after demo** — ✅ გაკეთდა 2026-07-29 (`0bf7fb1`, `5941c2d`). hero-ს პანელი
      ინტერაქტიულია: "Fix with my tokens" → ტექსტი ფერს იცვლის, კოეფიციენტი ითვლის, Undo აბრუნებს.
      light/dark artboard toggle-ითაც — `text/secondary` light-ზე 6.9:1, dark-ზე 1.7:1
- [ ] 📸 **რეალური Figma screenshot** — ზემოთა demo სინთეზურია (SVG specimen). გვერდზე ჯერ
      არც ერთი კადრი არაა Figma-ში ნამდვილად მომუშავე პლაგინის. ეს დარჩა კონვერსიის ხვრელად
- [ ] 🔗 **Footer-ის ლინკები** — changelog, GitHub, X/Twitter ჯერ არ არსებობს. როცა გაჩნდება →
      `SiteFooter.tsx`-ის Company სვეტი
- [ ] 👥 **Social proof** — 0. waitlist counter ან testimonial launch-ის შემდეგ
- [ ] 🤖 `/docs` — რა შედის v1-ში? (getting started, რას ვამოწმებთ, strict mode, BYOK setup)
- [ ] 👤 launch თარიღი: `site.ts` ამბობს **September 2026**; შიდა გეგმა — ყველაფერი გარდა
      გადახდებისა 15 აგვისტოსთვის. თუ ეს ცურავს, საიტის ტექსტიც უნდა ცურავდეს

---

## 8. 🟡 გადასაწყვეტი, არა გასაკეთებელი

- [ ] **რედიზაინი** — `website-new-design/` handoff მზადაა (Free + Pro, 2 სვეტი).
      გავუშვათ launch-მდე თუ ახლანდელი დიზაინით წავიდეთ? *ორივე მუშაობს — ეს scope-ის არჩევანია*
      ⚠️ 2026-07-29-ის review pass ახლანდელ დიზაინზე გაკეთდა. რედიზაინზე გადასვლისას **გადადის**
      ტოკენები, კონტრასტი (AAA), lining figures, SVG specimen, contrast.test.ts; **არ გადადის**
      layout-ზე მიბმული ფიქსები (checks-ის სვეტების flow, split-ის ღერძი, nav-ის გაზომვადი სიმაღლე)
- [ ] **AI alt-text**: BYOK-ს ვტოვებთ უფასოდ + Pro-ს ვუმატებთ quota-ს ჩვენი key-ით?
      (launch-stack §6 — საჭიროებს backend-ს, ე.ი. §5-ის შემდეგ)
- [ ] **main branch** — dev main-ზე **36 commit-ით წინაა**. გაშვებამდე merge საჭიროა
      (⚠️ CLAUDE.md: main-ზე push მხოლოდ user-ის ცალსახა თანხმობით)

---

## 9. ✅ უკვე მზადაა (რომ არ დაგვავიწყდეს)

- ✅ Plugin engine: 10 WCAG SC + advisory tier, 328 tests green, typecheck + build სუფთა
- ✅ ფასების სტრუქტურა და მისი თანმიმდევრობა plugin ↔ website ↔ docs (D20)
- ✅ Landing page — AAA-audited, privacy გვერდით, waitlist form-ით (კოდი მზადაა, key აკლია)
- ✅ ორმაგი design review (55 finding, გასწორდა 44) — [`website.md §9`](./website.md).
      body copy 7:1 (AAA), oldstyle-ციფრების ბაგი გასწორდა, spacing/type ტოკენიზებულია,
      axe: **0 violations**
- ✅ Brand name locked (D9) — იურიდიული clearance კი ჯერ არა (§1)
- ✅ Privacy story: ყველა შემოწმება on-device; მხოლოდ optional BYOK alt-text გადის გარეთ

---

## 10. მოკლე პასუხი — "დღეს რომ დავაჭიროთ publish-ს, რა მოხდება?"

Plugin იმუშავებს (engine სრულყოფილად მზადაა), მაგრამ:
**ხუთი ლინკი 404 · waitlist 503 · Pro-ს ყიდვის გზა არ არსებობს · email სხვისი დომენიდან.**

ე.ი. პროდუქტი მზადაა, **ინფრასტრუქტურა არა.** ერთი ნაბიჯი ხსნის ჯაჭვის ნახევარს — **დომენი.**
