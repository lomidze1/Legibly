# Legibly

**Accessibility checker and auto-fixer for Figma.** Legibly scans a design against WCAG 2.2 AA and fixes what it finds in one click, using values from the file's own variables and styles.

Live site: [legibly.design](https://legibly.design)

---

## What it does

- **Detects** contrast, target-size, text-spacing, use-of-color, non-text contrast, focus-state, form-label, clipped-text and missing alt-text issues.
- **Resolves the real background.** It composites fill stacks, layer opacity and overlapping layers to find the colour actually behind the text. Gradients, images and blend modes are marked "needs review" instead of guessed.
- **Checks every theme.** Colour checks re-run in each variable mode, so a file that passes in Light cannot hide a failure in Dark.
- **Fixes on-system.** A fix snaps to a passing token from the user's own design system rather than inventing an off-brand value.
- **Verifies every fix.** Each change is re-checked with the same function that flagged it, and reverted if it does not pass.
- **AI only where it helps.** Alt-text suggestions come from Claude through a strict tool schema and a deterministic validator, and always need human review.

## Architecture

| Part | Stack | What's in it |
|---|---|---|
| `plugin/` | TypeScript, React, Vite, Figma Plugin API, culori | Scanner, the WCAG checks (`src/shared/`), fix engine (`src/main/apply.ts`), plugin UI |
| `api/` | TypeScript serverless functions on Vercel, PostgreSQL (Neon) | Figma OAuth, licences, Flitt checkout and webhooks, admin panel, AI judge |
| `website/` | Next.js | Landing page, docs, pricing and checkout, terms and privacy |
| `docs/` | Markdown | Requirements, decision log, architecture, competitor research (mostly in Georgian) |

The detection logic is deterministic and covered by unit tests. There are about 90 test files across the three packages, run with Vitest.

## Running locally

```bash
cd plugin  && npm install && npm test && npm run build   # load plugin/manifest.json in Figma → Plugins → Development
cd api     && npm install && npm test                     # needs the env vars listed in api/.env.example
cd website && npm install && npm run dev
```

## How it was built

Built by Giorgi Lomidze in 2026: product scope, design decisions, pricing and launch, with Claude Code as a pair programmer. `CLAUDE.md`, `AGENTS.md` and `.claude/` hold the instructions and agents used during development. The reasoning behind each decision is in `docs/approach.md`.

## License

Source is public for reference. All rights reserved; no licence is granted to reuse or redistribute the code.
