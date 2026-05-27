# docs/ — Claude-ის Entry Point

> **ეს არის Claude-ის source of truth.** ყოველი fresh session უნდა იწყებოდეს ამ ფაილით.

ეს docs/ საქაღალდე AI-first-ია: სტრუქტურა ინგლისურადაა, განმარტებები ქართულად. ფაილები mid-detail დონეზე — საკმარისად ღრმა რომ Claude ნებისმიერ session-ში orient-დეს, საკმარისად მსუბუქი რომ კოდის გენერაციისას არ მოძველდეს.

---

## 🎯 Quick Start (Claude — წაიკითხე ეს თანმიმდევრობით)

| # | File | რას შეიცავს | წაიკითხე როცა |
|---|------|--------------|----------------|
| 1 | [`branding.md`](./branding.md) | პროდუქტის სახელი, naming convention, `{{PRODUCT_NAME}}` token | ყოველთვის — სახელის შესახებ უნდა იცოდე |
| 2 | [`goal.md`](./goal.md) | რა არის ჩვენი მიზანი — ბიზნესის ჭრილში | session-ის დასაწყისში — ხედვის გასაგებად |
| 3 | [`requirements.md`](./requirements.md) | რა გვინდა (functional + non-functional + constraints) | feature-ის implementation-მდე |
| 4 | [`approach.md`](./approach.md) | რა გზით მივდივართ — strategy, principles, decision log | architecture-ის გადაწყვეტილებამდე |
| 5 | [`architecture.md`](./architecture.md) | სრული ტექნიკური არქიტექტურა (902 ხაზი) | implementation-ის დროს — single source of truth |
| 6 | [`links.md`](./links.md) | ყველა გარე reference (Anthropic, Figma, MCP, competitors) | როცა გჭირდება გარე dokumentation |
| 7 | [`research-roadmap.md`](./research-roadmap.md) | რა უნდა გამოვიკვლიოთ — tools, plugins, libraries, generators | planning phase-ში |
| 8 | [`glossary.md`](./glossary.md) | ტერმინების ლექსიკონი | როცა term-ი არ გესმის |
| 9 | [`research/`](./research/) | კვლევის შედეგები — per-tool/per-topic deep dives | reference material |

---

## 📂 დირექტორიის სტრუქტურა

```
docs/
├── README.md                ← ეს ფაილი (entry point)
├── branding.md              ← სახელი + naming convention
├── goal.md                  ← რა გვინდა და რატომ
├── requirements.md          ← MVP და beyond
├── approach.md              ← სტრატეგია + decisions log
├── architecture.md          ← სრული ტექნიკური არქიტექტურა
├── links.md                 ← გარე references (ALL)
├── research-roadmap.md      ← რა გამოვიკვლიოთ
├── glossary.md              ← ტერმინების განმარტება
└── research/                ← per-topic deep dives
    └── claude-design-plugin.md
```

---

## 🤖 Claude-ის სამუშაო წესები (ამ პროექტში)

1. **დაიწყე ყოველი session აქედან.** წაიკითხე `goal.md` და `approach.md` სანამ რაიმეს დაწერ.
2. **სახელი არ მოახდინო hardcode.** გამოიყენე `{{PRODUCT_NAME}}` token ახალ ფაილებში — დეტალები [`branding.md`](./branding.md)-ში.
3. **სუბ-აგენტები და skills.** გადახედე `.claude/agents/` და `.claude/skills/` — ბევრი task უკვე ავტომატიზებული გვაქვს.
4. **main ბრანჩი sacred-ია.** ყოველი ცვლილება dev-ზე უნდა იქნას committed. main-ზე — მხოლოდ მომხმარებლის approval-ით.
5. **Decisions log.** ყოველი არქიტექტურული გადაწყვეტილება უნდა შევიდეს `approach.md`-ში (Decision Log section).
6. **Don't delegate understanding.** sub-agent-ს დავალება მიეცი მზად ფორმაში — file paths, line numbers, specific changes.

---

## 🧭 ბიზნესის ცენტრალური ფაქტი

> 2026 May 20: Figma-მ გამოუშვა საკუთარი **Design Agent** (OpenAI + Anthropic, **free during beta**).
> ჩვენი defensible position **არ არის** "AI generates UI". ჩვენი position-ია:
> 1. **System-strict** (Figma-ს ვერ მოარგებს თქვენს tokens-ს ისე, როგორც ჩვენ)
> 2. **A11y-first** (in-loop WCAG 2.2 AA, არა post-hoc)
> 3. **Selection-based partial regen** (v0-ის loop, native Figma-ში)
> 4. **MCP-first core** (Figma-ის გარეთაც გავა: Cursor, Claude Code, Stitch)

დეტალები — [`goal.md`](./goal.md), [`approach.md`](./approach.md).
