# launch-stack.md — რა გვჭირდება Legibly-ის გასაშვებად

> **სტატუსი:** 📋 DRAFT — 2026-07-26. ეს არის **infrastructure/vendor shopping list**, არა scope.
> Product scope → [`requirements.md`](./requirements.md). ფული/tier-ები → [`goal.md §money`](./goal.md).
> გამოწვეულია v0.3 footer-ის (Free & Pro, Subscribe, Send feedback) დამატებით — თითოეული ღილაკი
> ახლა placeholder URL-ზე მიდის ([`plugin/src/ui/links.ts`](../plugin/src/ui/links.ts)).

---

## 0. TL;DR — ხუთი blocker

| # | რა | ვენდორი | სტატუსი | ბლოკავს |
|---|----|---------|---------|---------|
| 1 | დომენი | Namecheap | ✅ **`legibly.design`** (2026-08-01) | — *(ბლოკი მოხსნილია)* |
| 2 | Hosting | Render | ❌ არ არის | website + (თუ დაგვჭირდა) API |
| 3 | Email | Resend | ❌ არ არის | Subscribe, feedback autoreply |
| 4 | გადახდები | ✅ **Flitt** — one-time, წლიური-first (D23) | merchant account უკვე არსებობს | Pro tier-ის ჩართვა |
| 5 | Auth | **Figma OAuth** (`current_user:read`) — რეგისტრაციის გარეშე | ✅ მიდგომა გადაწყვეტილია (D21) | license binding |

**კრიტიკული თანმიმდევრობა:** ~~დომენი~~ ✅ → **hosting → email → Flitt-ის ინტეგრაცია**.
დომენი აღებულია, ე.ი. Resend-ის verification, OAuth redirect URI და plugin-ის footer-ის ლინკები
ყველა განბლოკილია.

---

## 1. Namecheap — დომენი

**რისთვის:** website, email sender domain, OAuth redirect, plugin-ის ყველა outbound ლინკი.

**მდგომარეობა:** ✅ **`legibly.design` შეძენილია** (2026-08-01, Namecheap).
`legibly.app` — 🔴 ცოცხალი პროდუქტი იმავე სახელით; `.com`/`.io`/`.ai` — parked მესამე პირებზე;
`legibly.co` — premium $325/**წელიწადში**. დეტალები → [`branding.md`](./branding.md).

**რა უნდა გავაკეთოთ:**
- [x] ხელმისაწვდომობის შემოწმება (ყველა მოკლე TLD დაკავებულია)
- [x] შეძენა + WHOIS privacy + auto-renew
- [ ] `hello@` — Namecheap-ის უფასო Email Forwarding
- [ ] DNS: `A`/`CNAME` → hosting, `TXT`/`MX` → Resend (**subdomain-ზე**, root-ის MX forwarding-ს რჩება)

**ღირებულება:** `.app` ≈ $15–20/წელი (Google-ის TLD — **HSTS preload სავალდებულოა**, ე.ი.
HTTPS-only by design; ჩვენთვის უპრობლემოა). `.com` acquisition თუ ვცდით — $500–5000+, არაპროგნოზირებადი.

> ⚠️ `.app`-ის HSTS მოთხოვნა ნიშნავს, რომ **http:// fallback არ არსებობს**. Render-ზე TLS ავტომატურია, ე.ი. OK.

**რის შემდეგ:** `SITE` კონსტანტა [`links.ts`](../plugin/src/ui/links.ts)-ში → ერთი ცვლილება, plugin-ის ყველა ლინკი გასწორდება.

---

## 2. Render — hosting

**რისთვის:** (ა) marketing website — `website/` Next.js; (ბ) *თუ* გადავწყვიტეთ, backend API
(license validation + Flitt webhook).

**რა უნდა გავაკეთოთ:**
- [ ] `website/` deploy — Static Site ან Web Service
- [ ] custom domain + auto-TLS
- [ ] env vars: `RESEND_API_KEY`, (მოგვიანებით) გადახდის vendor-ის key-ები

**ღირებულება:** Static Site $0; Web Service $7/თვე (free tier იძინებს — webhook-ისთვის გამოუსადეგარია).

> ✅ **გადაწყვეტილია ([D21](./approach.md)): serverless ჰყოფნის.** w2w-ს Render **Standard $25/თვე**
> სჭირდება მხოლოდ იმიტომ, რომ URL/HTML import ნამდვილ **Chromium**-ს უშვებს სერვერზე (~1GB RAM).
> Legibly-ის API = license CRUD + checkout + webhook — მილიწამების request-ები, მძიმე პროცესის გარეშე.
> ე.ი. **long-running service და $25 tier არ გვჭირდება**; store = managed Postgres/KV free tier.
> API-ს სჭირდება: Flitt webhook · `/checkout/create` · `/license/me` · Figma OAuth callback.

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
> `networkAccess.allowedDomains` ახლა **`["none"]`-ია** (D22), და ასე რჩება.
> Subscribe = `figma.openExternal()` → ბრაუზერი → website form. **ე.ი. Resend key plugin-ს არასდროს ხედავს.**

---

## 4. გადახდები — ✅ **Flitt** ([D23](./approach.md))

**გამყიდველი:** ქართველი **ინდ. მეწარმე**, პირადი სახელით/ID-ით.
**პროვაიდერი:** **Flitt** (ex-Fondy) — PCI-DSS Level 1 gateway. **Merchant account უკვე გვაქვს** — w2w-ში
პროდაქშენში მუშაობს.
**მოდელი:** ერთჯერადი გადახდა, ორი tier:

| | ფასი | წვდომა |
|---|---|---|
| **Pro — წლიური** ⭐ მთავარი | **$120** | 365 დღე |
| Pro — თვიური | **$12** | 30 დღე |

**auto-renewal არ არსებობს** · გასაუქმებელი არაფერია · განახლება **დღეებს სტეკავს** დარჩენილზე.

---

### რატომ Flitt

**1. ეკონომიკა ჩვენს დღევანდელ მოცულობაზე.** Flitt იღებს **4%-ს, ფიქსირებული საკომისიოს გარეშე.**
სწორედ ფიქსირებული ნაწილია გადამწყვეტი $12-იან პროდუქტზე — ალტერნატივები ამატებდნენ როგორც
per-transaction ფიქსირებულს (~$0.40–0.50), ისე თვიურ payout ხარჯს (~$30), რაც გაყიდვებისგან
დამოუკიდებლად ეცემა:

| გამომწერი | შემოსავალი | Flitt-ის ხარჯი | სხვა ვარიანტების ხარჯი |
|---|---|---|---|
| 10 | $120 | **4%** | ~34% |
| 25 | $300 | **4%** | ~19% |
| 100 | $1,200 | **4%** | ~11% |

პროცენტული ვენდორები მხოლოდ **~100 გამომწერიდან** ხდებიან კონკურენტული. ის მოცულობა ჯერ არ გვაქვს.

**2. ფული ~1 დღეში.** ალტერნატივები თვიურ ციკლზე იხდიდნენ — 20-დან 50 დღემდე ლაგით.

**3. რისკი ნული.** merchant account არსებობს, KYC გავლილია, approval-ს არ ველოდებით. ახალი ვენდორის
verification-ს დღეები/კვირები სჭირდება და **launch სექტემბერშია** (შიდა deadline: 30 აგვისტო გადახდა).

**4. კოდი უკვე დაწერილია.** w2w-ში მუშაობს და გატესტილია: `flittService` (checkout URL + SHA1 signature),
webhook handler, `WebhookEvent` dedup, `License` model, admin override endpoint-ები, და სამი runbook
(refund, chargeback, key rotation). Legibly-სთვის ეს **გადმოტანაა, არა წერა**.

### რატომ წლიური მთავარი

ერთჯერადი მოდელის ერთადერთი სუსტი წერტილი ის არის, რომ თვიურ tier-ზე მომხმარებელს ყოველთვე
ხელახლა უწევს ყიდვა. **წლიური ამას სტრუქტურულად ხსნის** — ერთი ყიდვა, 365 დღე.

და წლიური ისედაც სჯობდა, გადახდის ვენდორისგან დამოუკიდებლად: **break-even ≈ 10.3 თვე.**
ანუ თუ საშუალო გამომწერი 10 თვეზე ნაკლებს რჩება (indie $12-იან პროდუქტზე თითქმის ყოველთვის ასეა),
წლიური მეტ შემოსავალს ტოვებს — და ბარათის უარის 12 შანსის ნაცვლად 1-ია.

> ⚠️ **გავრცელებული შეცდომა, რომელიც უკვე დავუშვით და გავასწორეთ:** წლიური **არ** ირჩევა საკომისიოს
> გამო. $12×12 = $144 (fee-ს გამოკლებით ~$138), წლიური $120 (~$115). **ფასდაკლება უფრო მეტს ჯდება,
> ვიდრე საკომისიოზე იზოგება.** ერთადერთი რეალური არგუმენტი churn-ია.

### რას ვიხდით ამის სანაცვლოდ (შეგნებულად)

**1. VAT ჩვენზე რჩება.** Flitt არის PSP, არა Merchant of Record — ე.ი. იურიდიულად გამყიდველი **ჩვენ ვართ**,
და EU-ს B2C ციფრული სერვისის გადასახადი ჩვენი პასუხისმგებლობაა. w2w-ის ზუსტი მიდგომას ვიმეორებთ:
- ფასი **tax-exclusive**
- Terms-ში disclaimer: *"Prices are exclusive of any local taxes (e.g. VAT) for which you may be responsible in your jurisdiction"*
- **გადასაფასებელია, თუ EU შემოსავალი ~$30K/წელს გადააჭარბებს** → მაშინ ან EU VAT OSS რეგისტრაცია, ან MoR-ზე გადასვლა

**2. Recurring ჯერ არ არის.** Flitt-მა თქვა, რომ subscription-ს ჩართავს **გაყიდვების დაფიქსირების შემდეგ**
(კონკრეტული რიცხვი არ დაუსახელებიათ). ეს არასდროს ყოფილა ბლოკერი — ერთჯერადით სწორედ იმ გაყიდვებს
ვაფიქსირებთ. და როცა ჩართავენ, **აშენება არ დაგვჭირდება**: w2w-ის recurring კოდი დაწერილი და
გატესტილია, უბრალოდ route-ის დონეზეა გამორთული (`PAYMENT-SYSTEM.md §1`) — webhook handler და License
model ორივე გზას უჭერს მხარს.

### ❌ განხილული და დახურული — ეს კითხვები აღარ გავხსნათ

| | რატომ არა |
|---|---|
| **Figma Payments** (`figma.payments`) | Community-ზე paid resource **აქტიურ Stripe account-ს მოითხოვს** ([Figma Help](https://help.figma.com/hc/en-us/articles/360042293394-Publish-plugins-to-the-Figma-Community)), Stripe კი საქართველოს merchant country-ად არ უჭერს მხარს. |
| **Stripe** (და მასზე დაშენებული ვენდორები) | GE არ არის supported merchant country — 46 ქვეყანა, GEL არ არსებობს. |
| **Merchant-of-Record ვენდორები** | VAT-ს თავის თავზე იღებენ — რეალური უპირატესობა. მაგრამ ფიქსირებული per-transaction + payout ხარჯი ჩვენს მოცულობაზე **3–8× ძვირია**, ფული 20–50 დღეში მოდის, და KYC-ის დამტკიცებას ველოდებოდით. **გადასაფასებელია მხოლოდ ორ შემთხვევაში:** EU შემოსავალი ~$30K/წელს გადააჭარბა, ან Flitt-მა recurring საერთოდ არ გახსნა. |

> ℹ️ **Figma Payments-ის დაკარგვა დანაკარგი არ არის.** Figma-ს
> [review guidelines](https://help.figma.com/hc/en-us/articles/360039958914-Plugin-and-widget-review-guidelines)
> პირდაპირ უშვებს გარე მონეტიზაციას: listing რჩება **Free**-დ, ფასი ცხოვრობს plugin-ის UI-სა და საიტზე,
> და **Figma 0%-ს იჭერს**. w2w ზუსტად ასე მუშაობს. ე.ი. მისი ხელმისაწვდომობის შემთხვევაშიც გარე
> checkout გვერჩია.

### რა უნდა გავაკეთოთ

- [ ] 👤 Flitt merchant portal → Legibly-ის ცალკე product / `order_id` prefix (w2w-სგან გასამიჯნად)
- [ ] 👤 `server_callback_url` რეგისტრაცია: `https://api.legibly.design/api/webhooks/flitt`
- [ ] 🤖 env: `FLITT_MERCHANT_ID`, `FLITT_SECRET_KEY`, `FLITT_BASE_URL=https://pay.flitt.com`
- [ ] 🤖 w2w-დან გადმოტანა: `flittService` · webhook handler (signature + dedup) · `License` model · admin endpoint-ები
- [ ] 🤖 Terms გვერდი: refund policy + **tax-exclusive disclaimer** + statutory rights clause
- [ ] 👤 chargeback rate-ის მონიტორინგი — **target <0.5%** (ინდუსტრიის სტანდარტი; ამის ზემოთ acquirer-ს freeze-ის უფლება აქვს)

> 💡 **Chargeback-ის ეკონომიკა:** დავა გამყიდველს უჯდება დაბრუნებულ თანხას **პლუს ჯარიმას** ($15–30
> ინდუსტრიაში). $12-იან პროდუქტზე ეს ნიშნავს, რომ **refund-ის გაცემა ყოველთვის იაფია, ვიდრე უარი**
> ($12 vs ~$42 + rate-ის გაფუჭება). ამიტომ: policy იყოს "ავტომატური დაბრუნება არ ხდება — მოგვწერეთ და
> მოვაგვარებთ", პრაქტიკაში კი ვინც მოითხოვს, დაუბრუნდეს.

---

## 5. Identity & license binding — **Figma OAuth, რეგისტრაციის გარეშე** ([D21](./approach.md))

**რეგისტრაცია/პაროლი/email-verification არ არსებობს.** `figmaUserId` არის primary key;
email მხოლოდ checkout-იდან მოდის, receipt-ისთვის. ეს w2w-ის დადასტურებული მოდელია.

```
Plugin → Figma OAuth (scope: current_user:read) → API ჭრის HMAC ტოკენს
       → ტოკენი ინახება figma.clientStorage-ში
       → POST /checkout/create { figmaUserId } → hosted checkout ბრაუზერში
       → 3DS → approved → server callback → webhook (signature + dedup)
       → License.upsert { plan: pro, cycleEndsAt }
Plugin polls /license/me → UI განახლდა
```

> ⚠️ **რატომ OAuth და არა შიშველი `figma.currentUser.id`:** w2w-მ ზუსტად ეს დაუცველობა უკვე გაიარა.
> [`licenseClient.ts:44-52`](../../Web2Wireframe/packages/figma-plugin/src/ui/shared/licenseClient.ts) —
> ძველი `/api/auth/init` ტოკენს ჭრიდა ნებისმიერი body-ში მითითებული `figmaUserId`-ისთვის, **მტკიცებულების გარეშე
> რომ caller ამ account-ს ფლობს**, ე.ი. ნებისმიერს შეეძლო სხვისი Pro-ს იმიტაცია. გასწორდა Figma OAuth-ით
> ([`figmaAuth.ts:137-144`](../../Web2Wireframe/packages/api/src/routes/website/figmaAuth.ts), `scope=current_user:read`).
>
> Legibly-ის fix **ლოკალურია** — იმიტაცია დღეს მხოლოდ დაკარგული შემოსავალია, ჩვენს ხარჯს არ ზრდის.
> **მაგრამ** §6-ის hosted alt-text quota-ს ჩართვისთანავე იმიტაცია = **ჩვენი Anthropic ბილინგი**.
> ⇒ OAuth თავიდანვე ჩავდოთ, არა მოგვიანებით.

**რა უნდა გავაკეთოთ:**
- [ ] Figma app registration → `client_id` / `client_secret`
- [ ] redirect URI (⇒ დომენი, §1)
- [ ] scope: **მხოლოდ** `current_user:read` — file scope არ გვჭირდება, plugin API თვითონ ხატავს
- [ ] plugin-ის manifest-ში `allowedDomains` += ჩვენი API დომენი

**ღირებულება:** $0.

---

## 6. Anthropic API key — ❌ **აღარ გვჭირდება** (D22)

**დღევანდელი მდგომარეობა:** **AI საერთოდ არ არის plugin-ში.** BYOK (მომხმარებლის `sk-ant-…` key
Settings-ში) **წაშლილია** — იხ. [D22](./approach.md). Manifest ამბობს `"allowedDomains": ["none"]`,
ე.ი. plugin **ვერცერთ ქსელურ მოთხოვნას ვერ გააკეთებს**.

SC 1.1.1 უცვლელად რჩება: presence check დეტერმინისტულია, ტექსტი ხელით იწერება ან decorative-ად ინიშნება.

### რატომ წაიშალა
- **Conversion:** დიზაინერების უმრავლესობას Anthropic key არ აქვს — ფუნქცია პრაქტიკულად მკვდარი იყო.
- **Trust:** `allowedDomains: ["none"]` ისეთი privacy-განაცხადია, რომელსაც ნებისმიერი მომხმარებელი
  manifest-ში თავად ამოწმებს. "თითქმის არაფერი გადის" → "**არაფერი გადის**".
- **Figma review:** ნულოვანი egress = ერთი კითხვა ნაკლები.

### ⛔ რაც შემდეგშიც შეუძლებელი დარჩება
ჩვენი key **ვერასდროს ჩაიდება plugin-ის bundle-ში** — Figma plugin-ის კოდი მომხმარებლის მანქანაზე
იწერება და მთლიანად წაკითხვადია. **ჩვენი key = სავალდებულოდ server-side proxy.**

### თუ ოდესმე დავაბრუნებთ — მხოლოდ ასე
**Pay-as-you-go, ჩვენი key-ით, proxy-ს გავლით.** მაშინ დაგვჭირდება: backend (§2) + Figma OAuth (§5,
quota-ს მიბმა) + `allowedDomains` += ჩვენი API დომენი. **BYOK-ის კოდი ამაში არაფერში გამოდგებოდა** —
ის სხვა plumbing-ია. წაშლილი `ai-client.ts` (prompt, strict tool schema, ვალიდატორი) git-ის
ისტორიაშია და საჭიროებისას მთლიანად აღდგება.

- [ ] *(მხოლოდ თუ დავაბრუნებთ)* cost per alt-text call (Haiku vs Sonnet vision) → quota-ს ეკონომიკა

---

## 7. რაც **არ** გვჭირდება (განზრახ)

| | რატომ არა |
|---|-----------|
| Analytics SDK plugin-ში | `allowedDomains`-ის გაფართოება trust-ს აზიანებს. Figma Community-ს თავისი stats აქვს. |
| Error tracking (Sentry) plugin-ში | იგივე მიზეზი. website-ზე — შეიძლება. |
| CDN | website static-ია; hosting-ს თავისი აქვს. |
| ~~Database (v1)~~ | ⚠️ **შეიცვალა (D21):** license state ვერ იქნება მხოლოდ provider-ის API-ში → **გვჭირდება მინიმალური store** (`figmaUserId` → plan/cycle/usage). free tier ჰყოფნის. settings კვლავ → `figma.clientStorage`. |

---

## 8. Open questions

| # | კითხვა | ბლოკავს |
|---|--------|---------|
| **Q10** | **როდის დავუბრუნდეთ Flitt-ს subscription-ზე?** მათი პირობა ზეპირად იყო — *"გაყიდვები დაფიქსირდეს"*; **რიცხვი არ დაუსახელებიათ.** `$1000` ჩვენი საკუთარი trigger-ია საუბრის გასახსნელად. ⇒ ერთჯერადით ვიწყებთ, გაყიდვებს ვაფიქსირებთ, მერე ვბრუნდებით. | §4 |
| **Q6** | F20-ის paywall timing ძალაშია? (fix დღეს **უფასოა beta-ში** — ასე წერია Plans modal-ში) | plugin-ის copy |
| ~~Q1~~ | ✅ **დახურულია (D23): Flitt**, ერთჯერადი, წლიური-first. | — |
| ~~Q2~~ | ✅ **დახურულია:** `legibly.design` შეძენილია (2026-08-01). | — |
| ~~Q3~~ | ✅ **დახურულია (D21):** serverless ჰყოფნის — Legibly-ს Chromium არ სჭირდება. | — |
| ~~Q4~~ | ✅ **დახურულია (D23):** VAT ჩვენზე რჩება — მიღებული რისკი, ~$30K EU revenue trigger-ით. | — |
| ~~Q5~~ | ✅ **მოხსნილია (D22):** AI alt-text წაშლილია, Anthropic quota-ს ეკონომიკა აღარ დგას. | — |
| ~~Q9~~ | ✅ **დახურულია (D23):** წლიური კი — და მთავარიც. break-even ≈ 10.3 თვე. | — |
