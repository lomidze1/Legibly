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
✅ დომენი ──┬──✅ website deploy ──✅ plugin-ის ხუთივე ლინკი ცოცხალია
            ├──🔴 Resend domain verification ──> waitlist form ამუშავდება
            └──🔴 Figma OAuth redirect URI

🔴 backend (Flitt + OAuth + License) ──> paywall ჩართვა ──> Pro რეალურად იყიდება
                                     └──> /api/judge (D24, cutoff 1 სექტ.)
```

**ერთი წინადადებით (განახლდა 2026-08-03):** დომენისა და deploy-ის ჯაჭვი **დახურულია** —
`https://legibly.design` ცოცხალია და plugin-ის ხუთივე ლინკი მუშაობს. დარჩა **ორი ფესვი:
Resend** (waitlist ჯერ 503-ია) და **backend** (Pro-ს ყიდვის გზა ჯერ არ არსებობს).

---

## 1. ✅ დომენი — ცოცხალია (2026-08-03)

- [x] 👤 ხელმისაწვდომობის შემოწმება — **ყველა მოკლე ვარიანტი დაკავებულია:** `legibly.com` (parked),
      `legibly.app` (🔴 **ცოცხალი პროდუქტი იმავე სახელით** — "Legal clarity for peaceful parenting"),
      `legibly.io` (GoDaddy, დეკ 2025), `legibly.ai` (Namecheap, აგვ 2025), `getlegibly.com` (აპრ 2026).
      `legibly.co` თავისუფალია, მაგრამ **premium — $325/წელი, ყოველწლიურად.**
- [x] 👤 **შეძენილია `legibly.design`** (2026-08-01, Namecheap — $12.98 1-ლი წელი / $58.98 განახლება).
      WHOIS privacy ✅ · auto-renew ✅
- [x] 🤖 დომენი ჩასმულია კოდში: `SITE` ([links.ts:8](../plugin/src/ui/links.ts:8)),
      `SITE_URL` ([schema.ts:3](../website/src/lib/schema.ts:3)), `site.email` → `hello@legibly.design`
- [x] 👤 **Email forwarding ✅** (2026-08-03) — `hello@` · `support@` · `billing@` → პირად Gmail-ზე,
      Namecheap-ის უფასო Redirect Email-ით. MX = `eforward1–5.registrar-servers.com`.
      საიტზე მხოლოდ `hello@` ჩანს; `billing@` Terms-სა და ქვითრებისთვისაა
      - ⚠️ forwarding მხოლოდ **მიღებაა** — პასუხი პირადი Gmail-იდან წავა. გამოსწორება Resend-ის
        შემდეგ: Gmail → Accounts → *Send mail as* → `hello@legibly.design`
- [x] 👤 **DNS ✅** (2026-08-03) — `A` `@` → `216.198.79.1`, `CNAME` `www` →
      `6c118a1a637b104d.vercel-dns-017.com`. Nameservers დარჩა `Namecheap BasicDNS`
      (თუ Vercel-ის NS-ზე გადავიდოდით, email forwarding გაითიშებოდა)
- [ ] 👤 Resend-ის DNS: `TXT`/`MX` (SPF/DKIM/DMARC) — **`send.legibly.design` subdomain-ზე**,
      რომ root-ის `MX` forwarding-ს დარჩეს
- [ ] 👤 **Trademark clearance (Track F)** — ⬆️ **პრიორიტეტი გაიზარდა.** `legibly.app`-ის აღმოჩენის
      შემდეგ ეს აღარაა ფორმალობა: ფორმალური USPTO/EUIPO ძებნა **Figma Community publish-ამდე.**
      თუ `.app`-ის მფლობელს აქვს ნიშანი class 9/42-ში — rename იძულებითია

---

## 2. ✅ Plugin-ის ლინკები — ხუთივე მუშაობს

### 2.1 Plugin → ვებ (გადამოწმებულია ცოცხალ დომენზე 2026-08-03)

| ღილაკი plugin-ში | სად მიდის | სტატუსი |
|---|---|---|
| Plans modal → "Subscribe" | `/subscribe` | ✅ 200 |
| Help → "Compare plans" | `/pricing` | ✅ 307 → `/#pricing` |
| Help → "Read the docs" | `/docs` | ✅ 200 |
| Help → "Contact" | `/contact` | ✅ 200 |
| Footer → "Send feedback" | `/feedback` | ✅ 200 |

- [x] 🤖 `SITE` განახლდა რეალურ დომენზე (2026-08-01)
- [x] 🤖 ხუთივე route ცოცხალია (2026-08-03): `/subscribe` (waitlist form), `/contact`, `/feedback`,
      `/docs` (minimal one-pager), `/pricing` → 307 → `/#pricing`. Footer-ს დაემატა Docs/Contact/Feedback,
      sitemap განახლდა. Deploy-ის შემდეგ plugin-ის არცერთი ღილაკი 404-ს აღარ მოხვდება

### 2.2 საიტზე არსებული routes (2026-08-03)
`/` · `/docs` · `/subscribe` · `/contact` · `/feedback` · `/privacy` · `/api/waitlist` ·
`/robots.txt` · `/sitemap.xml` · `/opengraph-image` · `/pricing` (redirect).

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

## 4. ✅ Hosting / deploy — ცოცხალია (2026-08-03)

- [x] 👤 **Vercel** (Hobby, უფასო) — `lomidze1/Legibly`, Root Directory `website`, production branch `main`
- [x] 👤 deploy + custom domain + auto-TLS — `legibly.design` = Production,
      `www` → 308 → apex. Let's Encrypt სერტიფიკატი გამოწერილია (2026-08-03 → 2026-11-01)
- [x] 🤖 production-ის შემოწმება: `/` `/docs` `/subscribe` `/contact` `/feedback` `/privacy`
      `/sitemap.xml` = 200 · `/pricing` = 307 → `/#pricing` · waitlist = 503 (მოსალოდნელი, key აკლია)
- [ ] 🤖 OG image-ის და robots-ის ვიზუალური გადამოწმება ცოცხალ დომენზე

---

## 5. 🔴 გადახდები — **Flitt** (D23)

> გადაწყვეტილი: **Flitt · ერთჯერადი გადახდა · `$120/წელი` (მთავარი) + `$12/30 დღე`.**
> სრული დასაბუთება → [`launch-stack.md §4`](./launch-stack.md). ვენდორის კითხვა **დახურულია** — არ გავხსნათ.

**ნაბიჯ-ნაბიჯ:**

- [x] ~~ვენდორის არჩევა~~ — ✅ Flitt (D23, 2026-08-02)
- [x] ~~ფასის სტრუქტურა~~ — ✅ `$120/წელი` + `$12/30 დღე`, ორივე ერთჯერადი (D23)
- [ ] 👤 **Flitt merchant portal:** Legibly-ის ცალკე product + `order_id` prefix (w2w-სგან გასამიჯნად)
- [ ] 👤 **`server_callback_url`** რეგისტრაცია → `https://api.legibly.design/api/webhooks/flitt`
- [ ] 🤖 env: `FLITT_MERCHANT_ID` · `FLITT_SECRET_KEY` · `FLITT_BASE_URL=https://pay.flitt.com`
- [ ] 🤖 **w2w-დან გადმოტანა:** `flittService` (checkout + SHA1 signature) · webhook handler (verify + dedup) · `License` model · admin override endpoint-ები
- [ ] 🤖 **Figma OAuth** (`current_user:read`) → HMAC token → `figma.clientStorage` ([`launch-stack §5`](./launch-stack.md))
- [ ] 🤖 **Terms გვერდი:** refund policy · **tax-exclusive disclaimer** (VAT ჩვენზეა — Flitt PSP-ია) · statutory-rights clause
- [ ] 🤖 paywall-ის ჩართვა — დღეს fix **უფასოა beta-ში** (F20). განზრახაა, მაგრამ `Plans` modal-შიც ასე წერია: ორივე ერთდროულად უნდა შეიცვალოს
- [ ] 👤 **chargeback rate მონიტორინგი** — target **<0.5%** (ინდუსტრიის სტანდარტი). $12-ზე refund ($12) ყოველთვის იაფია, ვიდრე chargeback (~$42 + rate)

---

> 🔧 **Backend-ის სრული სამუშაო სპეციფიკაცია → [`backend-spec.md`](./backend-spec.md)**
> (Flitt + Figma OAuth + AI Judge, ფაზებად, ტესტებით და ხაფანგებით — self-contained)

## 5.1 🟡 AI Designer Judge (D24) — cutoff **1 სექტემბერი**, launch-ს **არ ბლოკავს**

> მონიშნული frame → snapshot → `/api/judge` → Claude vision + rubric → verdict.
> **Pro-gated + 3 საცდელი free-ზე.** ვერ მოასწრო cutoff-მდე → v1.1 (~2 კვირა post-launch).
> სრული დასაბუთება → [`approach.md D24`](./approach.md) · [`launch-stack.md §6`](./launch-stack.md)

- [ ] 🤖 `/api/judge` endpoint — OAuth-bound, quota counter License row-ში (⇒ §5-ის backend)
- [ ] 🤖 rubric + eval pass — **"მზადაა"-ს კრიტერიუმი**: generic ფიდბექი launch-ში არ გადის
- [ ] 🤖 plugin UI: Judge ღილაკი + Pro gate + trial counter
- [ ] 🤖 privacy + listing copy: *"your design leaves Figma only when you click Judge"*
- [ ] 🤖 model-ის არჩევა cost-ით (Haiku vs Opus vision) → quota-ს ეკონომიკა

---

## 6. 🟠 Figma Community listing

- [ ] 👤 **publish = user action** (Figma ანგარიშის მფლობელი). Claude ვერ გამოაქვეყნებს
- [ ] 🤖 listing copy → [`listing-v0.1.md`](./listing-v0.1.md) განახლდეს v0.4-ის რეალობაზე
      (10 SC, advisory tier — draft ჯერ v0.1-ის ტექსტია)
- [ ] 🤖 cover art + screenshots (Figma Community-ს სავალდებულო აქვს)
- [ ] 🤖 `site.figmaCommunityUrl` = `null` → რეალური URL. სანამ null-ია, hero-ს CTA waitlist-ია
- [x] 🤖 manifest-ის `networkAccess.allowedDomains` = **`["none"]`** (D22) — კოდის დღევანდელი მდგომარეობა.
      ⚠️ **D24-ის დაზუსტება:** paywall/OAuth-თან ერთად ეს **ისედაც** ხდება `[api.legibly.design]` —
      ე.ი. review-ს არგუმენტი აღარ არის "zero egress", არამედ: *"network only for license checks —
      your design leaves Figma only when you click Judge."* ამაზე მეტად არ გავაფართოვოთ

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

**განახლდა 2026-08-03.** Plugin იმუშავებს, საიტი ცოცხალია საკუთარ დომენზე, ხუთივე ლინკი მუშაობს,
email მისამართები ჩვენია. დარჩა ორი:

- 🔴 **waitlist 503-ს აბრუნებს** — Resend key + domain verification (§3)
- 🔴 **Pro-ს ყიდვის გზა არ არსებობს** — backend + Flitt + OAuth (§5)

ე.ი. **launch-ის ნახევარი დახურულია.** დარჩენილი ორივე ერთ ფესვზე დგას — **backend.**
