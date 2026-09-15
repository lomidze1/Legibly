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
            ├──✅ Resend domain verification ──✅ waitlist form მუშაობს
            └──✅ Figma OAuth redirect URI

✅ backend-ის კოდი (Flitt + OAuth + License + plugin + Terms/Privacy)
   └──✅ deploy: api.legibly.design · Neon Postgres · მიგრაციები 001–004 · env vars
      └──🔴 Flitt merchant-ის აქტივაცია (დღეს Test mode)  ← 👤, ტელეფონით
         └──> paywall ჩართვა (F20) ──> Pro რეალურად იყიდება
      └──> /api/judge (D24, cutoff 1 სექტ.) — launch-ს არ ბლოკავს
```

**ერთი წინადადებით (განახლდა 2026-08-13):** deploy-ის რგოლი **დაიხურა** — `api.legibly.design`
ცოცხალია, Figma OAuth ბოლომდე გატესტილია, Flitt რეალურ checkout-ს ქმნის (`12.00 USD`,
merchant `legibly.design`). დარჩა **ერთადერთი ბლოკერი: Flitt-ის merchant ჯერ Test mode-შია** —
აქტივაცია ტელეფონით ხდება (portal-ში ღილაკი არაა). სანამ ეს არ მოხდება, გადახდა რეალურ
ბარათზე ჩავარდება; ყველა დანარჩენი რგოლი მუშაობს.

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
- [x] 👤 **Email forwarding ✅** (2026-08-12, **მიგრირდა Cloudflare-ზე**) — `hello@` · `support@` ·
      `billing@` → პირად Gmail-ზე, **Cloudflare Email Routing**-ით. MX = `route1/2/3.mx.cloudflare.net`.
      Catch-all განზრახ `Disabled`. საიტზე მხოლოდ `hello@` ჩანს; `billing@` Terms-სა და ქვითრებისთვისაა
      - ✅ **გაგზავნაც მოგვარდა (2026-08-13)** — Gmail → *Send mail as*, სამივე მისამართი
        (`hello@` · `billing@` · `support@`) **Resend-ის SMTP-ით** (`smtp.resend.com:465`,
        user `resend`). Cloudflare Email Routing გაგზავნას **ვერ ახერხებს** — ის მხოლოდ
        forwarding-ია; ამიტომ შემოსვლა Cloudflare-ზეა, გასვლა Resend-ზე.
        ⚠️ key **`legibly` workspace-იდან** უნდა იყოს — w2w-ის key ამ დომენს არ ხედავს.
        `Reply from the same address` ჩართულია, თორემ პასუხი `@gmail.com`-იდან წავიდოდა
      - ✅ Gmail-ის labels: `Legibly/Billing` · `Legibly/Hey` · `Legibly/Support`, სამი ფილტრით
        (`To:` → label + `Never send it to Spam`). `Never send it to Spam` **სავალდებულოა** —
        დავის შეტყობინებას ბანკის ვადა აქვს და Spam-ში ჩავარდნა ავტომატურ წაგებას ნიშნავს
      - ❌ **ძველი Namecheap Redirect Email მიტოვებულია.** მიზეზი: ის სერვისია, არა უბრალოდ MX —
        მუშაობს მხოლოდ `Mail Settings = Email Forwarding` რეჟიმში, რომელიც MX-ს ბოქლომით კეტავს.
        `Custom MX`-ზე გადასვლა forwarding-ს **თიშავს** (ვცადეთ, ჩავარდა). ე.ი. Namecheap-ზე
        root-ის forwarding და `send`-ის MX ერთდროულად შეუძლებელი იყო — ეს იყო Resend-ის ბლოკერი
- [x] 👤 **DNS ✅** (2026-08-12) — nameservers `Namecheap BasicDNS` → **Cloudflare**
      (`kate.ns` · `rajeev.ns`). `A` `@` → `216.198.79.1`, `CNAME` `www` →
      `6c118a1a637b104d.vercel-dns-017.com` — ორივე **`DNS only` (proxy OFF)**, თორემ Vercel-ის
      TLS-ის ავტომატური განახლება ჩაიშლება. დომენის რეგისტრაცია Namecheap-ზე დარჩა
- [x] 👤 **Resend-ის DNS ✅** (2026-08-12) — `TXT resend._domainkey` (DKIM) ·
      `TXT send` + **`MX send` → `feedback-smtp.eu-west-1.amazonses.com` (pri 10)**.
      root-ის SPF ახლა Cloudflare-ისაა (`include:_spf.mx.cloudflare.net`), დუბლიკატის გარეშე
- [ ] 🤖 DMARC (`_dmarc` → `v=DMARC1; p=none;`) — არასავალდებულო, Cloudflare გვირჩევს
- [x] 🤖 **Trademark clearance (Track F)** — ✅ **შესრულდა 2026-08-12** →
      [`research/trademark-legibly.md`](./research/trademark-legibly.md), გადაწყვეტილება
      [D25](./approach.md). `.app`-ის მფლობელს ნიშანი **არ შეუტანია** (TMview: "legibly" = 0 შედეგი
      მსოფლიოში) ⇒ **rename იძულებითი არაა, სახელი რჩება.** მაგრამ ჩვენც ვერ დავირეგისტრირებთ:
      🇪🇺 `Logibly` EUTM `019231527` (კლ. 9+42, რეგისტრირებული) · 🇺🇸 `LEGIBLE PLATFORM` (კლ. 42,
      published for opposition). ⚠️ ეს **attorney-ს clearance opinion არაა**
- [ ] 🤖 **M1 — "Legibly for Figma"** ყველგან: Figma store title, საიტის H1, OG tags, checkout descriptor
- [ ] 🤖 **M5 — footer-ის disclaimer:** "Legibly is a Figma plugin for accessibility. Not affiliated
      with any other product named Legibly."
- [ ] 🤖 **M6 — `hello@legibly.design`** plugin-ის UI-შიც და ქვითარზეც (მათი `hello@legibly.com`
      mail-misdirection-ის ვექტორია)
- [ ] 👤 **M7 — TMview-ის გადამოწმება** (`contains: legibly`): publish-ის დღეს, +90 დღეზე, და
      ნებისმიერი ფასიანი მარკეტინგის წინ. **T1 trigger** = კლ. 9/42-ში განაცხადი გამოჩნდა → Conformly
- [ ] ❌ **LEGIBLY-ის trademark რეგისტრაცია — გეგმიდან ამოღებულია** (D25). უარი ბაჟს ჯდება და
      ჩანაწერს ტოვებს ჩვენს წინააღმდეგ; ფული clearance opinion-ს მოხმარდეს, როცა შემოსავალი გაამართლებს

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

- [x] 🤖 **Terms of Service** ✅ (2026-08-03) — `/terms`: ერთჯერადი გადახდა და დღეების სტეკინგი ·
      **tax-exclusive disclaimer** (D23) · refund policy (`billing@`) · EU-ს 14-დღიანი withdrawal +
      statutory-rights clause · პასუხისმგებლობის ზღვარი · "არაა audit/certification/legal advice".
      Footer-სა და sitemap-ში ჩასმულია.
      ✅ **გამყიდველის იდენტობა დაემატა 2026-08-13** — იურიდიული სახელი, ფორმა და მისამართი
      `site.seller`-ში, ერთი წყაროდან terms-სა და privacy-ზე (EU consumer-information +
      GDPR Art. 13(1)(a) + Flitt-ის აქტივაციის მოთხოვნა)
- [x] 🤖 Privacy policy — ✅ **ხელახლა დაიწერა 2026-08-12 (Phase 6).** D22-ის *"the plugin makes
      no network requests of any kind"* **აღარაა სიმართლე** — paywall-მა manifest შეცვალა.
      ახლა წერია: ქსელი მხოლოდ ლიცენზიისთვის · ახალი manifest-ის ციტატა · რას ვინახავთ Pro-ს
      ყიდვისას (`figmaUserId`, email, ციკლის თარიღები, webhook-ის ჩანაწერი) · rate-limit-ის
      IP-counter-ები · სამი processor (Vercel, Flitt, Resend) და "სხვა არავინ"
- [x] 🤖 **`/checkout/success` და `/checkout/cancel`** ✅ (2026-08-12) — API ამათზე ამისამართებს
      გადახდის შემდეგ (backend-spec §7.7). მათ გარეშე წარმატებული ყიდვის ბოლო ნაბიჯი **404 იყო**.
      ორივე `noindex`

---

## 3. ✅ Email / waitlist — მუშაობს (2026-08-12)

[`website/src/app/api/waitlist/route.ts`](../website/src/app/api/waitlist/route.ts) ცოცხალ დომენზე
გადამოწმებულია: სწორი მისამართი → `{"ok":true}` 200 · არასწორი → 400 · honeypot → 200 და არ ინახება.

- [x] 👤 **Resend account + domain verification ✅** (2026-08-12) — `legibly.design`, region
      Ireland (`eu-west-1`), status `Verified`
- [x] 👤 **env vars Vercel-ზე ✅** (Production + Preview): `RESEND_API_KEY` · `RESEND_AUDIENCE_ID`
      (audience `Legibly waitlist`, არა `General`) · `WAITLIST_FROM` =
      `Legibly waitlist <noreply@legibly.design>`
      - ⚠️ **key-ს `Full access` სჭირდება, არა `Sending access`.** `Sending access` მხოლოდ
        გაგზავნას უშვებს — `contacts.create` იბლოკება და signup audience-ში **არ ჩაიწერება.**
        სიმპტომი: წერილი მოდის, მაგრამ ტექსტში წერია `NOT STORED` და სია ცარიელია
        ([route.ts:83](../website/src/app/api/waitlist/route.ts:83)). key-ის უფლება Resend-ში
        ადგილზე რედაქტირდება — ახალი key და redeploy არ სჭირდება
      - Development გარემო განზრახ არაა — Vercel `Sensitive` ცვლადს იქ არ უშვებს (`vercel env pull`)
      - ⚠️ env-ის ცვლილება **მხოლოდ ახალ deployment-ში** ჩაიტვირთება — Redeploy სავალდებულოა
- [x] 🤖 `site.email` → **`hello@legibly.design`** ✅ ცოცხალია Cloudflare Email Routing-ით (§1)
- [ ] 🤖 **double opt-in — გადადებულია launch-ის დაგზავნამდე** (user-approved 2026-08-03).
      GDPR მას *არ* ავალდებულებს — საჭიროა დამტკიცებადი consent, რაც ერთჯერადი opt-in-ითაც
      მიიღწევა. სამაგიეროდ ✅ **ფორმას დაემატა consent-ის ხაზი გაგზავნამდე** (`WaitlistForm.tsx`):
      რას იღებ, რას ვინახავთ, privacy-ს ლინკი.
      ⚠️ **დაგზავნამდე სავალდებულო:** მისამართების ვალიდაცია — ახალი დომენიდან პირველი bulk-send
      bounce-ებით sender reputation-ს აზიანებს ყველასთვის
- [x] 🤖 copy-ს შეუსაბამობა გასწორდა (2026-08-03): consent ჰპირდებოდა "short notes when new
      checks ship"-ს, privacy policy კი **ერთ** მიზანს აცხადებს. ყველგან დარჩა ვიწრო, სწორი
      ვერსია — "one email at launch, and nothing else"

---

## 4. ✅ Hosting / deploy — ცოცხალია (2026-08-03)

- [x] 👤 **Vercel** (Hobby, უფასო) — `lomidze1/Legibly`, Root Directory `website`, production branch `main`
- [x] 👤 deploy + custom domain + auto-TLS — `legibly.design` = Production,
      `www` → 308 → apex. Let's Encrypt სერტიფიკატი გამოწერილია (2026-08-03 → 2026-11-01)
- [x] 🤖 production-ის შემოწმება: `/` `/docs` `/subscribe` `/contact` `/feedback` `/privacy`
      `/sitemap.xml` = 200 · `/pricing` = 307 → `/#pricing` · waitlist = 503 (მოსალოდნელი, key აკლია)
- [x] 🤖 OG image + robots ცოცხალ დომენზე ✅ (2026-08-03): `/opengraph-image` = 200,
      `image/png`, 1200×630, 56 KB · `robots.txt` sitemap-ს სწორად უთითებს · og/twitter
      მეტა-ტეგები სრულია. **გასწორდა:** მთავარ გვერდს canonical არ ჰქონდა — დაემატა `layout.tsx`-ში

---

## 4.1 ✅ API deploy — ცოცხალია (2026-08-13)

`api.legibly.design` ის რგოლია, რომელსაც ეს ფაილი თვეზე მეტი ხნის განმავლობაში 🔴-ით ნიშნავდა.

- [x] 👤 **Vercel-ის მე-2 პროექტი** `legibly-api` — Root Directory `api`, region `fra1`
- [x] 👤 **DNS ✅** — `CNAME api` → `18456cdd313afe92.vercel-dns-017.com`, **`DNS only` (proxy OFF)**.
      Vercel-მა თვითონ ამოიცნო Cloudflare და `Proxy: Disabled` ცხრილშივე მოგვცა. proxy ჩართული
      Vercel-ს TLS-ის გამოწერას **უკრძალავს** — დომენი სამუდამოდ `Invalid Configuration`-ში დარჩებოდა.
      MX-ს ხელი არ შევხებივართ. Let's Encrypt სერტიფიკატი 50 წამში გამოიწერა (→ 2026-11-10)
- [x] 👤 **Neon Postgres + მიგრაციები 001–004 ✅** — გადამოწმებულია `/api/admin/stats`-ით, რომელიც
      ერთი მოთხოვნით სამ ცხრილს ეხება (`licenses` · `usage_events` · `license_audit`).
      `200` + `success:true` ⇒ ოთხივე მიგრაცია გაშვებულია; ერთის დაკლებაზე `relation does not exist` იქნებოდა
- [x] 👤 **env vars ✅** — `AUTH_SECRET` · `ADMIN_TOKEN` · `DATABASE_*` · `FIGMA_*` · `FLITT_*` ·
      `API_PUBLIC_URL` · `WEBSITE_BASE_URL` (Production + Preview).
      ⚠️ env-ის ცვლილება მხოლოდ **ახალ deployment-ში** ჩაიტვირთება — Redeploy სავალდებულოა
- [x] 👤 **Figma app registration ✅** — [figma.com/developers/apps](https://www.figma.com/developers/apps),
      redirect URI `https://api.legibly.design/api/auth/figma/callback`, scope **მხოლოდ**
      `current_user:read`. ცოცხლად გატესტილია: „Connected to Figma" ⇒ `client_secret`-ით კოდის
      გაცვლა, user-ის წამოღება, `licenses`-ში ჩაწერა და ტოკენის დაპარკვა — ოთხივე მუშაობს

### 4.2 🟠 ორი გადადებული ხარვეზი

- [ ] 🤖 **`FLITT_WEBHOOK_IPS` ცარიელია, allowlist გამორთულია** (`FLITT_IP_ALLOWLIST_ENABLED=false`).
      `.env.example`-ის IP-ები დოკუმენტაციიდანაა და შეიძლება მოძველებული იყოს; არასწორ IP-ზე webhook
      **ჩუმად** უარიყოფა — Flitt-ს `200 received` უბრუნდება, ლიცენზია კი არ გაიცემა
      ([`flittIpAllowlist.ts:36`](../api/src/middleware/flittIpAllowlist.ts:36)). ე.ი. მყიდველი
      გადაიხდიდა და ვერაფერს მიიღებდა. SHA1 ხელმოწერა მაინც მუშაობს — ის არის ნამდვილი დაცვა.
      **გეგმა:** პირველი რეალური გადახდის შემდეგ Vercel-ის ლოგებიდან ავიღოთ ფაქტობრივი IP და ჩავრთოთ
- [x] 🤖 **admin panel-ის routing ✅ გასწორდა (2026-08-13)** — `/api/admin/*`-ის catch-all სეგმენტი
      Vercel-ზე `req.query.path`-ში **არ ჩნდებოდა**, `segmentsOf()` ცარიელს აბრუნებდა და router
      ყოველთვის `panel`-ზე ვარდებოდა — ე.ი. პანელი საკუთარ თავს აბრუნებდა მონაცემების ნაცვლად.
      მტკიცებულება იყო: `/api/admin/stats` → `200` panel HTML, ხოლო `?path=stats` → `401` JSON.
      ერთსეგმენტიანი dynamic route (`/api/checkout/success`) სწორად მუშაობდა ⇒ ხარვეზი
      კონკრეტულად `[...path]`-ში იყო. **გამოსწორება:** query-ს ცარიელობისას `segmentsOf()` ახლა
      `req.url`-იდან კითხულობს მისამართს ([`router.ts`](../api/src/routes/admin/router.ts)).
      query კვლავ პრიორიტეტულია — პლატფორმა თუ ოდესმე გამოასწორებს, ჩვენი fallback ჩუმად ჩამოსცილდება

---

## 5. 🔴 გადახდები — **Flitt** (D23)

> გადაწყვეტილი: **Flitt · ერთჯერადი გადახდა · `$12/30 დღე` (მთავარი, D28) + `$120/წელი`.**
> სრული დასაბუთება → [`launch-stack.md §4`](./launch-stack.md). ვენდორის კითხვა **დახურულია** — არ გავხსნათ.

**ნაბიჯ-ნაბიჯ:**

- [x] ~~ვენდორის არჩევა~~ — ✅ Flitt (D23, 2026-08-02)
- [x] ~~ფასის სტრუქტურა~~ — ✅ `$120/წელი` + `$12/30 დღე`, ორივე ერთჯერადი (D23)
- [x] 👤 **Flitt merchant portal ✅ (2026-08-13)** — შეიქმნა **ცალკე merchant `legibly.design`**
      (არა უბრალოდ ცალკე product). იგივე იურიდიული პირი, ცალკე merchant.
      **რატომ ცალკე:** merchant-ის სახელი ვებგვერდიდან წარმოიქმნება და **ბარათის ამონაწერში ხვდება.**
      w2w-ის merchant-ზე დარჩენა ნიშნავდა, რომ Legibly-ს მყიდველი ამონაწერში `web2wireframe`-ს
      ნახავდა — „friendly fraud"-ის №1 მიზეზი. დამატებით: chargeback rate **merchant-ზე** ითვლება,
      ე.ი. ერთ ანგარიშზე ორი პროდუქტის დავები ერთმანეთს აზიანებდა
- [x] 👤 **`server_callback_url` ✅** → `https://api.legibly.design/api/webhooks/flitt`.
      Payment settings-ში ჩაწერილია, თუმცა კოდი მას **ყოველ მოთხოვნაშიც** აგზავნის — portal-ისა სარეზერვოა
- [x] 👤 **Flitt-ის კონფიგურაცია ✅** — `Redirect method: POST` (⚠️ არ შეიცვალოს: საიტი სტატიკურია და
      POST-ზე 405-ს დააბრუნებდა; `[action].ts` სწორედ ამიტომ იღებს POST-ს და 303-ით ისვრის საიტზე) ·
      Success/Decline → `api.`-ზე, არა საიტზე · `Checkout language priority: API language` (თორემ ძველი
      ქართული cookie გადაფარავდა ჩვენს `lang: 'en'`-ს) · Save card და Pre-auth გამორთული ·
      Subscription/Chargeback callback ცარიელი (chargeback-ს handler არ აქვს — მისამართის მიცემა
      404-ს ნიშნავდა) · notifications `billing@legibly.design`, ენა **English**
- [x] 🤖 **checkout ცოცხლად გატესტილია ✅ (2026-08-13)** — რეალური Flitt-ის გვერდი აჩვენებს:
      `legibly.design` · `Legibly Pro - 30 days` · **`12.00 USD`**. ე.ი. merchant id ჩაიტვირთა,
      `Payment key`-ით SHA1 ხელმოწერა სწორია, და USD მიიღება GEL-ის settlement ანგარიშის მიუხედავად.
      `orderId` = `lgb_pro_…` — w2w-ს შეკვეთებს ვერასდროს აირევს
- [ ] 👤 🔴 **merchant ჯერ `Test mode`-შია — აქტივაცია ტელეფონით** (portal-ში ღილაკი არ არსებობს).
      **დარეკვისას ცალკე ახსენე: Google Pay `Environment TEST`-შია** და production-ზე უნდა გადავიდეს —
      ეს ის დეტალია, რომელიც აქტივაციის შემდეგ რჩება გამორჩენილი და პირველივე Google Pay-ით
      გადამხდელი კარგავს. Apple Pay-ის სერტიფიკატი ატვირთულია (ვადა 2027-12-05)
- [x] 🤖 env: ✅ ყველა ცვლადი [`api/.env.example`](../api/.env.example)-ში, boot-time ვალიდაციით.
      **რეალური მნიშვნელობები Vercel-ზე — 👤**
- [x] 🤖 **w2w-დან გადმოტანა:** ✅ `flittService` (checkout + SHA1, კანონიკურ ვექტორზე ტესტით) ·
      webhook handler (verify + dedup + lease) · `License` model · stacking-ის ჭერი და იატაკი.
      admin override endpoint-ები **განზრახ არ გადმოვიტანე** — backend-spec-ში არ წერია
- [x] 🤖 **Figma OAuth** (`current_user:read`) → HMAC token → `figma.clientStorage` ✅
      ([`launch-stack §5`](./launch-stack.md)). ✅ **მიგრაციები გაშვებულია (2026-08-13)** — §4.1
- [x] 🤖 **Terms გვერდი:** ✅ refund policy · tax-exclusive disclaimer · statutory-rights clause
      (2026-08-03). Phase 6-ში დაემატა ერთი აბზაცი: **Pro-ს ყიდვა Figma-ს ანგარიშის დაკავშირებას
      ითხოვს** — ეს ყიდვამდე უნდა იცოდე. ✅ გამყიდველის იურიდიული სახელი/მისამართი დაემატა (2026-08-13)
- [x] 🤖 **plugin-ის integration** ✅ (Phase 5, 2026-08-12): Connect · licence pill · checkout →
      `figma.openExternal`. manifest = `["https://api.legibly.design"]`. **Judge-ის ღილაკი არ შედის**
      — მას Phase 4 სჭირდება
- [ ] 🤖 paywall-ის ჩართვა — დღეს fix **უფასოა beta-ში** (F20). განზრახაა, მაგრამ `Plans` modal-შიც ასე წერია: ორივე ერთდროულად უნდა შეიცვალოს
- [ ] 👤 **chargeback rate მონიტორინგი** — target **<0.5%** (ინდუსტრიის სტანდარტი). $12-ზე refund ($12) ყოველთვის იაფია, ვიდრე chargeback (~$42 + rate)

---

> 🔧 **Backend-ის სრული სამუშაო სპეციფიკაცია → [`backend-spec.md`](./backend-spec.md)**
> (Flitt + Figma OAuth + AI Judge, ფაზებად, ტესტებით და ხაფანგებით — self-contained)

## 5.1 ✅ AI Designer Judge — **cutoff დახურულია ([D27](./approach.md)); launch-ის სამუშაო აღარ არის**

> **გადაწყვეტილება 2026-08-18:** Judge **launch-ში არ შედის.** კოდი რჩება, გამორთული
> (`JUDGE_ENABLED` default = false, `api/src/config/judge.ts:64`); plugin-ის UI არ არსებობს;
> საიტი მას არსად არ ჰპირდება — ე.ი. **ფუნქცია უკვე ბნელი იყო, გამორთვა კოდს არ საჭიროებდა.**
> ქვემოთ დარჩენილი უმონიშნავი პუნქტები **გადადის [D26](./approach.md)-ის 🟢 შედეგზე.**
> ⚠️ **launch-ის ერთადერთი პირობა:** `JUDGE_ENABLED` prod-ზე **არ დაყენდეს**.
- [x] 🤖 `/api/judge` endpoint ✅ (2026-08-12) — OAuth-bound · free 3 (lifetime) / Pro N-თვეში ·
      quota **მხოლოდ წარმატებულ ზარზე** · structured outputs (enforced სქემა) · retry
- [x] 🤖 rubric ✅ — [`judgeRubric.ts`](../api/src/services/judgeRubric.ts): a11y-ს არ იმეორებს ·
      ყოველი finding ციფრს/პოზიციას ასახელებს · სიჩუმე სწორი პასუხია · ქულა არ ბერდება
- [ ] 👤 **eval pass** — 🔴 **არ გაშვებულა.** სჭირდება `ANTHROPIC_API_KEY` **და 10–15 რეალური
      Figma fixture** წინასწარ ცნობილი პრობლემებით. harness მზადაა →
      [`docs/judge-eval.md`](./judge-eval.md). **სანამ არ გაივლის, `JUDGE_ENABLED=false`** (D24)
- [ ] 🤖 plugin UI: Judge ღილაკი + Pro gate + trial counter — **განზრახ გადადებულია eval-მდე**
      (გამორთულ endpoint-ზე მიმავალი ღილაკი მომხმარებელს ცრუობს)
- [ ] 🤖 privacy + listing copy: *"your design leaves Figma only when you click Judge"* — მაშინ,
      როცა judge რეალურად ჩაირთვება. დღეს privacy სწორად ამბობს, რომ დიზაინი არსად არ იგზავნება
- [x] 🤖 model-ის ეკონომიკა ✅ — Opus 5-ზე ერთი ზარი **≈ $0.08**. ⚠️ §8.3-ის "მაგ. 100/თვე"
      **$120-იანი Pro-ს 78%-ს ჭამს** → default `JUDGE_PRO_MONTHLY=30` (~23%). მოდელი განზრახ
      **არ ჩამომიწევია** — Haiku vs Opus eval-ის კითხვაა ([judge-eval.md §5](./judge-eval.md))

---

## 6. 🟠 Figma Community listing

- [ ] 👤 **publish = user action** (Figma ანგარიშის მფლობელი). Claude ვერ გამოაქვეყნებს
- [x] 🤖 listing copy → ✅ [`listing-v0.1.md`](./listing-v0.1.md) განახლდა v0.4-ზე (2026-08-12):
      10 SC ცხრილად, advisory tier, mode-sweep. **"100% private, no network" წაიშალა** —
      ჩანაცვლდა ვიწრო და მაინც ძლიერი დაპირებით. Judge განზრახ არაა ნახსენები (არ არსებობს)
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

**განახლდა 2026-08-13 (deploy-ის დღის შემდეგ).** პასუხი პირველად შეიცვალა: `api.legibly.design`
**არსებობს**, Connect **მუშაობს**, და checkout რეალურ Flitt-ის გვერდს ქმნის.

დღეს publish-ს რომ დავაჭიროთ:

- ✅ სკანირება, fix, ხუთივე ლინკი — მუშაობს
- ✅ **Connect** — ბოლომდე გატესტილი (OAuth → ლიცენზია → ტოკენი)
- ✅ **checkout-ის ბმულის შექმნა** — `12.00 USD`, merchant `legibly.design`
- 🔴 **გადახდის დასრულება ჩავარდება** — merchant `Test mode`-შია. რეალური ბარათი ვერ გადაიხდის

ე.ი. ბლოკერი აღარაა არც კოდი და არც deploy — **ერთი სატელეფონო ზარია Flitt-თან.**

დარჩენილი 👤-სია:

1. 🔴 **Flitt-ის აქტივაცია** (+ Google Pay production environment-ზე) — §5
2. 🟠 `FLITT_WEBHOOK_IPS` პირველი რეალური გადახდის შემდეგ — §4.2
3. 🟠 admin panel-ის catch-all routing — §4.2
4. 🟠 paywall-ის ჩართვა (F20) — დღეს fix განზრახ უფასოა beta-ში

**Community publish აქტივაციამდე არ უნდა მოხდეს** — გადამხდელი მყიდველი უარესია, ვიდრე
არავითარი მყიდველი.
