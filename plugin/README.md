# Legibly — Figma plugin (v0.1 "Contrast, fixed right")

Accessibility-first correctness layer: finds WCAG 2.2 AA text-contrast
violations **reliably** (effective-background resolution) and fixes them
one-click by snapping to the user's own tokens — correctness-by-construction.
Fully client-side: no backend, no AI, no network (`networkAccess: none`).

## Dev quickstart

```bash
cd plugin
npm install
npm test           # 120 unit tests (vitest)
npm run typecheck  # strict TS, main + ui contexts separately
npm run build      # dist/main.js (sandbox IIFE) + dist/ui.html (singlefile)
```

Load in Figma Desktop: **Plugins → Development → Import plugin from manifest…**
→ pick `plugin/manifest.json` (build first).

## Architecture (docs/architecture.md + docs/requirements.md are canonical)

```
src/
├── main/            sandbox only (figma.*) — no DOM, no fetch (C1)
│   ├── index.ts     RPC server: scan / tokens / apply-fix / apply-batch / settings
│   ├── apply.ts     canvas mutation + commit-time re-verify + revert (F12/NF1)
│   └── tokens.ts    variable/style harvester → TokenIndex (alias-resolved)
├── ui/              React iframe (all UI, plan computation)
└── shared/          pure, unit-tested engine — no figma global
    ├── contrast.ts  WCAG 2 gate (culori), large-text rules, the single judge
    ├── apca.ts      APCA Lc — advisory readout only, never a gate (F9)
    ├── background.ts effective-bg resolver: fill stacks, opacity, z-order
    │                 siblings; gradient/image/blend → needsReview (F6/F8)
    ├── classify.ts  3-tier verdicts: violation / needsReview / notChecked (F7)
    ├── scan.ts      traversal + report
    ├── fix.ts       candidate order: same-ramp → hue-filtered nearest →
    │                any token → new-token proposal (D8) → escalate (F13)
    └── rpc.ts       typed postMessage bridge (C2)
```

**The trust invariant (NF1):** the function that detects a violation and the
function that verifies a fix are the same function (`wcagRatio` via
`classifyTextNode`). A fix is committed iff the re-run check passes; otherwise
the mutation is reverted. A bad fix cannot physically stay on the canvas.

## Test map

| File | Covers |
|---|---|
| `tests/contrast.test.ts` | W3C reference ratios, compositing, thresholds |
| `tests/apca.test.ts` | apca-w3 reference values |
| `tests/background.test.ts` | resolver fixtures incl. all needsReview degradations |
| `tests/classify.test.ts` | 3-tier verdicts, zero-false-positive property |
| `tests/scan.test.ts` | traversal, ordering, 500-node perf budget (NF4) |
| `tests/tokens.test.ts` | harvester: aliases, cycles, translucent exclusion |
| `tests/fix.test.ts` | resolution order, D8/strict, 500-case property sweep |
| `tests/apply.test.ts` | commit-time verify + revert, batch single undo |
| `tests/rpc.test.ts` | bridge correlation + errors |
