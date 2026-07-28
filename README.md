# Legibly

> **Accessibility-first "correctness layer" for Figma.**
> Currently in **research / planning phase** — no code yet.

---

## What is this?

**Legibly** is an in-development Figma plugin (and standalone MCP server) that **checks any design and fixes its issues automatically** — starting with accessibility.

It detects problems like unreadable text contrast, then **fixes them in one click** by snapping to the user's *own* design-system tokens. Every fix is **provably correct** — Legibly re-verifies each change against the same deterministic check and only commits it if it passes, so it never produces "one bad AI result from another."

- 🔍 **Detect** — find WCAG 2.2 AA + design-system violations reliably (deterministic-first, zero false-positives)
- 🔧 **Fix** — one-click / batch auto-fix, on-system, with a before/after diff
- ✅ **Trust** — correctness-by-construction; the fix is guaranteed better, not another guess

**Why not just use Figma's own Design Agent?** Figma's native agent (May 2026, free during beta) *generates* designs but does **not** hard-fail on accessibility or enforce your design system. Legibly is a neutral **correctness layer** that audits and fixes the output of *any* generator — including Figma's own — plus human-made designs. Generators are crowded and commoditized; **trust is the open lane.**

---

## Product direction (locked)

| | |
|---|---|
| **What** | Accessibility-first correctness layer — detect & auto-fix |
| **MVP v0.1** | "Contrast, fixed right" (deterministic, no backend/AI) |
| **Roadmap** | contrast → target-size/spacing → alt-text (AI) → design-system enforcement → brand-QA |
| **Money** | Free = detect · Pro $12/mo = fix + report (two tiers only — D20) |
| **Why us** | Nobody does reliable a11y *auto-fix* (competitors only flag) |

See [`docs/goal.md §0`](./docs/goal.md) for the locked north-star.

---

## Status

| | |
|---|---|
| Stage | Planning / research (docs complete, scope locked) |
| Code | None yet |
| Name | **Legibly** ✅ locked ([`docs/branding.md`](./docs/branding.md)) |
| Branches | `main` (protected) · `dev` (active) |
| Visibility | **Private — all rights reserved** |
| Repo | github.com/lomidze1/Legibly |

---

## Documentation

All project docs are in [`docs/`](./docs/). Start here:

1. [`docs/README.md`](./docs/README.md) — entry point, navigation map
2. [`docs/goal.md`](./docs/goal.md) — what we want and why (business view; §0 = locked direction)
3. [`docs/requirements.md`](./docs/requirements.md) — MVP v0.1 scope (locked)
4. [`docs/approach.md`](./docs/approach.md) — strategy, principles, decision log (D1–D9)
5. [`docs/architecture.md`](./docs/architecture.md) — technical architecture (legacy, generation-era; correctness-first reframe pending)
6. [`docs/research/`](./docs/research/) — competitor + methodology deep dives
7. [`docs/website.md`](./docs/website.md) — landing-page plan (TODO)

---

## License

Private. All rights reserved. No public distribution.
