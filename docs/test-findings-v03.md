# v0.3 Field Test — findings (2026-07-16)

პირველი ტესტირება რეალურ ფაილზე (web2wireframe imported design). Სტატუსი: ტესტირება გრძელდება,
fix-ები ერთ batch-ად შესრულდება ტესტის დასრულების შემდეგ (user-თან შეთანხმებული).

---

## Bugs (კოდის დონეზე დადასტურებული)

| # | ბაგი | Root cause | Fix |
|---|------|-----------|-----|
| B1 | `in createVariable: duplicate variable name` — new-color accept ვარდება მეორე session-ზე | `proposalCounter` in-memory-ა (App.tsx), ყოველ გახსნაზე 0-დან იწყება; `createProposalVariable` არსებობას არ ამოწმებს | Duplicate-check: იმავე სახელის/ფერის ვარიაბლის reuse; counter ფაილში არსებული max-იდან გაგრძელდეს |
| B2 | წინა run-ის `legibly/contrast-fix-*` ტოკენები fix-კანდიდატებად ბრუნდება | `harvestTokens` ყველა local ვარიაბლს კრეფს ფილტრის გარეშე | **D15**: "Legibly" collection-ის ვარიაბლები harvest-იდან გამოირიცხოს |
| B3 | proposal user-ის collection-ში შეიძლება ჩაიწეროს | `apply.ts`: `collections.find(...) ?? collections[0]` fallback | Fallback მოიხსნას — "Legibly" collection ყოველთვის შეიქმნას |
| B4 | Cmd+Z-ის შემდეგ ბარათი FIXED/მწვანე რჩება | არცერთი `figma.on('documentchange')` listener არ არსებობს | documentchange → applied state invalidation (ან re-verify) |
| B5 | Batch fix identical ფერებზეც ცალ-ცალკე ტოკენებს შექმნის | `payloadFor` ყოველ finding-ზე `nextProposalName()`-ს ეძახის | Სესიაში ფერით dedup — ერთი ფერი = ერთი ტოკენი |
| B6 | Fix background უხილავია — user ვერ ხვდება რა შეიცვალა | `apply-bg-fix` owner node-ს არ აჩვენებს; changeDescription მხოლოდ token name-ს წერს | Owner select/zoom + before→after hex swatches ბარათზე |
| B7 | Manual alt save ნებისმიერ ნაგავს იღებს ("g" → მწვანე) | Validator gate მხოლოდ AI path-ზეა; manual save-ზე არაფერი | იგივე deterministic validator manual save-ზეც (min length, filename-pattern, generic-word block) |
| B8 | Line-height fix overflow-ს არ ამოწმებს | Verify მხოლოდ ratio-ს ზომავს; 140→150% შეიძლება ტექსტი frame-იდან გაიტანოს/დაclip-ოს | Post-fix bounds check: overflow/clip → revert + "needs manual" (font-size ალტერნატივა არა — 1.4.12 spacing-ზეა, დიზაინს მეტად შლის) |

## UX / Features (backlog, პრიორიტეტით)

| # | Feature | დეტალი |
|---|---------|--------|
| F1 | Grouped results + filter | Header-ში check-type filter (Contrast / Text spacing / Tap target / Non-text / Alt); სექციები collapsible headers-ით + count; **Fix all scoped ფილტრზე** (user-ს ზოგჯერ მხოლოდ ერთი კატეგორია ევალება) |
| F2 | Deep check all | Batch deep-check ყველა "check by eye"-ზე; pass/fail ავტომატურად იხსნება, მხოლოდ mixed/unresolved რჩება თვალით სანახავი. Perf: ერთი exportAsync per top-level frame, არა per text |
| F3 | Finding-ის სათაური = ტექსტის შიგთავსი | Layer name ("span", "p") არაფრის მთქმელია imported ფაილებზე; text node-ებზე characters-ის excerpt (~40 char) გამოჩნდეს, layer name secondary |
| F4 | Proposal apply mode | Setting: new color as **variable** vs **raw fill value** (default raw?) — system-less დიზაინერს variable pollution არ უნდა. Existing-token snap ყოველთვის binding რჩება |
| F5 | Footer bar | მარცხნივ settings, მარჯვნივ help/questions, ცენტრში **Pro** ღილაკი (web2wireframe-ის ანალოგიური) — paywall-ის UI საფუძველი |

## Product ღია კითხვები (founder)

- Paywall მექანიკა: detect free / fix = Pro ($12/mo, D8) — license vendor / billing ჯერ გადასაწყვეტია (Q1, Q5)
- Hosted backend AI-სთვის (BYOK → shared key proxy) — v0.4+ (D14)

## Ტესტის დარჩენილი პუნქტები

- [ ] Contrast Fix / Fix all / undo — ✅ ნაწილობრივ (B1/B4/B6 იპოვა)
- [ ] Gradient ვერდიქტები — ✅ ჩანს სწორად (3.68–4.46 range flagged)
- [x] Fix background — მუშაობს, მაგრამ უხილავია (B6)
- [ ] Deep check ფოტოზე — ✅ მუშაობს; Deep check all მოთხოვნილია (F2)
- [ ] Tap-target fix prototype ღილაკებზე
- [x] Line-height fix — მუშაობს (140→150%), overflow guard სჭირდება (B8)
- [ ] Export CSV — გადადებულია
- [ ] Alt text AI (BYOK) — გადადებულია
