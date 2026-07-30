# spike/dodo — ჯდება თუ არა Dodo ჩვენს `figmaUserId → license` მოდელში?

> **სტატუსი:** 🧪 SPIKE — 2026-07-31. **არ არის production კოდი და არაფერზეა მიბმული.**
> ერთადერთი მიზანი: `launch-stack.md §4`-ის vendor-ის კითხვაზე ("ინტეგრაცია მარტივია თუ არა?")
> რეალური პასუხის მიღება, სანამ გადავწყვეტთ. თუ Dodo-ს არ ავირჩევთ — ეს საქაღალდე იშლება.

---

## რას ამტკიცებს

```bash
npm test
```

```
✓ a forged body is rejected by the SDK verifier
✓ subscription.active grants Pro and records the period end
✓ a redelivered webhook is a no-op
✓ renewal pushes the period end forward
✓ a failed charge (on_hold) keeps Pro while dunning runs
✓ a late-arriving stale event cannot downgrade newer state
✓ cancellation keeps Pro until the paid period ends, then lapses on read
✓ expiry drops the plan to free
✓ a subscription with no figma_user_id is refused, not half-applied
✓ an unknown Figma user reads as free without a stored row

10/10 passed
```

**ეს ტესტი account-ს არ საჭიროებს** — payload-ებს იმავე Standard Webhooks სქემით ვაწერთ ხელს,
რომელსაც Dodo იყენებს, და ვამოწმებთ **ნამდვილი SDK-ის verifier-ით**.

---

## მთავარი აღმოჩენა: `metadata`

Dodo-ს checkout session იღებს თვითნებურ `metadata`-ს და **უცვლელად აბრუნებს ყოველ subscription webhook-ში**:

```ts
await dodo.checkoutSessions.create({
  product_cart: [{ product_id: PRODUCT_ID, quantity: 1 }],
  return_url: RETURN_URL,
  metadata: { figma_user_id: figmaUserId },   // ← მთელი binding ერთ ხაზშია
});
```

ამის შედეგები:

- **license key არ არსებობს.** არც გენერაცია, არც email-ით გაგზავნა, არც `/activate` endpoint,
  არც seat-binding — მომხმარებელს არსად არაფრის ჩასმა არ უწევს. checkout-იდან პლაგინში დაბრუნება
  და Pro უკვე ჩართულია.
- ეს **მთელ ერთ ფენას შლის** იმ გეგმიდან, რომელიც D21-ის პირველ ვერსიაში იყო აღწერილი.

## რაც სპეციალურად **არ** არის აქ

| | რატომ |
|---|---|
| **Figma OAuth** | სპაიკის endpoint-ები `figmaUserId`-ს ბრმად ენდობიან. რეალურში ეს დაუშვებელია — [D21](../../docs/approach.md) ხსნის რატომ (w2w-ის რეალური იმპერსონაციის ხვრელი). |
| ნამდვილი DB | `Map` მეხსიერებაში. სქემა (`src/store.ts`) იმდენად პატარაა, რომ ნებისმიერ store-ზე გადადის. |
| Usage counter | **Legibly-ს არ სჭირდება.** w2w ითვლის import-ებს, რადგან თითოეული სერვერს უჯდება. Legibly-ს Free = ულიმიტო detection, Pro = fix — და fix **პლაგინში** სრულდება. ე.ი. მხოლოდ entitlement-ია საჭირო, არა კვოტა. |

---

## ფაილები

| | |
|---|---|
| `src/store.ts` | license-ის მოდელი + **lazy expiry** (cron-ის გარეშე, w2w-ის ხერხი) |
| `src/handle-event.ts` | ერთადერთი ბიზნეს-ლოგიკა: Dodo event → license. HTTP-სა და SDK-ისგან თავისუფალი. |
| `src/server.ts` | 3 endpoint: `POST /api/checkout/create`, `POST /api/webhooks/dodo`, `GET /api/license/me` |
| `src/selftest.ts` | ზემოთა 10 შემოწმება, offline |

---

## ცოცხალ sandbox-ზე გასაშვებად (საჭიროებს account-ს)

1. რეგისტრაცია [dodopayments.com](https://dodopayments.com) — **ეს user-ის ქმედებაა**
2. Dashboard → **Test mode** → Products → subscription product, $12/month
3. Dashboard → Developer → API Keys → test key
4. `cp .env.example .env` და შეავსე (`.env` gitignore-შია — key არსად არ ჩაიდება)
5. webhook endpoint-ს საჯარო URL სჭირდება: `ssh -R 80:localhost:4242 nokey@localhost.run`,
   მიღებული მისამართი → Dashboard → Webhooks (`/api/webhooks/dodo`), signing secret → `.env`
6. `npm start`, მერე:

```bash
curl -X POST localhost:4242/api/checkout/create -H 'content-type: application/json' -d '{"figmaUserId":"test-user-1"}'
```

`checkoutUrl` გახსენი, გადაიხადე Dodo-ს ტესტ-ბარათით, და:

```bash
curl "localhost:4242/api/license/me?figmaUserId=test-user-1"
```

`plan` უნდა იყოს `"pro"`.

---

## რაც ამ სპაიკს **არ** შეუძლია გაარკვიოს

- მიიღებს თუ არა Dodo ქართველ ინდ. მეწარმეს რეალურ KYC-ზე
- payout-ის რეალური ციკლი / reserve
- საერთაშორისო ბარათის ნამდვილი განაკვეთი

ეს სამი მხოლოდ რეგისტრაციით გაირკვევა — იხ. [`launch-stack.md §4`](../../docs/launch-stack.md).
