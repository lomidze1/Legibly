# checks-expansion.md — რისი შემოწმება შეგვიძლია დამატებით

> **სტატუსი:** ✅ **Waves 1–3 shipped 2026-07-26** ([D16](./approach.md) · [D17](./approach.md) · [D18](./approach.md)). Coverage 5 → **10 SC** + advisory tier. Grounding: [requirements.md §2](./requirements.md) deferred roadmap, [research/wcag-detection-architecture.md §1](./research/wcag-detection-architecture.md) automatability table, [approach.md D12–D15](./approach.md), [test-findings-v03.md](./test-findings-v03.md).

---

## 1. სად ვართ ახლა (ფაქტი, კოდიდან)

**Shipped checks — 5 SC** (`plugin/src/shared/scan.ts`):

| SC | რას ამოწმებს | Tier ლოგიკა | Auto-fix |
|----|--------------|-------------|----------|
| **1.4.3** Contrast | ტექსტი vs effective background (fill stacks, opacity, z-order, gradient whole-range sampling, pixel deep-check) | flat solid → violation · gradient straddle / image / blend → needsReview | ✅ token snap + verify loop |
| **1.4.12** Text spacing | authored line-height < 1.5× | ყოველთვის needsReview | ✅ "150%" + overflow guard |
| **2.5.8** Target size | interactive target < 24×24 + spacing exception | prototype reaction → violation · name hint → needsReview | ✅ auto-layout min-size |
| **1.4.11** Non-text contrast | **მხოლოდ** interactive target-ების icon/border | certain target + all-fail → violation · სხვა → needsReview | ✅ იგივე token engine |
| **1.1.1** Alt text | content-sized image fills — **presence only** | ყოველთვის needsReview | ✅ manual / decorative / BYOK AI draft |

**საბოლოო გეგმა (requirements §2) რაც დარჩა:** system-strict token enforcement (v1.0), brand-QA vision (v2), MCP server (v2). ანუ **a11y check-ების roadmap ფაქტობრივად ამოიწურა** — v0.1→v0.3 ყველა დაგეგმილი SC ჩაბარდა. ეს დოკუმენტი ავსებს იმ ვაკუუმს.

**⚠️ ღია ვალი (ახალ check-ებამდე):** D15/B2 — `harvestTokens` ჯერ კიდევ არ ფილტრავს "Legibly" collection-ს (`plugin/src/main/tokens.ts:67`), ანუ ჩვენივე proposal ტოკენები user-ის ფერებად ბრუნდება. B6 (bg-fix უხილავია) ასევე ღიაა. F1/F5 UI (grouping + footer) uncommitted-ია work-in-flight.

---

## 2. რატომ ჩანს "მხოლოდ ტექსტი და alt"

არა coverage-ის, არამედ **scope-ის** გამო:
- **1.4.11** მუშაობს მხოლოდ იმ ელემენტებზე, რომლებსაც prototype reaction ან "button/link/tab..." სახელი აქვს. Imported/real ფაილში ასეთი ცოტაა → შედეგებში თითქმის არ ჩანს.
- **2.5.8** იგივე ფილტრს ეყრდნობა.
- **1.4.12** მხოლოდ line-height-ს ეხება.

ანუ **უახლოესი გაუმჯობესება coverage-ის შეგრძნებაზე არის არსებული check-ების scope-ის გაფართოება, არა მხოლოდ ახალი SC-ები.**

---

## 3. კანდიდატები — რისი შემოწმება შეგვიძლია პატიოსნად

Legend: **D** = deterministic (violation-eligible) · **P** = deterministic suspicion (needsReview only) · **A** = advisory (არა WCAG conformance)

### 🥇 S1 — Variable modes / dark mode contrast · **D** · SC 1.4.3 + 1.4.11 — ✅ SHIPPED (D16)
**პრობლემა:** `resolveVariableColor` მხოლოდ `collection.defaultModeId`-ს კითხულობს (`tokens.ts:57`). ფაილს რომ ჰქონდეს Light/Dark modes, **ჩვენ მხოლოდ ერთ თემას ვამოწმებთ**. დიზაინერები რეგულარულად უშვებენ dark theme-ს გატეხილი კონტრასტით — და ამას **ვერცერთი კონკურენტი ვერ იჭერს** (Stark-იც current mode-ზე ზომავს).
**როგორ:** `variable.valuesByMode` × node-ის `resolvedVariableModes` — ყოველი mode-ისთვის ხელახლა resolve + იგივე მათემატიკა. **ახალი judgment არ ჩნდება — მხოლოდ მეტი sample.**
**Fix:** არსებული multi-sample კონტრაქტი (`minRatioOver`, გრადიენტიდან) იმეორებს თავს — კანდიდატი უნდა გავიდეს **ყველა mode-ში**.
**FP რისკი:** ნული (მათემატიკა). Fill რომ variable-ზე არ არის მიბმული — mode-invariant-ია, უცვლელი ქცევა.
**ღირებულება:** 🔥 headline demo ("your dark mode fails in 12 places"), moat, zero-judgment. **ღირებულება/ღირებულების საუკეთესო თანაფარდობა მთელ სიაში.**
**ღირებულება (cost):** საშუალო-მაღალი — mode plumbing main thread-ში; scan pipeline უკვე multi-sample-aware-ია.

### 🥈 S2 — Platform target floors · **D** · SC 2.5.5 (AAA) + iOS — ✅ SHIPPED (D16)
**რა:** იგივე გეომეტრია, სხვა ზღვარი: 24 (AA) / 44 (AAA, iOS HIG) / 48 (Android Material). Settings toggle.
**Cost:** ~მინიმალური (ერთი კონსტანტა + UI). requirements §2-ში პირდაპირ გადადებულია ("44/48 platform floors — later").
**ღირებულება:** მობილურ დიზაინერებზე მყისიერი; "quick win" wave-ის შესავსებად.

### 🥉 S3 — Use of Color (ბმულები) · **P** · SC 1.4.1 (Level **A**) — ✅ SHIPPED (D17)
**რა:** აბზაცის შიგნით ფერით გამორჩეული ტექსტის მონაკვეთი, რომელსაც **ხაზგასმა არ აქვს** = კლასიკური "link is color-only" ჩავარდნა.
**როგორ:** `getRangeFills` / `getRangeTextDecoration` — მონაკვეთი, რომლის fill განსხვავდება მშობელი run-ისგან და `textDecoration === 'NONE'`. **მკაცრად აბზაცის შიგნით** scope-ით FP პრაქტიკულად არ რჩება (დამოუკიდებელ ტექსტს — წითელ error label-ს — არ ვეხებით, ის მართლაც judgment-ია).
**Fix:** ✅ **ერთი კლიკი — underline.** დეტერმინისტული, verify-ადი, "correctness-by-construction" სუფთა ქეისი.
**ღირებულება:** ახალი **Level A** კრიტერიუმი + ნამდვილი auto-fix. Cost: დაბალი-საშუალო.

### S4 — Clipped / truncated text · **D** · SC 1.4.10 (design-time signal) — ✅ SHIPPED (D17)
**რა:** ტექსტი, რომელიც უკვე მოჭრილია (`textTruncation: 'ENDING'`, fixed-size + overflow, `clipsContent` მშობელი) ან რომელიც 1.4.12 spacing override-ზე გატყდება.
**როგორ:** გეომეტრია — content bounds vs node bounds vs მშობლის clip.
**ბონუსი:** ეს არის **იგივე პრიმიტივი, რაც B8-ის overflow guard-ს სჭირდება** — ერთი ინვესტიცია, ორი შედეგი.
**ღირებულება:** სცდება a11y-ს — ეს "დიზაინის ბაგია", რომელიც ყველა დიზაინერს აღიზიანებს → ფართო appeal. Cost: დაბალი-საშუალო.

### S5 — Form label presence · **P** · SC 2.4.6 (presence მხოლოდ) — ✅ SHIPPED (D18)
**რა:** input-ის მსგავსი frame (stroke + ერთი ტექსტი, ან `input|field|textbox|select` სახელი), რომელსაც ზემოთ/მარცხნივ label ტექსტი არ აქვს → "placeholder as label".
**Tier:** მხოლოდ needsReview. **FP რისკი: საშუალო** — სახელობით ევრისტიკაზეა დამოკიდებული (იგივე სისუსტე, რაც 2.5.8-ს აქვს).
**ღირებულება:** ძალიან გავრცელებული რეალური ჩავარდნა; auto-fix არ აქვს (label-ის ტექსტი judgment-ია).

### S6 — Focus state capability · **P** · SC 2.4.7 — ✅ SHIPPED (D18)
**რა:** component set, რომელსაც აქვს `hover`/`pressed` ვარიანტები, მაგრამ **არა `focus`** → needsReview "focus state not defined". თუ focus ვარიანტი არსებობს — მისი indicator გაიაროს 3:1-ზე (არსებული 1.4.11 engine).
**Tier:** მხოლოდ needsReview, და **მხოლოდ იმ component set-ებზე, რომლებსაც state ვარიანტები უკვე აქვთ** (სხვაგვარად ხმაური იქნება).
**ღირებულება:** design-system governance-ის სუნი — ეს არის ხიდი "system-strict" expansion module-თან (goal.md §0). Cost: საშუალო.

### A1/A2 — Advisory bucket (არა WCAG conformance) — ✅ SHIPPED (D18)
- **A1 Font size floor** (<12px body) — ✅ ცალკე `advisory` tier, `sc: "Best practice"`, CSV-ში "Advisory (not WCAG)", issue count-ებში არ ითვლება.
- **A2 Line length** (>80 სიმბოლო, SC 1.4.8 AAA) — ❌ **უარვყავით:** Figma-დან მხოლოდ შეფასებით იზომება (box width ÷ fontSize × 0.45–0.6), ანუ 80-სიმბოლოიან ზღვართან ~64–100 რეალურ სიმბოლოს დავაფლაგებდით. მიახლოებითი advisory, რომელიც არასწორად ირთვება, უარესია ვიდრე მისი არარსებობა.
**პირობა (შესრულდა):** ზის **ცალკე "Legibly recommends" სექციაში**, WCAG findings-ისგან მკვეთრად გამიჯნული — თორემ ზუსტად იმ marketing-არაპატიოსნებას ჩავდივართ, რომელსაც detection research §1 გვიკრძალავს.

---

## 4. რასაც **არ** უნდა შევეხოთ

| რა | რატომ არა |
|----|-----------|
| Reading order, focus order, reflow, ARIA, status messages | სტატიკური Figma ფაილიდან სტრუქტურულად განუსაზღვრელი — footer-ში პატიოსნად წერია |
| Free-floating graphics 1.4.11 | "meaningful vs decorative" judgment — განზრახ გამორიცხულია (D12) |
| Alt text **ხარისხის** ავტომატური ვერდიქტი | D14-ის trust discipline — ჩვენ presence-ს ვამოწმებთ, ხარისხს user წყვეტს |
| Off-system token enforcement | v1.0 scope; FigmaLint ამას უფასოდ აკეთებს — არ ვებრძოლოთ ახლა |

---

## 5. რეკომენდებული თანმიმდევრობა

```
Wave 0 (ვალის დახურვა)  ✅ SHIPPED (D19) — F1/F5 UI ისევ in-flight
  └─ D15/B2 harvest ფილტრი ✅ + B6 bg-fix ხილვადობა ✅

Wave 1 "Dark mode, checked right"  ✅ SHIPPED (D16, დასრულდა D19-ით)
  ├─ S1 variable modes (1.4.3 + 1.4.11 ყველა mode-ზე) + ModeGuard fix safety
  ├─ S2 tap-target floor 24 (SC 2.5.8) / 44 (SC 2.5.5 · iOS)
  └─ mode-aware auto-fix ✅ (D19) — კანდიდატი ყველა თემას უნდა გადიოდეს

Wave 2 "ახალი კრიტერიუმები"  ✅ SHIPPED (D17)
  ├─ S3 1.4.1 colour-only run + one-click underline
  └─ S4 clipped text (გეომეტრია; auto-fix შეგნებულად არ აქვს)
      ↳ დარჩა: fixed-size ტექსტის შიგთავსის overflow (მუტაციას საჭიროებს — იხ. B8 guard)

Wave 3 "Governance + advisory"  ✅ SHIPPED (D18)
  ├─ S5 form labels (2.4.6) · S6 focus states (2.4.7)
  └─ advisory tier + A1 small text ("Legibly recommends" სექცია)
      ↳ A2 line length უარვყავით — გაზომვა ზედმეტად მიახლოებითია
```

**Coverage არითმეტიკა (ფაქტი):** 5 → **10 SC** — 1.4.3 · 1.4.12 · 1.4.11 · 1.1.1 · 2.5.8 · 2.5.5 · 1.4.1 · 1.4.10 · 2.4.6 · 2.4.7, პლუს 1.4.3/1.4.11 ყველა variable mode-ზე და ცალკე advisory tier. Listing-ისთვის ეს რეალური, გადამოწმებადი რიცხვია.

**რაც შეგნებულად არ გავაკეთეთ:** Wave 3-ის არცერთ check-ს auto-fix არ აქვს — label-ის ტექსტი, focus-ring-ის დიზაინი და ფონტის ზომა შინაარსობრივი გადაწყვეტილებებია, არა deterministic snap. "Fix" აქ გამოცნობა იქნებოდა, რასაც D7-ის #1 წესი კრძალავს.
