# Accessibility Remediation Methodology — Research Notes

> Topic: a trustworthy methodology for **automated remediation** (auto-fix), not just flagging.
> Date: 2026-06-14
> Researcher: Claude session via design-explorer
> Grounding: `docs/architecture.md` §0.C (7 principles), §3 (closed-enum DesignSpec), §5.3 renderer; `docs/approach.md` §1.3 (closed enums), §1.4 (in-loop a11y), Risk R5 (false positives frustrate users).

---

## TL;DR

- **The single guarantee that prevents "bad AI from bad AI":** every fix is committed *only after re-running the same deterministic check that flagged it and seeing it pass*. This is **correctness-by-construction** — the candidate's provenance (LLM, heuristic, random) is irrelevant; an unverified candidate is never shipped.
- **Most high-value a11y fixes are 100% deterministic and need NO LLM:** contrast (1.4.3/1.4.11), target size (2.5.8), spacing/padding (closed scale). These are math + token-snapping. Reserve the LLM strictly for *content-judgment* fixes (alt text 1.1.1, accessible names 4.1.2, link text 2.4.4).
- **Contrast remediation = binary search on OKLCH lightness** (perceptual, brand-hue-preserving), then **snap to the nearest PASSING token already in the user's palette** rather than emitting a novel hex. Deterministic + on-system. Libraries: `culori` (`wcagContrast`, `oklch`, `clampChroma`, `differenceEuclidean`). A 2025 arXiv paper ([2512.05067](https://arxiv.org/abs/2512.05067)) validates exactly this binary-search-on-L approach.
- **LLM content fixes are always "review recommended," never silently auto-applied to canvas.** They are constrained by structured output, grounded in the actual element + neighbors, and verified by format/length checks before they may touch the canvas. Deterministic fixes can be auto-applied; LLM fixes are staged for one-click accept.
- **Fix UX is the product** (mitigates Risk R5): every hard-fail ships with an instant fix, a before/after diff showing the WCAG SC and the measured value (e.g. "2.9:1 → 4.6:1"), one-click + batch apply, and single-step undo. Enforcement that *helps* instead of nagging is the paid wedge.

---

## Section 1 — Deterministic fix algorithms (no LLM)

These three cover the majority of WCAG AA machine-detectable failures and are fully deterministic. The output is provably better because it is **measured against the same check** that flagged it (see §2).

### 1.1 Contrast remediation (SC 1.4.3 text 4.5:1, large 3:1; 1.4.11 non-text 3:1)

**Goal:** given a failing `(fg, bg)` pair, reach the target ratio with the *minimal perceptual change* while **preserving brand hue**, then **snap to an on-system token**.

**Why OKLCH, not naive darkening.** Adjusting in sRGB or HSL produces uneven perceived steps and hue drift (HSL lightness shifts apparent hue). OKLCH is perceptually uniform: equal `L` steps ≈ equal perceived lightness change, and adjusting `L` alone keeps `H` (hue) fixed, so the brand color stays the brand color. This is the consensus approach ([LogRocket OKLCH](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes), [arXiv 2512.05067](https://arxiv.org/abs/2512.05067)).

**Algorithm A — minimal perceptual adjustment (the candidate generator):**

```ts
import { oklch, formatHex, wcagContrast, clampChroma } from 'culori';

// target: 4.5 (body), 3 (large/non-text). bgHex is the resolved background.
function minimalContrastFix(fgHex: string, bgHex: string, target: number): string {
  const bgL = oklch(bgHex)!.l;                 // 0..1
  const c = oklch(fgHex)!;
  // Decide direction: if bg is light, darken fg; if dark, lighten fg.
  const goDarker = bgL >= 0.5;
  let lo = goDarker ? 0 : c.l;
  let hi = goDarker ? c.l : 1;
  let best = goDarker ? { ...c, l: 0 } : { ...c, l: 1 }; // worst-case endpoint always passes if any L can
  // binary search on L, holding H constant, clamping C back into sRGB gamut
  for (let i = 0; i < 20; i++) {                // 20 iters → ~1e-6 precision on L
    const mid = (lo + hi) / 2;
    const cand = clampChroma({ ...c, l: mid }, 'oklch'); // keep in-gamut, preserve hue
    const ratio = wcagContrast(formatHex(cand), bgHex);
    if (ratio >= target) { best = cand; goDarker ? (lo = mid) : (hi = mid); }
    else { goDarker ? (hi = mid) : (lo = mid); }
  }
  return formatHex(best);                        // minimal-change passing hex (candidate only)
}
```

Notes:
- `clampChroma(..., 'oklch')` keeps the color inside the sRGB gamut by reducing chroma, not by mangling hue — important so the brand hue survives.
- The loop **always re-measures with `wcagContrast`** (the exact check that flagged the failure). It returns a candidate that, by the loop's own measurement, passes. §2 re-asserts this at commit time.
- If even the extreme endpoint (`L=0` or `L=1`) cannot reach the target against this background (rare; happens on mid-gray backgrounds where neither pure black nor pure white reaches 4.5:1 — mathematically possible since black-on-#777 ≈ 4.5 and white-on-#777 ≈ 4.7, but mid-grays can fail both), the function fails → escalate (§2.4). Never ship a near-miss.

**Algorithm B — snap to the nearest PASSING on-system token (the preferred output).** Architecture §1.3 / §0.C principle 5 forbids inventing off-system hex. So Algorithm A's hex is *not* the final answer — it is a **direction hint**. The actual fix:

```ts
import { oklch, wcagContrast, differenceEuclidean } from 'culori';

type Token = { name: string; role: string; hex: string }; // from DesignSystemSnapshot

function snapToPassingToken(
  currentFg: Token, bgHex: string, target: number,
  palette: Token[],                              // user's resolved tokens
  semanticRoleFilter?: (t: Token) => boolean     // prefer same role family, e.g. fg.* ramp
): Token | null {
  const dist = differenceEuclidean('oklch');     // perceptual distance metric
  const candidates = palette
    .filter(t => semanticRoleFilter ? semanticRoleFilter(t) : true)
    .filter(t => wcagContrast(t.hex, bgHex) >= target)        // MUST already pass
    .map(t => ({ t, d: dist(currentFg.hex, t.hex) }))         // perceptual closeness
    .sort((a, b) => a.d - b.d);
  return candidates.length ? candidates[0].t : null;          // nearest passing token, or null → escalate
}
```

**Resolution order for a contrast fix (deterministic, on-system first):**
1. **Same-role ramp step.** If `fg.default` fails, walk the *same* semantic ramp (e.g. `fg.default` → `fg.strong` / a darker neutral step) and pick the nearest step that passes. This keeps role semantics intact (principle 5).
2. **Nearest passing token anywhere in palette** (Algorithm B), preferring same hue family (filter by OKLCH hue within ±N°) so brand identity is preserved.
3. **Adjust the *background* instead** if the foreground is brand-locked (e.g. a fixed logo color on a CTA) — same two steps applied to `bg`.
4. **No on-system token satisfies the constraint → escalate to user** (§2.4). Optionally *offer* Algorithm A's computed hex as a labeled "off-system suggestion (creates a new token)" that the user must explicitly accept — never auto-applied.

This makes the contrast fix **deterministic, perceptual, brand-preserving, and on-system by construction.**

**Library choice.** `culori` is already the planned color-math dep (architecture §2.7, links.md). It has `wcagContrast`, full `oklch`/`lab` conversions, `clampChroma`/`toGamut`, and `differenceEuclidean`/`nearest` — everything above. `chroma.js` is a lighter alternative (`chroma.contrast`, `.set('oklch.l', x)`) but its gamut clamping and difference metrics are weaker; prefer `culori`. For a future WCAG-3 path, `apca-w3` exposes `reverseAPCA()` (grayscale only today) and `fontLookupAPCA()` ([apca-w3](https://github.com/Myndex/apca-w3)) — APCA is perceptually better than WCAG 2 but **not yet the legal/AA target**, so keep WCAG-2 `wcagContrast` as the committed check and treat APCA as an advisory secondary score.

### 1.2 Target-size remediation (SC 2.5.8 — 24×24 CSS px AA; 44 iOS / 48 Android)

WCAG 2.5.8 requires interactive targets ≥ 24×24 CSS px, **with a spacing exception**: a sub-24px target passes if no other target's 24px-diameter circle overlaps it (offset ≥ 24px to every adjacent target) ([WCAG 2.5.8 summary](https://www.digitala11y.com/understanding-sc-2-5-8-target-size-minimum/), [TheWCAG 2.5.8](https://www.thewcag.com/criteria/2.5.8)). So there are **two legal fixes**, and we should prefer the one that least disturbs layout:

**Detector:** for each interactive node, compute the rendered hit box. Fail if `w < MIN || h < MIN` (MIN = 24/44/48 by platform) **and** the spacing exception does not already hold.

**Fix, in order of least layout disruption:**
1. **Grow the hit area without growing the visual** — increase the node's padding (auto-layout `padding*`) so the *bounding box* reaches MIN while the icon/glyph stays the same size. This is the canonical fix and respects auto-layout. The added padding must come from the **closed spacing scale** (§1.3): pick the smallest scale step that brings the box to ≥ MIN.
   ```ts
   const needX = MIN - box.w;  // shortfall
   const pad = nextSpacingStep(Math.ceil(needX / 2)); // closed-scale step ≥ shortfall/2 per side
   ```
2. **Satisfy the spacing exception instead of growing** — if growing would break a dense toolbar, increase `itemSpacing` (gap) on the parent auto-layout to ≥ 24px offset so the exception applies. Also a closed-scale value.
3. **Min-size on the frame** — set `minWidth/minHeight = MIN` on the auto-layout frame (Figma supports min sizing) so HUG containers can't collapse below the floor.
4. If none is possible without breaking a fixed-width parent → escalate.

Re-verify (§2): after applying, recompute the hit box / spacing exception and confirm pass.

### 1.3 Spacing remediation (architecture principle 1 — closed 4px scale)

**Closed scale:** `{0,4,8,12,16,20,24,32,40,48,64,80,96,128}` (architecture §3 `SpaceToken`).

**Detector:** any `padding`, `itemSpacing`, `gap`, or position delta not in the set.

**Fix = snap to nearest scale member (deterministic):**
```ts
const SCALE = [0,4,8,12,16,20,24,32,40,48,64,80,96,128] as const;
function snapSpacing(v: number): number {
  return SCALE.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
}
```
**Auto-layout safety:** only mutate auto-layout properties (`paddingTop/Right/Bottom/Left`, `itemSpacing`) — never reposition children by absolute x/y inside an auto-layout frame (the engine recomputes them). Because architecture's renderer (§5.3) builds everything as auto-layout, snapping a spacing token re-flows children safely. For target-size fixes that *raise* padding (§1.2), the same constraint applies: the padding value chosen must itself be a valid `SpaceToken`, so target-size and spacing fixes are mutually consistent by construction.

**Tie with closed enums:** because the DesignSpec schema (§3) already types these as closed unions, a spacing fix is "round the offending number to the nearest enum member" — the schema is the spec, the fix restores schema-validity.

---

## Section 2 — The verification loop (correctness-by-construction)

This is the anti-"bad-AI-from-bad-AI" core and the founder's hard requirement. **The guarantee is structural, not statistical.**

### 2.1 The invariant

> A fix is committed **iff** re-running the *same deterministic check* on the post-fix state returns PASS. The function that *generates* the candidate and the function that *judges* it are different; only the judge can authorize a commit.

This means: even if a candidate came from a hallucinating LLM, a buggy heuristic, or a coin flip, a *wrong* candidate cannot reach the canvas — it fails re-verification and is discarded. Correctness is a property of the loop, not of the generator.

### 2.2 Loop structure

```ts
type Check = (state: NodeState, ctx: Ctx) => { pass: boolean; measured: number | string; sc: string };
type FixCandidate = (state: NodeState, ctx: Ctx) => NodeState | null; // null = "I have no candidate"

function remediate(
  state: NodeState, check: Check, candidates: FixCandidate[], ctx: Ctx
): { status: 'fixed' | 'unfixable'; state: NodeState; before: any; after?: any; sc: string } {
  const before = check(state, ctx);
  if (before.pass) return { status: 'fixed', state, before, sc: before.sc }; // nothing to do

  for (const gen of candidates) {                 // ordered: on-system → less disruptive → off-system(suggest)
    const cand = gen(state, ctx);
    if (!cand) continue;
    const verdict = check(cand, ctx);             // RE-RUN THE EXACT SAME CHECK
    if (verdict.pass) {
      return { status: 'fixed', state: cand, before, after: verdict, sc: before.sc };
    }
    // candidate did NOT actually fix it → discard, try next. Never commit.
  }
  return { status: 'unfixable', state, before, sc: before.sc }; // → escalate to user (§2.4)
}
```

Key properties:
- **Same check both sides.** `check` is the single source of truth. The detector and the verifier are *the same function* — impossible for them to disagree on the definition of "pass."
- **Ordered candidate list = backtracking.** Try the most-preferred (on-system, least disruptive) first; fall through to the next on failure. Contrast: [same-role ramp step → nearest passing token → adjust background]. Target size: [pad → spacing-exception → min-size]. Spacing: [snap to nearest].
- **Idempotent.** Running the loop again on an already-fixed node returns immediately (`before.pass`). Safe to re-run after any edit.

### 2.3 Iteration count

- Within a single candidate, the *internal* search (binary search on OKLCH L) is bounded to **20 iterations** (sub-perceptual precision) — pure math, instant.
- The *candidate list* is short and fixed (2–4 strategies per rule). There is **no open-ended "ask the AI again" loop** for deterministic fixes — that is precisely the bad-AI-from-bad-AI failure mode we forbid.
- For the whole document, fixes are independent per node, so total work is `O(nodes × rules)`, each rule O(1)–O(20). No global fixpoint iteration needed because deterministic fixes don't interact destructively (a contrast fix never changes spacing; a padding fix never changes color). The one cross-effect — raising padding could change which targets are "adjacent" for the 2.5.8 spacing exception — is handled by running target-size detection *after* spacing fixes settle (single ordered pass: spacing → contrast → target-size → re-verify all).

### 2.4 When no on-system token can satisfy the constraint — escalate, never silently ship a fail

This is the rule that protects trust:
- **Never** widen the allowed set silently (e.g. invent a new hex) to force a pass. That would convert "on-system, provably correct" into "off-system, unverifiable" — the exact regression the founder forbids.
- On `status: 'unfixable'`, surface to the user with full context: the SC, the measured value, *why* no fix exists ("no token in your palette reaches 4.5:1 against `bg.surface`"), and **explicit options**:
  1. "Add a compliant token to your system" (offer Algorithm A's computed minimal hex as a *proposed new token*, clearly labeled off-system, requiring explicit accept — this is the only path to a novel value, and it's a deliberate, logged user decision).
  2. "Change the background instead."
  3. "Acknowledge & override" (logged; Risk R5 mitigation — user keeps agency).
- The override decision is recorded so we can learn which rules produce friction (architecture R5: "learn from overrides").

---

## Section 3 — Safe LLM use for content fixes only

Deterministic fixes (§1) never call the LLM. The LLM is used **only** where the fix requires human-language *judgment about content*:

| WCAG SC | Fix | Why LLM | Auto-apply? |
|---|---|---|---|
| 1.1.1 Non-text content | Generate **alt text** for an informative image | Requires understanding image content | ❌ Review-recommended |
| 4.1.2 / 1.3.1 | Generate **accessible name / label** for an unlabeled control | Requires understanding control purpose from context | ❌ Review-recommended |
| 2.4.4 Link Purpose | Rewrite vague link text ("click here") | Requires understanding link target | ❌ Review-recommended |
| 1.1.1 | Mark **decorative** image as such (empty alt / `role=presentation`) | Borderline judgment | ❌ Review-recommended |

### 3.1 Constrain the generation

1. **Structured output, not free text.** Use the `strict: true` tool / `output_config.format` path the architecture already mandates (§5.2). The alt-text tool returns a typed object, not a paragraph:
   ```jsonc
   // tool: emit_alt_text, strict schema
   {
     "decision": "informative" | "decorative",   // forces the decorative-vs-informative call
     "altText": "string",                          // required iff informative; "" iff decorative
     "confidence": "high" | "medium" | "low",
     "rationale": "string"                         // for the review UI, not for canvas
   }
   ```
2. **Ground in the real element + surrounding context.** Send: the actual image bytes (vision, via Files API per architecture §2.10/A12, downsampled ≤ 1568px), the node's name, nearby heading/caption text, and the component role. The model judges *this* element, not a generic one. This grounding is what stops hallucinated alt text.
3. **Constrain length/format in the schema and the prompt.** Alt text: ≤ ~125 chars, no "image of/picture of" prefix, no trailing period style mandate from the user's content rules. Labels: imperative verb phrase, ≤ N chars. Link text: must reference the destination noun.

### 3.2 Verify before it may touch the canvas (the same loop, adapted)

LLM output is a **candidate**, subject to the same §2 invariant — but the "check" for content is a *validator*, not a numeric measurement:
- **Format/length check:** length within bounds, no banned prefixes, non-empty iff informative, empty iff decorative. Fail → reject candidate.
- **Grounding check:** does the alt text contain at least one content token that plausibly relates to detectable image features / nearby caption? (cheap heuristic; low-confidence → force review).
- **Never inject free-form model text directly into the canvas** (`characters`, alt fields) without passing the validator. A failed validator → do **not** auto-stage; mark "needs manual input."
- **Profanity / PII / injection scrub** on any string before it reaches `node.characters` or an alt field.

### 3.3 Mark provenance — deterministic vs LLM

Every applied or staged fix carries a `source` tag:
- `deterministic` → eligible for **auto-apply** and **batch** (math-proven by §2; e.g. contrast snap, padding bump).
- `llm-suggested` → **never auto-applied**; always staged with a "Review recommended" badge, the model's rationale, and an editable text field so the user accepts/edits before commit. Confidence `low` → require edit, not just accept.

This separation is the trust contract: numbers get fixed automatically; words get *proposed* and approved by a human.

---

## Section 4 — Fix UX that builds trust (mitigates Risk R5)

The enforcement must **help, not nag**. The rule: **every hard-fail is shipped together with an instant, applicable fix.** A flag with no fix is the nagging failure mode R5 warns about.

### 4.1 Suggest vs apply

- **Deterministic, high-confidence (contrast snap, spacing snap, padding bump):** offer **one-click Apply** (and "Apply all of this type"). Optionally an org setting "auto-fix deterministic on generate" (in-loop, architecture §1.4) — still always undoable.
- **LLM content fixes:** **Suggest only.** Staged with editable text + "Review recommended" badge. No bulk auto-accept.

### 4.2 Diff preview — "before/after + the rule it now satisfies"

Each fix card shows, concretely:
- **The SC + plain name:** "WCAG 2.2 AA — 1.4.3 Contrast (Minimum)".
- **Measured before → after:** "2.9:1 → 4.6:1 (target 4.5:1)". For target size: "20×20 → 24×24". For spacing: "14px → 16px (scale step)".
- **A visual before/after swatch / mini-render** of the node.
- **What changed, on-system:** "Foreground: `fg.default` → `fg.strong` (existing token)" — proving it stayed on-system, not a novel hex.

Showing the *measured numbers and the SC* is what makes the fix feel provable rather than magical.

### 4.3 One-click + batch

- Per-fix Apply, plus **"Fix all 12 contrast issues"** grouped by rule.
- Batch operates only on `deterministic` fixes; LLM suggestions remain individually reviewed.
- Show a running tally: "9 auto-fixed, 3 need your review."

### 4.4 Undo as a single step

- Wrap a batch (or single fix) in the renderer's `figma.commitUndo()` pair (architecture §5.3 step 4) so the entire remediation is **one Cmd-Z**. Never leave the user hunting through 12 undo steps.

### 4.5 Always show WHY + always pair fail with fix

- Every flagged item links to the offending node (architecture §5.5 / Phase 5 "link to the offending node"), names the SC, the measured value, and the proposed fix in the same card.
- **No bare flags.** If a violation genuinely has no automatic fix (§2.4 unfixable), the card still explains why and offers the explicit choices (add token / change bg / override) — the user is never left with a red mark and no path forward.

---

## Risks

| # | Risk | Mitigation |
|---|---|---|
| RM1 | **Mid-gray backgrounds where no pure fg color reaches 4.5:1** (both black and white can fail). | Detect at candidate-gen; escalate to "adjust background" fix; never ship near-miss. |
| RM2 | **Snapping to nearest passing token changes role semantics** (e.g. uses an accent color as body text). | Constrain candidate filter to same role family / same hue ±N° first; cross-role snap only as labeled fallback requiring review. |
| RM3 | **WCAG 2 contrast math is perceptually imperfect** (known; APCA is better). | Commit against WCAG-2 (the legal AA target); show APCA as advisory secondary. Re-evaluate when WCAG 3 / APCA becomes the AA standard. |
| RM4 | **LLM alt text hallucinates / is generic.** | Vision-grounded + structured + validator + always human-reviewed; low confidence forces edit. Never auto-applied. |
| RM5 | **Target-size padding bump breaks a fixed-width parent or dense toolbar.** | Ordered fallback (pad → spacing-exception → min-size → escalate); only mutate auto-layout props; never absolute-position children. |
| RM6 (= arch R5) | **False positives frustrate users.** | Pair every fail with an instant fix; allow logged override; learn from overrides to tune rules. |
| RM7 | **Spacing↔target-size cross-interaction** (padding changes adjacency for the 2.5.8 exception). | Single ordered pass (spacing → contrast → target-size) then re-verify all; idempotent loop. |

---

## Open questions

- **Token-creation policy:** when no on-system token passes, do we (a) hard-block and require the user to add a token, or (b) auto-propose a new minimal-change token that the user one-click accepts into their system? Leaning (b) with explicit, logged accept — needs founder sign-off (it is the only sanctioned path to a novel value).
- **APCA timeline:** when (if) WCAG 3 / APCA becomes the AA bar, do we switch the *committed* check or keep WCAG-2 as the floor and APCA as a higher tier? Affects `culori` vs `apca-w3` weighting.
- **Background resolution for nested/transparent fills:** computing the *effective* bg behind text (gradients, images, semi-transparent overlays) is non-trivial; need a flatten-to-effective-bg routine before contrast math. Spike required.
- **Where does the deterministic remediation engine live** relative to the existing `shared/lint/a11y.ts` (architecture §2.11)? Proposal: extend the linter into a `lint → remediate` pair sharing the same `check` functions (enforces the §2.1 same-check invariant by code reuse, not convention).
- **Confidence-to-review thresholds** for LLM fixes: exact length caps, banned-prefix list, and the grounding heuristic need to be specified and tested.

---

## Sources

- [WCAG 2.2 Quickref](https://www.w3.org/WAI/WCAG22/quickref/) — SC 1.4.3, 1.4.11, 2.5.8, 1.1.1, 4.1.2 definitions
- [Understanding SC 2.5.8 Target Size (DigitalA11y)](https://www.digitala11y.com/understanding-sc-2-5-8-target-size-minimum/) — 24px floor + spacing exception
- [TheWCAG — 2.5.8 with examples](https://www.thewcag.com/criteria/2.5.8) — exception details
- [arXiv 2512.05067 — Perceptually-Minimal Color Optimization for Web Accessibility](https://arxiv.org/abs/2512.05067) — binary search on OKLCH L + gradient descent + constraint relaxation; minimal perceptual change to reach WCAG contrast
- [LogRocket — OKLCH in CSS: consistent, accessible palettes](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes) — why OKLCH for contrast-safe adjustment
- [culori vs chroma-js vs tinycolor2 (2026)](https://www.pkgpulse.com/blog/culori-vs-chroma-js-vs-tinycolor2-color-manipulation-javascript-2026) — culori has the most accurate WCAG contrast + OKLCH support
- [apca-w3 (Myndex)](https://github.com/Myndex/apca-w3) — APCA Lc thresholds, `reverseAPCA()`, `fontLookupAPCA()` (advisory / WCAG-3 path)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) — reference contrast values
- Internal: `docs/architecture.md` §0.C, §3, §5.3, §2.11, Phase 5; `docs/approach.md` §1.3, §1.4, Risk R5
