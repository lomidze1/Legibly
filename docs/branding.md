# branding.md — სახელი + Naming Convention

> **მთავარი წესი:** პროდუქტის სახელი არსად არ მოახდინო hardcode ახალ ფაილებში. გამოიყენე `{{PRODUCT_NAME}}` token, რომელიც განისაზღვრება ამ ფაილში.

---

## Current Product Name

```yaml
PRODUCT_NAME: Designer
PRODUCT_NAME_SHORT: Designer
PRODUCT_NAME_SLUG: designer       # lowercase, no spaces — for file names, URLs
PRODUCT_NAME_NPM: designer         # npm package name (if published)
TAGLINE: "System-strict, accessibility-first Figma AI for design teams"
DOMAIN_PLACEHOLDER: designer.app   # not yet acquired
```

**Status:** **PLACEHOLDER**. "Designer" სახელი არ არის ბოლომდე გადაწყვეტილი — ეს იყო პირველი ვარიანტი, რომელიც მომაფიქრდა. შესაცვლელია მარტივად.

---

## როგორ შევცვალო სახელი ერთბაშად

### 1. ცვალე ეს ფაილი (`docs/branding.md`)
ცვალე `PRODUCT_NAME` ცვლადი ზემოთა block-ში.

### 2. გაუშვი rename script

```bash
./scripts/rename-product.sh "ახალი სახელი"
```

ეს script:
- შეცვლის `{{PRODUCT_NAME}}` token-ს ყველა docs/ ფაილში
- შეცვლის `{{PRODUCT_NAME_SLUG}}` token-ს ყველგან
- **არ შეცვლის** `docs/architecture.md`-ში literal "Designer" სიტყვას (იქ legacy ფაილია, manual edit საჭიროა)

### 3. გადახედე ეს ადგილები (manual)

- `README.md` (root)
- `docs/architecture.md` — literal "Designer" references
- GitHub repo description (`gh repo edit --description`)
- GitHub repo name (`gh api repos/owner/repo -X PATCH -f name=...`) — ეს URL-ს ცვლის
- Figma plugin manifest (როცა გვექნება)
- npm package.json (როცა გვექნება)

---

## Token Convention (ახალი ფაილებისთვის)

ყოველი ახალი markdown/code ფაილი იყენებს ამ token-ებს:

| Token | Replacement | სად გამოიყენება |
|-------|-------------|------------------|
| `{{PRODUCT_NAME}}` | Designer | სიდიდე/მენიუ/UI ნაწილში |
| `{{PRODUCT_NAME_SHORT}}` | Designer | სადაც სიგრძე მნიშვნელოვანია |
| `{{PRODUCT_NAME_SLUG}}` | designer | file names, URLs, npm packages |
| `{{TAGLINE}}` | System-strict, ... | marketing copy, README headers |

**მაგალითი:**

```markdown
<!-- სწორი (ცვალებადი) -->
{{PRODUCT_NAME}} is a Figma AI plugin that respects your design system.

<!-- არასწორი (hardcoded) -->
Designer is a Figma AI plugin that respects your design system.
```

---

## Legacy ფაილების სტატუსი

- **`docs/architecture.md`** — გადატანილია root-დან AS-IS. Literal "Designer" სიტყვები იქ რჩება მანამდე, სანამ ბოლო სახელი არ გადაწყდება. **ნუ ცვლი მას ხელით token-ად** — განახლება ერთად მოხდება საბოლოო rename-ის დროს.

---

## Alternative Names — Future Brainstorm

> არ გვინდა "Designer" იყოს — დროა მოვიფიქროთ. ბრენდინგი ბიზნესის ფუნდამენტია.

**Naming თეზისები ბრენდინგისთვის:**
1. **მოკლე** (≤ 8 ჩარაქტერი) — easier marketing, easier domain
2. **Pronounceable** — international users
3. **Trademark-clear** — USPTO/EUIPO search საჭიროა
4. **Domain available** — .com/.app/.io
5. **GitHub/npm available** — package squatting risk

**კანდიდატები (ბრეინსტორმინგი):**

| სახელი | რატომ კარგი | რატომ ცუდი |
|--------|--------------|--------------|
| Designer | მარტივი, თვით-აღწერითი | TOO generic, SEO impossible, trademark conflict |
| Figmind | Figma + mind | Figma trademark issue |
| Tokenly | tokens + ly | სუსტი, არ აღწერს |
| Strictly | "system-strict" wedge | მოულოდნელი |
| Conform | "conform to your system" | რეგულატორული ტონი |
| Atom | atomic design hint | trademark conflict (Electron Atom) |
| Honest | "honest to your system" | სუსტი ბრენდინგი |

**TODO:** გადააწყდი სახელი planning phase-ის ბოლომდე. ბრენდინგი წინ უსწრებს კოდს.
