# requirements.md — Legibly MVP v0.1 Scope (LOCKED)

> **სტატუსი:** ✅ **MVP v0.1 scope LOCKED — 2026-06-14.** Grounded in D7/D8/D9 ([approach.md](./approach.md)) + research ([wcag-detection-architecture](./research/wcag-detection-architecture.md), [a11y-remediation-methodology](./research/a11y-remediation-methodology.md), [a11y-competitor-teardown](./research/a11y-competitor-teardown.md)).
> **north-star:** [goal.md §0](./goal.md). ⚠️ ეს ფაილი აღარ არის generation-centric — ძველი scope archived git history-ში (`5aad6c8` და უკან).

---

## 0. MVP v0.1 — "Contrast, fixed right"

**ერთი წინადადება:** Legibly v0.1 პოულობს text-contrast violations-ს Figma დიზაინში **სანდოდ** (effective-background resolution-ით, სადაც axe და Figma-native ცდებიან) და **ასწორებს one-click-ით** — snap to user-ის არსებულ passing token-ზე, **correctness-by-construction** გარანტიით.

**რატომ ეს არის v0.1 (და არა მეტი):**
- **Contrast = #1 ყველაზე ხშირი a11y issue** (audits-ში დომინანტი) + **fully deterministic** (math).
- **არავინ ასწორებს reliable-ად** — Stark მხოლოდ "suggests" (stray styles); FigmaLint a11y-ს manual-ზე აგდებს ([teardown](./research/a11y-competitor-teardown.md)).
- **🔑 backend/AI არ სჭირდება** — წმინდა მათემატიკა, plugin-ში ლოკალურად: $0 cost, instant, offline, private, ყველაზე trustworthy.
- **Demoable** — "გაასწორე ყველა contrast issue ერთ კლიკში, on-system" = viral hook + clear paid value.

---

## 1. Functional Requirements — v0.1

### 1.1 Plugin Core
- **F1.** Figma Community public listing (single plugin).
- **F2.** UI iframe (React + Vite via `create-figma-plugin`): scan button, results panel, settings.
- **F3.** Main thread (`figma.*` only): node traversal, fill/style read, color mutation, undo grouping.
- **F4.** **No backend, no Anthropic key, no network** in v0.1 — fully client-side deterministic. (manifest `networkAccess`: none/minimal.)

### 1.2 Detection (the trust core — FREE)
- **F5.** Scan **selection** ან **current page** for **text contrast** violations: WCAG 2 ratio — normal text ≥ **4.5:1**, large text (≥24px, ან ≥18.66px bold) ≥ **3:1** (SC 1.4.3).
- **F6.** **Effective-background resolution (the moat):** resolve რეალური background text node-ის უკან through — fill stacks, layer opacity, solid fills. Gradient / image / blend-mode / unresolvable → **`needs-review` bucket** (NOT a false hard-fail).
- **F7.** **3-tier results** ([detection arch](./research/wcag-detection-architecture.md)): `violation` (certain, deterministic) · `needsReview` (cannot resolve confidently) · `notChecked` (out of v0.1 scope SC). სიჩუმე არასდროს = pass.
- **F8.** **Zero false-positives** on `violation` tier — uncertain → `needsReview`, არასდროს violation (R5 mitigation).
- **F9.** Contrast math via **`culori`** (`wcagContrast`), WCAG 2 ratio = gate; **APCA Lc = advisory readout only** (არა gate).
- **F10.** Results list: თითო finding-ზე — element name, measured ratio, required ratio, the SC, tier badge.

### 1.3 Remediation (the paid value — correctness-by-construction)
- **F11.** **One-click fix** per `violation`: candidate = nearest **passing token user-ის library-დან** (OKLCH lightness direction-hint → token snap via `culori differenceEuclidean`, hue-filtered). არასდროს novel hex by default.
- **F12.** **Verification loop:** apply candidate → re-run F5 check (იგივე ფუნქცია) → commit **iff PASS**; თუ არა → შემდეგი candidate (ordered, bounded ≤20 iter); ყველა candidate ჩავარდა → escalate. ცუდი fix canvas-ს ფიზიკურად ვერ აღწევს.
- **F13.** **Resolution order:** same-role ramp step → nearest passing token (hue-filtered) → adjust background token → **propose minimal new token (D8, one-click accept)** → escalate to user.
- **F14.** **Strict mode toggle** (D8): governance-heavy teams — forbid new tokens (F13 stops at escalate).
- **F15.** Fix updates the **style/variable binding** where possible (NOT a stray local override — the inverse of Stark's "stray styles").
- **F16.** **Before/after diff** per fix: "2.9:1 → 4.6:1", the token change, the SC satisfied.
- **F17.** **Batch fix** — apply all deterministic `violation` fixes; **single undo step** (`commitUndo()`).

### 1.4 Free vs Paid (money model — D7)
- **F18.** **FREE:** unlimited detection (F5–F10) — the funnel/viral hook.
- **F19.** **PAID Pro:** one-click fix (F11), batch fix (F17), **compliance report export** (CSV/PDF: findings + before/after + SC). ✏️ **D20:** seat-based Team tier მოხსნილია — ბრუნდება მხოლოდ რეალური seat-value-ს (shared policy / audit trail) არსებობისას. ✏️ **D23:** ფასი = **`$120/წელი` (მთავარი) + `$12/30 დღე`**, ორივე **one-time** — auto-renewal არ არსებობს, გასაუქმებელი არაფერია, განახლება დღეებს სტეკავს.
- **F20.** Paywall **timing decision (open):** v0.1 ships fix FREE during **public beta** (distribution-first — the real risk) → paywall turns on in **v0.2** via license keys. *(იხ. Open Q1.)* ✏️ **D21:** LemonSqueezy/Gumroad **აღარ ვარიანტია** (Stripe-ის GE ბლოკი). ✏️ **D23:** vendor = **Flitt** (one-time, წლიური-first); Dodo = დოკუმენტირებული fallback. **"no server" ნაწილი ძალადაკარგულია** — license state-ს store სჭირდება, ე.ი. მინიმალური backend სავალდებულოა (serverless ჰყოფნის). Identity = **Figma OAuth** (`current_user:read`) → HMAC token, **რეგისტრაციის გარეშე**; შიშველი `figma.currentUser.id` არასაკმარისია — იმპერსონაციის ვექტორია.

### 1.5 Settings
- **F21.** Strict mode (F14) on/off.
- **F22.** Theme: light/dark/auto via Figma editor preferences.
- **F23.** Large-text threshold + AA/AAA toggle (default AA).

---

## 2. რა **არ** არის v0.1-ში (deferred roadmap)

> "Super simple" = ერთი check უნაკლოდ. ყველაფერი დანარჩენი მოგვიანებით.

| Deferred | როდის | რატომ არა ახლა |
|----------|-------|----------------|
| ~~Target size (24px AA) + text spacing~~ | ✅ **shipped 2026-07-14** ([approach.md D12](./approach.md)); 44px floor = SC 2.5.5 shipped 2026-07-26 (D16) | Android 48px — not a WCAG SC, deferred |
| ~~Non-text / UI contrast (SC 1.4.11)~~ | ✅ **shipped 2026-07-14** (interactive icons/strokes; D12) | free-floating graphics — judgment, footer-ში |
| ~~Alt text presence (SC 1.1.1)~~ | ✅ **shipped 2026-07-14** ([D14](./approach.md)); AI draft **წაშლილია 2026-08-02** — manual/decorative მხოლოდ ([D22](./approach.md)) | hosted pay-as-you-go AI — backend-ის შემდეგ, თუ საერთოდ |
| ~~Use of colour (1.4.1) + clipped text (1.4.10 signal)~~ | ✅ **shipped 2026-07-26** ([approach.md D17](./approach.md)) | in-paragraph runs only; standalone colour-coded labels/icons remain judgement |
| ~~Label presence (2.4.6) + focus capability (2.4.7) + advisory tier~~ | ✅ **shipped 2026-07-26** ([approach.md D18](./approach.md)) | presence/capability only; no auto-fix by design |
| System-strict design-token enforcement (non-a11y) | v1.0 | ცალკე module; FigmaLint owns token-cleanup (free) |
| Brand-QA vision pass (Opus) | v2 | premium; vision cost |
| Multi-screen / generation / "fix it for me" generate | — | არასდროს headline (D7); optional internal action only |
| MCP server (Cursor/Claude Code) | v2 | after Figma PMF |
| Multi-language UI | post-MVP | English first |

---

## 3. Non-Functional Requirements — v0.1

### 3.1 Trust (the #1 NFR)
- **NF1.** Every committed fix **provably passes** the same deterministic check (F12). No exceptions.
- **NF2.** Zero false-positives on `violation` tier (F8).
- **NF3.** Never silently ship a fail or silently create off-system values (D8).

### 3.2 Performance
- **NF4.** Scan ≤ **2s** for a page of ≤ 500 text nodes (P50).
- **NF5.** Single fix ≤ 200ms; batch fix progress-shown.
- **NF6.** Fully offline — no network round-trip in core loop.

### 3.3 Security / Privacy
- **NF7.** No data leaves the plugin in v0.1 (no backend). Strong privacy story = marketing asset.
- **NF8.** `manifest.networkAccess.allowedDomains` = none (or license host only in v0.2). Never `"*"`.

### 3.4 Compatibility
- **NF9.** Figma Plugin API `"1.0.0"`, `documentAccess: "dynamic-page"`.
- **NF10.** Figma Desktop + Web.

---

## 4. Constraints (Figma sandbox — apply to v0.1)

- **C1.** Main thread: no `fetch`/`window`/DOM — only `figma.*`.
- **C2.** UI ↔ main comms only via `postMessage` (structured-clone; no functions survive).
- **C3.** `dynamic-page`: only `*Async` getters; `loadAllPagesAsync()` for cross-page scan.
- **C4.** Color resolution: must read `fills`, `opacity`, parent stack, bound variables via `*Async`.
- **C5.** `clientStorage` 5MB cap, not a secret store (fine — we store only settings).
- **C6.** `figma.notify` truncates ~100 chars — status lives in React panel.

> Anthropic / MCP constraints (key handling, connector, vision, prompt cache) **არ ეხება v0.1-ს** — ერთვება v0.3-ზე (LLM tier). იხ. [architecture.md §0.A](./architecture.md).

---

## 5. Success Criteria — v0.1 (Definition of Done)

- [ ] Plugin scans selection/page და აჩვენებs contrast findings 3 tier-ად.
- [ ] **Effective-background resolution** მუშაობს solid + opacity + fill-stack-ზე; gradient/image → `needsReview` (გადამოწმებული real Figma files-ზე).
- [ ] One-click fix snap-ავs passing token-ზე და **verify loop გარანტიას იძლევა** (test: ვერცერთი committed fix ვერ რჩება failing).
- [ ] Batch fix + single undo მუშაობს.
- [ ] Before/after diff აჩვენებs ratio + token + SC.
- [ ] Zero false-positive on `violation` tier (manual QA on 5+ real design files).
- [ ] Live on Figma Community (beta).
- [ ] **Target metric:** 1,000 installs + 4.5★ avg + ≥3 reviews ახსენებენ "actually fixes / reliable" first 8 weeks.

---

## 6. Open Questions (v0.1 build-მდე)

| # | კითხვა | სად გადაიჭრება |
|---|---------|----------------|
| Q1 | **Paywall timing/mechanism** — free beta → v0.2 license keys (no server)? თუ paywall v0.1-დანვე? | `approach.md` (founder decision) |
| Q2 | **Effective-background empirical spike** — fill-stack/gradient resolution fidelity real files-ზე; `node.reactions` reliability target-size-ისთვის (v0.2) | pre-build spike → `research/` |
| Q3 | Compliance report format — CSV ჯერ, PDF მოგვიანებით? | v0.2 design |
| Q4 | ~~`create-figma-plugin` vs raw scaffold~~ | ✅ Resolved — raw Vite dual-bundle ([approach.md D10](./approach.md)) |
| Q5 | License vendor — ✏️ **D21:** LemonSqueezy/Gumroad გამოირიცხა (Stripe GE ბლოკი). დარჩა **Flitt vs Paddle vs Dodo** | [`launch-stack.md §4`](./launch-stack.md) |

---

## 7. Build sequence (v0.1)

```
1. Scaffold (create-figma-plugin + React + Vite)              → verify: empty panel loads in Figma
2. Color/contrast engine (culori) + unit tests on WCAG cases  → verify: known ratios match W3C examples
3. Effective-background resolver (fills/opacity/stack)         → verify: correct bg on test fixtures; unresolvable→needsReview
4. Scan + 3-tier results UI                                    → verify: findings render, zero false-pos on QA files
5. Token harvester (figma.variables) — passing-token index    → verify: lists user palette tokens + their ratios
6. Fix engine: snap + verification loop + resolution order    → verify: every committed fix re-passes; no stray styles
7. Batch fix + single undo + before/after diff                → verify: undo reverts all; diff shows ratio/token/SC
8. New-token proposal (D8) + strict-mode toggle               → verify: proposes minimal token; strict mode escalates
9. Polish + Community listing (beta, fix free)                → verify: published, installable
```
