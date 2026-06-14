# Accessibility & Design-Lint Competitor Teardown

> Scope: Per-tool teardown of the accessibility + design-linting tools in/around Figma, then synthesis on fix-vs-flag, reliability, pricing, and the precise whitespace for our "correctness layer" plugin.
> Date: 2026-06-14
> Researcher: Claude session via design-explorer
> Method: WebSearch + WebFetch triangulation across vendor sites (getstark.co, deque.com, willowtreeapps.com, adee.co), GitHub (FigmaLint, Design Lint), G2, and independent reviews (Sparkbox, Ben Walsh, LogRocket, story.to.design, Lokalise). Figma Community pages bot-block WebFetch — install counts are vendor-stated or from third-party reviews and are point-in-time [VERIFY in-app].
> Grounding: builds on `figma-plugin-opportunity.md` (Candidate A = "Design Correctness / Governance Gate" won at 27/30). This doc stress-tests the wedge against the a11y incumbents specifically.

---

## TL;DR

- **Nobody does reliable, automated, system-aware FIX. The entire category is DETECT-first.** Every tool flags; "fixing" is at best a per-element color *suggestion* you click to accept (Stark, Adee, A11y CC Checker). The one tool that genuinely *auto-fixes* — **FigmaLint** — explicitly auto-fixes only **tokens, naming, and component props, NOT accessibility**. Contrast/touch-target/font-size issues are left "in audit results for manual remediation." That is the validating gap: **no tool closes the loop on a11y fixes.**
- **FigmaLint is our nearest competitor and it is advisory, not a gate.** It is AI/multi-LLM (Claude Opus 4.5 / GPT-5.2 / Gemini 3, bring-your-own-key), open-source, free. It *audits* and *exports docs* (Markdown/JSON/AI-prompt) and auto-fixes the design-system layer — but it does **not block**, does **not auto-fix a11y**, and has **no re-verification loop**. Our hard-fail gate + a11y auto-fix + verification loop sits squarely in its blind spot.
- **Reliability is the category's soft underbelly — specifically background/color detection.** axe for Designers (Deque) "frequently grabs the wrong colours from layers" (Jan 2026 review); Figma's own native contrast checker is reported to round contrast ratios up; Stark itself surfaces "context-uncertain" items it can't confirm. A tool that resolves the *actual* rendered background (gradients, images, overlapping fills, opacity) reliably would beat the field on trust, not features.
- **Pricing is tightly clustered: free → ~$12/mo Pro → ~$15/seat Team.** Stark anchors at **$12/mo (or $120/yr) Pro, $15/seat/mo Team (5-seat min)**, enterprise custom. Most checkers (Adee, Contrast, Able, axe, Color Blind) are **fully free**. The paid air is thin and Stark owns it; our price band must be **$10–15/mo Pro**, justified by *fix + governance*, not by another checker.
- **The unoccupied whitespace = AUTO-FIX (a11y) + SYSTEM-STRICT + VERIFICATION LOOP + FIGMA-NATIVE, neutral across any generator.** Each tool owns 1–2 of these; none owns the combination. Stark = detect+suggest+annotate (no system, no loop). FigmaLint = AI audit + DS auto-fix (no a11y fix, no gate, no loop). Annotation kits = handoff docs only. That four-way intersection is empty.

---

## Per-tool teardown table

Fields: DETECT-only vs DETECT+FIX · deterministic vs AI · reliability reputation · native vs external · pricing · base · biggest gap vs our wedge.

| Tool | What it does | Detect vs Fix | Deterministic vs AI | Reliability reputation | Figma-native vs external | Pricing | Base (point-in-time) | Biggest gap vs our wedge |
|---|---|---|---|---|---|---|---|---|
| **Stark** (category leader) | Contrast checker, vision/CVD simulator, focus-order editor, alt-text/touch-target, a11y annotations, WCAG audit; suite spans Figma + browser ext + web app | **DETECT + per-element color *suggestion*** ("auto-scan & fix" surfaces issues; Color Suggestions offer AA/AAA swatches you accept). **NOT bulk/system auto-fix** — accepting a suggestion updates only that element and does **not** update library styles (vendor-warned "stray styles" risk) | Deterministic (rule/WCAG math) for contrast; suggestion engine is algorithmic | Strong/trusted for contrast; flags "context-uncertain" items rather than asserting; "removed false-positive results on WCAG audit" per release notes | Figma plugin (+ ecosystem) | Free (contrast + CVD sim); **Pro $12/mo or $120/yr**; **Team $15/seat/mo, 5-seat min**; Enterprise custom | "40,000+ designers / 28,000+ companies" (vendor); ~390K Figma users cited by one listicle [VERIFY] | No design-system hard-fail; no global auto-fix that respects tokens; no regen; no verification loop; a11y-only |
| **FigmaLint** ⭐ nearest competitor | AI audit of components for DS compliance, a11y, dev-readiness; checks states, WCAG (contrast/targets/focus), tokens vs hardcoded, naming; exports MD/JSON/AI-prompt | **DETECT + FIX, but FIX scoped to DS only** — Auto-Fix binds tokens (fuzzy match), renames layers (BEM/kebab/camel), stages component props. **A11y issues are detected but NOT auto-fixed** ("remain in audit results for manual remediation"). Advisory; does **not block** | **AI/LLM** — Anthropic Claude Opus 4.5/Sonnet 4.5/Haiku, OpenAI GPT-5.2, Google Gemini 3; **bring-your-own API key** | No published accuracy claims; "detects/suggests" framing implies human review; no re-check loop documented | Figma plugin (open-source, ISC) | **Free** (you pay your own LLM key) | Open-source, GitHub `southleft/figmalint`; install count not public | **No a11y auto-fix; no hard-fail gate; no verification loop.** Exactly the three things our wedge adds on top of what it already does |
| **Adee** | Contrast check + *apply changes*; 8-mode CVD simulation; touch-target size checker; alt-text generator; share results; code generator | **DETECT + apply** (contrast: "test and apply changes"; alt-text generated) — per-element, not system-wide governance | Deterministic checks; AI alt-text | Generally positive in listicles; less scrutinized than Stark/axe | Figma plugin (also Sketch/XD) | **Free** | Listed in Figma Community a11y; count not public | No system-strict enforcement, no gate, no loop; multi-tool feel but advisory |
| **Contrast** (WillowTree / TELUS Digital) | Auto-detects background behind selection, shows contrast ratio vs WCAG AA/AAA; scans gradients/images/blends/fills; **APCA (WCAG 3) beta** | **DETECT-only** (read-out + guidance; no fix action) | Deterministic | Well-regarded free contrast tool; large base | Figma plugin | **Free** | **220,000+ users** (vendor/TELUS) | Contrast-only; no fix, no system, no a11y breadth, no loop |
| **A11y - Color Contrast Checker** | WCAG color analysis with real-time sliders to adjust colors and watch ratio change | **DETECT + manual slider adjust** (you move sliders; not auto) | Deterministic | Niche, free | Figma plugin | **Free** | Community | Contrast-only, manual; no automation |
| **Able** | Auto-compares contrast between two selected layers; text/bg preview; CVD simulation as you design | **DETECT-only** (live read-out) | Deterministic | Liked for zero-friction inline checking | Figma plugin | **Free** | Community | Contrast/CVD only; no fix, no system, no loop |
| **Color Blind** | Clones selection into 8 CVD variants grouped & labeled | **DETECT/visualize-only** (generates simulation copies) | Deterministic image transform | Simple, single-purpose | Figma plugin | **Free** | Community | Visualization only; not a checker or fixer |
| **Include – Accessibility Annotations** (Microsoft Design) | Annotation kit/plugin to spec a11y (focus order, headings, alt text, ARIA, keyboard) for handoff | **DOCUMENT-only** (annotations for dev handoff; no checking, no fixing) | N/A (manual authoring) | Trusted; widely used handoff standard | Figma plugin/library (Microsoft) | **Free** | Microsoft-backed, widely adopted | Pure documentation; doesn't detect or fix anything — complementary, not competing |
| **A11y Annotation Kit** (community/Indeed; popularized by Atlassian) | Standardized a11y annotation components for handoff (callouts, focus order, keyboard) | **DOCUMENT-only** | N/A | De-facto annotation standard | Figma library | **Free** | Very widely used | Same as Include — handoff docs, not a gate |
| **Microsoft A11y – Focus Order** | Add focus-order annotations over interactive elements | **DOCUMENT-only** | N/A | Trusted | Figma plugin (Microsoft) | **Free** | Microsoft | Annotation only |
| **Design Lint** | General design linter: flags missing text/fill/stroke/effect styles, bad border-radius | **DETECT + bulk fix-by-value** ("Select All" fixes multiple errors sharing one value) | Deterministic rules | Popular, stable, open-source | Figma plugin (open-source) | **Free** | Established (Product Hunt) | DS-consistency only; **no a11y at all**; no semantic/token-aware fix, no loop |
| **Formalist – Progressive Design Linter** | Rule-based linter: layer naming, style usage, fractional coords; "find and fix" | **DETECT + some fix** | Deterministic rules | Niche | Figma plugin | **Freemium** (15 free scans, then paid) | Community | No a11y depth, no system enforcement, no loop |
| **Polypane** | Browser-based dev tool: a11y, contrast, CVD, responsive testing — **NOT a Figma plugin** | DETECT (dev/QA stage, not design) | Deterministic | Respected dev tool | **External (browser)**, not Figma | Paid SaaS | Dev tooling | Wrong stage (post-code); not in our Figma-native lane |
| **axe for Designers** (Deque) | A11y Scan, WCAG contrast checker, focus order, annotations | **DETECT-only** (audit + annotate) | Deterministic (axe-core lineage) | **Reliability complaints**: Jan 2026 review — "frequently grabs the wrong colours from layers," spotty background detection, component/section/instance support "unreliable in practice" | Figma plugin (Deque) | **Free** (beta) | "8,000+ designers" (vendor, beta) | Detect-only; color-detection unreliability is a *cautionary tale* for our own engine |
| **Figma native contrast checker** | Built-in contrast read-out | DETECT-only | Deterministic | Reported to **round contrast ratios up** (forum bug report) — a trust gap in the platform itself | Native | Bundled | All Figma | No fix, no audit, no system; rounding bug undermines trust |

---

## Deep dive — Stark (the anchor)

**Position.** Stark is the undisputed category leader and the *only* pure-a11y tool sustaining a real paid business. It is a *suite* (Figma plugin + browser extension + web app), which is why it can charge when single-purpose checkers can't. Vendor claims "40,000+ designers across 28,000+ companies"; one listicle cites ~390K Figma users (treat as marketing-order-of-magnitude, not verified).

**Capabilities.** Contrast checker (all states: default/hover/disabled/error), Vision/CVD Simulator (protanopia/deuteranopia/tritanopia + more), Focus Order editor (make implicit keyboard order explicit & correctable), Alt-Text + Touch-Target, A11y Annotations, and a WCAG Audit. Contrast now handles gradients and images.

**Fix vs flag — the critical nuance.** Stark markets an "auto-scan & fix" and "Color Suggestions" (AA/AAA-guaranteed swatches that stay close to your original and update in real time). **But this is a per-element *suggestion you accept*, not a reliable system-wide auto-fix.** Stark's own support docs warn: accepting a color suggestion via the Contrast tool updates **only that individual element** and does **NOT** update the corresponding library color styles — applying suggestions in many places "could lead to a design with many stray styles." So Stark explicitly is *not* system-aware fixing; it can actively *create* design-system drift. Stark's stated philosophy: "designed to help you identify and understand accessibility issues **rather than automatically fix them**."

**Reliability.** Strong reputation for contrast accuracy. Notably mature about false positives: it surfaces "context-uncertain" items for human review rather than over-asserting, and release notes claim removal of false-positive WCAG-audit results. This is the bar our detection must clear.

**Pricing.** Free tier = contrast checker + CVD simulator (the two most-used features) — generous, which is *why the free a11y-checker market is commoditized*. **Pro $12/mo (or $120/yr)** adds focus order, alt-text, touch targets, audit, team features. **Team $15/seat/mo (5-seat minimum)**. Enterprise custom (SSO, bulk). G2 complaints cluster on "too much locked behind premium" and "expensive for small teams."

**Wedge against Stark.** (1) Stark warns its own fixes cause stray styles → **we fix to the nearest on-system token**, turning the a11y fix into a *system-strengthening* action instead of a drift-creating one. (2) Stark has no hard-fail/gate. (3) No re-verification loop. (4) A11y-only — no design-system governance. We are not "better Stark"; we are the *governance gate Stark is philosophically unwilling to be* ("we help you understand, not auto-fix").

---

## Deep dive — FigmaLint (nearest competitor — go deep)

**Why it's the closest.** It is the only tool that already combines *AI audit + accessibility + design-system + auto-fix* in one Figma plugin, and it uses Claude — the same model family we'd use. On paper it overlaps our Candidate A more than anything else in the market.

**What it actually does.** "Audits components for design-system compliance, accessibility, and developer readiness." Checks: interactive states (hover/focus/disabled/pressed/active), WCAG (contrast, touch targets, focus indicators), component readiness/structure, tokens vs hardcoded values, naming conventions. Outputs: in-plugin audit + exports to Markdown, JSON, and **AI-prompt** format. Multi-LLM: Anthropic (Claude Opus 4.5 / Sonnet 4.5 / Haiku 4.5), OpenAI (GPT-5.2 / Pro / Mini), Google (Gemini 3 Pro / 2.5). **Bring-your-own API key**, stored per-provider in Figma local storage. Open-source (ISC), free.

**Auto-Fix — exactly where it stops (this is the whole ballgame).**
- ✅ Auto-fixes **token binding** (fuzzy match hardcoded color/spacing → DS variables, property-aware scoring).
- ✅ Auto-fixes **layer renaming** (semantic, 6 naming strategies).
- ✅ Stages **component properties** (Boolean/Text/Instance-swap/Variant from AI suggestions).
- ❌ Does **NOT** auto-fix accessibility — "identifies a11y issues (contrast ratios, touch targets, font sizes)… but does **not** auto-fix these problems. These remain in audit results for **manual remediation**."
- ❌ **No hard-fail / blocking** — it is advisory documentation + DS cleanup.
- ❌ **No verification loop** — "Fix All" exists for batch DS fixes, but docs don't describe any re-check after applying; user approves, no closed loop.

**Reliability.** No published accuracy guarantees. The "detects/suggests" framing and BYO-key model push correctness onto the user + the chosen LLM. AI-based audit means non-determinism: the same file can yield different findings across runs/models — an inherent trust risk we can exploit with a **deterministic rule core + LLM only for fix-suggestion**.

**Wedge against FigmaLint (precise).** It already does the *DS* half of our wedge (token binding, renaming) — so we should NOT try to out-FigmaLint it on token cleanup. Our differentiation is the three things it explicitly lacks:
1. **A11y AUTO-FIX** (it detects a11y but punts to manual) — we close contrast/target/font-size automatically against on-system tokens.
2. **Hard-fail GATE** (it's advisory; we block off-system / sub-AA output, including a generator's).
3. **VERIFICATION LOOP** (it has no re-check; we re-scan after fix and assert pass/fail).
Plus: deterministic detection core (trust) vs its pure-LLM audit (variance), and neutrality as a gate over *any* generator's output (incl. Figma's Agent), not a one-shot manual audit.

---

## Cross-tool synthesis

### 1. Fix vs Flag — does ANYONE do reliable automated a11y fix?

**No. This validates the wedge.** Mapping the whole field:

| Capability | Tools that have it | Tools that DON'T |
|---|---|---|
| Detect a11y issues | Stark, Adee, Contrast, Able, axe, A11y CC, FigmaLint, Figma native | — |
| **Per-element a11y *suggestion* (accept-to-apply)** | Stark (Color Suggestions), Adee (apply changes), A11y CC (sliders) | most |
| **Automated, system-aware a11y FIX** | **NONE** | everyone |
| Auto-fix design-system (tokens/naming) | **FigmaLint** (AI), Design Lint (by-value), Formalist (some) | a11y tools |
| **Verification loop (re-check after fix)** | **NONE documented** | everyone |
| **Hard-fail / gate (block on fail)** | **NONE** | everyone |

The market splits cleanly: **a11y tools fix nothing (or per-element suggest); DS linters fix tokens/naming but ignore a11y.** The two halves never meet, and *nobody* gates or verifies. Our wedge = the union + the loop + the gate. The category's own leader (Stark) is *philosophically opposed* to auto-fix, and the closest combiner (FigmaLint) *deliberately excludes* a11y from its auto-fix. The whitespace is real, not assumed.

### 2. Detection reliability landscape — who's trusted, who isn't

- **Trusted:** **Stark** (contrast accuracy; mature false-positive handling — flags "context-uncertain" rather than over-asserting), **Contrast/WillowTree** (220K+ users, solid free contrast incl. gradients/images, APCA beta).
- **Reliability complaints:** **axe for Designers (Deque)** — Jan 2026 review: "frequently grabs the wrong colours from layers," spotty background detection, component/section/instance support "unreliable in practice." **Figma native contrast checker** — reported to round contrast ratios up (forum bug). **Any AI-based auditor (FigmaLint)** — non-deterministic by construction; no published accuracy.
- **The recurring failure mode is background/color *resolution*** — getting the *actual rendered* background under a layer (gradients, images, opacity, stacked fills, blend modes). This is where axe fails and even Figma's native tool fumbles (rounding). **Reliability here is a moat, not a checkbox.** Our detection engine must nail rendered-background resolution and report deterministically; that alone differentiates us from the AI-audit and the buggy-free crowd.

### 3. Pricing norms → our band

| Tier | Market norm | Examples |
|---|---|---|
| Free | Universal for single-purpose checkers; even Stark gives away contrast + CVD | Adee, Contrast, Able, axe, Color Blind, A11y CC, Design Lint, FigmaLint (BYO-key) |
| **Pro** | **~$12/mo or ~$120/yr** | **Stark $12/mo, $120/yr** |
| **Team** | **~$15/seat/mo (5-seat min)** | **Stark $15/seat** |
| Enterprise | Custom (SSO, bulk) | Stark |

- **Free a11y *checking* is commoditized — we cannot charge for detection.** The moment of value (and payment) is **fix + governance + verification**, which nobody sells.
- **Recommended band: free tier (detect + a flagged-issue count) → Pro $12/mo (or ~$120/yr) → Team $15/seat/mo.** Match Stark's anchor exactly so we're not the expensive option, but **justify Pro with auto-fix + gate + loop**, not with checking. The Team/seat motion is where the regulated/DesignOps ARPU lives (per opportunity study §3).
- G2's recurring Stark gripe ("too much behind premium," "expensive for small teams") → keep our free tier *useful* (real detection, not a teaser) to win switchers, monetize the fix/gate.

### 4. The precise whitespace nobody occupies

Four axes. Each competitor holds 1–2; the intersection is empty.

| | Auto-FIX a11y | System-strict (token-aware) | Verification loop | Figma-native + generator-neutral |
|---|---|---|---|---|
| Stark | suggest-only | ✗ (warns it creates stray styles) | ✗ | native, a11y-only |
| FigmaLint | ✗ (a11y manual) | ✅ (token bind) | ✗ | native, audit-once |
| Design Lint / Formalist | ✗ (no a11y) | partial (style usage) | ✗ | native |
| Annotation kits (Include/A11y Kit) | ✗ | ✗ | ✗ | native, docs-only |
| axe / Contrast / Able / Adee | suggest/none | ✗ | ✗ | native, checker |
| **US (Candidate A)** | **✅** | **✅** | **✅** | **✅ + neutral over any generator incl. Figma Agent** |

**The empty cell = `auto-fix a11y` × `system-strict token-aware` × `verification loop` × `Figma-native, generator-neutral`.** Stated as a sentence: *the only tool that automatically fixes accessibility failures by snapping them to your design-system tokens, then re-verifies the fix actually passed WCAG 2.2 AA, and does this as a blocking gate over any design or generator output (including Figma's own Agent).*

---

## Implications for our MVP scope and pricing

**MVP scope (what to build first, given the teardown):**
1. **Deterministic detection core that nails rendered-background resolution.** This is the trust moat — beat axe's "wrong colours" and Figma's rounding. Rule-based, not LLM, for *detection* (FigmaLint's AI-audit variance is a weakness to exploit). Cover contrast (incl. gradients/images/opacity/stacked fills), touch-target, font-size.
2. **A11y AUTO-FIX that snaps to the nearest on-system token** — the literal inverse of Stark's "stray styles" warning. This single feature is unoccupied across the entire market and is the headline.
3. **Verification loop** — re-scan after fix, assert pass/fail. Nobody documents one; it is cheap to build and a strong trust/marketing differentiator ("we prove it passed").
4. **Hard-fail gate** that can run over *any* selection — human design OR a generator's output (Figma Agent, Buddy, etc.). Pair every hard-fail with the one-click fix so the gate "helps, not nags" (per opportunity-study risk note).
5. **Defer:** brand-QA vision and state-machine flows to v2. **Do NOT** rebuild FigmaLint's token-binding/renaming as a headline — it's solved and free; treat DS-fix as a secondary module or interop, not the wedge.

**Explicitly avoid:** competing on *checking* (free/commoditized), on *annotations* (Microsoft/Include own handoff docs free), or on *CVD simulation* (everyone has it free). These are table-stakes free features, not monetizable.

**Pricing:** **Free (real detection + issue count) → Pro $12/mo or ~$120/yr → Team $15/seat/mo (5-seat min)**, mirroring Stark so we're never the "expensive" option, with Pro value = **fix + gate + loop** (the things Stark and FigmaLint don't sell). Enterprise/seat motion for the regulated + DesignOps buyer is the ARPU upside.

**One-line positioning vs the field:** *Stark tells you what's broken; FigmaLint cleans your tokens; we are the only one that automatically fixes the accessibility failure to your own design system and proves it now passes — as a gate over anything, including Figma's Agent.*

---

## Open questions

- **In-app install counts** (Stark, FigmaLint, Contrast, axe) — Community bot-blocks WebFetch; "390K Stark users" and "220K Contrast users" need in-app verification.
- **Does FigmaLint plan a11y auto-fix?** It's open-source (`southleft/figmalint`) — check issues/roadmap; if they add a11y auto-fix, our lead narrows. Worth a GitHub issues read.
- **Stark exact current pricing** — triangulated to $12/mo · $120/yr Pro · $15/seat Team; confirm against live getstark.co/pricing (WebFetch was permission-denied this session).
- **Verification-loop feasibility in Figma plugin API** — re-scanning after a mutation must be fast/non-destructive; validate against `figma.` API limits before committing it as headline.
- **Rendered-background resolution accuracy** — how hard is it to reliably resolve true background under gradients/images/opacity/blend? This is the moat; needs a technical spike (it's exactly where axe fails).
- **APCA / WCAG 3 stance** — Contrast and Polychrom already ship APCA beta. Do we support APCA at launch or stay WCAG 2.2 AA only? Affects "future-proof" marketing.

## Sources

- Stark — [Stark for Figma](https://www.getstark.co/figma/) · [Contrast Checker + Color Suggestions support](https://www.getstark.co/support/getting-started/using-the-contrast-checker/) · [Announcing Paid Plans](https://www.getstark.co/blog/announcing-starks-paid-plans/) · [Release notes](https://www.getstark.co/release-notes/) · [Elevated contrast checking (gradients/images)](https://www.getstark.co/blog/elevated-contrast-checking/) · [G2 pricing](https://www.g2.com/products/stark-stark/pricing) · [G2 pros & cons](https://www.g2.com/products/stark-stark/reviews?qs=pros-and-cons) · [Sparkbox review](https://sparkbox.com/foundry/stark_for_figma_accessibility_testing_tool_design_website_accessibility_and_accessible_design_review_tool) · [Easyweb 2026 review](https://www.easyweb-agency.fr/en/outils-comparatifs/stark)
- FigmaLint — [GitHub southleft/figmalint](https://github.com/southleft/figmalint) · [Figma Community](https://www.figma.com/community/plugin/1521241390290871981/figmalint)
- Adee — [Adee plugins](https://www.adee.co/products/plugins) · [Figma Community](https://www.figma.com/community/plugin/931280467863251825/adee-comprehensive-accessibility-tool) · [UX Collective walkthrough](https://uxdesign.cc/inclusive-design-how-to-use-adee-comprehensive-accessibility-tool-41b159d29973)
- Contrast (WillowTree/TELUS) — [WillowTree/TELUS write-up](https://www.willowtreeapps.com/insights/accessible-to-all-how-our-figma-plugin-contrast-helps-designers-foreground-inclusivity) · [Figma Community](https://www.figma.com/community/plugin/748533339900865323/contrast)
- axe for Designers (Deque) — [Deque axe design beta](https://www.deque.com/axe/design-beta/) · [Figma Community](https://www.figma.com/community/plugin/1085612091163821851/axe-for-designers-a-free-accessibility-plugin) · [Ben Walsh Jan 2026 review (reliability)](https://www.benjaminwalsh.co.uk/best-figma-plugins-for-accessibility-testing)
- Able / Color Blind / A11y CC Checker — [LogRocket 10 a11y plugins](https://blog.logrocket.com/ux-design/10-figma-accessibility-plugins/) · [Kalamuna free a11y plugins](https://www.kalamuna.com/blog/free-figma-plugins-accessibility-design) · [Lokalise top 9](https://lokalise.com/blog/figma-plugins-accessibility/)
- Include / A11y Annotation Kit (Microsoft) — [Include – Accessibility Annotations](https://www.figma.com/community/plugin/1208180794570801545/include-accessibility-annotations) · [A11y Annotation Kit](https://www.figma.com/community/file/953682768192596304/a11y-annotation-kit) · [Atlassian/Medium walkthrough](https://medium.com/designing-atlassian/create-accessible-designs-using-the-figma-a11y-annotation-kit-35371f00dac5)
- Design Lint / Formalist — [Design Lint GitHub](https://github.com/destefanis/design-lint) · [Design Lint site](https://lintyour.design/) · [Formalist Community](https://www.figma.com/community/plugin/1016769583931337913/formalist-progressive-design-linter) · [Linting tools overview](https://thedesignsystem.guide/knowledge-base/linting-tools-for-figma)
- Figma native contrast rounding bug — [Figma Forum report](https://forum.figma.com/report-a-problem-6/figma-contrast-checker-rounds-up-41901)
- General landscape — [story.to.design a11y plugins](https://story.to.design/blog/best-figma-plugins-to-design-for-accessibility) · [Figma a11y blog](https://www.figma.com/blog/design-for-everyone-with-these-accessibility-focused-plugins/)
</content>
</invoke>
