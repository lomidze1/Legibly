import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEFAULT_JUDGE_MODEL } from '../src/config/judge.js';
import { anthropicRunner, judge, parseJudgeInput } from '../src/services/judgeService.js';
import type { JudgeVerdict } from '../src/services/judgeRubric.js';

/**
 * The rubric eval (backend-spec §8.4). D24 makes this the gate: a judge that
 * fails here does not ship, no matter how finished the code looks.
 *
 * It is skipped unless both are set, because it costs money and needs fixtures
 * that do not live in this repo:
 *
 *   ANTHROPIC_API_KEY=sk-ant-…  JUDGE_EVAL_FIXTURES=../fixtures  npx vitest run tests/judge-eval.test.ts
 *
 * Each fixture is a directory containing:
 *   frame.png    the exported frame
 *   nodes.json   the layer listing the plugin would send
 *   expect.json  { "kind": "broken" | "good" | "borderline",
 *                  "dimensions": ["spacing"],        // broken only: what it must catch
 *                  "note": "why this fixture exists" }
 *
 * Results go in docs/judge-eval.md — including a failing run. A recorded
 * failure is the point of the gate.
 */

const FIXTURES = process.env.JUDGE_EVAL_FIXTURES;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const CONFIGURED = FIXTURES !== undefined && API_KEY !== undefined && existsSync(FIXTURES ?? '');

interface Expectation {
  kind: 'broken' | 'good' | 'borderline';
  dimensions?: string[];
  note?: string;
}

interface Case {
  name: string;
  expectation: Expectation;
  verdict: JudgeVerdict;
}

function loadFixtureNames(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function runFixture(root: string, name: string): Promise<Case> {
  const dir = join(root, name);
  const input = parseJudgeInput({
    png: readFileSync(join(dir, 'frame.png')).toString('base64'),
    nodes: JSON.parse(readFileSync(join(dir, 'nodes.json'), 'utf8')),
  });
  const expectation = JSON.parse(readFileSync(join(dir, 'expect.json'), 'utf8')) as Expectation;

  const runner = anthropicRunner({
    apiKey: API_KEY!,
    model: process.env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL,
    freeTrials: 0,
    proMonthly: 0,
  });

  return { name, expectation, verdict: await judge(input, runner) };
}

/** A finding is specific if it points at something — a number or a named place. */
function isConcrete(text: string): boolean {
  return /\d/.test(text) || /"[^"]+"/.test(text);
}

describe.skipIf(!CONFIGURED)('judge rubric eval', () => {
  it('meets the D24 exit criteria', async () => {
    const root = FIXTURES!;
    const names = loadFixtureNames(root);
    expect(names.length, 'fixtures directory is empty').toBeGreaterThan(0);

    const cases: Case[] = [];
    for (const name of names) cases.push(await runFixture(root, name));

    const broken = cases.filter((c) => c.expectation.kind === 'broken');
    const good = cases.filter((c) => c.expectation.kind === 'good');

    const caught = broken.filter((c) =>
      (c.expectation.dimensions ?? []).some((dimension) =>
        c.verdict.findings.some((f) => f.dimension === dimension && isConcrete(f.where)),
      ),
    );

    const falsePositives = good.filter((c) =>
      c.verdict.findings.some((f) => f.severity === 'blocking'),
    );

    const vagueSuggestions = cases.flatMap((c) =>
      c.verdict.findings
        .filter((f) => !isConcrete(f.what) && !isConcrete(f.suggestion))
        .map((f) => `${c.name}: ${f.suggestion}`),
    );

    // Printed so a failing run can be pasted straight into docs/judge-eval.md.
    console.log(
      [
        `fixtures        ${cases.length} (${broken.length} broken, ${good.length} good)`,
        `caught          ${caught.length}/${broken.length}`,
        `false blocking  ${falsePositives.length} (${falsePositives.map((c) => c.name).join(', ')})`,
        `vague           ${vagueSuggestions.length}`,
        ...vagueSuggestions.map((line) => `  - ${line}`),
      ].join('\n'),
    );

    // ≥80% of known problems found, with the right dimension and a real location.
    expect(caught.length / Math.max(1, broken.length)).toBeGreaterThanOrEqual(0.8);
    // A blocking finding on a good design is a false positive, and false
    // positives are the one thing this product promises never to produce.
    expect(falsePositives).toHaveLength(0);
    // Vagueness is the failure D24 names by name.
    expect(vagueSuggestions).toHaveLength(0);
  }, 600_000);
});
