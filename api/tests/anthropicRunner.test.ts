import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The live model call — the one seam every other judge test injects past.
 *
 * The SDK is mocked at the class, so no request is ever made and no key is ever
 * read from the environment. What matters here is that the request carries the
 * rubric and the schema, that a reply is reduced to `{text, stopReason}`, and
 * that nothing the SDK throws escapes as anything but JudgeUnavailableError.
 */

interface CreateArgs {
  model: string;
  max_tokens: number;
  system: string;
  output_config: { format: { type: string; schema: unknown } };
  messages: Array<{ role: string; content: Array<Record<string, unknown>> }>;
}

const created: Array<{ apiKey?: string }> = [];
const calls: CreateArgs[] = [];
const create = vi.fn(async (_args: CreateArgs): Promise<unknown> => ({
  content: [{ type: 'text', text: '{}' }],
  stop_reason: 'end_turn',
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic {
    messages = {
      create: async (args: CreateArgs) => {
        calls.push(args);
        return create(args);
      },
    };
    constructor(options: { apiKey?: string }) {
      created.push(options);
    }
  },
}));

const { JUDGE_MAX_TOKENS } = await import('../src/config/judge.js');
const { JUDGE_SYSTEM_PROMPT, VERDICT_SCHEMA } = await import('../src/services/judgeRubric.js');
const { JudgeUnavailableError, anthropicRunner, judge, renderNodes } = await import(
  '../src/services/judgeService.js'
);

const config = { apiKey: 'sk-ant-test', model: 'claude-opus-5', freeTrials: 3, proMonthly: 30 };

const input = {
  png: Buffer.from('a fake png').toString('base64'),
  nodes: [{ type: 'TEXT', name: 'Title', x: 16, y: 16, w: 288, h: 24, text: 'Get started' }],
};

const verdictJson = JSON.stringify({
  overall: { score: 4, summary: 'Solid; tighten the card padding.' },
  findings: [],
});

beforeEach(() => {
  created.length = 0;
  calls.length = 0;
  create.mockReset();
  create.mockResolvedValue({ content: [{ type: 'text', text: verdictJson }], stop_reason: 'end_turn' });
});

describe('anthropicRunner', () => {
  it('builds the client with the configured key and nothing from the environment', async () => {
    await anthropicRunner(config)(input);

    expect(created).toEqual([{ apiKey: 'sk-ant-test' }]);
  });

  it('sends the configured model, the rubric and the token ceiling', async () => {
    await anthropicRunner(config)(input);

    expect(calls[0]?.model).toBe('claude-opus-5');
    expect(calls[0]?.max_tokens).toBe(JUDGE_MAX_TOKENS);
    expect(calls[0]?.system).toBe(JUDGE_SYSTEM_PROMPT);
  });

  it('constrains the answer with the verdict schema rather than trusting prose', async () => {
    await anthropicRunner(config)(input);

    expect(calls[0]?.output_config).toEqual({
      format: { type: 'json_schema', schema: VERDICT_SCHEMA },
    });
  });

  it('sends the frame as a base64 PNG and the layers as the rendered listing', async () => {
    await anthropicRunner(config)(input);

    const content = calls[0]?.messages[0]?.content ?? [];
    expect(content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: input.png },
    });
    expect(content[1]).toEqual({ type: 'text', text: renderNodes(input.nodes) });
  });

  it('sets no temperature or top_p — Opus 5 rejects them', async () => {
    await anthropicRunner(config)(input);

    expect(calls[0]).not.toHaveProperty('temperature');
    expect(calls[0]).not.toHaveProperty('top_p');
  });

  it('reduces the reply to its text and its stop reason', async () => {
    create.mockResolvedValueOnce({
      content: [{ type: 'text', text: verdictJson }],
      stop_reason: 'end_turn',
    });

    await expect(anthropicRunner(config)(input)).resolves.toEqual({
      text: verdictJson,
      stopReason: 'end_turn',
    });
  });

  it('skips a leading thinking block to find the verdict', async () => {
    create.mockResolvedValueOnce({
      content: [
        { type: 'thinking', thinking: 'measuring the gaps' },
        { type: 'text', text: verdictJson },
      ],
      stop_reason: 'end_turn',
    });

    expect((await anthropicRunner(config)(input)).text).toBe(verdictJson);
  });

  it('reports null text when the model produced no text block at all', async () => {
    create.mockResolvedValueOnce({
      content: [{ type: 'thinking', thinking: 'still thinking' }],
      stop_reason: 'max_tokens',
    });

    await expect(anthropicRunner(config)(input)).resolves.toEqual({
      text: null,
      stopReason: 'max_tokens',
    });
  });

  it('passes a refusal stop reason straight through, so the caller can end the attempt', async () => {
    create.mockResolvedValueOnce({ content: [], stop_reason: 'refusal' });

    expect((await anthropicRunner(config)(input)).stopReason).toBe('refusal');
  });

  it('wraps a transport failure as JudgeUnavailableError, keeping the reason', async () => {
    create.mockRejectedValueOnce(new Error('Request timed out.'));

    await expect(anthropicRunner(config)(input)).rejects.toThrow(JudgeUnavailableError);
    create.mockRejectedValueOnce(new Error('Request timed out.'));
    await expect(anthropicRunner(config)(input)).rejects.toThrow('Request timed out.');
  });

  it('wraps an overload the same way rather than letting a 529 escape', async () => {
    create.mockRejectedValueOnce(Object.assign(new Error('Overloaded'), { status: 529 }));

    await expect(anthropicRunner(config)(input)).rejects.toThrow(JudgeUnavailableError);
  });

  it('copes with a throw that is not an Error', async () => {
    create.mockRejectedValueOnce('socket hang up');

    await expect(anthropicRunner(config)(input)).rejects.toThrow('The judge is unavailable');
  });
});

describe('judge over the live runner', () => {
  it('returns a verdict from a single well-formed reply', async () => {
    const verdict = await judge(input, anthropicRunner(config));

    expect(verdict.overall.score).toBe(4);
    expect(calls).toHaveLength(1);
  });

  it('asks a second time when the first reply carried no text, then gives up', async () => {
    create.mockResolvedValue({ content: [], stop_reason: 'end_turn' });

    await expect(judge(input, anthropicRunner(config))).rejects.toThrow(JudgeUnavailableError);
    expect(calls).toHaveLength(2);
  });

  it('does not retry a transport failure — the error leaves on the first attempt', async () => {
    create.mockRejectedValue(new Error('Connection error.'));

    await expect(judge(input, anthropicRunner(config))).rejects.toThrow(JudgeUnavailableError);
    expect(calls).toHaveLength(1);
  });

  it('rejects a reply that is valid JSON but not a verdict, after both attempts', async () => {
    create.mockResolvedValue({
      content: [{ type: 'text', text: '{"overall":{"score":9,"summary":"x"},"findings":[]}' }],
      stop_reason: 'end_turn',
    });

    await expect(judge(input, anthropicRunner(config))).rejects.toThrow(JudgeUnavailableError);
    expect(calls).toHaveLength(2);
  });
});
