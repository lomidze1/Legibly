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

**კრიტიკული თანმიმდევრობა:** დომენი → hosting → email → **vendor-ის ემპირიული შემოწმება** → გადახდები.
დომენის გარეშე Resend-ის domain verification შეუძლებელია, OAuth redirect URI-ს ვერ დაარეგისტრირებ,
და plugin-ის footer-ის ხუთივე ლინკი 404-ია.

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
(license validation, Claude proxy, Flitt webhook).

**რა უნდა გავაკეთოთ:**
- [ ] `website/` deploy — Static Site ან Web Service
- [ ] custom domain + auto-TLS
- [ ] env vars: `RESEND_API_KEY`, (მოგვიანებით) გადახდის vendor-ის key-ები

**ღირებულება:** Static Site $0; Web Service $7/თვე (free tier იძინებს — webhook-ისთვის გამოუსადეგარია).

> ✅ **გადაწყვეტილია ([D21](./approach.md)): serverless ჰყოფნის.** w2w-ს Render **Standard $25/თვე**
> სჭირდება მხოლოდ იმიტომ, რომ URL/HTML import ნამდვილ **Chromium**-ს უშვებს სერვერზე (~1GB RAM).
> Legibly-ის API = license CRUD + checkout + webhook — მილიწამების request-ები, მძიმე პროცესის გარეშე.
> ე.ი. **long-running service და $25 tier არ გვჭირდება**; store = managed Postgres/KV free tier.
> კონკრეტული ვენდორი (Vercel functions vs სხვა) — billing vendor-ის არჩევის შემდეგ, ერთად.

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

## 4. გადახდები — ✅ **Flitt, one-time, წლიური-first** ([D23](./approach.md))

> **გადაწყვეტილია 2026-08-02.** ქვემოთა შედარება ისტორიისთვის რჩება — მან მიგვიყვანა აქამდე.
> **არჩეული:** Flitt · `$120/წელი` (მთავარი) + `$12/30 დღე` · auto-renew არ არსებობს ·
> subscription მაშინ, როცა Flitt ჩართავს (კოდი w2w-ში უკვე დაწერილია და parked-ია).
> **რატომ:** 10 გამომწერზე Flitt = **4%**, Dodo = **34%** (ფიქსირებული payout ხარჯის გამო);
> ფული 1 დღეში და არა 50-ში; KYC-ის რისკი ნული; launch-ის deadline 30 აგვისტო.
> **ფასი, რასაც ვიხდით:** VAT ჩვენზე რჩება — w2w-ის მოდელით (tax-exclusive + disclaimer + ~$30K EU trigger).
> **Dodo = დოკუმენტირებული fallback**, [`spike/dodo`](../spike/dodo/README.md) მტკიცებულებით.

---

### 📜 ისტორიული შედარება (D21 → D23)

**გამყიდველი:** ქართველი **ინდ. მეწარმე**, პირადი სახელით/ID-ით (user-confirmed, 2026-07-29).
ეს ერთი ფაქტი განსაზღვრავს ყველაფერს ქვემოთ.

### ❌ Figma Payments API (`figma.payments`) — **გამორიცხულია**
Figma Community-ზე paid resource მოითხოვს **აქტიურ Stripe account-ს**
([Figma Help](https://help.figma.com/hc/en-us/articles/360042293394-Publish-plugins-to-the-Figma-Community)),
Stripe კი საქართველოს merchant country-ად **არ უჭერს მხარს** (46 supported country, GEL არ არსებობს).
*(გაიხსნებოდა მხოლოდ EE/UK/US entity-ით — არ არის დღევანდელი გეგმა.)*

> ℹ️ **და ეს დანაკარგი არ არის.** Figma-ს [review guidelines](https://help.figma.com/hc/en-us/articles/360039958914-Plugin-and-widget-review-guidelines)
> უშვებს გარე მონეტიზაციას; ასეთი listing რჩება **Free**-დ, ფასი ცხოვრობს plugin-ის UI-სა და საიტზე,
> და **Figma 0% იჭერს**. w2w ზუსტად ასე მუშაობს. ე.ი. გარე checkout ისედაც გვერჩია.

### ❌ LemonSqueezy — **გამორიცხულია**
Stripe-ის შვილობილი → იგივე GE-ის ბლოკი.

### ⏳ სამი დარჩენილი კანდიდატი

| | **Flitt** | **Paddle** | **Dodo Payments** |
|---|---|---|---|
| GE-დან გაყიდვა | ✅ მუშაობს (w2w prod) | ⚠️ **დაუდასტურებელი** | ✅ **დადასტურებული** |
| მტკიცებულება | რეალური ტრანზაქციები | სანქციების blocklist-ში GE არ არის, მაგრამ "supported" არსად არ წერია | [merchant-eligibility სია](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories) **#63 Georgia** (Gambia↔Germany); *"payouts supported only in the countries listed above"* |
| ინდ. მეწარმე | ✅ | ✅ sole trader — KYB არ სჭირდება, მხოლოდ პირადი ID | ✅ unregistered business |
| **Recurring** | ❌ **უარი** — Flitt არ რთავს, სანამ გაყიდვები არ დაფიქსირდება (user, 2026-07-30) | ✅ | ✅ + dunning |
| MoR / VAT | ❌ PSP — VAT ჩვენზე | ✅ | ✅ |
| Payout | ქართული acquiring | wire / Payoneer, min $100, თვეში 1× | USD/GBP/EUR wallet; **$5** თუ payout < $1000 **+ $25 USD SWIFT (non-US ბიზნესი)** |
| Fee — $12/თვე | 4% = $0.48 | 5%+$0.50 = **9.2%** | **5.5%+$0.40 = 8.8%**¹ |
| Fee — $120/წელი | 4% | 5.4% | 5.8% |
| სიმწიფე | w2w-ში გამოცდილი | 2012-დან | ახალგაზრდა → **counterparty risk** |

¹ ✏️ **გასწორდა 2026-08-02:** ადრე ეწერა 7.3% — ეს **US domestic**-ის განაკვეთია (4%+$0.40).
საერთაშორისო ბარათს **+1.5%** ემატება, ე.ი. ჩვენი რეალური განაკვეთი **5.5% + $0.40**-ია.
სხვა ტარიფები: refund **$1**, chargeback/dispute **$30**, FX 2–4% (მყიდველს ეკისრება).

> 🔴 **ფიქსირებული payout ხარჯი პატარა მოცულობას ჭამს — ეს Dodo-ს მთავარი ეკონომიკური რისკია.**
> $5 (payout < $1000) **+** $25 (USD SWIFT, non-US) = **$30/თვე გაყიდვებისგან დამოუკიდებლად**:
>
> | გამომწერი | შემოსავალი | tx fee | payout | შენთან | **ჯამური ხარჯი** |
> |---|---|---|---|---|---|
> | 10 | $120 | −$10.60 | −$30 | $79 | **34%** 🔴 |
> | 25 | $300 | −$26.50 | −$30 | $243 | **19%** |
> | 50 | $600 | −$53 | −$30 | $517 | **14%** |
> | 100 | $1,200 | −$106 | −$25 | $1,069 | **11%** |
>
> **ორი შესაძლო გამოსავალი (support-ს ეკითხება):** (ა) payout-ის დაგროვება და **კვარტალური** გატანა
> → $30/თვე → $10/თვე; (ბ) **Payoneer**-ის მიმღები რეკვიზიტები ადგილობრივი US ანგარიშია (ACH) —
> შესაძლოა $25 SWIFT საერთოდ არ ჩაირთოს.

> 💡 **ფიქსირებული საკომისიო არის მთავარი პრობლემა, არა პროცენტი.** $0.50 თავისთავად 4.2%-ია $12-ზე.
>
> ⚠️ **შესწორება (2026-07-31):** აქ ადრე ეწერა "წლიური გეგმა fee-ს ორჯერ ამცირებს, ე.ი. სჯობს" — **მცდარია**.
> Dodo-ს განაკვეთით: ყოველთვიური $12 → წმინდა $11.12/თვე, ე.ი. სრული წელი = **$133.44**;
> წლიური $120 → წმინდა **$114.80**. საკომისიოს **პროცენტი** ეცემა (7.3%→4.3%), მაგრამ ფასდაკლებამ
> იმაზე მეტი წაიღო, ვიდრე დაზოგა. წლიურის რეალური არგუმენტი **churn-ია**:
> **break-even = $114.80 ÷ $11.12 ≈ 10.3 თვე.** თუ საშუალო გამომწერი 10 თვეზე ნაკლებს რჩება
> (indie $12-იან პროდუქტზე თითქმის ყოველთვის ასეა) — წლიური იგებს; + ფული ახლავე შემოდის
> და ბარათის უარის 12 შანსის ნაცვლად 1-ია.

**შემდეგი ნაბიჯი — ემპირიული, არა დოკუმენტაციური:**
- [ ] Paddle sign-up (უფასო, ვალდებულების გარეშე) → onboarding-ში საქართველო არჩევადია country-ს ველში?
- [x] Dodo sign-up → **საქართველო არჩევადია** country-ს dropdown-ში (🇬🇪, 2026-07-31). ⚠️ ეს ჯერ არ არის საბოლოო — **ნამდვილი დადასტურება KYC-ის გავლაა.**
- [ ] Dodo — საერთაშორისო-ბარათის რეალური განაკვეთი
- [ ] ფასის სტრუქტურა: $12/თვე vs $120/წელი vs ორივე

#### Dodo — MSA-ის ის პუნქტები, რაც სასწორზე უნდა იდოს

| | |
|---|---|
| 💰 Payout | *"on or before the 20th of the following month"* (§9.2) — **20-დან 50 დღემდე ლაგი.** Flitt-ის ~1 დღე არ არის; ეს დაშვება გასწორდა. |
| 🛡 Reserve | დისკრეციული %, *"decided as per the risk profile of the Seller"* (§9.3) |
| ⚡ Chargeback | **მინიმუმ $30** თითოზე (§9.7) — $12-იან პროდუქტზე ≈ **2.5 თვის შემოსავალი** |
| ⛔ Termination | *"chargeback/cancellation/refund rate of more than 0.5% of total orders monthly"* (§18.3) |
| ↩️ Refund | ჩართულია 7 დღე შეძენიდან (§9.6) · 🔗 ფართო set-off უფლება (§10.2) |

- ❓ **დასაზუსტებელი:** §18.3-ის "cancellation" ნიშნავს order cancellation-ს თუ **subscription churn-ს**? თუ მეორეა, 0.5% ვერცერთ subscription-ბიზნესს ვერ დაიტევს (ნორმა 3–7%). წერილობითი პასუხი გვინდა **გაყიდვების დაწყებამდე.**

#### Merchant Acceptance Policy — შემოწმებული (2026-07-31)
- ✅ supported: *"SaaS & AI products · Digital goods · **Templates, Plugins & Apps**"* — პირდაპირ ჩვენზეა
- ⛔ **"Marketplaces/resale" აკრძალული კატეგორიაა (#29 / 32)** — რეგისტრაციისას category უნდა იყოს **SaaS/AI or Digital products**
- ⛔ *"selling custom design, development, coaching, freelancing or consulting services via digital platforms isn't allowed"* → **glinc.io პროდუქტ-კომპანიად უნდა კითხულობდეს, არა სტუდიად/აგენტობად.** შემოწმებულია — ასეა.
- ⚠️ glinc.io-ზე **ფასები/terms/refund policy არ წერია** — MoR-ის review ამას ეძებს, verification-ამდე დასამატებელია
- ✅ restricted countries: ბელარუსი, კუბა, ჰაიტი, ირანი, ერაყი, ჩრდ. კვიპროსი, ჩრდ. კორეა, პაკისტანი, რუსეთი, სამხრ. სუდანი, სუდანი, სირია, ვენესუელა, იემენი — **საქართველო არ არის**

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
| ~~Q1~~ | ✅ **დახურულია (D23): Flitt**, one-time, წლიური-first. Dodo = fallback. | — |
| **Q10** | **როდის დავუბრუნდეთ Flitt-ს subscription-ზე?** Flitt-ის ერთადერთი პირობა იყო ზეპირი — *"გაყიდვები დაფიქსირდეს"*. **რიცხვი მათ არ დაუსახელებიათ.** `$1000` არის ჩვენი საკუთარი trigger, საიდანაც საუბარს აზრი აქვს — არა Flitt-ის ზღვარი. ⇒ ვაფიქსირებთ გაყიდვებს one-time-ით, მერე ვბრუნდებით. | §4 |
| Q2 | დომენი: `.app` თუ `.com` acquisition? | §1 → ყველაფერი |
| ~~Q3~~ | ✅ **დახურულია (D21):** serverless ჰყოფნის — Legibly-ს Chromium არ სჭირდება, ე.ი. w2w-ის $25 Render Standard არარელევანტურია. | — |
| ~~Q4~~ | ✅ **გადაფასდა (D21):** VAT არ არის Flitt-ის დისკვალიფიკაცია — w2w გლობალურად ყიდის და VAT-ს შეგნებულად არ იკრებს, ზღვრით (~$30K EU revenue). ეს **მიღებული რისკია**, არა ბლოკერი. | — |
| Q7 | Paddle onboarding-ში საქართველო არჩევადია? (ემპირიული ტესტი) | §4 → Q1 |
| Q8 | Dodo-ს **საერთაშორისო**-ბარათის რეალური განაკვეთი (public pricing მხოლოდ US domestic-ს აჩვენებს) | §4 → Q1 |
| ~~Q9~~ | ✅ **დახურულია (D23): კი — და მთავარიც.** `$120/წელი` გამოკვეთილი, `$12/30 დღე` გვერდით. break-even ≈ 10.3 თვე. | — |
| Q5 | Pro-ს AI quota-ს ეკონომიკა (cost/call) | §6 |
| Q6 | F20-ის paywall timing ძალაშია? (fix უფასოა beta-ში) | plugin-ის copy — ახლა ასე წერია Plans modal-ში |
