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

## 1. 🟡 დომენი — ✅ შეძენილია, DNS ჯერ არა

- [x] 👤 ხელმისაწვდომობის შემოწმება — **ყველა მოკლე ვარიანტი დაკავებულია:** `legibly.com` (parked),
      `legibly.app` (🔴 **ცოცხალი პროდუქტი იმავე სახელით** — "Legal clarity for peaceful parenting"),
      `legibly.io` (GoDaddy, დეკ 2025), `legibly.ai` (Namecheap, აგვ 2025), `getlegibly.com` (აპრ 2026).
      `legibly.co` თავისუფალია, მაგრამ **premium — $325/წელი, ყოველწლიურად.**
- [x] 👤 **შეძენილია `legibly.design`** (2026-08-01, Namecheap — $12.98 1-ლი წელი / $58.98 განახლება).
      WHOIS privacy ✅ · auto-renew ✅
- [x] 🤖 დომენი ჩასმულია კოდში: `SITE` ([links.ts:8](../plugin/src/ui/links.ts:8)),
      `SITE_URL` ([schema.ts:3](../website/src/lib/schema.ts:3)), `site.email` → `hello@legibly.design`
- [ ] 👤 `hello@legibly.design` mailbox — Namecheap-ის უფასო Email Forwarding → პირად Gmail-ზე.
      **საიტის ყველა contact ლინკი და waitlist-ის შეტყობინება ამ მისამართზე მიდის** (`route.ts:80`)
- [ ] 👤 DNS: `A`/`CNAME` → hosting, `TXT`/`MX` (SPF/DKIM/DMARC) → Resend
      - ⚠️ Resend **subdomain-ზე** (`send.legibly.design`) დავაყენოთ, რომ root-ის `MX` forwarding-ს დარჩეს
- [ ] 👤 **Trademark clearance (Track F)** — ⬆️ **პრიორიტეტი გაიზარდა.** `legibly.app`-ის აღმოჩენის
      შემდეგ ეს აღარაა ფორმალობა: ფორმალური USPTO/EUIPO ძებნა **Figma Community publish-ამდე.**
      თუ `.app`-ის მფლობელს აქვს ნიშანი class 9/42-ში — rename იძულებითია

---

## 2. 🔴 გატეხილი ლინკები — ზუსტად რომელი

### 2.1 Plugin → ვებ (ხუთივე 404)
`SITE` უკვე `https://legibly.design`-ია ([links.ts:8](../plugin/src/ui/links.ts:8)), მაგრამ **საიტი
ჯერ არ არის deploy-ული და ხუთივე route არ არსებობს** — ე.ი. ლინკები კვლავ 404-ია:

| ღილაკი plugin-ში | სად მიდის | გვერდი არსებობს? |
|---|---|---|
| Plans modal → "Subscribe" | `/subscribe` | ❌ არა |
| Help → "Compare plans" | `/pricing` | ⚠️ მხოლოდ `#pricing` anchor მთავარ გვერდზე |
| Help → "Read the docs" | `/docs` | ❌ არა |
| Help → "Contact" | `/contact` | ❌ არა |
| Footer → "Send feedback" | `/feedback` | ❌ არა |

- [x] 🤖 `SITE` განახლდა რეალურ დომენზე (2026-08-01)
- [ ] 🤖 შევქმნათ დაკლებული routes, ან ლინკები გადავამისამართოთ არსებულებზე
      (`/pricing` → `/#pricing`, `/feedback` → `mailto:` ან form). **გადასაწყვეტია: რომელი 5-დან
      მართლა გვჭირდება v1-ზე** — `/docs`-ის დაწერა ცალკე სამუშაოა

### 2.2 საიტზე არსებული routes (დღეს)
`/` · `/privacy` · `/api/waitlist` · `/robots.txt` · `/sitemap.xml` · `/opengraph-image` — სულ ეს.

- [ ] 🤖 **Terms of Service** გვერდი — გადახდების ჩართვამდე სავალდებულოა
- [x] 🤖 Privacy policy — ✅ განახლდა (D22, 2026-08-02): BYOK სექცია წაიშალა, ჩანაცვლდა
      "the plugin makes no network requests of any kind" + manifest-ის ციტატით

---

## 3. 🔴 Email / waitlist — ახლა არ მუშაობს

[`website/src/app/api/waitlist/route.ts`](../website/src/app/api/waitlist/route.ts) `RESEND_API_KEY`-ის
გარეშე **503-ს აბრუნებს** ("The waitlist is not configured yet").

- [ ] 👤 Resend account + domain verification (⇒ დომენი, §1)
- [ ] 👤 env vars deploy-ზე: `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `WAITLIST_FROM`
      - default sender ახლა `onboarding@resend.dev` — **Resend-ის sandbox, real launch-ზე არ გამოდგება**
- [x] 🤖 `site.email` → **`hello@legibly.design`** (2026-08-01, ადრე `hello@glinc.io` იყო).
      ⚠️ **mailbox ჯერ არ არსებობს** — Namecheap forwarding საჭიროა, თორემ waitlist-ის შეტყობინება ბრუნდება
- [ ] 🤖 double opt-in confirmation (GDPR — EU დიზაინერები target-ია)

---

## 4. 🟠 Hosting / deploy

- [ ] 👤 **გადაწყვეტილება: Vercel თუ Render?** (launch-stack Q3 — რეკომენდაცია: website → Vercel)
- [ ] 👤 deploy + custom domain + auto-TLS
- [ ] 🤖 production build-ის შემოწმება deploy-ის შემდეგ (OG image, sitemap, robots)

---

## 5. 🔴 გადახდები — Pro-ს ყიდვა შეუძლებელია

- [x] ~~**Q1: Figma Payments API**~~ — ✅ **გამორიცხულია** (D21): მოითხოვს Stripe-ს, Stripe საქართველოს
      merchant-ად არ უჭერს მხარს. listing რჩება **Free**-დ, ფასი plugin-ში/საიტზე; Figma 0% იჭერს.
- [ ] 👤 **vendor-ის ემპირიული შემოწმება** ([`launch-stack.md §4`](./launch-stack.md)):
      Paddle sign-up → საქართველო არჩევადია? · Dodo sign-up (merchant list-ში #63 GE) + საერთაშორისო განაკვეთი
      · Flitt — recurring **უარყოფილია** სანამ გაყიდვები არ დაფიქსირდება (2026-07-30)
- [ ] 👤 ფასის სტრუქტურა: $12/თვე vs $120/წელი — fixed fee ($0.40–0.50) ყოველთვიურ $12-ს 3–4%-ს ჭამს
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
- [x] 🤖 manifest-ის `networkAccess.allowedDomains` = **`["none"]`** (D22) — review-ზე
      ეს ჩვენი ყველაზე ძლიერი არგუმენტია, არ გავაფართოვოთ

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
- [ ] 🤖 `/docs` — რა შედის v1-ში? (getting started, რას ვამოწმებთ, strict mode)
- [ ] 👤 launch თარიღი: `site.ts` ამბობს **September 2026**; შიდა გეგმა — ყველაფერი გარდა
      გადახდებისა 15 აგვისტოსთვის. თუ ეს ცურავს, საიტის ტექსტიც უნდა ცურავდეს

---

## 8. 🟡 გადასაწყვეტი, არა გასაკეთებელი

- [ ] **რედიზაინი** — `website-new-design/` handoff მზადაა (Free + Pro, 2 სვეტი).
      გავუშვათ launch-მდე თუ ახლანდელი დიზაინით წავიდეთ? *ორივე მუშაობს — ეს scope-ის არჩევანია*
      ⚠️ 2026-07-29-ის review pass ახლანდელ დიზაინზე გაკეთდა. რედიზაინზე გადასვლისას **გადადის**
      ტოკენები, კონტრასტი (AAA), lining figures, SVG specimen, contrast.test.ts; **არ გადადის**
      layout-ზე მიბმული ფიქსები (checks-ის სვეტების flow, split-ის ღერძი, nav-ის გაზომვადი სიმაღლე)
- [x] ~~**AI alt-text**: BYOK-ს ვტოვებთ?~~ — ✅ **წაშლილია** (D22, 2026-08-02). თუ ოდესმე
      დაბრუნდება — მხოლოდ hosted pay-as-you-go ჩვენი key-ით (backend + OAuth საჭირო)
- [x] ~~**main branch**~~ — ✅ **merge შესრულდა 2026-08-02** (user-approved): 51 commit fast-forward-ით,
      `main` = `dev` = `0380f23`. GitHub-ის default view ახლა რეალურ პროდუქტს აჩვენებს
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
- ✅ Privacy story: **ნულოვანი ქსელი** — `allowedDomains: ["none"]`, გადამოწმებადი manifest-ში (D22)

---

## 10. მოკლე პასუხი — "დღეს რომ დავაჭიროთ publish-ს, რა მოხდება?"

Plugin იმუშავებს (engine სრულყოფილად მზადაა), მაგრამ:
**ხუთი ლინკი 404 · waitlist 503 · Pro-ს ყიდვის გზა არ არსებობს · email სხვისი დომენიდან.**

ე.ი. პროდუქტი მზადაა, **ინფრასტრუქტურა არა.** ერთი ნაბიჯი ხსნის ჯაჭვის ნახევარს — **დომენი.**
