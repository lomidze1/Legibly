# "Legibly" — Trademark & Naming Risk Assessment

> ⚠️ **This is research, not legal advice.** Nothing here is a clearance opinion. Only a formal clearance search by a licensed trademark attorney (US + EU) is authoritative. Everything below is public-record evidence gathered by an AI research session and can be wrong, stale, or incomplete.
>
> Scope: Does the name **Legibly** survive Figma Community publish + US/EU commercialisation, or must we rename first? Confirms-or-breaks decision **D9** (`branding.md`).
> Date: 2026-08-12
> Researcher: Claude session via `design-explorer`
> Method: live product inspection (legibly.app), **TMview** multi-office trademark search (EUIPO-operated; covers USPTO, EUIPO, WIPO + ~75 national offices), **USPTO TSDR** per-serial status pull, **RDAP** domain registry lookups, `whois`, Wayback CDX, Figma Help Center + Figma IP policy, WebSearch.
> Verification status: every registry number below was pulled from a live API response. Where a source blocked us, the row says **unverified** — no numbers are invented.

---

## TL;DR

- **Nobody, anywhere in the world, has a trademark filing for "LEGIBLY."** TMview `contains: "legibly"` across all member offices (incl. USPTO, EUIPO, WIPO) returns **0 results**. `legibly.app` (Legibly Inc.) has **no trademark application**. The "existing brand will sue us" scenario has no registered basis today.
- **`legibly.app` is tiny and ~10 months old.** Domain registered **2025-10-22** (RDAP), **zero Wayback captures ever**, "© 2025 Legibly Inc.", $4.99/mo consumer legal-tech for co-parents. It is *active* (Vercel-hosted, live pricing) but has no archival, press, or funding footprint we could find. It is a senior user in time in the US — but in a completely different market.
- **The real risk is not being sued — it is that we can never own "Legibly."** Class 42 is filling up with the LEGIBLE family: **LEGIBLE PLATFORM** (US 99627721, cl. 42 SaaS, *published for opposition* 2026-07-14), **LEGIBLE** (US 97227987, Legible Media Inc., cl. 9 + 42, LIVE), **LEGIBLE SYSTEMS** (US 99906450, cl. 42, filed 2026-06-25). And in the EU, **"Logibly" is a *registered* EUTM in exactly classes 9 + 42** (019231527, registered 2026-01-17, all 27 member states). A LEGIBLY application in cl. 9/42 faces a credible §2(d) / Art. 8(1)(b) obstacle on both sides of the Atlantic.
- **Figma will not block the name — but Figma will remove it on a trademark complaint, at its "sole discretion."** No Figma naming rule prohibits colliding with a third-party product (only Figma's *own* marks are restricted — note: **no "Fig" in any product name**, which kills every "FigFix"-type candidate). But the Copyright & IP Policy lets any mark owner file a complaint and Figma "take whatever action, in its sole discretion, it deems appropriate, including temporary or permanent removal."
- **Recommendation: (b) keep "Legibly" + mitigate, with a hard rename trigger.** Publish now; do not spend money on a US/EU registration for LEGIBLY (low odds, cl. 42 is crowded); always ship as "Legibly for Figma"; re-run this search before any paid-marketing spend. **Designated fallback if a trigger fires: `Conformly`** — 0 trademark hits worldwide, `conformly.design` free. Renaming today costs ~1 focused day and <$100 (84 files / 360 occurrences, live site, live email, 0 users). It will never be cheaper.

---

## 1. Who is behind `legibly.app`?

| Attribute | Finding | Source |
|---|---|---|
| Product | Upload court documents (decrees, parenting plans, scanned PDFs) → AI chat with cited answers, clause mapping, plain-language summaries | [legibly.app](https://www.legibly.app/) |
| Tagline | "Legal clarity for peaceful parenting" | [legibly.app](https://www.legibly.app/) |
| Market | Consumer legal-tech / co-parenting. Nice-class analogue: **cl. 42** (SaaS) and/or **cl. 45** (legal services) — but they have filed nothing, so this is inference | — |
| Legal entity | **"Legibly Inc."** — © 2025 Legibly Inc. State of incorporation **unverified** (not disclosed on site or privacy page) | [legibly.app](https://www.legibly.app/), [/privacy](https://www.legibly.app/privacy) |
| Country | US (implied by "Inc." + English-only, US family-court framing). **Unverified** — no corporate registry record retrieved | — |
| Contact | `hello@legibly.com` | [legibly.app](https://www.legibly.app/) |
| Pricing | 3-day free trial · **$4.99/mo** · **$49.99/yr** | [legibly.app](https://www.legibly.app/) |
| Domain age | `legibly.app` **registered 2025-10-22**, expires 2026-10-22 (1-year term) | RDAP: `https://rdap.org/domain/legibly.app` |
| Hosting / mail | Vercel (`*.vercel-dns-017.com`); MX = `eforward1-5.registrar-servers.com` → **Namecheap email forwarding** (i.e. no corporate mail infra) | `dig MX legibly.app`, `dig legibly.app` |
| Web archive footprint | **Zero captures.** Wayback CDX for `legibly.app` (matchType=domain) returns an empty set; control query on `figma.com` returns rows, so the API worked | `https://web.archive.org/cdx/search/cdx?url=legibly.app&matchType=domain` |
| App-store presence | **None found.** No App Store / Google Play listing surfaced; no Product Hunt launch found | WebSearch (negative result) |
| Funding / press | **None found** | WebSearch (negative result) |
| Trademark filings | **None. Zero.** | TMview (see §2) |

**Do they even own `legibly.com`?** They publish `hello@legibly.com`, but the domain tells a different story: `legibly.com` was created **2000-12-31**, sits at GoDaddy with **Media Temple nameservers**, runs its own `mail.legibly.com` MX, and has returned **HTTP 403 continuously since ~2010** in the Wayback record. That is the profile of a long-dormant domain held by an unrelated party, not of a 2025 startup's primary domain. Either they acquired it recently (WHOIS updated 2026-01-01) or they are publishing an address on a domain they do not control. **Unverified.**

**Dormant or growing?** Verdict: **active but embryonic.** Live product, live pricing, but 10 months old, 1-year domain registration, forwarding-based email, no archive/press/app-store/funding footprint, and no IP filings. Enforcement capability against a Figma plugin in a different market: **very low**.

---

## 2. Registered marks — what the databases actually say

### Method & reachability (honest gaps)

| Database | Reachable? | Notes |
|---|---|---|
| **TMview** (`tmdn.org`, EUIPO-operated, aggregates USPTO + EUIPO + WIPO + ~75 offices) | ✅ **Yes** — JSON API, validated with a control query (`figma` → returns records) | This is the primary source below. Intermittently rate-limits; retried. |
| **USPTO TSDR** (per-serial status) | ✅ **Yes** — `tsdr.uspto.gov/statusview/sn<serial>` returns full status + goods/services | Used to verify status + G&S for US hits |
| **USPTO tmsearch.uspto.gov** (new search UI) | ❌ **No** — AWS WAF challenge, JS-required; API path not callable | Substituted by TMview + TSDR |
| **EUIPO eSearch plus** | ❌ **No** — no response from `euipo.europa.eu` in this environment | EU data below comes from TMview's EM (EUIPO) records; EUTM **goods & services text is unverified** |
| **WIPO Global Brand Database** | ❌ Not directly queried | WO records covered via TMview |
| Justia / Trademarkia / uspto.report | ❌ All Cloudflare-403 | — |

### 2.1 Exact term "LEGIBLY"

**TMview, `criteria: contains`, `basicSearch: "legibly"`, all offices → `totalResults: 0`.**

There is **no trademark application or registration containing the string "legibly" in any TMview member office** — including the USPTO and EUIPO. TMview currency was spot-checked: it already carries a US application filed **2026-06-25**, so the index is current to within weeks.

> Consequence: `legibly.app` / Legibly Inc. holds **no registered rights**. Any claim they could bring in the US would be **common-law (unregistered) rights**, limited to the geographic/market scope of their actual use.

### 2.2 Close variants (TMview fuzzy + `contains "legible"`) — the ones that matter

Filtered to **class 9 (software) and class 42 (SaaS/design services)** — our classes.

| Mark | Office | App./Reg. no. | Owner | Filed | Status (verified) | Classes | Goods & services (verbatim, where verified) |
|---|---|---|---|---|---|---|---|
| **Logibly** ⚠️ | **EUIPO (EM)** | **019231527** | Anteprima brands international | 2025-08-12 | **REGISTERED 2026-01-17**, expires 2035-08-12; opposition period closed 2026-01-08; protection in all 27 MS | **9, 42** | **Unverified** (EUIPO detail page unreachable). Word mark. |
| **LEGIBLE** | US | 97227987 | **Legible Media Inc.** (Vancouver, BC, Canada) | 2022-01-19 | **LIVE** / Application / Under Examination — "A suspension inquiry has been sent"; status date 2026-06-11 | **9, 25, 35, 38, 41, 42** | cl. 9: *"Downloadable computer software for transmitting, receiving, uploading, downloading, formatting, synchronizing and accessing visual and audio electronic media"*; cl. 42: *"…providing online non-downloadable computer software for transmitting, receiving, uploading, downloading, formatting, synchronizing and accessing visual and audio electronic media"* |
| **LEGIBLE PLATFORM** ⚠️ | US | 99627721 | Sriniwas Gedella (individual, Fremont CA) | 2026-02-02 | **LIVE / PUBLISHED FOR OPPOSITION 2026-07-14**; "PLATFORM" disclaimed → dominant element = **LEGIBLE** | **42** | *"Software as a service (SAAS) services featuring software using machine learning for Software Development and management of computer operating systems"* |
| **LEGIBLE SYSTEMS** | US | 99906450 | Legible Systems, Inc. | 2026-06-25 | Filed (TMview). TSDR returned 403 for this serial → **status unverified** | **42** | Unverified |
| **LEGIBLE** | US | 86905856 / Reg. 5835094 | Haworth, Inc. | 2016-02-12 | **DEAD** — registration cancelled 2026-02-27 (no §8 declaration) | 42 | — (cancelled) |
| **LEGIBLE** | WIPO / GB / CA | WO 1321309 · UK00801321309 · CA 1792023-00 | Haworth, Inc. | 2016-07-15 | **Registered** (WO, GB, CA) | 42 | Unverified. Haworth = office furniture/workplace; EU designation not confirmed |
| **LEGIBLE** | US | 75753710 / 75753712 | Audible Inc. | 1999-07-14 | **DEAD** (Ended) | 9, 41, 42 | — |
| **Legible** | NZ | 1323552 | LYSERGY LIMITED | 2026-05-20 | Filed | 35, 38, 42, 45 | Unverified |
| **LEGIBL** | FR | 4697515 | UPLAW SAS | 2020-11-03 | Registered | 9, 35, 36, 38, 42, 45 | Unverified |
| **LEGITLY** | US | 88526086 | LEGITLY, INC. | 2019-07-21 | **DEAD** (Ended) | 42 | — |
| **LEGISLY** | EUIPO + HU | 018732539/538, M2101189/190 | Legisly Solutions Kft. | 2021–2022 | Registered | 35, 38, 42, 45 | Unverified — legal-tech |

Non-relevant classes omitted (LEGIBLE in cl. 5/7/11/16/25/35 — Chinese equipment maker, shoes, water filters, etc.).

**Two findings drive the whole analysis:**

1. **EU — "Logibly", EUTM 019231527, REGISTERED, classes 9 AND 42.** One letter apart from LEGIBLY (`e`→`o` in position 2), a word mark, covering exactly our classes, in force across all 27 member states until 2035, opposition window already closed. This is a live registered right sitting on top of our EU class 9/42 space. Whether EUIPO would find LEGIBLY confusingly similar is genuinely uncertain — high visual/phonetic similarity, but "Logibly" is meaningless while "Legibly" is an English dictionary adverb, and conceptual difference can neutralise similarity. **This needs a lawyer, not us.**
2. **US — the LEGIBLE family is colonising class 42 right now.** LEGIBLE PLATFORM is one opposition period away from registering in cl. 42 with "PLATFORM" disclaimed (so the mark that gets protected is effectively *LEGIBLE*), and Legible Media's LEGIBLE covers cl. 9 downloadable software + cl. 42 SaaS in broad terms and is still LIVE. An examiner assessing LEGIBLY for "downloadable software / SaaS" would very plausibly cite one of them under §2(d).

---

## 3. Actual collision risk (US + EU)

### 3.1 Against `legibly.app` / Legibly Inc. — **LOW**

Applying the standard likelihood-of-confusion factors honestly:

| Factor | Legibly Inc. (them) | Legibly (us) | Reads as |
|---|---|---|---|
| Similarity of the mark | LEGIBLY | LEGIBLY | **Identical — maximally bad factor** |
| Goods/services | AI Q&A over custody decrees & parenting plans | Figma plugin: deterministic WCAG 2.2 AA detection + auto-fix, design-system enforcement | **Unrelated in purpose.** "Both are software" is not the test — relatedness is source-confusion, not technology |
| Channels of trade | Consumer web / direct signup | **Figma Community** + our site; B2B/prosumer design tooling | **No overlap** |
| Purchasers & care | Co-parents in litigation, low price, impulse | Designers/design-system owners/a11y leads; $120/yr; often expensed | **Different buyers, higher care** |
| Price point | $4.99/mo · $49.99/yr | $120/yr | Different tier |
| Strength of their mark | Common English adverb, ~10 months' use, no registration, no press | — | **Weak, narrow common-law scope** |
| Priority | First use ~Oct 2025 | First use ~Aug 2026 | **They are the senior user in the US** — the one factor that genuinely cuts against us |
| Actual confusion | None known | — | Neutral (both too small) |
| Bridging the gap | Would require them to enter design tooling, or us to enter legal-tech | — | Implausible on both sides |

**Verdict: plausible coexistence.** Identical marks + genuinely unrelated goods + different channels + different buyers = the classic coexistence pattern (cf. dozens of same-name products living in different classes). Their common-law rights, absent a registration, extend only to their actual market — consumer family-law software — which we will never enter.

**The scenario that changes this:** Legibly Inc. files a US application in **class 9/42** with a broad software identification. As senior user they'd likely get it, and a registration confers nationwide constructive priority. That wouldn't automatically make us infringers (goods still differ), but it would (a) block *our* registration, and (b) hand them a registration certificate to attach to a Figma IP complaint (§4.2). **Probability: unknown but non-trivial — they are a software company with a US entity; filing is the normal next step.** This is the single most important thing to monitor.

### 3.2 Against the LEGIBLE / Logibly families — **MODERATE, and it is about *our* rights, not theirs**

- **US:** filing LEGIBLY in cl. 9 or 42 has a credible chance of a §2(d) refusal over LEGIBLE (97227987) and/or LEGIBLE PLATFORM (99627721). Examiners routinely treat adjective/adverb variants of the same root as confusingly similar when the identifications overlap, and "downloadable computer software" / "SaaS" identifications overlap with ours on their face.
- **EU:** an EUTM for LEGIBLY in cl. 9/42 runs straight into **Logibly** (registered, same classes, all MS). Even if we'd win, Anteprima can oppose, and opposition costs money and ~12–18 months.
- **Additional US wrinkle:** for *our* product specifically, LEGIBLY is much closer to descriptive than it is for a legal-tech app — we literally sell "make your text legible/readable." A §2(e)(1) merely-descriptive objection is conceivable. This cuts both ways: it weakens our exclusivity, but it also weakens anyone else's ability to monopolise the word against us.

**Net:** the practical meaning of all this is not "we'll get sued." It is **"Legibly is a name we can use but probably cannot own."** For a product whose whole positioning is *deterministic, defensible correctness*, an unownable brand is a strategic weakness, not a legal emergency.

---

## 4. Non-trademark risks

### 4.1 SEO / discoverability — **LOW impact, but for an unflattering reason**

- A bare Google/web search for **"legibly"** returns **dictionary results end-to-end** — Vocabulary.com, Dictionary.com, Cambridge, OED, Merriam-Webster, Free Dictionary, Scrabble finders. `legibly.app` did **not** appear in the top results. Neither would we.
- Translation: **the dictionary owns the head term, not our competitor.** Nobody ranks for "legibly." The collision with `legibly.app` costs us almost nothing in SEO because there was no winnable SEO on that term for either party.
- The queries that actually matter — *"figma accessibility plugin"*, *"wcag figma"*, *"figma contrast checker"*, *"legibly figma"* — are uncontested by `legibly.app`. A search for `"Legibly" Figma plugin accessibility WCAG` surfaced the incumbent a11y plugins (WCAG Plugin, Accessibility View, Stark, Corpowid) and **no** legal-tech interference.
- Residual cost: brand-name searches ("legibly pricing", "legibly login") may split between two products, and **`hello@legibly.design` vs their published `hello@legibly.com` is a genuine misdirected-mail vector** — a customer typing the "obvious" domain reaches them, not us.

### 4.2 Figma Community — **no naming block, but a takedown lever exists**

What Figma's published rules actually say:

- **Plugin and widget review guidelines** contain **no rule against reusing a third-party product name.** The only naming-adjacent rule is a *business* rule: *"If a plugin or widget has the same essential functionality as an existing plugin or widget you've published previously, it should share the same listing."* Trust & Safety rejects content that is *"fraudulent, false, misleading, deceptive."* ([source](https://help.figma.com/hc/en-us/articles/360039958914-Plugin-and-widget-review-guidelines))
- **Community Guidelines** restrict only **Figma's own** marks: *"You may use the Figma name, logo, and wordmarks in your design file, plugin, widget, or other Figma Community resource if you comply with Figma's Trademark Guidelines."* Allowed: referring to Figma in the title (e.g. *"Tom's plugin for Figma Design"*). **Not** allowed: *including Figma's name in company names, resource names, domain names, or social media handles (e.g. "Figdesigns")* — and Figma treats **part** of its name (e.g. "Fig") as covered. ([source](https://help.figma.com/hc/en-us/articles/360038510573-Figma-Community-Guidelines))
  - 👉 **Our current listing title "Legibly — Accessibility Auto-Fix & WCAG 2.2 AA Checker" is compliant.** It does not use Figma's name at all. Naming it *"Legibly for Figma"* is **explicitly permitted**.
  - 👉 **Any candidate name containing "Fig" is disqualified.**
- **Copyright & IP Policy** is where the operational risk lives. A mark owner may submit *"(i) for registered Marks, a copy of each relevant federal trademark registration certificate or (ii) for common law or other Marks, evidence sufficient to establish your claimed rights in the Mark."* Figma will then *"seek to confirm the existence of the Mark on the Site, notify the registered user who posted the content including the Mark, and take whatever action, in its sole discretion, it deems appropriate, including temporary or permanent removal of the Mark from the Site."* Repeat infringers can have accounts disabled. ([source](https://www.figma.com/copyright-and-ip-policy/))
  - 👉 Note **"common law or other Marks"** — a complainant does **not** need a registration. Legibly Inc. could file a complaint today on unregistered rights. Figma is a platform, not a tribunal: it can pull a listing without deciding who's right, and a pulled listing means **revenue interruption**, not just a legal argument.
- No Figma plugin named "Legibly" was found (WebSearch). Direct verification via `figma.com/community/search` is **unverified** — Figma bot-blocks that endpoint (403), consistent with the note in `a11y-competitor-teardown.md`.

### 4.3 Own-user confusion

- We are `legibly.design` + `hello@legibly.design`; they are `legibly.app` + `hello@legibly.com`; `legibly.io`, `legibly.ai`, `getlegibly.com` are all third-party-held (see §5.1). We own **one** label in a six-domain namespace we don't control.
- Concrete failure modes: customer emails `hello@legibly.com` about a $120 charge (goes to a stranger who handles *custody documents*); a designer googling "legibly" lands on a co-parenting app and bounces; support/refund friction on a Georgian-issued checkout with a US-sounding name is already a trust-fragile moment.

---

## 5. Rename options (only relevant if a trigger fires)

Positioning to satisfy: **deterministic · zero-false-positive · system-strict · a11y correctness layer**. Explicitly *not* an "AI generates UI" tool. Constraints applied: no "Fig" (Figma rule §4.2), avoid the LEGIBLE/Logibly cluster, avoid the known-polluted names already rejected in `branding.md`.

### 5.1 Domain observations (what we actually saw)

Method: `whois` against explicit registry servers (`whois.verisign-grs.com`, `whois.nic.design`) and **RDAP** (`rdap.org`) for `.app`. Both were validated with a nonsense control (`qzxwlegiblytest99`) — the plain `whois` client returns unusable thin data for `.app`, so **all `.app` results below come from RDAP**, where the control correctly reported AVAILABLE. Availability = registry has no record; it is **not** a reservation and can change any day.

| Candidate | `.design` | `.com` | `.app` | Trademark sanity (TMview `contains`, all offices) | Read |
|---|---|---|---|---|---|
| **Conformly** ⭐ | ✅ **AVAILABLE** | ❌ taken (2014-12-17) | ❌ taken (2025-06-23) | **0 hits worldwide** | Best overall. "Conformance" is the literal WCAG verb; coined adverb matches our house style; totally clean register |
| **Squintly** | ✅ **AVAILABLE** | ❌ taken (2014-05-17) | ✅ **AVAILABLE** | **0 hits worldwide** | Only candidate with `.design` **and** `.app` free. "Squint test" is native design vocabulary. Playful — may undersell "deterministic gate" |
| **Rectifly** | ✅ **AVAILABLE** | ❌ taken (2025-08-02) | ✅ **AVAILABLE** | **0 hits worldwide** | Clean; "rectify" = our auto-fix promise. Slightly awkward to say/spell |
| **Amendly** | ✅ **AVAILABLE** | ❌ taken (2011-10-19) | ❌ taken (2025-04-28) | **0 hits worldwide** | Clean; "amend" is softer/legal-flavoured, weaker fit than Conformly |
| **A11yfix** | ✅ **AVAILABLE** | ❌ taken (2025-09-14) | ✅ **AVAILABLE** | **0 hits worldwide** | Max SEO, zero collision — but descriptive ⇒ weak/near-unregistrable mark, and "a11y" is jargon to PM/non-designer buyers |
| **Wellformed** | ✅ **AVAILABLE** | ❌ taken (2003-11-19) | ❌ taken (2026-08-06) | 12 hits, **all class 25 footwear** (Think Schuhwerk GmbH "THINK! WELLFORMED SHOES…") — cl. 9/42 clear | Dev-native ("well-formed"); clean in our classes; generic-sounding, hard to own |
| **Auditly** ❌ | ✅ AVAILABLE | ❌ taken (2015-01-10) | ❌ taken (2025-01-21) | ⚠️ **4 hits, all cl. 42/9**: AUDITLY US 2026-07-01 (filed), Auditly NO **registered** 2026-01-30, Auditly CL cl. 9+42 filed, AUDITLY.AI US (ended) | **Reject** — repeats the exact mistake we'd be fixing |
| **Plumbline** ❌ | ✅ AVAILABLE | ❌ taken (1999-09-12) | ❌ taken (2019-11-06) | 35 hits (cl. 5/6/8/11/16/20/25/41); live cl. 9/42 hits are expired/ended | Weak reject — crowded register, no live cl. 9/42 conflict but lots of noise |
| **Perceivable** ❌ | ❌ taken | ❌ taken | ❌ taken | not checked | **Reject** — all three TLDs gone |
| **Contrastly** ❌ | ✅ AVAILABLE | ❌ taken | ❌ taken | 0 TMview hits, **but** already rejected in `branding.md` (live photography-presets brand; scope too narrow) | Reject — stands |

⭐ = designated fallback.

**Also confirmed (context for §4.3):** `legibly.com` taken 2000-12-31 (dormant, 403 since ~2010) · `legibly.app` taken 2025-10-22 (the live competitor) · `legibly.io` taken 2025-12-10 (GoDaddy, Domains By Proxy, US) · `legibly.ai` taken 2025-08-30 (Namecheap, Iceland privacy) · `getlegibly.com` taken 2026-04-02 (Name.com) · `legibly.design` **ours**, 2026-08-01, Namecheap→Cloudflare NS.

---

## 6. Recommendation

### ✅ **(b) Keep "Legibly" — but mitigate, and pre-commit to a rename trigger.**

**Why keep, precisely:**

1. **There is no registered "LEGIBLY" anywhere on Earth.** TMview across USPTO + EUIPO + WIPO + ~75 offices: 0 results. Nobody holds the right we'd be infringing.
2. **The only same-name user is 10 months old, consumer legal-tech, unregistered, and has no press, funding, app-store, or archive footprint.** Their common-law scope is their market, and their market is family-court paperwork.
3. **Goods are genuinely unrelated on every DuPont factor except mark identity** — different buyers, different channels, different price tier, no plausible bridging.
4. **Figma imposes no naming restriction we violate,** and "Legibly for Figma" is expressly permitted phrasing.
5. **The SEO loss is near zero** because the dictionary — not the competitor — owns the head term.
6. **The counterfactual isn't free.** Renaming buys us a name we can *own*, but we'd still have to build brand equity from zero, and the leading fallback also has no `.com`.

**Why *only* (b) and not (a):** the honest weakness is that we probably **cannot register LEGIBLY** in cl. 9/42 in either the US (LEGIBLE / LEGIBLE PLATFORM) or the EU (Logibly). We should stop treating a future registration as part of the plan.

### Mitigations — do these before / at publish

| # | Action | Why | Cost |
|---|---|---|---|
| M1 | Always ship as **"Legibly for Figma"** in the store title, site H1, OG tags, and checkout descriptor | Figma-permitted; adds a market qualifier that is the exact thing distinguishing us from a co-parenting app; strengthens any coexistence argument | 0 |
| M2 | Keep the listing/site copy relentlessly category-anchored ("Figma plugin", "WCAG 2.2 AA", "design system") — never bare "Legibly" as a standalone brand claim | Reduces confusion evidence; reinforces different channels of trade | 0 |
| M3 | **Do not file a US/EU trademark for LEGIBLY yet.** Budget for a **paid clearance opinion instead** if/when revenue justifies it | A refusal costs the full fee and creates a written record against us; the money is better spent on an attorney's read of Logibly + LEGIBLE PLATFORM | saves ~$250–1,000 |
| M4 | Defensive domain: register **`getlegibly.design`**? No — instead point spend at whichever fallback we designate, or skip. **Do not** try to buy `legibly.com` / `.app` (signals value to holders, invites a price) | Avoid self-inflicted price discovery | 0 |
| M5 | Put a one-line disclaimer in the site footer: "Legibly is a Figma plugin for accessibility. Not affiliated with any other product named Legibly." | Cheap, honest, defuses complaint framing | ~10 min |
| M6 | Publish support contact as `hello@legibly.design` **everywhere**, including inside the plugin UI and on the receipt/checkout page | Their `hello@legibly.com` is the mail-misdirection vector | ~30 min |
| M7 | **Diarise a re-run of this exact search** (TMview `contains: legibly`) at: pre-publish day, +90 days, and before any paid-marketing spend | The one live threat is Legibly Inc. filing in cl. 9/42; TMview will surface it within weeks of filing | ~15 min each |
| M8 | Keep `docs/branding.md` §"სახელის შეცვლა" and `scripts/rename-product.sh` in working order; keep the name in variables, not hardcoded, in any new code | Keeps the rename cheap for longer | 0 |

### 🚨 Rename triggers — pre-commit now, execute without re-litigating

Rename to **Conformly** (fallback: **Squintly**) if **any** of these occurs:

- **T1** — A trademark application or registration for **LEGIBLY** in **class 9 or 42** appears in any office (TMview `contains: legibly` ≠ 0), by Legibly Inc. or anyone.
- **T2** — We receive a cease-and-desist, or Figma notifies us of an IP complaint under the Copyright & IP Policy.
- **T3** — `legibly.app` visibly scales into general-purpose "document/AI software" positioning, or acquires a design/productivity audience.
- **T4** — An attorney's clearance opinion (if commissioned) comes back adverse on Logibly or the LEGIBLE family.

### Cost of renaming: **NOW vs AFTER launch**

**NOW (pre-publish, 0 users) — ~1 focused day, <$100:**

| Item | Detail | Cost |
|---|---|---|
| Code/docs churn | **84 files, 360 occurrences** of "legibly" across `plugin/` (26), `website/` (24), `docs/` (17), `.claude/` (8), `api/` (6), README/CLAUDE/AGENTS (3) | ~3–4 h with `scripts/rename-product.sh` + manual review |
| Plugin manifest | `plugin/manifest.json` `name` + `id` (`legibly-contrast-fixer`), `plugin/package.json` `name` — **plugin is not yet published**, so no Figma-assigned ID or install base is at stake | ~15 min |
| Domain | New `.design` ≈ $20–40/yr. **`legibly.design` (bought 2026-08-01) is sunk (~$40) and non-refundable** — keep it to 2027 as a 301 redirect | ~$40 |
| Website | `legibly.design` is **live (HTTP 200)** — redeploy under new domain, redo OG images, canonical URLs, sitemap | ~2 h |
| Email | Re-do the Cloudflare Email Routing + Resend verification we just finished (per recent commits `d2e7840`, `ab7d463`, and the Namecheap→Cloudflare migration). **This is the most annoying line item — but it's a repeat of a path we just walked, not a new one** | ~1–2 h |
| Brand assets | Wordmark, favicon, plugin cover art, AAA-audited palette survives (name-independent) | ~2 h |
| GitHub | Repo already named `Designer`; only description/README change | ~10 min |
| **Users affected** | **Zero.** Plugin unpublished, no customers, no reviews, no backlinks | **0** |

**AFTER launch (with paying users) — weeks of drag + revenue risk:**

- Figma listing name is editable (**unverified** whether the Community URL slug/handle follows) — install count and reviews likely survive, but every backlink, tutorial mention, and search result points at the old name.
- Paying customers hold **receipts, invoices, and card-statement descriptors** under the old name → chargeback and dispute risk on a Georgian ინდ. მეწარმე checkout, where trust is already the fragile part.
- Dual-running two support domains for 12+ months; renewing the old domain indefinitely.
- All SEO/backlink equity restarts; any press/newsletter coverage is stranded.
- If the rename is *forced* by a Figma takedown (§4.2), the listing is down **while** we rebrand — that's a direct revenue stop, plus refund exposure.
- Realistic: **10–20× the effort of renaming today, with a non-zero revenue hit.**

**Bottom line:** the rename option never gets cheaper than this week. That is exactly why (b) is defensible — we are consciously accepting a low-probability, medium-cost risk while keeping the escape hatch cheap, monitored, and pre-decided. If the answer to "would we bet $120/yr of revenue on this?" ever becomes uncomfortable, the trigger list fires and we move to **Conformly**.

---

## Open questions

- **Where is Legibly Inc. incorporated, and does it actually control `legibly.com`?** Both unverified. A US corporate-registry lookup (Delaware/California SoS) and a `legibly.com` acquisition check would sharpen the priority analysis.
- **What are Logibly's (EUTM 019231527) actual goods & services in cl. 9/42?** EUIPO was unreachable here. If the specification is narrow and unrelated to design software, the EU risk drops a lot. **This is the highest-value single unknown.**
- **LEGIBLE SYSTEMS (US 99906450)** — TSDR returned 403 for this serial; status/G&S unverified.
- **Does Figma preserve the Community URL slug on a plugin rename?** Determines the true post-launch rename cost. Unverified.
- **Is there already a Figma Community plugin named "Legibly"?** WebSearch says no; direct Community search is bot-blocked. Should be checked manually in-app before publish.
- **Does the EU/US analysis change for a Georgian sole trader?** Jurisdiction/service-of-process realities for a GE ინდ. მეწარმე selling into the US/EU are outside this research and worth one attorney question.

## Sources

- [legibly.app — product, pricing, "© 2025 Legibly Inc."](https://www.legibly.app/) · [privacy page](https://www.legibly.app/privacy)
- [TMview (EUIPO/TMDN) — multi-office trademark search](https://www.tmdn.org/tmview/) — API `POST /tmview/api/search/results`; queries run 2026-08-12: `contains:"legibly"` → 0; `fuzzy:"legibly"` → 45; `contains:"legible"` → 43; candidate-name checks
- [USPTO TSDR — LEGIBLE, serial 97227987 (Legible Media Inc.)](https://tsdr.uspto.gov/statusview/sn97227987)
- [USPTO TSDR — LEGIBLE PLATFORM, serial 99627721](https://tsdr.uspto.gov/statusview/sn99627721)
- [USPTO TSDR — LEGIBLE, serial 86905856 (Haworth, cancelled 2026-02-27)](https://tsdr.uspto.gov/statusview/sn86905856)
- EUIPO record for **Logibly**, EUTM 019231527 (data via TMview; detail page unreachable): [euipo.europa.eu/eSearch — trademark 019231527](https://euipo.europa.eu/eSearch/#details/trademarks/019231527)
- [Figma — Plugin and widget review guidelines](https://help.figma.com/hc/en-us/articles/360039958914-Plugin-and-widget-review-guidelines)
- [Figma — Community Guidelines (trademark & IP sections)](https://help.figma.com/hc/en-us/articles/360038510573-Figma-Community-Guidelines)
- [Figma — Copyright and IP Policy (trademark complaint process)](https://www.figma.com/copyright-and-ip-policy/)
- [Figma — Using the Figma brand / trademark guidelines](https://www.figma.com/using-the-figma-brand/)
- RDAP domain registry lookups (2026-08-12): [rdap.org/domain/legibly.app](https://rdap.org/domain/legibly.app) and the same endpoint for each candidate
- `whois` against `whois.verisign-grs.com` / `whois.nic.design` (2026-08-12), control-validated
- [Wayback Machine CDX API](https://web.archive.org/cdx/search/cdx?url=legibly.app&matchType=domain) — `legibly.app`: 0 captures; `legibly.com`: HTTP 403 since 2010
- WebSearch: `"legibly"` (dictionary-dominated SERP); `"Legibly" Figma plugin accessibility WCAG` (no collision); `"Legibly" co-parenting app` (product confirmation)
- Internal: [`docs/branding.md`](../branding.md) (D9 lock + prior indicative clearance), [`plugin/manifest.json`](../../plugin/manifest.json), repo grep 2026-08-12 (84 files / 360 occurrences)
