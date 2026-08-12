# admin-panel.md — Legibly-ის ადმინ პანელი და სტატისტიკა

> **სტატუსი:** 🟢 აშენებულია (2026-08-12, Phase 7) — `api/src/routes/admin/`
>
> ერთი გვერდი, საიდანაც ჩანს ვინ იყენებს, ვინ იხდის, რა ჩავარდა — და საიდანაც შეიძლება
> ლიცენზიის ჩუქება ან გაუქმება.

---

## 1. როგორ გავხსნათ

```
https://api.legibly.design/api/admin/panel#token=<ADMIN_TOKEN>
```

- `ADMIN_TOKEN` უკვე სავალდებულო env var-ია (`src/config/env.ts`), production-ში ≥32 სიმბოლო.
- ტოკენი **fragment-შია** (`#`), რომელსაც ბრაუზერი სერვერს არ უგზავნის — ანუ access log-ში
  არასოდეს ხვდება. გვერდი მას JS-ით კითხულობს და `Authorization: Bearer`-ად აგზავნის.
- გვერდი თავად უსაფრთხოა ტოკენის გარეშეც: ის ცარიელი ჭურვია — არც ერთი ციფრი მასში არ არის
  ჩაშენებული. CSP-ით ჩაკეტილია (`connect-src 'self'`, `frame-ancestors 'none'`).

curl-ისთვის იგივე მუშაობს `X-Admin-Token`-ითაც:

```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" https://api.legibly.design/api/admin/stats
```

---

## 2. Endpoint-ები

ყველა ერთ serverless ფუნქციაშია — `api/admin/[...path].ts`.

| Route | რას აბრუნებს |
|---|---|
| `GET /api/admin/panel` | HTML გვერდი (ტოკენის გარეშე) |
| `GET /api/admin/stats` | ყველა ციფრი: users, revenue, payments, conversion, judge, 30-დღიანი დღიური სერია |
| `GET /api/admin/users` | ლიცენზიების სია — `search`, `plan`, `paid`, `sort`, `page`, `limit` |
| `GET /api/admin/users.csv` | იგივე ფილტრებით, CSV (მაქს. 5000 row) |
| `GET /api/admin/user?figmaUserId=` | ერთი მომხმარებლის სრული სურათი: ლიცენზია + activity + payments + audit |
| `GET /api/admin/payments` | webhook-ების feed — `status=approved\|declined\|expired\|reversed` |
| `GET /api/admin/activity` | usage events feed — `kind=checkin\|checkout_created\|…` |
| `POST /api/admin/license` | `{figmaUserId, action: grant\|revoke, duration?, days?, reason}` |

**⚠️ Vercel function budget.** `api/`-ში ახლა **13 ფაილია** — Hobby-ს ჭერი 12-ია. თუ პროექტი
Hobby-ზეა, deploy-მდე ან Pro-ზე უნდა ავიდეს, ან `checkout/success.ts` + `checkout/cancel.ts`
უნდა გაერთიანდეს ერთ ფუნქციად (ორივე უკვე ერთ `src/routes/checkout/return.ts`-ს ეძახის).
სწორედ ამიტომაა მთელი admin ერთ catch-all-ში და არა 8 ცალკე ფაილად.

---

## 3. მონაცემები (migration `004_admin.sql`)

```bash
psql "$DATABASE_URL" -f api/migrations/004_admin.sql
```

**`usage_events`** — metadata only. Plugin-ის manifest გვპირდება, რომ დიზაინის მონაცემი არ
იგზავნება; ეს ცხრილი იმგვარადაა შედგენილი, რომ ვერც შეინახოს: kind, ok, და მოკლე `detail`
ფიქსირებული ლექსიკონიდან (`monthly`, `pro`, `declined`). **არასოდეს ჩასვა აქ ფაილიდან/ნოდიდან
წამოღებული არაფერი.**

| kind | სად იწერება |
|---|---|
| `checkin` | `GET /api/license/me` — დღეში ერთი row თითო user-ზე (partial unique index) |
| `checkout_created` | `POST /api/checkout/create` (`ok=false` თუ Flitt ჩავარდა) |
| `checkout_paid` / `checkout_refunded` / `checkout_failed` | Flitt webhook |
| `judge_call` | `/api/judge` — verdict-ის შემდეგ, ან `ok=false` refusal/outage-ზე |

**`license_audit`** — ყველა ცვლილება ლიცენზიაზე. Admin action-ი audit row-ს წერს **ჯერ**, და
მხოლოდ შემდეგ ცვლის ლიცენზიას: თუ audit ჩავარდა, ცვლილება საერთოდ არ ხდება
(`tests/adminLicense.test.ts`).

---

## 4. Grant / Revoke სემანტიკა

- **Grant monthly/yearly** — იგივე არითმეტიკა, რაც ყიდვას აქვს (`computeCycleEnd`): დღეები
  ეხვევა დარჩენილს, იმავე ჭერით. ანუ ჩუქება ვერ გახდება ceiling-ის გვერდის ავლის გზა.
- **Grant N days** — პირდაპირ: დარჩენილს (ან `now`-ს) + N დღე. 1…3650.
- **Revoke** — `plan=free`, `status=expired`, `cycle_ends_at=now`.
- ჩუქებულ ლიცენზიას `flitt_order_id`-ს პრეფიქსი `adm_` აქვს, ამიტომ **revenue-ში და
  conversion-ში არ ითვლება**.
- `reason` სავალდებულოა (≥3 სიმბოლო) — პანელი მის გარეშე არ აგზავნის, backend არ იღებს.

---

## 5. რა ითვლება როგორ

| მეტრიკა | წყარო |
|---|---|
| Pro (live) | `plan='pro' AND cycle_ends_at > now()` — შენახული სვეტი არ არის საკმარისი |
| Active 7d/30d | `usage_events.kind='checkin'`-ის distinct users |
| Gross / Net | `webhook_events.amount_cents` — `approved` მინუს `reversed` |
| Conversion 30d | ბოლო 30 დღეში შექმნილი ლიცენზიები, რომლებმაც გადაიხადეს (`adm_` გამორიცხულია) |
| Daily series | `generate_series` ბოლო 30 დღეზე — **UTC დღეები** |

Revenue-ს ბოლო სიმართლე Flitt-ის settlement report-ია; ეს ციფრები ჩვენი webhook-ების ჩანაწერია.
