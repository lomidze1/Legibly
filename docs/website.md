# website.md — Legibly-ის ვებსაიტის გეგმა

> **სტატუსი:** 🟢 BUILT (2026-07-22) — საიტი აშენებულია [`website/`](../website/)-ში (Next.js App Router, glinc.io-ს სტრუქტურის მიხედვით). Deploy და domain — user action (იხ. §7).
> **მთავარი წესი:** ჯერ დაიწერება **მოთხოვნა + დაგეგმარება** (ამ ფაილში, plugin-ზე დაყრდნობით), მერე გაკეთდება.

---

## 1. რატომ გვჭირდება ვებსაიტი

პლაგინი Figma Community-ში ცხოვრობს, მაგრამ **სახლი (landing page) მაინც სჭირდება:**
- 🎯 **Marketing** — ხალხს უნდა ვუთხრათ რას აკეთებს Legibly და რატომ
- 🔒 **Trust** — accessibility-tool-ს სანდოობა სჭირდება (compliance-ს ხალხი ენდობა)
- 🔍 **SEO** — "WCAG figma", "accessibility fix figma" — ძიებით მოსვლა
- 💰 **Conversion funnel** — უფასო detect → paid fix; ვებსაიტი ხსნის Pro-ს
- 🔗 **Domain** — `legibly.app` (ან სხვა, იხ. [branding.md](./branding.md))

---

## 2. პროცესის წესი (მნიშვნელოვანი)

**ვებსაიტი არ იგეგმება ვაკუუმში — ის plugin-იდან გამომდინარეობს.**

სანამ ვებსაიტს გავაკეთებთ, ამ ფაილში (ან ცალკე `website-requirements.md`-ში) დაიწერება:
1. **მოთხოვნა (requirements)** — რა გვერდები, რა სექციები, რა ტექსტი
2. **დაგეგმარება (design plan)** — structure, visual style, CTA-ები

ეს ყველაფერი **დაეყრდნობა უკვე არსებულ დოკუმენტებს:**
- [requirements.md](./requirements.md) — რას აკეთებს პლაგინი (features → website features)
- [goal.md §0](./goal.md) — positioning, message, money model
- [branding.md](./branding.md) — სახელი, tagline, store title
- [approach.md D7](./approach.md) — რატომ ვართ defensible (→ "why us" სექცია)

---

## 3. Reference / parallel properties

ჩვენი არსებული საიტები — **structure-ისა და style-ის reference-ად** (და შესაძლო cross-link/portfolio umbrella):
- **glinc.io**
- **web2wireframe.design**

> გამოვიყენოთ როგორც მაგალითი: რა სექციები, რა ტონი, როგორი layout მუშაობს. Legibly-ის საიტი მსგავს ხარისხზე უნდა იყოს.

---

## 4. სექციების პირველი მონახაზი (draft — plugin-ზე დაფუძნებული)

> ეს **საწყისი idea-ა**, სრული requirements-ში დაიხვეწება.

| # | სექცია | რა იქნება (message plugin-იდან) |
|---|--------|--------------------------------|
| 1 | **Hero** | Tagline: *"Accessibility & design-system auto-fix for Figma — WCAG 2.2 AA, done right"* + CTA "Install on Figma" |
| 2 | **Problem** | "AI და ხელით დახატული დიზაინი ხშირად არ იკითხება / არღვევს კანონს (EAA/ADA)" |
| 3 | **Solution / How it works** | 3 ნაბიჯი: Scan → Fix (one-click) → Verified (guaranteed correct) |
| 4 | **Before/After demo** 🔑 | *money shot* — gif/video: არასწორი კონტრასტი → გასწორებული, on-system, 1 კლიკში |
| 5 | **Why Legibly** | სხვები მხოლოდ *აჩვენებენ*; ჩვენ *ვასწორებთ* + correctness-by-construction (no bad-AI) |
| 6 | **Features** | contrast (now) → target size, spacing, alt-text, design-system, brand-QA (roadmap) |
| 7 | **Pricing** | Free (detect) · Pro $12/mo (fix + report) — ორი tier, Team მოხსნილია (D20) |
| 8 | **Social proof / trust** | reviews, install count, "WCAG 2.2 AA" badges (როცა გვექნება) |
| 9 | **FAQ** | "მართლა ასწორებს?", "ჩემს token-ებს იყენებს?", "privacy?" (offline, no data leaves) |
| 10 | **Footer CTA** | "Install on Figma" + docs/support links |

---

## 5. სრული website-requirements-მა უნდა განსაზღვროს (checklist)

- [ ] გვერდები (landing / pricing / docs / privacy)
- [ ] თითო სექციის **ზუსტი copy** (EN)
- [ ] Before/after **demo asset** (რა ვაჩვენოთ, video თუ interactive)
- [ ] Pricing display (Free/Pro, annual toggle?)
- [ ] CTA targets (Figma Community listing link)
- [ ] SEO keywords ("figma accessibility", "WCAG checker figma", "contrast fixer")
- [ ] Tech/hosting (static site — Vercel/Cloudflare Pages), domain lock
- [ ] Visual style (brand colors/logo — ჯერ არ გვაქვს → brand identity to-do)

---

## 6. Open / next

- ⏳ **Brand identity** (logo, colors) — ჯერ არ არსებობს; ვებსაიტამდე საჭიროა
- ⏳ ვებსაიტი **plugin v0.1-ის შემდეგ** — ჯერ demo asset (before/after) გვჭირდება რეალური პლაგინიდან
- 📌 **Next step:** როცა v0.1 build-ს დავიწყებთ, პარალელურად ეს ფაილი გადაიზრდება სრულ website-requirements-ად

---

## 7. Build შედეგი (2026-07-22)

საიტი აშენდა `website/`-ში. მიღებული გადაწყვეტილებები (user-თან შეთანხმებული):

- **Stack:** Next.js App Router + TypeScript + CSS Modules — glinc.io-ს repo-ს სტრუქტურის მირორი; hosting: Vercel
- **Visual identity (პირველად განისაზღვრა):** ღია, მაღალკონტრასტული "legibility-first" — body ტექსტის ყველა წყვილი **AAA (7:1)**, label-ები ≥ AA (4.5:1); ტიპოგრაფია: **Atkinson Hyperlegible** (Braille Institute-ის შრიფტი — ბრენდის არგუმენტი); აქცენტი: `#1e40af` (ლურჯი); verdict ფერები: fail `#b42318` / review `#92400e` / pass `#166534`. ყველა წყვილი unit-ტესტით მოწმდება (`src/lib/contrast.test.ts`) — საიტი თავად აკმაყოფილებს იმას, რასაც ყიდის
- **Hero demo:** ინტერაქტიული before/after კომპონენტი რეალური WCAG მათემატიკით (`FixDemo`) — მოგვიანებით ჩანაცვლდება/დაემატება რეალური პლაგინის GIF
- **CTA (launch-ამდე):** waitlist email capture (`/api/waitlist`, Resend + honeypot); `site.ts`-ში `figmaCommunityUrl`-ის შევსებისას CTA გადავა "Install on Figma"-ზე
- **Pricing:** ~~სამივე~~ **ორი** tier ჩანს (Free + Pro $12 — D20) + "Free during public beta" ბანერი
- **Privacy copy:** ~~BYOK disclosure~~ → **"no network at all"** (D22, 2026-08-02): manifest-ში `allowedDomains: ["none"]`, ე.ი. განაცხადი მომხმარებლის მიერ გადამოწმებადია
- **გვერდები:** `/` (10 სექცია), `/privacy`, SEO (sitemap, robots, JSON-LD SoftwareApplication, OG image)

**User actions (pending):** Vercel deploy + `RESEND_API_KEY` env; `legibly.app` domain-ის ყიდვა (Track F); Figma Community URL launch-ისას; რეალური demo GIF.

---

## 8. Design critique pass (2026-07-26)

სრული design review — [`docs/research/website-design-critique.md`](./research/website-design-critique.md) (26 finding, 8 განზომილება). გასწორდა 23; მთავარი ცვლილებები:

- **Waitlist ინახავს** — `/api/waitlist` ჯერ Resend audience-ში წერს (`RESEND_AUDIENCE_ID`), მერე აგზავნის შეტყობინებას; email-ის ჩავარდნა აღარ კარგავს lead-ს
- **Hero გადაკეთდა conversion unit-ად** — H1 = "Checkers tell you. Legibly fixes it."; ფორმა 460px inline; demo-ს ღილაკი secondary-ზე ჩამოვიდა
- **FixDemo-ს "before" ნიმუში `<canvas>`-ია** — განზრახ 2.4:1 ტექსტი აღარ არის live DOM text, ე.ი. axe/Lighthouse აღარ ხედავს SC 1.4.3 დარღვევას compliance-პროდუქტის hero-ზე; მათემატიკა კვლავ ცოცხალია, fix კი choreographed (ratio ითვლის, verdict chip რეალურ 4.5:1 გადაკვეთაზე ტრიალდება)
- **Reflow (SC 1.4.10)** — 305 CSS px-ზე ჰორიზონტალური სქროლი გაქრა
- **Measure ტოკენები** — `--measure-narrow/body/wide`; `ch` აღარ გამოიყენება (Atkinson-ში `1ch` = 11.02px vs საშუალო სიმბოლო 7.25px, ე.ი. `64ch` → 95 სიმბოლო). ახლა ყველა ბლოკი 48–72 სიმბოლოშია
- **Verdict ფერები semantic-only** — pricing checkmarks და beta banner accent-ზე გადავიდა (§7-ის წესი)

**გადაუწყვეტელი (user decision):** dark mode (brand identity-ს ცვლის — §7 "ღია, მაღალკონტრასტული"); OG card-ის ტიპოგრაფია (Atkinson woff/ttf binary სჭირდება Satori-სთვის).

✅ **დაიხურა 2026-08-13:** privacy §Contact-ში controller-ის იურიდიული სახელი და მისამართი — `site.seller`-ში, ერთი წყაროდან terms-სა და privacy-ზე. კოდში TODO-ები აღარაა.

---

## 9. ორმაგი design review pass (2026-07-29)

ორი დამოუკიდებელი აგენტი — design-critique (ტიპოგრაფია/craft) და ui-ux-pro-max
(კონვერსია/IA). სულ **55 finding, გასწორდა 44.** commit-ები: `e98e6b1`, `0bf7fb1`.

### მთავარი აღმოჩენა — oldstyle figures

Cormorant Garamond-ის ნაგულისხმევი ციფრები text figures-ია: `1` x-სიმაღლეზე ზის
(glyph ascent 77.2 vs cap 125), `3 5 9` ბაზისქვეშ ეშვება. `tnum`-თან ერთად `$12`
რენდერდებოდა როგორც **`$I2`**, hero-ს `2.4:1` კი როგორც **`2.4:I`** — გვერდის ორი
ყველაზე წაკითხვადი რიცხვი. ფიქსი: `font-variant-numeric: lining-nums tabular-nums`.

### კონტრასტი → AAA

Body copy ახლა 7:1-ზეა (SC 1.4.6), არა 4.5:1. `--color-neutral-700` `#605d5d`→`#504d4d`,
`--color-accent-700` `#7d5411`→`#684607`. ოქრო (`#b68235`, 3.0:1) **განზრახ რჩება AA-ზე** —
4.5:1-მდე დაბნელება ბრენდის ფერს ყავისფრად აქცევს და ის მხოლოდ display ზომებზე ზის.
გაზომვა: 140 page-copy კვანძი, 0 AA ჩავარდნა, 0 AAA ჩავარდნა.

`contrast.test.ts` ახლა AAA-ს ითხოვს bodyPairs-ისთვის — ტოკენის შეცვლა ტესტს ჩააგდებს.

### გადაწყვეტილებები

- **Warm ground არ იცვლება** (`#f3f2f2` რჩება) — user decision, 2026-07-29
- **Glinc ყველგან, პიროვნული byline არა** — user decision, 2026-07-29
- **Launch: September 2026** — ერთ ადგილას, `site.launch`. შიდა გეგმა: 15 აგვისტო ყველაფერი
  გადახდის გარდა, 30 აგვისტო გადახდა. სექტემბერი მეორე ნახევრის ცურვასაც უძლებს

### გადაუწყვეტელი

- **Verdicts + Comparison შერწყმა** — ორივე აგენტი ამბობს, რომ ერთსა და იმავეს ამტკიცებენ
  (accuracy / no false positives). რედაქციული გადაწყვეტილება, არ შესრულებულა
- **Footer-ის ლინკები არ არსებობს** — changelog, GitHub, X/Twitter. როცა გაჩნდება,
  `SiteFooter.tsx`-ის Company სვეტში ან მესამე სვეტად
- **რეალური პლაგინის screenshot** — გვერდზე არც ერთი კადრი არაა Figma-ში მომუშავე პლაგინის
- **Social proof** — 0. waitlist counter ან testimonial launch-ის შემდეგ
- **Verdicts + Comparison შერწყმა** — ორივე აგენტი ამბობს, რომ ერთსა და იმავეს ამტკიცებენ
  (accuracy / no false positives). რედაქციული გადაწყვეტილება, არ შესრულებულა

### გადაწყდა და გაკეთდა (2026-07-29, მეორე ნახევარი)

- **Hero specimen ინტერაქტიულია** (`0bf7fb1`) — მომხმარებელი აჭერს "Fix with my tokens"-ს და
  ხედავს შეკეთებას: ტექსტი ფერს იცვლის, კოეფიციენტი ითვლის, verdict ტრიალდება, Undo აბრუნებს.
  §8-ის choreographed demo, რომელიც Classical-ზე გადაწერისას დაიკარგა, დაბრუნებულია
- **Dark mode — მხოლოდ specimen-ს toggle** (`5941c2d`), არა მთელ საიტს. მიზეზი: Coverage-ის
  განაცხადს ("checks 01 და 04 ყოველ თემაზე ხელახლა გადის") არაფერი ამტკიცებდა. ახლა ჩანს, რომ
  `text/secondary`, რომელმაც light-ზე 6.9:1 გაიარა, dark-ზე 1.7:1-ია. საიტის palette არ შეხებია
- **SVG specimen** (`5941c2d`) — axe: 1 violation → **0**. დარჩა 3 "incomplete" (needs review),
  რაც პატიოსანი შედეგია: სკანერს background ვერ დაუდგენია და ადამიანს გადასცემს
- **`formatRatio` drift** — პანელი ოთხივე ციფრს render-ზე ითვლის, არა literal-ად. ამან ძველი
  შეცდომა გამოააშკარავა: light-ის ჩავარდნა 2.38-ია, ე.ი. პლაგინი `2.3:1`-ს დაბეჭდავდა,
  გვერდი კი ყოველთვის `2.4:1`-ს წერდა

### კვლავ გადაუწყვეტელი

დარჩენილი პუნქტები ერთ ადგილას ცხოვრობს — [`pre-launch-checklist.md`](./pre-launch-checklist.md)
§7 და §8 (რეალური Figma screenshot, footer-ის ლინკები, social proof, რედიზაინის არჩევანი).
აქ არ დუბლირდება, რომ ორი სია ერთმანეთს არ აცდეს.

ერთადერთი, რაც მხოლოდ ამ ფაილს ეხება:

- **სრული dark mode მთელ საიტზე** — შეგნებულად გადადებული. specimen-ის toggle message-ის
  იმ ნაწილს ფარავს, რომელიც მნიშვნელოვანი იყო (check 01/04 ყოველ თემაზე), ბრენდის palette-ის
  შეხების გარეშე
- **Comparison** ("Flagging is the easy half") — რჩება. Verdicts უკვე მოიხსნა (ქვემოთ),
  ამიტომ გამეორება აღარ არის

### მესამე pass (2026-07-29, გვიან) — user-ის მითითებით

- **Header-იდან CTA მოიხსნა** (`d1a28d6`) — "Get early access" პირველ ეკრანზე სამჯერ ეწერა
  (nav, hero-ს ფორმა, specimen-ის ღილაკი). ახლა მხოლოდ ფორმაშია
- **Login ღილაკი — არა, ჯერ** (გადაწყვეტილება). Flitt-ის (D23) ნაკადი license key-ის გარეშეა — `figmaUserId` binding
  email-ით → პლაგინში ჩასმა; ვებ-ლოგინი ამ ნაკადში არ ხვდება. backend არ არსებობს
  (checklist §5). "Sign in" launch-ის შემდეგ, როცა ლიცენზიის მართვა გაჩნდება
- **ScanDemo** (`3d936d8`) — Coverage სექციაში. "Run scan" → 6 finding; "Fix all 4" →
  ოთხი სწორდება, ორი განზრახ რჩება (needs review + not checked). ეს პირველად ამტკიცებს
  **batch fix**-ს, რაც Pro-ს ფასიანი ფუნქციაა და არსად ჩანდა
- **"Three verdicts" სექცია წაიშალა** — მისი ცხრილი სტატიკურად ამბობდა იმას, რასაც ScanDemo
  დინამიურად აჩვენებს. გვერდი 250px-ით დამოკლდა და დემონსტრაცია მოიგო
- **გადაწყვეტილება: სამი ინტერაქტიული პანელი არ იქნება.** Scan/Fix/Verify-ს ქვემოთ მესამე
  დემო არ დაემატა — hero (სიზუსტე) + Coverage (მასშტაბი) სხვადასხვას ამტკიცებს, მესამე
  გამეორება იქნებოდა
