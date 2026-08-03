# backend-spec.md — Legibly-ის backend: Flitt + Figma OAuth + AI Judge

> **სტატუსი:** 🟢 READY TO BUILD — შექმნილია 2026-08-03
>
> **ეს ფაილი self-contained-ია.** თუ ახალ session-ში ხარ და მხოლოდ ეს გითხრეს — აქ ყველაფერია:
> კონტექსტი, გადაწყვეტილებები, არქიტექტურა, ნაბიჯები, ტესტები და დასრულების კრიტერიუმი.
> სხვა ფაილის წაკითხვა **სავალდებულო არაა**, თუმცა სასარგებლოა (ლინკები §1.4-ში).

---

## 0. პირველი ნაბიჯი — წაიკითხე ეს სექცია სრულად

### 0.1 რას აშენებ ერთი წინადადებით

Legibly-ის Figma plugin დღეს სრულად ლოკალურია და უფასო. შენ აშენებ **backend-ს**, რომელიც სამ
რამეს დაამატებს: **(ა)** ვინაობის დადასტურება Figma OAuth-ით, **(ბ)** Pro-ს ყიდვა Flitt-ით,
**(გ)** ახალი ფუნქცია **AI Designer Judge** — მონიშნულ დიზაინს Claude ხედავს და აფასებს.

### 0.2 სამუშაო წესები

1. **ბრანჩი:** მუშაობ `main`-იდან აღებულ ახალ ბრანჩზე. **`main`-ზე პირდაპირ არ დააპუშო.**
2. **კომიტები:** მცირე და თემატური. Co-author footer:
   `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
3. **ტესტები:** ყოველი ფაზა ტესტებით სრულდება. §11-ში ზუსტი მოთხოვნებია. **წითელი ტესტით ფაზა არ იხურება.**
4. **გადაწყვეტილებები §3-ში დახურულია.** არ გადახსნა — თუ საფუძვლიანი არგუმენტი გაქვს, ჯერ დაწერე
   `docs/approach.md`-ში ახალი D-ჩანაწერი და user-ს ჰკითხე.
5. **Credential-ები შენთან არ მოდის.** §13-ში სიაა, რას აკეთებს user თავად. კოდი მათ გარეშე უნდა
   იწერებოდეს და ტესტირდებოდეს (mock/fixture).
6. **არ დაწერო speculative კოდი.** არაფერი, რაც ამ ფაილში არ წერია.

### 0.3 რიგითობა (მკაცრი — თითოეული წინაზეა დამოკიდებული)

```
Phase 1  API skeleton + store          ← ყველაფრის საძირკველი
Phase 2  Figma OAuth + HMAC token      ← identity; ამის გარეშე billing და judge ვერ იმუშავებს
Phase 3  Flitt checkout + webhook      ← Pro იყიდება
Phase 4  AI Judge (/api/judge)         ← cutoff 2026-09-01
Phase 5  Plugin integration            ← UI: Connect, Pro gate, Judge ღილაკი
Phase 6  Terms of Service + privacy    ← გადახდების ჩართვამდე სავალდებულო
```

---

## 1. კონტექსტი

### 1.1 რა არის Legibly

Accessibility-first "correctness layer" Figma plugin. აღმოაჩენს WCAG 2.2 (AA/AAA) დარღვევებს
Figma-ს დიზაინში და **ერთი დაჭერით ასწორებს** — მომხმარებლის საკუთარი design token-ებით.

**პოზიციონირება (რატომ არ გვჭამს Figma-ს საკუთარი Design Agent):** ჩვენ არ ვართ "AI ხატავს UI-ს".
ჩვენ ვართ **დეტერმინისტული, ნულოვანი false-positive-ით, system-strict** შემმოწმებელი. ეს
განსხვავებაა და ის უნდა დაიცვას ყველა გადაწყვეტილებამ.

### 1.2 დღევანდელი მდგომარეობა (2026-08-03)

| კომპონენტი | სტატუსი |
|---|---|
| **Plugin engine** | ✅ მზადაა — 10 WCAG SC + advisory tier, **312 ტესტი მწვანე**, typecheck + build სუფთა |
| **Plugin network** | `manifest.json` → `"allowedDomains": ["none"]` — **ნულოვანი ქსელი** |
| **Website** | ✅ ცოცხალია `https://legibly.design`-ზე (Vercel, TLS) |
| **Website routes** | `/` `/docs` `/subscribe` `/contact` `/feedback` `/privacy` `/pricing`→307 `/api/waitlist` |
| **Email** | ✅ `hello@` `support@` `billing@` → Gmail forwarding (Namecheap) |
| **Waitlist** | 🔴 503 — Resend key ჯერ არ არის (**ეს შენი სამუშაო არაა**, user-ს აქვს) |
| **Backend** | 🔴 **არ არსებობს — ეს შენ უნდა ააშენო** |
| **Pro-ს ყიდვა** | 🔴 გზა არ არსებობს |
| **AI** | 🔴 plugin-ში AI საერთოდ არ არის (BYOK წაიშალა D22-ში) |

### 1.3 Repo

- **Repo:** `github.com/lomidze1/Legibly` (PRIVATE)
- **ბრანჩები:** `main` (production, Vercel აქედან აშენებს) · `dev`
- **საქაღალდეები:**
  - `plugin/` — Figma plugin (React UI + main thread), Vite, Vitest
  - `website/` — Next.js marketing საიტი (Vercel-ზე deploy-ულია, Root Directory = `website`)
  - `docs/` — ყველა დოკუმენტაცია
  - `website-new-design/` — გამოუყენებელი redesign handoff, **ხელი არ ახლო**

### 1.4 დამატებითი წყაროები (არასავალდებულო, მაგრამ სასარგებლო)

| ფაილი | რა წერია |
|---|---|
| [`docs/approach.md`](./approach.md) | გადაწყვეტილებების ჟურნალი — **D21, D22, D23, D24** ყველაზე რელევანტურია |
| [`docs/launch-stack.md`](./launch-stack.md) | ვენდორები, ფასები, რატომ Flitt |
| [`docs/pre-launch-checklist.md`](./pre-launch-checklist.md) | გაშვებამდე დარჩენილი საქმეები |
| [`docs/goal.md`](./goal.md) | north-star, ბიზნეს კონტექსტი |
| `~/Desktop/Web2Wireframe/` | **სხვა პროექტი იმავე მფლობელის — აქედან გადმოგაქვს კოდი** (§14) |

---

## 2. არქიტექტურა

### 2.1 სამი კომპონენტი

```
┌─────────────────────┐
│  Figma Plugin       │  plugin/ — React UI + main thread
│  (მომხმარებლის      │  ⚠️ კოდი მთლიანად წაკითხვადია → საიდუმლო აქ ვერასდროს იქნება
│   მანქანაზე)        │
└──────────┬──────────┘
           │ HTTPS (მხოლოდ ორი რამისთვის: license + judge)
           ▼
┌─────────────────────┐
│  API                │  api/ — ახალი პაკეტი, Vercel serverless
│  api.legibly.design │  OAuth · checkout · webhook · license · judge
└──────────┬──────────┘
           │
           ├──► Figma OAuth      (ვინაობის დადასტურება)
           ├──► Flitt            (გადახდა)
           ├──► Anthropic API    (judge — vision)
           └──► Postgres/KV      (License store)

┌─────────────────────┐
│  Website            │  website/ — Next.js, ცალკე Vercel პროექტი
│  legibly.design     │  marketing + waitlist + Terms/Privacy
└─────────────────────┘
```

### 2.2 რატომ ცალკე API პროექტი და არა `website/`-ის `/api/*`

Plugin-ის `manifest.json`-ში `allowedDomains` უნდა შეიცავდეს **მხოლოდ** `api.legibly.design`-ს.
თუ API marketing საიტთან ერთად იდგება, plugin-ს მთელი დომენის ნახვის უფლება მიეცემა. ეს
პირდაპირ ეწინააღმდეგება ჩვენს trust story-ს.

**გადაწყვეტილება:** ცალკე Vercel პროექტი, ცალკე `api/` საქაღალდე repo-ში,
subdomain `api.legibly.design`.

### 2.3 Identity model — რეგისტრაცია არ არსებობს

**`figmaUserId` არის primary key.** არ არის რეგისტრაცია, პაროლი, email verification, "Sign in"
ღილაკი საიტზე. Email მხოლოდ checkout-იდან მოდის, ქვითრისთვის.

```
Plugin → Figma OAuth (scope: current_user:read) → API ჭრის HMAC ტოკენს
       → ტოკენი ინახება figma.clientStorage-ში
       → POST /checkout/create { figmaUserId } → hosted checkout ბრაუზერში
       → 3DS → approved → server callback → webhook (signature + dedup)
       → License.upsert { plan: pro, cycleEndsAt }
Plugin → GET /license/me → UI განახლდა
```

---

## 3. გადაწყვეტილებები — ძალაშია, არ გადახსნა

### D21 — Identity = Figma OAuth, არა შიშველი `figma.currentUser.id`

`figma.currentUser.id` **არ არის მტკიცებულება**. w2w-მ ზუსტად ეს დაუცველობა გაიარა: ძველი
`/api/auth/init` ტოკენს ჭრიდა ნებისმიერი body-ში მითითებული `figmaUserId`-ისთვის, ე.ი. ნებისმიერს
შეეძლო სხვისი Pro-ს იმიტაცია.

**Legibly-სთვის ეს ორმაგად კრიტიკულია:** judge-ის ჩართვისთანავე იმიტაცია = **ჩვენი Anthropic
ბილინგი**. ⇒ OAuth თავიდანვე, არა მოგვიანებით.

Scope: **მხოლოდ `current_user:read`.** File scope არ გვჭირდება — plugin API თვითონ ხატავს.

### D22 — plugin-ში AI არ არის; BYOK წაშლილია

მომხმარებლის `sk-ant-…` key-ის ველი Settings-ში წაშლილია. `ai-client.ts` წაშლილია (git-ის
ისტორიაშია). **ჩვენი key plugin-ის bundle-ში ვერასდროს ჩაიდება** — კოდი წაკითხვადია.
⇒ ჩვენი key = **სავალდებულოდ server-side proxy**.

### D23 — Billing = Flitt, ერთჯერადი გადახდა, წლიური-first

| tier | ფასი | წვდომა |
|---|---|---|
| **Pro — წლიური** ⭐ მთავარი | **$120** | 365 დღე |
| Pro — თვიური | **$12** | 30 დღე |

- **auto-renewal არ არსებობს.** გასაუქმებელი არაფერია. განახლება **დღეებს სტეკავს** დარჩენილზე.
- **VAT ჩვენზე რჩება** — Flitt PSP-ია, არა Merchant of Record. ფასი tax-exclusive,
  Terms-ში disclaimer სავალდებულოა.
- **❌ Stripe / Figma Payments / MoR ვენდორები — დახურულია.** არ გადახსნა.
  (GE არაა Stripe-ის supported merchant country; Figma Community-ს paid resource აქტიურ
  Stripe account-ს მოითხოვს.)
- Flitt-ის recurring **ჯერ არ არის ჩართული** — მათ თქვეს, გაყიდვების დაფიქსირების შემდეგ.
  ერთჯერადით სწორედ იმ გაყიდვებს ვაფიქსირებთ.

### D24 — AI Designer Judge: შენდება ახლა, launch-ს არ ბლოკავს

- **რა არის:** მონიშნული frame → snapshot → `/api/judge` → Claude vision + rubric → verdict.
- **Figma-ში inter-plugin API არ არსებობს** — "Claude Design-თან დაკავშირება" ტექნიკურად
  შეუძლებელია. ერთადერთი გზა ჩვენი proxy-ა.
- **Gating:** Pro-only + free user-ს **3 საცდელი**. (Launch-ის დღეს Pro user 0-ია — საცდელის
  გარეშე ფუნქციას ვერავინ ნახავდა.)
- **Cutoff 2026-09-01:** მზადაა და eval კარგია → launch build-შია. ვერა → v1.1, ~2 კვირა
  post-launch. **Launch-ის თარიღი judge-ზე არასდროს იბმევა.**
- **ხარისხის რისკი:** generic-ფიდბექიანი judge **უარესია, ვიდრე მისი არქონა.**
  rubric + eval pass სავალდებულოა "მზადაა"-ს განსაზღვრებაში.

### Trust story-ის ცვლილება — გააცნობიერე

D22-ის `"allowedDomains": ["none"]` **იცვლება** — ეს გარდაუვალია paywall-თან ერთად (OAuth +
license polling). ახალი ფორმულირება, რომელიც ყველგან უნდა გამოჩნდეს (privacy, listing, plugin UI):

> **"Network only for license checks — your design leaves Figma only when you click Judge."**

`allowedDomains` = `["api.legibly.design"]`. **მეტი არაფერი.** არა analytics, არა Sentry.

---

## 4. Repo layout — რას ქმნი

```
api/                              ← ახალი პაკეტი
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── vercel.json
├── .env.example                  ← ყველა env var, ცარიელი მნიშვნელობებით
├── src/
│   ├── config/
│   │   ├── env.ts                ← env-ის ვალიდაცია, boot-ზე throw
│   │   └── startupChecks.ts      ← prod-ში secret-ების სიძლიერის შემოწმება
│   ├── lib/
│   │   ├── hmac.ts               ← signToken / verifyToken
│   │   ├── validators.ts         ← assertString / assertStringMax (injection-ის საწინააღმდეგოდ)
│   │   └── serializeLicense.ts
│   ├── models/
│   │   ├── License.ts
│   │   └── WebhookEvent.ts
│   ├── services/
│   │   ├── flittService.ts       ← w2w-დან
│   │   ├── licenseService.ts     ← w2w-დან
│   │   └── judgeService.ts       ← ახალი
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   └── flittIpAllowlist.ts
│   └── routes/
│       ├── auth/                 ← figma login / callback / exchange / refresh / me
│       ├── checkout/             ← create / success / cancel
│       ├── license/              ← me
│       ├── webhooks/             ← flitt
│       └── judge/                ← judge
└── tests/
    └── …                         ← §11
```

Plugin-ის მხარეს იცვლება: `manifest.json`, `src/ui/` (Connect, Pro gate, Judge), ახალი
`src/ui/shared/apiClient.ts` + `licenseClient.ts`.

---

## 5. Phase 1 — API skeleton + store

### 5.1 რა უნდა გააკეთო

1. `api/` პაკეტი: TypeScript, Vitest, Vercel serverless functions
2. `config/env.ts` — ყველა env var ერთ ადგილას, prod-ში სავალდებულოების boot-time შემოწმებით
3. **Store-ის არჩევა** — Vercel Postgres (free tier). w2w Mongo/Mongoose-ს იყენებს; **პირდაპირ
   არ გადმოიტანო Mongoose** — გადაწერე Postgres-ზე (Drizzle ან პირდაპირი SQL). სქემა §7.2-ში.
4. `GET /api/health` — `{ok: true, store: "up"|"down"}`
5. Rate limiting middleware

### 5.2 Env vars (სრული სია)

```bash
# --- core ---
NODE_ENV=production
API_PUBLIC_URL=https://api.legibly.design
WEBSITE_BASE_URL=https://legibly.design
AUTH_SECRET=              # ≥32 chars, HMAC ტოკენებისთვის
ADMIN_TOKEN=              # ≥32 chars, admin endpoint-ებისთვის
DATABASE_URL=             # Vercel Postgres

# --- Figma OAuth (Phase 2) ---
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
FIGMA_REDIRECT_URI=https://api.legibly.design/api/auth/figma/callback

# --- Flitt (Phase 3) ---
FLITT_MERCHANT_ID=
FLITT_SECRET_KEY=
FLITT_BASE_URL=https://pay.flitt.com
FLITT_WEBHOOK_IPS=54.154.216.60,3.75.125.89
FLITT_IP_ALLOWLIST_ENABLED=true

# --- Judge (Phase 4) ---
ANTHROPIC_API_KEY=
JUDGE_MODEL=              # §8.3-ის მიხედვით აირჩევა
JUDGE_FREE_TRIALS=3
```

### 5.3 Boot-time guard (w2w-ის `startupChecks.ts`-ის ანალოგი)

Production-ში throw, თუ `AUTH_SECRET` / `ADMIN_TOKEN`:
- არ არსებობს, ან < 32 სიმბოლო
- ემთხვევა placeholder-ს (`change-me`, `dev-secret`, `dev-…` პრეფიქსი)

`API_PUBLIC_URL` უნდა იყოს https და არა localhost.

### 5.4 დასრულების კრიტერიუმი

- [ ] `npm test` მწვანე, `npm run typecheck` სუფთა
- [ ] `GET /api/health` პასუხობს ლოკალურად
- [ ] `.env.example` სრულია
- [ ] env-ის ვალიდაციის ტესტი: არასრული env prod-ში → throw

---

## 6. Phase 2 — Figma OAuth + HMAC token

> ⚠️ **ეს ფაზა უსაფრთხოების ბირთვია.** w2w-ს აქ **რეალური დაუცველობა ჰქონდა და გაასწორა.**
> ქვემოთ არის სწორი ვერსია — გადმოიტანე ის, არა ძველი.

### 6.1 სრული ნაკადი

```
1. Plugin ქმნის nonce-ს: 32 random bytes → 64-char hex
   crypto.getRandomValues(new Uint8Array(32))

2. Plugin ხსნის ბრაუზერს:
   GET /api/auth/figma/login?plugin_nonce=<nonce>

3. API:
   - ვალიდაცია: /^[A-Za-z0-9_-]{32,128}$/  ← 32-ის ქვედა ზღვარი აუცილებელია
   - state = randomBytes(16).toString("hex")
   - შეინახე { state, pluginNonce } (store-ში ან ხელმოწერილ cookie-ში)
   - ⚠️ სესია აუცილებლად შეინახე ᲒᲐᲓᲐᲛᲘᲡᲐᲛᲐᲠᲗᲔᲒᲐᲛᲓᲔ (await save) — Figma უკვე
     ავტორიზებულ user-ს consent-ს ატარებს და 302 async ჩაწერას უსწრებს
   - redirect →
     https://www.figma.com/oauth
       ?client_id=<FIGMA_CLIENT_ID>
       &redirect_uri=<FIGMA_REDIRECT_URI>
       &response_type=code
       &scope=current_user:read
       &state=<state>

4. GET /api/auth/figma/callback?code&state
   - !code → 400
   - state არ ემთხვევა შენახულს → 400 "Invalid state"
   - token exchange — client credentials ᲰᲗᲗᲞ ᲑᲐᲡᲘᲪ-ᲨᲘ, არა body-ში:
       POST https://api.figma.com/v1/oauth/token
       Authorization: Basic base64(clientId:clientSecret)
       Content-Type: application/x-www-form-urlencoded
       body: redirect_uri, code, grant_type=authorization_code
   - GET https://api.figma.com/v1/me
       Authorization: Bearer <figma access_token>
       → { id, email?, handle? }
   - ⚠️ Figma-ს access token ᲐᲠᲡᲐᲓ ᲐᲠ ᲘᲜᲐᲮᲔᲑᲐ — ერთხელ იხმარება /v1/me-სთვის და იყრება
   - License.getOrCreate(me.id) + setEmailIfMissing(me.id, me.email)
     ⚠️ ᲢᲝᲙᲔᲜᲘᲡ ᲒᲐᲪᲔᲛᲐᲛᲓᲔ — plugin მაშინვე ეკითხება და ცარიელ email-ს დაიჭერს
   - token = signToken(me.id, AUTH_SECRET, 30 დღე)
   - შეინახე: pendingAuth[nonce] = { token, tokenExpiresAt, expires: now + 5 წუთი }
   - დააბრუნე HTML გვერდი "Connected to Figma", რომელიც 1 წამში თავს ხურავს

5. Plugin ეკითხება: GET /api/auth/figma-exchange?nonce=<nonce>
   - public by design — nonce არის bearer credential (მაღალი ენტროპია, ერთჯერადი, მოკლევადიანი)
   - ჯერ არაა → { success: true, pending: true }
   - არის → წაშალე ჩანაწერი (ᲔᲠᲗᲯᲔᲠᲐᲓᲘ!) → { success: true, pending: false, token, expiresAt }
   - Plugin: 2 წამიანი ინტერვალი, 3 წუთის ლიმიტი
```

### 6.2 HMAC token — ზუსტი ფორმატი

**არაა JWT.** არ არის header segment, არ არის `alg`.

```ts
interface TokenPayload { userId: string; iat: number; exp: number }  // წამები

// ხელმოწერა ხდება base64url ᲡᲢᲠᲘᲜᲒᲖᲔ, არა raw JSON-ზე
function signToken(userId: string, secret: string, expirySeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = { userId, iat: now, exp: now + expirySeconds };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}
```

**Verify — მკაცრი რიგითობა:**
1. ფორმატი: უნდა იყოს ზუსტად 2 ნაწილი `.`-ით
2. **ხელმოწერა შემოწმდეს payload-ის დეკოდირებამდე**
3. `timingSafeEqual` + სიგრძის წინასწარი შემოწმება (`timingSafeEqual` არათანაბარ სიგრძეზე throw-ს აკეთებს)
4. `exp <= now` → "Token expired"

**ვადები:** plugin token = **30 დღე**. Clock-skew-ის დათმობა **არ არის** — plugin-ის მხარეს
`TOKEN_SAFETY_MARGIN_MS = 60_000`.

### 6.3 IDOR-ის თავიდან აცილება — სამი წესი

1. **`GET /api/license/me`** იყენებს **მხოლოდ `req.userId`-ს ტოკენიდან.** query param-ის
   `figmaUserId` **არ ენდობა** (w2w-ის ძველი ბაგი: ნებისმიერს შეეძლო სხვისი ლიცენზიის წაკითხვა).
2. ტოკენის გაცემის **ერთადერთი გზა** არის OAuth callback, სადაც `userId` = `/v1/me`-ს დაბრუნებული
   `id`. Client **ვერასდროს** გვაწვდის `figmaUserId`-ს ტოკენის მისაღებად.
3. შეცდომის ტექსტები: სადაც შესაძლებელია, **გააერთიანე** — `"Invalid or expired token"`, არა
   ცალკე `"Invalid signature"` და `"Token expired"` (თავს არიდებს secret-ის გამოცნობის ზონდირებას).

### 6.4 Route-ები

| Method | Path | Auth | პასუხი |
|---|---|---|---|
| GET | `/api/auth/figma/login` | rate limit | 302 → figma.com/oauth |
| GET | `/api/auth/figma/callback` | rate limit | HTML "Connected" |
| GET | `/api/auth/figma-exchange` | public (nonce = credential) | `{success, pending, token?, expiresAt?}` |
| POST | `/api/auth/refresh` | Bearer | `{success, token, expiresAt}` |
| GET | `/api/auth/me` | Bearer | `{success, userId}` |

Rate limit: 300/10 წუთი IP-ზე auth-ის ყველა route-ზე (2-წამიანი poll-ისთვის სივრცე უნდა დარჩეს:
სრული 3-წუთიანი მცდელობა ~90 request-ია).

### 6.5 ⚠️ Serverless-ის კრიტიკული ცვლილება w2w-სთან შედარებით

w2w `pendingPluginAuth`-ს **in-memory `Map`-ში** ინახავს. ეს **Vercel serverless-ზე არ იმუშავებს** —
ყოველი invocation ცალკე instance-ია.

**⇒ `pendingAuth` უნდა იყოს store-ში** (Postgres ცხრილი ან Vercel KV), 5-წუთიანი TTL-ით.
იგივე ეხება `revokedTokens`-ს — ან store-ში, ან საერთოდ არ დანერგო v1-ზე.

### 6.6 დასრულების კრიტერიუმი

- [ ] `signToken`/`verifyToken` ტესტები: ვალიდური, გაყალბებული ხელმოწერა, ვადაგასული, დამახინჯებული
- [ ] state mismatch → 400
- [ ] nonce ერთჯერადია — მეორე exchange იმავე nonce-ით `pending: true`-ს აბრუნებს
- [ ] `/license/me` query param-ის `figmaUserId`-ს იგნორირებს (IDOR ტესტი)
- [ ] nonce-ის TTL იმუშავებს restart-ის შემდეგაც (store-ში, არა memory-ში)

---

## 7. Phase 3 — Flitt checkout + webhook

> 🔴 **ეს ფაზა ფულს ეხება. აქ ბაგი = დაკარგული ფული ან უფასო Pro.**
> §14-ის ხაფანგები **სავალდებულოდ** წაიკითხე ამ ფაზამდე.

### 7.1 SHA1 ხელმოწერა — ზუსტი ალგორითმი

```ts
const filtered = Object.entries(params)
  .filter(([key, value]) => {
    if (key === "signature" || key === "response_signature_string") return false;
    if (value === "" || value === null || value === undefined) return false;
    return true;
  })
  .sort(([a], [b]) => a.localeCompare(b));

const concat = [secretKey, ...filtered.map(([, v]) => String(v))].join("|");
return createHash("sha1").update(concat, "utf8").digest("hex");
```

**ხუთი წესი, რომელთა დარღვევაც სიჩუმეში იშლება:**
1. **secret არის სტრინგის პირველი ელემენტი**, არა HMAC key: `sha1(secret + "|" + v1 + "|" + v2…)`
2. **მხოლოდ მნიშვნელობები** მიდის სტრინგში — **სორტირება კი გასაღებით**
3. `""` იშლება, მაგრამ **`0` რჩება** (მკაცრი შედარებაა; truthiness-ის ფილტრი `amount: 0`-ს წაშლიდა)
4. `signature` **და** `response_signature_string` ორივე უნდა ამოიშალოს
5. ჩალაგებული ობიექტები (`merchant_data`) **caller-მა უნდა `JSON.stringify`-ოს** — `String(v)`
   ობიექტს `"[object Object]"`-ად აქცევს

**Verify-ს დამატებითი დაცვა (w2w-ის C-1 ბაგი):** ხელახლა ხელმოწერამდე დააბრუნე `false` თუ:
- რომელიმე მნიშვნელობა `typeof === "object"` (მასივიც) — collision-ის რისკი
- რომელიმე მნიშვნელობა შეიცავს `|`-ს — canonicalization injection

შემდეგ `timingSafeEqual` სიგრძის წინასწარი შემოწმებით.

### 7.2 License სქემა (Postgres-ზე გადაწერილი)

```sql
CREATE TABLE licenses (
  figma_user_id     TEXT PRIMARY KEY,
  email             TEXT,
  plan              TEXT NOT NULL DEFAULT 'free',    -- 'free' | 'pro'
  status            TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'expired'
  cycle_started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle_ends_at     TIMESTAMPTZ NOT NULL,
  judge_used        INTEGER NOT NULL DEFAULT 0,      -- free trial counter (D24)
  flitt_order_id    TEXT,
  last_duration     TEXT,                            -- 'monthly' | 'yearly'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON licenses (email);
CREATE INDEX ON licenses (cycle_ends_at);

CREATE TABLE webhook_events (
  transaction_id TEXT PRIMARY KEY,        -- dedup key
  order_id       TEXT NOT NULL,
  order_status   TEXT NOT NULL,
  amount_cents   INTEGER,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON webhook_events (order_id);
CREATE INDEX ON webhook_events (order_status, processed_at DESC);

CREATE TABLE pending_auth (            -- Phase 2, serverless-ისთვის
  nonce      TEXT PRIMARY KEY,
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
```

**⚠️ w2w-სთან განსხვავებები, რომლებიც განზრახაა:**
- `subscription` subdocument არ გვჭირდება — recurring არ არსებობს (D23). ბრტყელი
  `flitt_order_id` + `last_duration` ჰყოფნის.
- `usage.imports` არ გვჭირდება — Legibly-ს import quota არ აქვს. **`judge_used` ცვლის მას.**
- `status: 'canceled'` არ არსებობს — გასაუქმებელი არაფერია.

### 7.3 ფასები და order_id

```ts
const PRICES = { monthly: 1200, yearly: 12000 };   // ᲪᲔᲜᲢᲘ! $12 და $120
const DURATION_MS = { monthly: 30 * 86_400_000, yearly: 365 * 86_400_000 };
const RENEWAL_WINDOW_MS = { monthly: 7 * 86_400_000, yearly: 10 * 86_400_000 };

function buildOrderId(figmaUserId: string): string {
  const safe = figmaUserId.replace(/[^A-Za-z0-9_-]/g, "");
  return `lgb_pro_${safe}_${Date.now()}`;     // w2w-ს "w2w_pro_" აქვს — ᲒᲐᲛᲘᲯᲜᲔ!
}
```

> ⚠️ **`order_id`-ის prefix `lgb_` აუცილებელია** — Flitt merchant account საერთოა w2w-სთან.
> Webhook ხელახლა იღებს ამ ფორმატს და შეუსაბამობაზე უარს ამბობს.

### 7.4 Checkout request

```
POST ${FLITT_BASE_URL}/api/checkout/url
Content-Type: application/json
body: { request: { ...params, signature } }
```

პარამეტრები: `merchant_id`, `order_id`, `amount` (ცენტი), `currency: "USD"`, `order_desc`,
`lang: "en"`, `server_callback_url`, `response_url`, `merchant_data`, `sender_email` (თუ არის).

```ts
merchant_data = JSON.stringify({ figmaUserId, plan: "pro", recurring: false, duration });
server_callback_url = `${API_PUBLIC_URL}/api/webhooks/flitt`;
```

**პასუხი:** `data.response` → საჭიროა `response_status === "success"` და `checkout_url`.
(`response_status` ≠ `order_status` — სხვადასხვა ველია.)

**`returnUrl`-ის sanitizer სავალდებულოა** (open redirect): დაშვებული host-ები —
`legibly.design`, `www.legibly.design`, `localhost`, `127.0.0.1`. სხვა → ჩუმად fallback
default-ზე (არა 400 — რეალურ გადახდას არ ვკლავთ typo-ს გამო).

### 7.5 Webhook — ვალიდაციის მკაცრი რიგითობა

> **ინვარიანტი:** **ყველა ვალიდაცია ხდება lease-ის აღებამდე; state-ის ცვლილება — მის შემდეგ.**
> მტრულმა payload-მა dedup key არ უნდა დახარჯოს.

```
1.  body ობიექტია?
2.  verifyCallback (SHA1)                          → წარუმატებლობა: 200, ლოგი
3.  სავალდებულო ველები: merchant_data, order_id, order_status, amount
4.  JSON.parse(merchant_data) → ობიექტი, არა მასივი; figmaUserId სტრინგი
5.  figmaUserId.length <= 64
6.  order_id.startsWith(`lgb_pro_${sanitize(figmaUserId)}_`)   ← ᲑᲛᲐ order_id ↔ merchant_data
7.  currency.toUpperCase() === "USD"
8.  თუ order_status === "approved": Number(amount) === PRICES[duration]
9.  ⬇️ ᲛᲮᲝᲚᲝᲓ ᲐᲮᲚᲐ: lease-ის აღება (INSERT webhook_events)
        duplicate key → 200 { received: true, deduped: true }
10. state-ის ცვლილება → License upsert
        შეცდომა → lease-ის გათავისუფლება (DELETE), რომ Flitt-ის retry-მ იმუშაოს
```

**dedup key:**
```ts
transactionId = typeof payload.payment_id === "string"
  ? payload.payment_id
  : `${orderId}_${orderStatus}`;
```

**🔴 Webhook ᲧᲝᲕᲔᲚᲗᲕᲘᲡ 200-ს აბრუნებს.** არასდროს 4xx/5xx. Flitt-ის retry გრაფიკი:
2წმ / 60წმ / 5წთ / 10წთ / 1სთ / 24სთ — 4xx retry-ს ქარიშხალს იწვევს და რეალურ ხარვეზს ფარავს.

**სტატუსები:** `approved`, `declined`, `expired`, `reversed` (refund და chargeback ორივე).

### 7.6 "დღეები სტეკავს" — ზუსტი ალგორითმი

```ts
const durationMs = DURATION_MS[duration];
const now = Date.now();
const stillActivePro = existing != null && existing.plan === "pro"
                       && existing.cycleEndsAt.getTime() > now;

const renewalWindowMs = RENEWAL_WINDOW_MS[duration];
const maxCycleEndMs   = now + renewalWindowMs + durationMs;      // ჭერი
const naiveBase       = stillActivePro ? existing.cycleEndsAt.getTime() : now;
const naiveCycleEnd   = naiveBase + durationMs;
const existingEndMs   = stillActivePro ? existing.cycleEndsAt.getTime() : 0;
const effectiveCapMs  = Math.max(maxCycleEndMs, existingEndMs);  // ᲘᲐᲢᲐᲙᲘ: არასდროს შეამციროს
const cycleEndMs      = Math.min(naiveCycleEnd, effectiveCapMs);
```

`Math.max`-ის იატაკი აუცილებელია: მარტივი `Math.min(naive, cap)` არსებულ გრძელ ციკლს **ამოკლებდა**.

**შესაბამისი დაცვა checkout-ის მხარეს:** თუ user უკვე Pro-ა და renewal window-ს გარეთაა →
`400 { error: "already_pro", remainingDays, renewalOpensInDays, renewalWindowDays }`.
**ორივე დაცვა ერთად მუშაობს — ცალკე არცერთი არ კმარა** (chargeback stacking).

### 7.7 Route-ები

| Method | Path | Auth | პასუხი |
|---|---|---|---|
| POST | `/api/checkout/create` | Bearer | `{checkoutUrl, orderId}` / 400 `already_pro` / 502 |
| ALL | `/api/checkout/success` | — | 303 → `${WEBSITE_BASE_URL}/checkout/success` |
| ALL | `/api/checkout/cancel` | — | 303 → `${WEBSITE_BASE_URL}/checkout/cancel` |
| POST | `/api/webhooks/flitt` | SHA1 + IP allowlist | **ყოველთვის 200** |
| GET | `/api/license/me` | Bearer | serialized license |

> ⚠️ **განსხვავება w2w-სგან:** w2w-ის `/checkout/create` **public**-ია (`figmaUserId` body-შია).
> **Legibly-ზე ის Bearer-ით დაცული უნდა იყოს** — OAuth ისედაც გვაქვს Phase 2-იდან, ე.ი. სუსტი
> ვარიანტის გადმოტანას აზრი არ აქვს.

**`response_url` POST-ით მოდის** → `router.all("/success")` და **303** redirect (303 აიძულებს
ბრაუზერს GET-ით გაჰყვეს).

**IP allowlist:** `54.154.216.60`, `3.75.125.89`. უარყოფაზე — **200 `{received:true}`**, არა 403
(retry-ის ქარიშხალს არიდებს და ზონდირებას არაფერს ეუბნება).

### 7.8 დასრულების კრიტერიუმი

- [ ] ხელმოწერის ტესტები ცნობილ ვექტორზე (fixture w2w-ის ტესტებიდან)
- [ ] webhook: ვალიდური approved → Pro; declined → ცვლილება არ ხდება
- [ ] dedup: ერთი და იგივე `payment_id` ორჯერ → მეორე `deduped: true`, ციკლი არ იზრდება
- [ ] amount mismatch → უარი, Pro არ ეძლევა
- [ ] currency ≠ USD → უარი
- [ ] `order_id`-ის prefix არ ემთხვევა → უარი
- [ ] stacking: 2× yearly ზედიზედ → `cycle_ends_at` ჭერს არ სცდება
- [ ] stacking-ის იატაკი: მოკლე yearly-ს მერე monthly ციკლს **არ ამცირებს**
- [ ] `already_pro` checkout-ზე ბრუნდება
- [ ] mutation-ის შეცდომა → lease თავისუფლდება

---

## 8. Phase 4 — AI Designer Judge

### 8.1 ნაკადი

```
Plugin: user ირჩევს frame-ს → აჭერს "AI Designer Judge"
  → main thread: node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } })
  → + მსუბუქი node-tree JSON (ტიპები, ზომები, ტექსტი — ᲐᲠᲐ სრული დოკუმენტი)
  → POST /api/judge  (Bearer token, multipart ან base64)
API:
  → license შემოწმება: pro? → OK
                        free? → judge_used < JUDGE_FREE_TRIALS ? OK : 402
  → Anthropic Messages API (vision) + rubric (§8.2)
  → strict tool schema-ით სტრუქტურირებული პასუხი
  → judge_used++ (მხოლოდ free-ზე)
  → verdict → plugin
```

### 8.2 Rubric — ხარისხის ბირთვი

> 🔴 **ეს არის ფაზის ყველაზე მნიშვნელოვანი ნაწილი.** Generic ფიდბექი ("good use of whitespace")
> **უარესია, ვიდრე ფუნქციის არქონა.** Judge უნდა კითხულობდეს როგორც გამოცდილი დიზაინერი, არა
> როგორც ChatGPT wrapper.

Verdict სტრუქტურირებული უნდა იყოს (strict tool schema, არა თავისუფალი ტექსტი):

```ts
interface JudgeVerdict {
  overall: { score: number; summary: string };   // score 1–5
  findings: Array<{
    dimension: 'hierarchy' | 'spacing' | 'typography' | 'color' | 'consistency' | 'affordance';
    severity: 'blocking' | 'notable' | 'nit';
    what: string;        // რა არის მოსახერხებელი — კონკრეტული, გაზომვადი
    where: string;       // რომელი ელემენტი/არე
    why: string;         // რატომ აქვს მნიშვნელობა მომხმარებლისთვის
    suggestion: string;  // კონკრეტული ცვლილება, არა "consider improving"
  }>;
}
```

**Prompt-ის მკაცრი წესები:**
1. **დამოკიდებულება a11y-ზე არ დაიმეოროს** — დეტერმინისტული engine უკვე ამოწმებს კონტრასტს,
   target size-ს და ა.შ. Judge **სხვა ფენაა**: იერარქია, რიტმი, თანმიმდევრობა.
2. **ყოველი finding კონკრეტული უნდა იყოს** — "the CTA sits 8px from the card edge while every
   other element uses 16px", არა "spacing could be more consistent".
3. **თუ არაფერი აქვს სათქმელი — გაჩუმდეს.** ცარიელი `findings` სრულიად მისაღები პასუხია.
   ეს იგივე ფილოსოფიაა, რაც zero-false-positive-ის ბირთვში.
4. **ქულა არ გაბერო.** 5 იშვიათი უნდა იყოს.

### 8.3 მოდელის არჩევა

**გასაზომია და შემდეგ გადასაწყვეტი.** გაუშვი ორივე იმავე eval set-ზე და შეადარე:
- ხარისხი (§8.4-ის eval)
- ღირებულება ერთ ზარზე

Anthropic-ის მოდელების ID-ები და ფასები **სესიის დროს გადაამოწმე** — არ დაეყრდნო მეხსიერებას.
თუ `claude-api` skill ხელმისაწვდომია, გამოიყენე.

**Quota-ს ეკონომიკა:** $120/წელი. თუ ერთი judge $0.10 ჯდება, 1200 ზარი წლის შემოსავალს ჭამს.
⇒ Pro-ზეც უნდა იყოს გონივრული ლიმიტი (მაგ. 100/თვე), არა უსასრულო.

### 8.4 Eval — cutoff-ის კრიტერიუმი

**ეს არაა არჩევითი.** D24 ამბობს: "rubric + eval pass სავალდებულოა 'მზადაა'-ს განსაზღვრებაში."

1. შექმენი **10–15 fixture დიზაინი** (PNG + node-tree), სადაც პრობლემები **წინასწარ ცნობილია**:
   - 5 ცხადი პრობლემით (გატეხილი იერარქია, არათანმიმდევრული spacing, …)
   - 5 კარგი დიზაინი — judge-მა **არაფერი უნდა თქვას ან მხოლოდ nit**
   - 3–5 სასაზღვრო
2. გაუშვი judge თითოეულზე
3. **გასვლის კრიტერიუმი:**
   - ცხად პრობლემებზე: სწორი `dimension` და კონკრეტული `where` — ≥80%
   - კარგ დიზაინებზე: **არცერთი `blocking` finding** (ეს false-positive-ია და ჩვენს
     მთავარ დაპირებას არღვევს)
   - ყოველი `suggestion` კონკრეტული მოქმედებაა, არა ზოგადი რჩევა — ხელით შემოწმებით

**თუ eval არ გადის — judge launch-ში არ შედის.** ეს D24-ის ცალსახა პირობაა.

### 8.5 დასრულების კრიტერიუმი

- [ ] `/api/judge` — Pro OK, free ≤3, მე-4 free ზარი → 402
- [ ] quota counter იზრდება მხოლოდ **წარმატებულ** ზარზე (Anthropic-ის შეცდომა quota-ს არ ჭამს)
- [ ] Anthropic-ის timeout/error → სუფთა შეცდომა plugin-ს, quota უცვლელი
- [ ] strict schema — არასწორი პასუხი მოდელისგან retry-დება, არა user-ს გადაეცემა
- [ ] eval-ის შედეგი ჩაწერილია `docs/judge-eval.md`-ში (გავიდა თუ არა და რატომ)

---

## 9. Phase 5 — Plugin integration

### 9.1 Manifest

```json
"networkAccess": {
  "allowedDomains": ["https://api.legibly.design"],
  "reasoning": "Legibly checks and fixes designs on-device. The network is used only to verify a Pro licence, and — when you explicitly press AI Designer Judge — to send that one frame for review."
}
```
`devAllowedDomains` ლოკალური განვითარებისთვის.

**⚠️ Manifest-ს ასევე სჭირდება `"permissions": ["currentuser"]`** — `figma.currentUser` მის გარეშე
**სინქრონულად throw-ს აკეთებს**.

### 9.2 Token-ის შენახვა

```
figma.clientStorage key: "legibly_auth_token"
value: { token: string, expiresAt: number }   // ᲝᲑᲘᲔᲥᲢᲘ, არა სტრინგი
```
`clientStorage` მხოლოდ main thread-იდან ხელმისაწვდომია → UI iframe-მა RPC-ით უნდა გაიაროს.
**პროექტს უკვე აქვს typed RPC** — [`plugin/src/shared/rpc.ts`](../plugin/src/shared/rpc.ts).
გამოიყენე ის, ახალი postMessage არხი არ შექმნა.

**Token-ის ვალიდაცია ჩატვირთვისას:**
```ts
const TOKEN_SAFETY_MARGIN_MS = 60_000;
// ⚠️ Number.isFinite(expiresAt) ᲡᲐᲕᲐᲚᲓᲔᲑᲣᲚᲝᲐ — NaN typeof-ს "number"-ს აბრუნებს
//    და NaN - 60000 <= Date.now() false-ია ⇒ სამუდამოდ "ვალიდური" ნაგავი ტოკენი
```

### 9.3 UI ცვლილებები

| სად | რა |
|---|---|
| Footer "Free & Pro" modal | "Subscribe" ღილაკი → `/checkout/create` → `figma.openExternal(checkoutUrl)` |
| Footer | license pill: `Free` / `Pro · 312 days left` |
| ახალი | **"AI Designer Judge"** ღილაკი top bar-ში (screenshot-ზე ჩანს სად: Scan-ების გვერდით) |
| Judge modal | verdict-ის ჩვენება dimension-ებად დაჯგუფებით |
| Free user | Judge-ზე: "3 free reviews left" → ამოწურვისას upsell |
| Connect | თუ ტოკენი არაა — "Connect to Figma" ღილაკი (მხოლოდ Pro-ს ან Judge-ის დაჭერისას, არა startup-ზე) |

> ⚠️ **Connect არ უნდა იყოს ხელისშემშლელი.** Free scanning + fix უნდა მუშაობდეს **OAuth-ის
> გარეშე, როგორც დღეს**. Connect მხოლოდ მაშინ ჩნდება, როცა user Pro-ს ან Judge-ს ითხოვს.
> ეს პროდუქტის მთავარი ღირებულებაა — არ დაარღვიო.

### 9.4 License-ის განახლება — polling არ არის

w2w-ს **არ აქვს** license polling loop. `refresh()` სამ მოვლენაზე ხდება:
1. plugin-ის გახსნისას (ერთხელ)
2. quota/gate-ის შეცდომაზე
3. ხელით (Plans modal-ის გახსნა)

**გაიმეორე ეს.** ტაიმერი არ დაამატო — ის ბატარეასაც ჭამს და trust story-საც აზიანებს.

**გამონაკლისი:** checkout-ის შემდეგ, როცა user ბრაუზერიდან ბრუნდება — მოკლე poll (მაგ. 2 წამში
ერთხელ, 60 წამი) გამართლებულია, რომ Pro მაშინვე გამოჩნდეს.

### 9.5 დასრულების კრიტერიუმი

- [ ] plugin-ის **არსებული 312 ტესტი კვლავ მწვანეა**
- [ ] free scan + fix მუშაობს **ტოკენის გარეშე**
- [ ] `Number.isFinite` ვალიდაცია ტესტით დაფარულია
- [ ] 401 → ტოკენი იშლება, UI "Connect"-ზე ბრუნდება
- [ ] typecheck + build სუფთა

---

## 10. Phase 6 — Terms of Service + privacy

### 10.1 Terms გვერდი (`website/src/app/terms/page.tsx`)

სავალდებულო შიგთავსი:
1. **Tax-exclusive disclaimer** (D23 — VAT ჩვენზეა):
   > "Prices are exclusive of any local taxes (e.g. VAT) for which you may be responsible in your jurisdiction."
2. **Refund policy** — "ავტომატური დაბრუნება არ ხდება — მოგვწერეთ და მოვაგვარებთ"
   პრაქტიკაში ვინც ითხოვს, უბრუნდება: $12-ზე refund ($12) **ყოველთვის იაფია, ვიდრე
   chargeback** (~$42 + rate-ის გაფუჭება)
3. **Statutory rights clause** — EU-ს კანონისმიერი უფლებები არ იზღუდება
4. კონტაქტი: `billing@legibly.design`
5. მკაფიოდ: **ერთჯერადი გადახდაა, არაფერი განახლდება ავტომატურად**

### 10.2 Privacy-ის განახლება

[`website/src/app/privacy/page.tsx`](../website/src/app/privacy/page.tsx) დღეს ამბობს
*"The plugin makes no network requests of any kind"* + manifest-ის ციტატას. **ეს აღარ იქნება
სიმართლე.** გადაწერე:

- ქსელი გამოიყენება **მხოლოდ** ლიცენზიის შესამოწმებლად
- **დიზაინი ტოვებს Figma-ს მხოლოდ მაშინ, როცა user თავად აჭერს Judge-ს**
- რას ვაგზავნით judge-ზე: ერთი frame-ის სურათი + მისი სტრუქტურა. სხვა არაფერი.
- რამდენ ხანს ვინახავთ: **არ ვინახავთ** (ან თუ ვინახავთ — ზუსტად რამდენ ხანს და რატომ)
- Anthropic როგორც processor
- ⚠️ იქვე არსებული TODO: controller-ის იურიდიული სახელი და მისამართი (GDPR Art. 13(1)(a))

### 10.3 Plugin-ის copy

`App.tsx` და `FooterBar.tsx` ამბობენ *"Nothing ever leaves Figma."* — **ეს უნდა შეიცვალოს.**
ახალი ფორმულირება §3-შია.

### 10.4 Listing-ის copy

[`docs/listing-v0.1.md`](./listing-v0.1.md) განახლდეს — 10 SC, advisory tier და judge.

---

## 11. ტესტები — სავალდებულო

### 11.1 წესები

1. **ყოველი ფაზა ტესტებით სრულდება.** წითელი ტესტით commit არ ხდება.
2. **პროექტს აქვს მაღალი ბარიერი:** plugin-ს **312 ტესტი** აქვს, website-ს **32**.
   Backend-ისთვის ბარიერი იგივეა — **არ დაწერო "happy path"-ის ერთი ტესტი და გადახვიდე**.
3. **Vitest** ორივე პაკეტში (plugin-ი და website-იც მას იყენებენ).
4. **არსებული ტესტები არ გატეხო.** ყოველი ფაზის ბოლოს:
   ```bash
   cd plugin && npm test && npm run typecheck
   cd website && npm test && npx tsc --noEmit
   cd api && npm test && npm run typecheck
   ```

### 11.2 რა უნდა დაიფაროს აუცილებლად

| ფენა | ტესტები |
|---|---|
| **HMAC** | sign/verify round-trip · გაყალბებული ხელმოწერა · ვადაგასული · დამახინჯებული ფორმატი · სიგრძის შეუსაბამობა |
| **OAuth** | state mismatch · nonce-ის ერთჯერადობა · nonce-ის TTL · `/me`-ს IDOR |
| **Flitt sign** | ცნობილი ვექტორი · `0`-ის შენარჩუნება · `""`-ის ამოგდება · სორტირება გასაღებით · ჩალაგებული ობიექტი · `\|`-ის injection · object-ის უარყოფა |
| **Webhook** | approved → Pro · declined → ცვლილება არ ხდება · dedup · amount mismatch · currency mismatch · order_id prefix · lease-ის გათავისუფლება შეცდომაზე · ვალიდაცია lease-ამდე |
| **Stacking** | ჭერი · იატაკი (არ ამცირებს) · `already_pro` |
| **Judge** | Pro OK · free 3 → 402 მე-4-ზე · quota მხოლოდ წარმატებაზე · schema-ს ვალიდაცია · Anthropic error |
| **Plugin** | არსებული 312 · ტოკენის `Number.isFinite` · 401 recovery · free flow ტოკენის გარეშე |

### 11.3 Integration ტესტი (ერთი, სრული)

Fixture-ებით ბოლომდე: OAuth → ტოკენი → checkout → webhook (approved) → `/license/me` აბრუნებს
`plan: "pro"`-ს სწორი `cycleEndsAt`-ით.

---

## 12. Final goal — რა უნდა იყოს ბოლოს

### 12.1 Definition of done

**ყველა ქვემოთ ჩამოთვლილი ჭეშმარიტია:**

1. ✅ Figma plugin-ის მომხმარებელი აჭერს "Connect to Figma"-ს, გადის OAuth-ს და უბრუნდება
   plugin-ს დაკავშირებული
2. ✅ აჭერს "Subscribe"-ს → ბრაუზერში იხსნება Flitt-ის checkout → იხდის $120 (ან $12) →
   plugin-ში **60 წამში** Pro ჩნდება
3. ✅ Webhook-ის ხელახალი მოსვლა (Flitt-ის retry) **არ** აძლევს ორმაგ ვადას
4. ✅ Free user აჭერს "AI Designer Judge"-ს → იღებს კონკრეტულ, გამოსადეგ verdict-ს →
   3 საცდელის შემდეგ ხედავს upsell-ს
5. ✅ Pro user judge-ს ლიმიტის ფარგლებში იყენებს
6. ✅ Free scan + fix მუშაობს **ტოკენის და ინტერნეტის გარეშე** — როგორც დღეს
7. ✅ Terms და Privacy ასახავს რეალობას (VAT, refund, რა ტოვებს Figma-ს და როდის)
8. ✅ ყველა ტესტი მწვანე: plugin (≥312) + website (≥32) + api (ახალი)
9. ✅ `manifest.json`-ის `allowedDomains` = **მხოლოდ** `api.legibly.design`
10. ✅ არცერთი secret არ არის კოდში ან git-ის ისტორიაში

### 12.2 რას ვზომავთ წარმატებას

> **პროდუქტი უნდა დარჩეს ისეთივე სანდო, როგორიც დღეს არის.**
>
> Legibly-ის მთელი პოზიციონირება ეყრდნობა იმას, რომ ის **დეტერმინისტულია და არაფერს იგონებს.**
> Backend-მა ეს არ უნდა შეასუსტოს:
> - ქსელი მინიმალურია და ახსნადი
> - AI-ის ფენა **ცალკეა** და **არჩევითი** — ბირთვი მის გარეშეც სრულფასოვანია
> - Judge, თუ არაფერი აქვს სათქმელი, ჩუმად რჩება
>
> თუ რაიმე გადაწყვეტილება ამ სამს ეწინააღმდეგება — **ის არასწორი გადაწყვეტილებაა**,
> რაც არ უნდა მოსახერხებელი იყოს.

### 12.3 რა არ შედის ამ სამუშაოში

- ❌ Recurring/subscription (Flitt-ს ჯერ არ აქვს ჩართული — D23)
- ❌ Website-ზე "Sign in" (D21 — რეგისტრაცია არ არსებობს)
- ❌ Team/seat-ები (D20-ში მოხსნილია)
- ❌ Analytics ან error tracking plugin-ში
- ❌ AI alt-text-ის დაბრუნება (D22; D24 **მხოლოდ judge-ს** ეხება)
- ❌ Resend/waitlist (user-ის მხარეზეა)
- ❌ `website-new-design/`-ის რედიზაინი

---

## 13. რა სჭირდება user-ისგან (👤)

**ეს ყველაფერი კოდის დაწერას არ აჩერებს** — env vars ბოლოს ჩაისმება.
როცა credential-ს მიაღწევ, გააჩერე და მოთხოვე.

| # | რა | სად |
|---|---|---|
| 1 | **Figma app registration** → `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET` | figma.com → Settings → Developers |
| 2 | Redirect URI-ის რეგისტრაცია: `https://api.legibly.design/api/auth/figma/callback` | იქვე |
| 3 | **Flitt portal:** Legibly-ის ცალკე product, `order_id` prefix `lgb_` | Flitt merchant portal |
| 4 | `server_callback_url` რეგისტრაცია: `https://api.legibly.design/api/webhooks/flitt` | იქვე |
| 5 | `FLITT_MERCHANT_ID`, `FLITT_SECRET_KEY` | Vercel env vars — **კოდში არასდროს** |
| 6 | `ANTHROPIC_API_KEY` | Vercel env vars |
| 7 | **Vercel:** ახალი პროექტი `api/`-სთვის + subdomain `api.legibly.design` | Vercel dashboard |
| 8 | **DNS:** `CNAME api` → Vercel | Namecheap Advanced DNS ⚠️ MX-ს ხელი არ ახლო |
| 9 | **Postgres** provisioning (Vercel Storage, free tier) | Vercel dashboard |
| 10 | `AUTH_SECRET`, `ADMIN_TOKEN` გენერაცია (≥32 სიმბოლო) | `openssl rand -base64 32` |

---

## 14. ხაფანგები — წაიკითხე კოდის წერამდე

> ეს სია w2w-ის **რეალური ბაგებიდან** მოდის. თითოეული უკვე დაჯდა ვინმეს.

### 14.1 Flitt-ის ხელმოწერა

1. **secret პირველი ელემენტია**, არა HMAC key. შეცდომა სიჩუმეშია — მხოლოდ 400 Flitt-ისგან.
2. **მნიშვნელობები იწერება, გასაღებებით სორტირდება.** მნიშვნელობებით სორტირება
   დამაჯერებლად არასწორ ხელმოწერას იძლევა.
3. `localeCompare` ≠ codepoint sort. ამჟამინდელ lowercase-ASCII ველებზე ემთხვევა, მაგრამ
   პორტირებისას დააფიქსირე ordinal და გადაამოწმე რეალურ payload-ზე.
4. **`0` რჩება, `""` იშლება.** truthiness-ის ფილტრი `amount: 0`-ს და `false`-ს წაშლიდა.
5. **`response_signature_string` აუცილებლად ამოიშალოს** — ეს Flitt-ის debug echo-ა თავად
   concat სტრინგისა; მისი დატოვება ყოველ webhook-ს ამტვრევს.
6. `merchant_data` მავთულზე **JSON სტრინგია**, არა ობიექტი.
7. Verify-მდე უარყავი object/array მნიშვნელობები და ყველაფერი, რაც `\|`-ს შეიცავს.
8. `timingSafeEqual` არათანაბარ სიგრძეზე **throw-ს აკეთებს** — სიგრძე ჯერ შეამოწმე.

### 14.2 თანხები

9. **ცენტებია:** monthly `1200`, yearly `12000`. Flitt სტრინგადაც შეიძლება დააბრუნოს → `Number()`.
10. Currency მხოლოდ USD, case-insensitive.
11. `order_desc` **ხელმოწერილი მნიშვნელობაა** — em dash (`—`) და UTF-8 encoding-ის ნებისმიერი
    დრეიფი ხელმოწერას ცვლის.

### 14.3 Webhook

12. **არასდროს 4xx/5xx.** ყოველი უარი 200-ია.
13. **ვალიდაცია lease-ამდე, mutation lease-ის შემდეგ.**
14. Duplicate key-ზე **გაანულე ლოკალური `transactionId`** სანამ დაბრუნდები — თორემ outer catch
    კონკურენტი მოთხოვნის lease-ს წაშლის.
15. **Email-ის გაგზავნა mutation-ის შიგნით იზოლირებული უნდა იყოს.** w2w-ში `RESEND_API_KEY`-ის
    არარსებობის throw-მ lease გაათავისუფლა **Pro-ს გაცემის შემდეგ** → Flitt-მა გაიმეორა →
    user-მა $16-ში 60 დღე მიიღო.
16. `applyRefund` მხოლოდ მაშინ აუქმებს, როცა `flitt_order_id` ემთხვევა მიმდინარეს.
    **`already_pro` (checkout) და ჭერი (webhook) ორივე უნდა გადმოიტანო — ცალკე არცერთი არ მუშაობს.**

### 14.4 Serverless

17. **In-memory `Map` არ იმუშავებს.** w2w-ის `pendingPluginAuth` და `revokedTokens` მეხსიერებაშია
    — Vercel-ზე ეს გატყდება. Store-ში გადაიტანე.
18. `req.ip` სანდოა მხოლოდ სწორი proxy-ის კონფიგურაციით. Vercel-ზე გამოიყენე
    `x-forwarded-for`-ის სწორი პარსინგი, თორემ IP allowlist გვერდს უვლის და rate limit ერთ ვედროდ იქცევა.

### 14.5 Plugin

19. `figma.currentUser` **სინქრონულად throw-ს აკეთებს** `"permissions": ["currentuser"]`-ის გარეშე.
20. `expiresAt` მავთულზე ISO სტრინგია, ინახება epoch ms-ად. `new Date(x).getTime()` არასწორ
    სტრინგზე `NaN`-ს იძლევა → `Number.isFinite` **სავალდებულოა**.
21. Plugin-ის iframe-ის `Origin` არის **არარსებული ან სიტყვასიტყვით `"null"`** — CORS-ის
    გულუბრყვილო allowlist plugin-ს დაბლოკავს.
22. `clientStorage`-ში ინახება **ობიექტი**, არა სტრინგი.

### 14.6 OAuth

23. **სესია აუცილებლად შეინახე Figma-ზე გადამისამართებამდე** (`await save()`). უკვე ავტორიზებული
    user-ის მყისიერი 302 async ჩაწერას უსწრებს → ყოველი callback "Invalid state"-ით ვარდება.
24. Nonce-ის TTL (5 წთ) და plugin-ის poll-ის ვადა (3 წთ) **სხვადასხვაა** — ნელი login პარკავს
    ტოკენს, რომელსაც ვერავინ იბარებს. ან გაასწორე, ან ცალსახად დააფიქსირე.
25. Clock skew-ის დათმობა არსად არაა. Plugin-ის `TOKEN_SAFETY_MARGIN_MS`-ს ენდობა.

---

## 15. სად დაიწყო — პირველი ხუთი წუთი

```bash
git checkout main && git pull
git checkout -b backend/flitt-oauth-judge

cd plugin && npm test        # ← 312 მწვანე უნდა იყოს. ეს შენი საბაზისო ხაზია.
cd ../website && npm test    # ← 32 მწვანე
```

მერე Phase 1 (§5). ყოველი ფაზის ბოლოს — ტესტები, typecheck, commit.

**როცა credential-ს მიაღწევ (§13) — გააჩერე და user-ს მოთხოვე. არ გამოიგონო placeholder,
რომელიც პროდაქშენში წავა.**
