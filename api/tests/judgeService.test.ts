import { describe, expect, it } from 'vitest';

import { MAX_PNG_BYTES, MAX_TREE_NODES, judgeMonth } from '../src/config/judge';
import { VERDICT_SCHEMA } from '../src/services/judgeRubric';
import {
  JudgeInputError,
  JudgeRefusedError,
  JudgeUnavailableError,
  judge,
  parseJudgeInput,
  parseVerdict,
  renderNodes,
  type ModelReply,
} from '../src/services/judgeService';

const PNG = Buffer.from('a fake png').toString('base64');

const validBody = {
  png: PNG,
  nodes: [{ type: 'TEXT', name: 'Title', x: 16, y: 16, w: 288, h: 24, text: 'Get started' }],
};

const verdictJson = JSON.stringify({
  overall: { score: 3, summary: 'Reads well; the CTA is hard to find.' },
  findings: [
    {
      dimension: 'affordance',
      severity: 'notable',
      what: 'The primary button uses the same weight as the two secondary ones',
      where: 'Bottom row of the card',
      why: 'Nothing tells the eye which action to take first',
      suggestion: 'Give the primary action the filled style and drop the others to text buttons',
    },
  ],
});

describe('parseJudgeInput', () => {
  it('accepts a well-formed payload', () => {
    expect(parseJudgeInput(validBody)).toEqual(validBody);
  });

  it('rejects a payload that is not an object', () => {
    for (const bad of [null, undefined, 'x', 42, []]) {
      expect(() => parseJudgeInput(bad)).toThrow(JudgeInputError);
    }
  });

  it('rejects a missing or non-base64 image', () => {
    expect(() => parseJudgeInput({ ...validBody, png: '' })).toThrow(/frame image/i);
    expect(() => parseJudgeInput({ ...validBody, png: 'not base64!' })).toThrow(/base64/i);
  });

  it('rejects an image past the body limit', () => {
    const huge = 'A'.repeat(Math.ceil((MAX_PNG_BYTES * 4) / 3) + 8);
    expect(() => parseJudgeInput({ ...validBody, png: huge })).toThrow(/too large/i);
  });

  it('rejects a frame with too many layers', () => {
    const nodes = Array.from({ length: MAX_TREE_NODES + 1 }, () => validBody.nodes[0]);
    expect(() => parseJudgeInput({ ...validBody, nodes })).toThrow(/too many layers/i);
  });

  it('rejects malformed layers rather than coercing them', () => {
    const cases = [
      [{ type: 'TEXT' }],
      [{ type: 'TEXT', name: 'a', x: 'left', y: 0, w: 1, h: 1 }],
      [{ type: 'TEXT', name: 'a', x: NaN, y: 0, w: 1, h: 1 }],
      ['not an object'],
    ];

    for (const nodes of cases) {
      expect(() => parseJudgeInput({ ...validBody, nodes })).toThrow(JudgeInputError);
    }
  });

  it('truncates long names and text instead of forwarding them', () => {
    const parsed = parseJudgeInput({
      png: PNG,
      nodes: [{ type: 'TEXT', name: 'n'.repeat(500), x: 0, y: 0, w: 1, h: 1, text: 't'.repeat(500) }],
    });

    expect(parsed.nodes[0]!.name.length).toBe(80);
    expect(parsed.nodes[0]!.text?.length).toBe(200);
  });

  it('omits text entirely when the layer has none', () => {
    const parsed = parseJudgeInput({
      png: PNG,
      nodes: [{ type: 'FRAME', name: 'Card', x: 0, y: 0, w: 320, h: 180 }],
    });

    expect(parsed.nodes[0]).not.toHaveProperty('text');
  });
});

describe('renderNodes', () => {
  it('gives one measurable line per layer', () => {
    const rendered = renderNodes([
      { type: 'FRAME', name: 'Card', x: 0, y: 0, w: 320, h: 180 },
      { type: 'TEXT', name: 'Title', x: 16.4, y: 16.6, w: 288, h: 24, text: 'Get started' },
    ]);

    expect(rendered).toContain('Layers (2)');
    expect(rendered).toContain('FRAME "Card" 0,0 320×180');
    expect(rendered).toContain('TEXT "Title" 16,17 288×24 — "Get started"');
  });
});

describe('parseVerdict', () => {
  it('reads a well-formed verdict', () => {
    const verdict = parseVerdict(verdictJson);
    expect(verdict?.overall.score).toBe(3);
    expect(verdict?.findings[0]?.dimension).toBe('affordance');
  });

  it('accepts an empty findings list — silence is a valid answer', () => {
    const quiet = JSON.stringify({ overall: { score: 4, summary: 'Nothing to change.' }, findings: [] });
    expect(parseVerdict(quiet)?.findings).toEqual([]);
  });

  it('rejects anything it cannot fully trust', () => {
    const cases = [
      'not json',
      '[]',
      JSON.stringify({ overall: { score: 3 }, findings: [] }),
      JSON.stringify({ overall: { score: 0, summary: 'x' }, findings: [] }),
      JSON.stringify({ overall: { score: 6, summary: 'x' }, findings: [] }),
      JSON.stringify({ overall: { score: 3.5, summary: 'x' }, findings: [] }),
      JSON.stringify({ overall: { score: 3, summary: '' }, findings: [] }),
      JSON.stringify({ overall: { score: 3, summary: 'x' } }),
      JSON.stringify({ overall: { score: 3, summary: 'x' }, findings: [{ dimension: 'spacing' }] }),
    ];

    for (const text of cases) expect(parseVerdict(text)).toBeNull();
  });
});

describe('judge', () => {
  const reply = (over: Partial<ModelReply>): ModelReply => ({
    text: verdictJson,
    stopReason: 'end_turn',
    ...over,
  });

  it('returns the verdict on the first good answer', async () => {
    let calls = 0;
    const verdict = await judge(validBody, async () => {
      calls += 1;
      return reply({});
    });

    expect(verdict.overall.score).toBe(3);
    expect(calls).toBe(1);
  });

  it('retries once when the answer is unusable, then succeeds', async () => {
    let calls = 0;
    const verdict = await judge(validBody, async () => {
      calls += 1;
      return calls === 1 ? reply({ text: 'sorry, here are some thoughts' }) : reply({});
    });

    expect(verdict.overall.score).toBe(3);
    expect(calls).toBe(2);
  });

  it('retries a truncated answer rather than parsing half of it', async () => {
    let calls = 0;
    await judge(validBody, async () => {
      calls += 1;
      return calls === 1 ? reply({ stopReason: 'max_tokens', text: '{"overall"' }) : reply({});
    });

    expect(calls).toBe(2);
  });

  it('gives up after the second bad answer instead of guessing', async () => {
    await expect(judge(validBody, async () => reply({ text: 'nope' }))).rejects.toThrow(
      JudgeUnavailableError,
    );
  });

  it('treats a refusal as terminal — a retry would only refuse again', async () => {
    let calls = 0;
    await expect(
      judge(validBody, async () => {
        calls += 1;
        return reply({ stopReason: 'refusal', text: null });
      }),
    ).rejects.toThrow(JudgeRefusedError);

    expect(calls).toBe(1);
  });

  it('checks the stop reason before reading content', async () => {
    // A refusal can carry partial text; parsing it would surface nonsense.
    await expect(
      judge(validBody, async () => reply({ stopReason: 'refusal', text: verdictJson })),
    ).rejects.toThrow(JudgeRefusedError);
  });
});

describe('verdict schema', () => {
  it('is strict — the model cannot invent fields', () => {
    expect(VERDICT_SCHEMA.additionalProperties).toBe(false);
    expect(VERDICT_SCHEMA.properties.findings.items.additionalProperties).toBe(false);
    expect(VERDICT_SCHEMA.properties.overall.additionalProperties).toBe(false);
  });

  it('requires every field of a finding, so none can be vague by omission', () => {
    expect([...VERDICT_SCHEMA.properties.findings.items.required]).toEqual([
      'dimension',
      'severity',
      'what',
      'where',
      'why',
      'suggestion',
    ]);
  });
});

describe('judgeMonth', () => {
  it('buckets by UTC calendar month', () => {
    expect(judgeMonth(Date.parse('2026-08-12T23:59:59Z'))).toBe('2026-08');
    expect(judgeMonth(Date.parse('2026-09-01T00:00:00Z'))).toBe('2026-09');
  });
});
