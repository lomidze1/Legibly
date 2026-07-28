# launch-stack.md — რა გვჭირდება Legibly-ის გასაშვებად

> **სტატუსი:** 📋 DRAFT — 2026-07-26. ეს არის **infrastructure/vendor shopping list**, არა scope.
> Product scope → [`requirements.md`](./requirements.md). ფული/tier-ები → [`goal.md §money`](./goal.md).
> გამოწვეულია v0.3 footer-ის (Free & Pro, Subscribe, Send feedback) დამატებით — თითოეული ღილაკი
> ახლა placeholder URL-ზე მიდის ([`plugin/src/ui/links.ts`](../plugin/src/ui/links.ts)).

---

## 0. TL;DR — ხუთი blocker

| # | რა | ვენდორი | სტატუსი | ბლოკავს |
|---|----|---------|---------|---------|
| 1 | დომენი | Namecheap | ❌ არ გვაქვს | **ყველაფერს** — plugin-ის ყველა ლინკს |
| 2 | Hosting | Render | ❌ არ არის | website + (თუ დაგვჭირდა) API |
| 3 | Email | Resend | ❌ არ არის | Subscribe, feedback autoreply |
| 4 | გადახდები | **Paddle (MoR)** — D21 | ❌ არ არის | Pro tier-ის ჩართვა |
| 5 | Auth | ~~Figma OAuth~~ → license key + `figma.currentUser.id` | ✅ გადაწყვეტილია (D21) | — |

**კრიტიკული თანმიმდევრობა:** დომენი → hosting → email → გადახდები (Paddle account + webhook).
დომენის გარეშე Resend-ის domain verification შეუძლებელია, OAuth redirect URI-ს ვერ დაარეგისტრირებ,
და plugin-ის footer-ის ხუთივე ლინკი 404-ია.

---

## 1. Namecheap — დომენი

**რისთვის:** website, email sender domain, OAuth redirect, plugin-ის ყველა outbound ლინკი.

**მდგომარეობა:** [`branding.md`](./branding.md) — `legibly.com` **დარეგისტრირებულია მესამე პირზე**
(parked/empty, 403). `legibly.app` = placeholder, **ჯერ არ არის შეძენილი**.

**რა უნდა გავაკეთოთ:**
- [ ] შევამოწმოთ `legibly.app` / `legibly.io` / `getlegibly.com` ხელმისაწვდომობა
- [ ] შევიძინოთ + ჩავრთოთ WHOIS privacy (Namecheap-ს უფასოდ აქვს)
- [ ] DNS: `A`/`CNAME` → Render, `MX`/`TXT` → Resend

**ღირებულება:** `.app` ≈ $15–20/წელი (Google-ის TLD — **HSTS preload სავალდებულოა**, ე.ი.
HTTPS-only by design; ჩვენთვის უპრობლემოა). `.com` acquisition თუ ვცდით — $500–5000+, არაპროგნოზირებადი.

> ⚠️ `.app`-ის HSTS მოთხოვნა ნიშნავს, რომ **http:// fallback არ არსებობს**. Render-ზე TLS ავტომატურია, ე.ი. OK.

**რის შემდეგ:** `SITE` კონსტანტა [`links.ts`](../plugin/src/ui/links.ts)-ში → ერთი ცვლილება, plugin-ის ყველა ლინკი გასწორდება.

---

## 2. Render — hosting

**რისთვის:** (ა) marketing website — `website/` Next.js; (ბ) *თუ* გადავწყვიტეთ, backend API
(license validation, Claude proxy, Flitt webhook).

**რა უნდა გავაკეთოთ:**
- [ ] `website/` deploy — Static Site ან Web Service
- [ ] custom domain + auto-TLS
- [ ] env vars: `RESEND_API_KEY`, (მოგვიანებით) `FLITT_*`, `ANTHROPIC_API_KEY`

**ღირებულება:** Static Site $0; Web Service $7/თვე (free tier იძინებს — webhook-ისთვის გამოუსადეგარია).

> ✅ **გადაწყვეტილია ([D21](./approach.md)): ორივე Vercel-ზე.** Paddle webhook და `/activate`
> short-lived request-ებია — Vercel serverless functions ჰყოფნის, long-running service არ გვჭირდება.
> ე.ი. **Render Web Service ($7/თვე) v1-ისთვის აღარ არის საჭირო**; store = Vercel KV / Neon free tier.

---

## 3. Resend — email

**რისთვის:** "Subscribe to updates" (footer → website form), feedback autoreply, მოგვიანებით
license key delivery.

**რა უნდა გავაკეთოთ:**
- [ ] account + domain verification (SPF/DKIM/DMARC DNS ჩანაწერები)
- [ ] `no-reply@` და `hello@` sender-ები
- [ ] `/subscribe` route website-ზე → Resend Audiences (contact storage) + confirmation email
- [ ] **double opt-in** — GDPR-ისთვის სავალდებულო, EU დიზაინერები ჩვენი target-ია

**ღირებულება:** free tier 3,000 email/თვე, 100/დღე — early stage-ისთვის სავსებით საკმარისი.
Pro $20/თვე როცა გავიზრდებით.

> 🔒 **არქიტექტურული წესი:** plugin **არასდროს** აგზავნის email-ს პირდაპირ. Figma-ს manifest-ის
> `networkAccess.allowedDomains` ახლა მხოლოდ `api.anthropic.com`-ს იცნობს, და ასე რჩება.
> Subscribe = `figma.openExternal()` → ბრაუზერი → website form. **ე.ი. Resend key plugin-ს არასდროს ხედავს.**

---

## 4. გადახდები — ✅ გადაწყვეტილია: **Paddle (MoR)** — [D21](./approach.md)

**გამყიდველი:** ქართველი ინდ. მეწარმე, პირადი სახელით/ID-ით (user-confirmed, 2026-07-29).

### ❌ ვარიანტი A — Figma Payments API (`figma.payments`) — **გამორიცხულია**
Figma Community-ზე paid resource მოითხოვს **აქტიურ Stripe account-ს**
([Figma Help](https://help.figma.com/hc/en-us/articles/360042293394-Publish-plugins-to-the-Figma-Community)),
Stripe კი საქართველოს merchant country-ად **არ უჭერს მხარს** (46 supported country, GEL არ არსებობს).
IE-ს სტატუსით ეს არხი დახურულია. *(გაიხსნებოდა მხოლოდ EE/UK/US entity-ით — არ არის დღევანდელი გეგმა.)*

### ❌ ვარიანტი B — Flitt (ex-Fondy) — **v1-სთვის არა**
- უკვე ნაცნობია web2wireframe-იდან; ქართული acquiring კარგია.
- **მაგრამ:** Flitt არის **PSP, არა Merchant of Record** → EU B2C digital services-ის VAT
  **პირველივე ევროდან ჩვენზეა** (OSS რეგისტრაცია, 27 იურისდიქცია). + უცხოელი დიზაინერისთვის
  უცნობი checkout = conversion-ის დანაკარგი. Legibly-ის target გლობალურია, web2wireframe-ისა — არა.
- რჩება როგორც შესაძლო **ლოკალური** არხი მოგვიანებით.

### ❌ LemonSqueezy — **გამორიცხულია**
Stripe-ის შვილობილი → იგივე GE-ის ბლოკი, რაც ვარიანტ A-ში.

### ✅ ვარიანტი C — **Paddle (MoR)** — არჩეული
- GE = supported seller country; payout **wire ან Payoneer**.
- VAT/sales tax სრულად მათი ვალდებულებაა — 200+ ქვეყანა, ჩვენი tax liability = 0.
- subscriptions + webhooks built-in.
- **ფასი:** ~5% + $0.50. ცნობიერად გადახდილი ფასი 27 ქვეყნის compliance-ის ნაცვლად.
- ⚠️ **built-in license key API არ აქვს** (განსხვავებით LemonSqueezy-სგან) → key generation ჩვენზეა, იხ. §5.

**რა უნდა გავაკეთოთ:**
- [ ] Paddle seller account (IE-ს დოკუმენტებით) + verification
- [ ] პროდუქტი: Pro $12/mo (+ optional yearly discount)
- [ ] webhook endpoint → license key generation → Resend delivery
- [ ] payout method: Payoneer ან wire

---

## 5. License binding — Figma OAuth **არ გვჭირდება** ([D21](./approach.md))

`figma.currentUser` (manifest: `"permissions": ["currentuser"]`) აბრუნებს `{ id, name, photoUrl, sessionId }` —
**სტაბილურ Figma user ID-ს პლაგინის შიგნიდან, OAuth-ის გარეშე.**

```
Paddle checkout (website)
  → webhook → license key → Resend email
  → user აწერს key-ს Settings-ში
  → POST /activate { key, figmaUserId }   ← figma.currentUser.id
  → seat binding (max 2/key) → signed token
  → figma.clientStorage cache + offline grace (~7 დღე)
```

- **რატომ ჰყოფნის:** `currentUser.id` client-reported-ია, ე.ი. spoof-ადი — მაგრამ $12-იან პლაგინზე
  მიზანი anti-piracy არაა, არის key-ის უაზრო გაზიარების შეჩერება. seat-limit საკმარისია.
- **Caveat:** `currentUser` შეიძლება იყოს `null` → fallback: key მარტო email-ზე იბმება.
- **manifest:** `allowedDomains` += ჩვენი API დომენი (`api.<domain>`), `permissions` += `currentuser`.

**Figma OAuth ბრუნდება მაშინ და მხოლოდ მაშინ, როცა** website-ზე account portal ("Sign in with Figma")
ან cross-device sync გვინდა key-ის copy-paste-ის გარეშე — **post-v1**.

---

## 6. Anthropic API key — BYOK თუ ჩვენი? (გასარკვევი #1)

**დღევანდელი მდგომარეობა:** **BYOK** — მომხმარებელი აწერს საკუთარ `sk-ant-…` key-ს Settings-ში,
ინახება მხოლოდ მეხსიერებაში (plugin-ის დახურვისას იშლება), მოთხოვნა მიდის **პირდაპირ**
`api.anthropic.com`-ზე. ერთადერთი ფუნქცია რომელიც მას იყენებს = AI alt-text draft (SC 1.1.1).

### ⛔ რაც **შეუძლებელია**
ჩვენი key **ვერ ჩაიდება plugin-ის bundle-ში**. Figma plugin-ის კოდი მომხმარებლის მანქანაზე იწერება
და მთლიანად წაკითხვადია — key-ს პირველ დღესვე მოიპარავენ. **ჩვენი key = სავალდებულოდ server-side proxy.**

### შედარება

| | BYOK (ახლანდელი) | ჩვენი key (proxy) |
|---|---|---|
| ღირებულება ჩვენთვის | **$0** | ცვლადი — abuse რისკი |
| Backend | არ სჭირდება | **სავალდებულოა** (Render, §2) |
| Key custody რისკი | არანაირი | ჩვენზეა |
| **Conversion** | ❌ **ცუდი** — დიზაინერების უმრავლესობას Anthropic key არ აქვს, ე.ი. ფუნქცია პრაქტიკულად მკვდარია | ✅ მუშაობს click-ზე |
| Pro-ს value story | სუსტი | "AI alt-text შედის" = გასაყიდი |

### რეკომენდაცია — **ჰიბრიდი**
1. **BYOK რჩება, უფასოდ და ულიმიტოდ** — power user-ებისთვის, privacy-conscious ორგანიზაციებისთვის
   (nothing leaves Figma = ჩვენი trust story, არ უნდა დავარღვიოთ).
2. **Pro-ს მოყვება metered quota ჩვენი key-ით** (მაგ. 50 alt-text/თვე) server proxy-ს გავლით.
3. Free + key-ის გარეშე → ფუნქცია disabled, ღილაკი ხსნის Pro-ს modal-ს.

**რატომ ასე:** დღეს BYOK-ს არაფერი ეღირება და უკვე მუშაობს (238 ტესტი მწვანე). Proxy მხოლოდ
მაშინ ავაშენოთ, როცა §4 გადაწყდება — მანამდე backend-ი ისედაც არ გვექნება.

- [ ] **გასარკვევი:** cost per alt-text call (Haiku vs Sonnet vision) → quota-ს ეკონომიკა

---

## 7. რაც **არ** გვჭირდება (განზრახ)

| | რატომ არა |
|---|-----------|
| Analytics SDK plugin-ში | `allowedDomains`-ის გაფართოება trust-ს აზიანებს. Figma Community-ს თავისი stats აქვს. |
| Error tracking (Sentry) plugin-ში | იგივე მიზეზი. website-ზე — შეიძლება. |
| CDN | website static-ია; hosting-ს თავისი აქვს. |
| ~~Database (v1)~~ | ⚠️ **შეიცვალა (D21):** Paddle-ს built-in license API არ აქვს → **გვჭირდება მინიმალური store** (key → figma user id seat binding). Vercel KV ან Neon free tier. settings კვლავ → `figma.clientStorage`. |

---

## 8. Open questions

| # | კითხვა | ბლოკავს |
|---|--------|---------|
| ~~Q1~~ | ✅ **დახურულია (D21):** Figma Payments = Stripe-required → GE-სთვის მიუწვდომელი. Billing = Paddle. | — |
| Q2 | დომენი: `.app` თუ `.com` acquisition? | §1 → ყველაფერი |
| ~~Q3~~ | ✅ **დახურულია (D21):** website + API ორივე Vercel-ზე. | — |
| ~~Q4~~ | ✅ **დახურულია (D21):** არა — Flitt = PSP, VAT ჩვენზე დარჩებოდა. Paddle = MoR. | — |
| Q7 | Paddle seller verification — IE-ს რა დოკუმენტები სჭირდება, რამდენი ხანი გრძელდება? | §4 |
| Q5 | Pro-ს AI quota-ს ეკონომიკა (cost/call) | §6 |
| Q6 | F20-ის paywall timing ძალაშია? (fix უფასოა beta-ში) | plugin-ის copy — ახლა ასე წერია Plans modal-ში |
