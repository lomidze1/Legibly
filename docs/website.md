# website.md — Legibly-ის ვებსაიტის გეგმა

> **სტატუსი:** 🟡 TODO — ვებსაიტი **გასაკეთებელია** (launch-ამდე), მაგრამ ჯერ არ დაწყებულა.
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
| 7 | **Pricing** | Free (detect) · Pro $12/mo (fix + report) · Team $15/seat |
| 8 | **Social proof / trust** | reviews, install count, "WCAG 2.2 AA" badges (როცა გვექნება) |
| 9 | **FAQ** | "მართლა ასწორებს?", "ჩემს token-ებს იყენებს?", "privacy?" (offline, no data leaves) |
| 10 | **Footer CTA** | "Install on Figma" + docs/support links |

---

## 5. სრული website-requirements-მა უნდა განსაზღვროს (checklist)

- [ ] გვერდები (landing / pricing / docs / privacy)
- [ ] თითო სექციის **ზუსტი copy** (EN)
- [ ] Before/after **demo asset** (რა ვაჩვენოთ, video თუ interactive)
- [ ] Pricing display (Free/Pro/Team, annual toggle?)
- [ ] CTA targets (Figma Community listing link)
- [ ] SEO keywords ("figma accessibility", "WCAG checker figma", "contrast fixer")
- [ ] Tech/hosting (static site — Vercel/Cloudflare Pages), domain lock
- [ ] Visual style (brand colors/logo — ჯერ არ გვაქვს → brand identity to-do)

---

## 6. Open / next

- ⏳ **Brand identity** (logo, colors) — ჯერ არ არსებობს; ვებსაიტამდე საჭიროა
- ⏳ ვებსაიტი **plugin v0.1-ის შემდეგ** — ჯერ demo asset (before/after) გვჭირდება რეალური პლაგინიდან
- 📌 **Next step:** როცა v0.1 build-ს დავიწყებთ, პარალელურად ეს ფაილი გადაიზრდება სრულ website-requirements-ად
