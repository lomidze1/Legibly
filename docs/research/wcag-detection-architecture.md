# Trustworthy WCAG 2.2 AA Detection — Architecture Research Notes

> Source: W3C WCAG 2.2, Deque/axe-core, IBM Equal Access (primary), plus APCA/culori for contrast math.
> Date: 2026-06-14
> Researcher: Claude session via design-explorer
> Grounding: `docs/research/figma-plugin-opportunity.md` (correctness-layer wedge), `docs/architecture.md` §0.C (7 principles), §3 (DesignSpec), §9 R5 (false positives destroy trust). The architecture already commits to `culori` and WCAG 2.2 AA — this note specifies *how to be trustworthy*, not whether to do it.

---

## TL;DR

- **The headline number designers will quote ("~57% auto-detectable", Deque) is NOT the right number for us.** It is *issues-by-volume in real web audits*, not *criteria coverage*. The criteria-level truth is harsher: only **~29.5% of WCAG 2.2 success criteria are fully automatable, ~10% partly, ~60% need human/LLM judgment**. We must design for the 60%, not pretend it away. Both figures are real; cite the one that matches the claim.
- **Our trust strategy is axe-core's, stolen wholesale: a zero-false-positive deterministic tier.** Deque's manifesto literally states automated rules must have a *zero false positive rate*; anything uncertain becomes **"needs review" / "incomplete"**, never a violation. IBM Equal Access does the same with six explicit levels (`violation`, `potentialviolation`, `recommendation`, `potentialrecommendation`, `manual`, `pass`). **Adopt a 3-tier model: CERTAIN (hard-fail) → NEEDS JUDGMENT (LLM-assisted, confidence-scored) → CANNOT DETERMINE FROM FIGMA (manual review).** This directly mitigates R5.
- **The deterministic tier we can actually trust in Figma is small but high-value:** contrast (1.4.3), non-text contrast (1.4.11), target size (2.5.8), text-spacing capability (1.4.12), and color-only-signifier *suspicion* (1.4.1). These are exactly the checks the figma-plugin-opportunity wedge #2 needs, and they overlap our 7 principles.
- **Figma is NOT a DOM.** It has no semantics, no real focus order, no runtime states (hover/focus/disabled), no resize. Any criterion that depends on those (1.3.1, 2.4.3, 2.4.7-as-rendered, 4.1.x, reflow) is *structurally undecidable from a static Figma file* and must be flagged honestly as needs-review, never hard-failed. Pretending otherwise is exactly the "bad result from a bad result" failure mode this project exists to avoid.
- **Contrast math: ship WCAG 2 ratio as the pass/fail gate (it is the legal standard for AA in 2026), show APCA Lc as an advisory secondary signal.** WCAG 3 is still Placeholder/draft and APCA has no ratified thresholds — do not gate on it. Use `culori` (`wcagContrast`, `wcagLuminance`) for the deterministic WCAG-2 math we already depend on in §2.7/§2.11.

---

## Section 1 — WCAG 2.2 AA criteria classified by automatability (from Figma)

Legend for **Tier**: **D** = Deterministic (we can be *certain*, hard-fail eligible) · **P** = Partial (deterministic pre-filter, LLM/human confirms) · **J** = Judgment only (LLM-assisted or manual, never hard-fail) · **N/A-Figma** = depends on runtime/DOM, undecidable from a static design.

Confidence column = our confidence in the *Figma-derived* verdict, not WCAG's testability in a browser. This is the load-bearing distinction: many criteria are auto-testable on a live DOM but NOT on a Figma file.

| SC | Name (Level) | Tier | How to check from Figma node data | Confidence |
|---|---|---|---|---|
| **1.4.3** | Contrast (Minimum) (AA) | **D** | Resolve effective fg color of `TextSpec` and effective bg behind it; compute WCAG-2 ratio. ≥4.5:1 normal, ≥3:1 large (≥24px, or ≥18.66px bold). Hard cases in §2. | **High** when bg is a flat resolved fill; **drops to P** over gradients/images. |
| **1.4.11** | Non-text Contrast (AA) | **D/P** | UI component boundaries, icons, focus rings, form borders vs adjacent color ≥3:1. Deterministic *math*; **P** because "which nodes are meaningful UI vs decorative" needs judgment. | **High** for explicit `stroke`/`border.focus` tokens; Med for icons. |
| **2.5.8** | Target Size (Minimum) (AA) | **D/P** | Interactive node bounding box ≥24×24 CSS px, OR ≥24px offset to neighbors (spacing exception). Math is exact. **P** because "is this node interactive?" has no DOM truth in Figma (see §2). | **High** on components we typed as interactive; Med on raw frames. |
| **1.4.12** | Text Spacing (AA) | **P** | Can only verify *capability* not adaptation: line-height ≥1.5×font-size, paragraph ≥2×, letter ≥0.12em, word ≥0.16em as authored. Real SC is "no loss when user overrides" — undecidable statically. | Med — flag as "authored spacing below override floor", needs-review. |
| **1.4.1** | Use of Color (A) | **P** | Detect color-only signifiers: e.g. a text run whose *only* differentiator from siblings is `color` (links, error states, chart legends). Deterministic *suspicion*, LLM/human confirms intent. | Low-Med — high false-positive risk; **needs-review only**. |
| **1.4.4** | Resize Text 200% (AA) | **N/A-Figma** | No reflow/zoom in a static frame. | Manual. |
| **1.4.10** | Reflow (AA) | **N/A-Figma** | No responsive breakpoints in a single frame; we have artboard width only. | Manual / flag if fixed-width content > viewport. |
| **1.1.1** | Non-text Content (A) | **J** | Presence of a `name`/alt field is deterministic; **quality/appropriateness of alt text is pure judgment** → LLM-assisted (vision) with confidence. Decorative-vs-meaningful also judgment. | Presence: High. Quality: Low (LLM). |
| **1.3.1** | Info & Relationships (A) | **J / N/A-Figma** | Figma has no semantic roles, no real heading levels, no table/list structure. Our `a11y.role` field (§3 FrameSpec) is *author intent*, not verified semantics. | Manual / LLM-inferred, low confidence. |
| **1.3.2** | Meaningful Sequence (A) | **N/A-Figma** | Visual order ≠ DOM/AT reading order; Figma layer order is not a focus/AT order. | Manual. |
| **2.4.3** | Focus Order (A) | **N/A-Figma** | No real tab order exists in a static design. | Manual. |
| **2.4.6** | Headings & Labels (AA) | **J** | Whether a label is *descriptive* is judgment (LLM). We can deterministically check a form field has *some* visible label nearby. | Presence: Med. Descriptiveness: LLM. |
| **2.4.7** | Focus Visible (AA) | **P** | We can verify a `:focus` style/`border.focus` token *exists in the system* and meets 1.4.11; we **cannot** verify it renders at runtime. Design-time capability check only. | Med — "no focus style defined", needs-review. |
| **2.4.11** | Focus Not Obscured (Min) (AA, new in 2.2) | **N/A-Figma** | Requires runtime scroll/sticky behavior. | Manual. |
| **2.5.7** | Dragging Movements (AA, new) | **J** | Cannot infer drag interactions from static nodes. | Manual. |
| **3.2.x / 3.3.x** | Predictable / Input Assistance (A/AA) | **J / N/A-Figma** | Behavior, error messages, redundant entry (3.3.7 new), accessible auth (3.3.8 new) — all runtime. | Manual. |
| **4.1.2 / 4.1.3** | Name/Role/Value, Status Messages (A/AA) | **N/A-Figma** | ARIA/roles are code-time, not design-time. | Manual. |

**The honest summary line for our UI:** "Designer can *certainly* check 5 of the ~50 WCAG 2.2 AA criteria, can *assist* on ~6 more, and *cannot* verify the rest from a Figma file — those are flagged for review, not passed silently." That sentence is the trust differentiator vs every tool that green-checks a whole audit.

### Industry figures to cite (with the caveat)
- **~57% of accessibility issues** found automatically — Deque study, 2,000+ audits / 13,000+ pages / ~300,000 issues, axe-core engine. This is *by issue volume*, dominated by a few high-frequency criteria (mainly 1.4.3 contrast, 4.1.2, 1.1.1). [Deque blog](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/) · [Coverage report PDF](https://accessibility.deque.com/hubfs/Accessibility-Coverage-Report.pdf)
- **~29.5% of WCAG 2.2 criteria fully automatable, ~10% partial, ~60% manual** — the criteria-level view. Use THIS number when talking about *coverage breadth*; use 57% only when talking about *defect catch rate*. Conflating them is the most common a11y-marketing dishonesty and we should not repeat it.

---

## Section 2 — Hard cases & how to handle them honestly

### 2.1 Contrast: resolving effective foreground/background (the hardest deterministic check)
Figma fills are a *stack*, not a single color. To get the effective color we must composite, in order:

1. **Text fill → effective fg.** Take the text node's `fills[]`. If multiple, the topmost visible solid wins for the run; gradient/image fills on *text* → cannot reduce to one ratio → **needs-review**.
2. **Node opacity + fill opacity + layer `blendMode`.** Each ancestor's `opacity` and the fill's own `opacity` multiply. Any non-`NORMAL` `blendMode` (multiply, screen, overlay…) means the rendered color is not a simple alpha composite → **needs-review** (do NOT guess a ratio).
3. **Background = composite of everything painted behind the text's bounding box**, walking up the parent chain and down through siblings beneath it in z-order. Flatten solid fills with alpha-over compositing to one effective bg color *only if all layers are flat solids*.
4. **Gradient behind text → sample the worst-case stop** under the text bbox; if best/worst stops straddle the threshold → **needs-review**, report the range, never a single pass/fail.
5. **Image (or video/photo) behind text → CANNOT compute deterministically.** This is the canonical "we are not certain" case. Either (a) flag needs-review, or (b) escalate to the LLM-vision tier (Opus 4.7, already in §2.12) to sample rendered pixels under the text and report a *confidence-qualified* estimate — never a hard-fail.
6. **Mixed/partial fills (text over a card edge that spans two bgs)** → split by region; if any region fails, report per-region; if regions disagree → needs-review.

Rule: **a hard-fail on contrast is only emitted when every layer in the stack is a flat, opaque-or-simple-alpha solid with `blendMode: NORMAL`.** Everything else degrades to needs-review or LLM-estimate. This single rule is most of our R5 mitigation.

### 2.2 Target size (2.5.8): "is this interactive?" has no DOM answer
Figma has no `<button>`. We infer interactivity from: (a) component instances whose master is tagged interactive in the design system, (b) `reactions`/prototype links on the node, (c) naming heuristics ("Button", "CTA", "Link" — low confidence). 
- Hard-fail only for (a) and (b) where intent is explicit.
- Naming heuristics → needs-review.
- Bounding box: use the node's rendered bbox including padding; apply the **spacing exception** (≥24px offset to adjacent targets) and the **inline exception** (target inside a text block — detect via a text-run parent) before failing. Missing these exceptions is the #1 target-size false-positive source (mirrors the axe-core `target-size` FP issues we saw).

### 2.3 Text spacing (1.4.12) & focus visible (2.4.7): capability, not behavior
Both real criteria are about *runtime adaptation* (user override / actual focus render) that a static file cannot exhibit. We honestly downgrade them to **capability checks**: "is a focus-state style defined and does it pass 1.4.11?", "is authored line-height ≥1.5×?". Report as `needs-review` with the capability finding, never as a conformance pass/fail.

### 2.4 Color-only signifiers (1.4.1): high false-positive trap
Detecting "this differs from neighbors only by color" is computable, but *intent* (is the color the only signifier of meaning?) is not. Links that are also underlined, errors that also have an icon — all pass, but we can't always see the icon relationship statically. **Always needs-review, never hard-fail.** Pair with the LLM tier to raise/lower confidence.

### 2.5 The honest-handling contract (what we promise the user)
- **Hard-fail** = we are mathematically certain AND the input data is unambiguous (flat solids, explicit interactive intent, exact bbox). Maps to our `LintReport.errors` (§3).
- **Needs-review** = computable suspicion OR ambiguous input (gradient/image/blend, naming-only interactivity, color-only intent). Maps to `LintReport.warnings` with an explicit `confidence` we should ADD to the type.
- **Cannot determine (manual)** = depends on runtime/DOM/semantics absent from Figma. New surface — list explicitly so the user knows we did NOT check it (vs silently passing).

---

## Section 3 — Recommended layered detection architecture

A 3-tier engine, ordered by certainty. This is a direct synthesis of axe-core's "zero-FP + incomplete bucket" and IBM Equal Access's 6-level result model.

```
Tier 1 — DETERMINISTIC RULE ENGINE  (pure TS, no LLM, no network)
  • Runs over the validated DesignSpec + ResolvedTokens (§3 architecture).
  • Emits CERTAIN violations ONLY when input is unambiguous (§2.5 contract).
  • Lives in shared/lint/a11y.ts — already scaffolded.
  • Guarantee we adopt: ZERO false positives at this tier (Deque manifesto).
      ↓ anything uncertain falls through, never silently passes
Tier 2 — LLM-ASSISTED JUDGMENT  (Opus 4.7 vision / Sonnet 4.6)
  • Alt-text quality (1.1.1), label descriptiveness (2.4.6), color-only
    intent (1.4.1), contrast-over-image estimate (1.4.3 hard case).
  • EVERY finding carries an explicit confidence ∈ {high, medium, low}
    and a rationale string. Confidence < high → presented as needs-review,
    never auto-fixed without user confirm.
      ↓
Tier 3 — CANNOT DETERMINE FROM FIGMA  (manual review checklist)
  • Reading order, focus order, reflow, runtime states, ARIA, status msgs.
  • We do NOT score these. We LIST them so the user knows the boundary.
  • This is a trust feature: admitting what we can't see beats false green.
```

### How the references structure rules + confidence (evidence we're copying the right thing)
- **axe-core**: each rule returns nodes into `passes`, `violations`, or **`incomplete`** ("needs review") — the engine refuses to call a violation unless certain; "incomplete" is the explicit uncertainty bucket. Deque's manifesto mandates a **zero false-positive rate** for automated rules. [Needs Review vs Incomplete (Deque Docs)](https://docs.deque.com/devtools-for-web/4/en/needs-review-incomplete/) · [axe-core repo](https://github.com/dequelabs/axe-core)
- **IBM Equal Access**: six result levels — `violation`, `potentialviolation`, `recommendation`, `potentialrecommendation`, `manual`, `pass` — and lets the consumer choose which levels fail a build. The `potential*` and `manual` levels are exactly our Tier-2/Tier-3. [equal-access repo](https://github.com/IBMa/equal-access) · [checker README](https://github.com/IBMa/equal-access/blob/master/accessibility-checker/src/README.md)

### Concrete `LintReport` change to support this (extends §3 architecture)
The current `LintReport` (architecture §3) only has `errors`/`warnings`. To carry the 3 tiers honestly, add a `confidence` and a third bucket:

```ts
type Confidence = 'certain' | 'high' | 'medium' | 'low';
interface Finding {
  sc: string;                 // "1.4.3"
  rule: string;
  nodePath: string;
  detail: string;
  tier: 'deterministic' | 'llm' | 'manual';
  confidence: Confidence;     // 'certain' only allowed on tier 'deterministic'
  evidence?: { fg?: string; bg?: string; ratio?: number; apcaLc?: number };
}
interface LintReport {
  ok: boolean;                // false iff >=1 certain deterministic violation
  violations: Finding[];      // tier=deterministic, confidence=certain  → hard-fail
  needsReview: Finding[];     // tier in {deterministic-ambiguous, llm}   → warn + confidence
  notChecked: string[];       // SC list we could not evaluate from Figma → manual
}
```

Only `violations` (certain) may block the in-loop a11y guard (architecture §5/§Phase 5) and trigger auto-fix. `needsReview` surfaces with confidence; `notChecked` is shown as a transparency footer.

### Auto-fix discipline (the second "bad-result-from-bad-result" guard)
The opportunity study warns against unreliable *fixes*, not just unreliable *analysis*. Therefore: **only `confidence: 'certain'` deterministic violations are eligible for one-click auto-fix** (e.g. snap fg to nearest on-system token that passes 4.5:1). Tier-2 findings can *suggest* a fix but require explicit user confirm. Tier-3 are never auto-fixed. This keeps our fixes as trustworthy as our analysis.

---

## Section 4 — Contrast math recommendation for 2026

**Decision: WCAG 2 ratio is the gate; APCA Lc is an advisory secondary readout. Show both, fail on only WCAG 2.**

| | WCAG 2 contrast ratio | APCA (Lc) |
|---|---|---|
| Status 2026 | Ratified, the legal AA standard (EAA/EN 301 549, ADA) | WCAG 3 still **Placeholder/draft**; APCA thresholds not ratified |
| Model | Relative-luminance ratio, 1:1–21:1; thresholds 4.5/3 | Perceptual lightness contrast, polarity- & font-aware; Lc 0–106 |
| Pass/fail certainty | Deterministic, defensible to an auditor today | Deterministic math, but **no official conformance thresholds** to fail against |
| Our use | **Hard-fail gate** (1.4.3, 1.4.11) | **Advisory** "APCA suggests this is harder to read than the ratio implies" |

Rationale: gating on APCA would make us *non-compliant with the standard our buyers are legally measured against* (EAA, regulated industries — the figma-plugin-opportunity tailwind). But APCA catches real readability failures WCAG 2 misses (e.g. it correctly flags some "passing" light-gray-on-white). Showing both, gating on one, gives trust + insight without overreach. Revisit if/when WCAG 3 ratifies thresholds.

**Library: `culori`** — already a dependency in architecture §2.7/§2.11. Use `wcagContrast(a, b)` and `wcagLuminance` for the gate. APCA is not in culori's core; if we show APCA we add a small dedicated APCA implementation (the `apca-w3` reference package) behind the advisory readout only — keep it out of the gate path. [culori API](https://culorijs.org/api/) · [WCAG 2 vs APCA (Myndex)](https://gist.github.com/Myndex/069a4079b0de2930e72d5401bde9af98) · [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)

Exact WCAG-2 thresholds to encode (for the deterministic rule):
- Normal text: **≥ 4.5:1** (1.4.3). Large text (**≥ 24 CSS px**, or **≥ 18.66 px / 14pt bold**): **≥ 3:1**.
- Non-text / UI / focus: **≥ 3:1** (1.4.11, 2.4.7).
- Exempt: disabled/inactive components, pure decoration, logos (1.4.3 exceptions) — must be excluded or they become false positives. [WebAIM contrast](https://webaim.org/articles/contrast/) · [W3C Understanding 1.4.3](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html)

---

## Risks & false-positive mitigation (R5 focus)

| Risk | Mitigation |
|---|---|
| **R5 — false positives destroy trust** (architecture §9) | Adopt Deque's zero-FP rule: Tier-1 emits a violation only on unambiguous input (§2.5 contract). Everything else → needs-review with confidence. This is the single most important design decision in this note. |
| Contrast over gradient/image/blend mis-scored | Never hard-fail; degrade to needs-review or LLM-vision estimate (§2.1). |
| Target-size FP from non-interactive nodes / missing exceptions | Hard-fail only on explicit interactive intent; always apply inline + spacing exceptions (§2.2). |
| Color-only (1.4.1) over-flagging underlined links / iconned errors | needs-review only; LLM confirms (§2.4). |
| Silent false *negatives* (worse for trust than FPs in a11y) | The `notChecked` bucket makes non-coverage explicit so users don't read silence as a pass. |
| Unreliable auto-fixes ("bad fix from bad analysis") | Only `certain` violations are auto-fixable; Tier-2 needs confirm, Tier-3 never (§3 auto-fix discipline). |
| Marketing dishonesty (claiming full WCAG coverage) | Use 29.5% criteria figure for breadth, 57% only for defect-volume; never imply we check everything. |

---

## Open questions

- **Reverse-extraction fidelity (architecture §4.2 R-extraction).** Contrast/target checks need the *rendered* fill stack; how faithfully does our Figma→DesignSpec adapter capture nested opacity/blend? If lossy, more cases must degrade to needs-review. Needs a hands-on probe on real files.
- **Interactivity ground truth.** Is `node.reactions` reliably present on designed buttons, or do most designers skip prototyping? Determines how much of 2.5.8 is hard-fail vs needs-review. Empirical question on sample files.
- **LLM-vision contrast estimate calibration.** What confidence does Opus 4.7 vision actually achieve sampling text-over-image contrast vs a pixel-true composite? Needs a benchmark before we trust Tier-2 for 1.4.3 hard cases.
- **APCA exposure.** Do our target buyers (a11y-conscious, regulated) want APCA shown at all in 2026, or is it noise/confusion against the legal WCAG-2 standard? Validate with early users.
- **Confidence taxonomy granularity.** Is 4 levels (`certain/high/medium/low`) right, or do we mirror IBM's 6 levels for parity with tools auditors already know? Lean to fewer for UX, but check.

## Sources

- Deque — automated testing finds 57% of issues — [blog](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/) · [Coverage Report PDF](https://accessibility.deque.com/hubfs/Accessibility-Coverage-Report.pdf) · [coverage report landing](https://www.deque.com/automated-accessibility-coverage-report/)
- axe-core — [GitHub repo](https://github.com/dequelabs/axe-core) · [Needs Review vs Incomplete (Deque Docs)](https://docs.deque.com/devtools-for-web/4/en/needs-review-incomplete/) · [target-size FP issue example](https://github.com/dequelabs/axe-core/issues/4350) · [API docs](https://www.deque.com/axe/core-documentation/api-documentation/)
- IBM Equal Access — [repo](https://github.com/IBMa/equal-access) · [accessibility-checker README (result levels)](https://github.com/IBMa/equal-access/blob/master/accessibility-checker/src/README.md) · [WCAG 2.2 + IBM toolkit (Knowbility)](https://knowbility.org/programs/accessu-2024/wcag-2-2-and-the-ibm-accessibility-equal-access-toolkit)
- W3C WCAG 2.2 — [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/) · [Understanding 1.4.3 Contrast](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html)
- Target Size 2.5.8 — [TestParty guide](https://testparty.ai/blog/wcag-target-size-guide) · [DigitalA11y SC 2.5.8](https://www.digitala11y.com/understanding-sc-2-5-8-target-size-minimum/)
- Contrast specifics — [WebAIM contrast article](https://webaim.org/articles/contrast/) · [TestParty 4.5:1 guide](https://testparty.ai/blog/wcag-contrast-ratio-guide-2025)
- APCA / WCAG 3 — [WCAG 2 vs APCA (Myndex)](https://gist.github.com/Myndex/069a4079b0de2930e72d5401bde9af98) · [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html) · [Designsystemet on WCAG 3 contrast](https://designsystemet.no/en/best-practices/accessibility/contrast)
- culori — [API reference](https://culorijs.org/api/) · [docs/api.md](https://github.com/Evercoder/culori/blob/main/docs/api.md)
- Criteria-level automatability breakdown — [WCAG 2.2 success criteria list (TestParty)](https://testparty.ai/blog/wcag-22-success-criteria-list)
</content>
</invoke>
