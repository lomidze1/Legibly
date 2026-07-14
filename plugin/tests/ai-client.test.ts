/**
 * v0.3 verify: AI alt-text client — request shape, forced strict tool,
 * response parsing, and the deterministic validator gate (research §3.2).
 * All network interaction mocked; no real API calls in tests.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  AI_MODEL,
  ALT_TOOL,
  buildAltTextRequest,
  buildHeaders,
  bytesToBase64,
  parseAltTextResponse,
  requestAltText,
  validateAltSuggestion,
} from '../src/shared/ai-client';

const PARAMS = { imageBase64: 'aGVsbG8=', nodeName: 'hero', contextText: 'Buy now' };

describe('buildAltTextRequest', () => {
  it('targets the current model with a forced strict tool', () => {
    const req = buildAltTextRequest(PARAMS) as Record<string, unknown>;
    expect(req.model).toBe(AI_MODEL);
    expect(req.max_tokens).toBe(1024);
    expect(req.tool_choice).toEqual({ type: 'tool', name: 'emit_alt_text' });
    const tool = (req.tools as (typeof ALT_TOOL)[])[0]!;
    expect(tool.strict).toBe(true);
    expect(tool.input_schema.additionalProperties).toBe(false);
    expect(tool.input_schema.required).toContain('decision');
  });

  it('sends the image as a base64 PNG block plus grounding text', () => {
    const req = buildAltTextRequest(PARAMS) as {
      messages: { content: { type: string; source?: { type: string; media_type: string; data: string }; text?: string }[] }[];
    };
    const [image, text] = req.messages[0]!.content;
    expect(image!.source).toEqual({ type: 'base64', media_type: 'image/png', data: 'aGVsbG8=' });
    expect(text!.text).toContain('hero');
    expect(text!.text).toContain('Buy now');
  });
});

describe('buildHeaders', () => {
  it('includes api key, version, and the direct-browser-access header', () => {
    const h = buildHeaders('sk-ant-test');
    expect(h['x-api-key']).toBe('sk-ant-test');
    expect(h['anthropic-version']).toBe('2023-06-01');
    expect(h['anthropic-dangerous-direct-browser-access']).toBe('true');
  });
});

describe('parseAltTextResponse', () => {
  const good = {
    stop_reason: 'tool_use',
    content: [
      { type: 'tool_use', name: 'emit_alt_text', input: { decision: 'informative', altText: ' Team photo ', confidence: 'high', rationale: 'clear subject' } },
    ],
  };

  it('extracts and trims the tool input', () => {
    const s = parseAltTextResponse(good);
    expect(s.altText).toBe('Team photo');
    expect(s.confidence).toBe('high');
  });

  it('throws a human message on refusal', () => {
    expect(() => parseAltTextResponse({ stop_reason: 'refusal', content: [] })).toThrow('declined');
  });

  it('throws on missing tool call or malformed input', () => {
    expect(() => parseAltTextResponse({ content: [{ type: 'text' }] })).toThrow('no suggestion');
    expect(() =>
      parseAltTextResponse({
        content: [{ type: 'tool_use', name: 'emit_alt_text', input: { decision: 'maybe', altText: 1 } }],
      })
    ).toThrow('malformed');
  });

  it('surfaces API error bodies', () => {
    expect(() => parseAltTextResponse({ error: { message: 'overloaded' } })).toThrow('overloaded');
  });
});

describe('validateAltSuggestion — the gate no candidate can skip', () => {
  const base = { decision: 'informative' as const, confidence: 'high' as const, rationale: '' };

  it('accepts a clean informative suggestion', () => {
    expect(validateAltSuggestion({ ...base, altText: 'Quarterly revenue chart, up 12%' }).ok).toBe(true);
  });
  it('rejects too-short and too-long alt text', () => {
    expect(validateAltSuggestion({ ...base, altText: 'ab' }).ok).toBe(false);
    expect(validateAltSuggestion({ ...base, altText: 'x'.repeat(151) }).ok).toBe(false);
  });
  it('rejects "image of…" style prefixes', () => {
    expect(validateAltSuggestion({ ...base, altText: 'Image of a chart' }).ok).toBe(false);
    expect(validateAltSuggestion({ ...base, altText: 'A photo showing the team' }).ok).toBe(false);
  });
  it('decorative must have empty alt text', () => {
    expect(validateAltSuggestion({ ...base, decision: 'decorative', altText: '' }).ok).toBe(true);
    expect(validateAltSuggestion({ ...base, decision: 'decorative', altText: 'oops' }).ok).toBe(false);
  });
});

describe('requestAltText — end to end with mocked fetch', () => {
  it('POSTs the built request and returns the validated suggestion', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          { type: 'tool_use', name: 'emit_alt_text', input: { decision: 'informative', altText: 'Login screen mockup', confidence: 'high', rationale: 'r' } },
        ],
      }),
    }));
    const s = await requestAltText(fetchFn, 'sk-ant-x', PARAMS);
    expect(s.altText).toBe('Login screen mockup');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('sk-ant-x');
    expect(JSON.parse(init.body).model).toBe(AI_MODEL);
  });

  it('rejects when the API returns an error status', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'invalid x-api-key' } }),
    }));
    await expect(requestAltText(fetchFn, 'bad-key', PARAMS)).rejects.toThrow('invalid x-api-key');
  });

  it('rejects a suggestion that fails the validator gate', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          { type: 'tool_use', name: 'emit_alt_text', input: { decision: 'informative', altText: 'Image of things', confidence: 'high', rationale: '' } },
        ],
      }),
    }));
    await expect(requestAltText(fetchFn, 'sk-ant-x', PARAMS)).rejects.toThrow('prefix');
  });

  it('refuses to run without a key', async () => {
    await expect(requestAltText(vi.fn(), '  ', PARAMS)).rejects.toThrow('API key');
  });
});

describe('bytesToBase64', () => {
  it('encodes large arrays chunk-safely', () => {
    const bytes = new Uint8Array(20000).fill(65);
    const b64 = bytesToBase64(bytes, (s) => Buffer.from(s, 'binary').toString('base64'));
    expect(Buffer.from(b64, 'base64').every((v) => v === 65)).toBe(true);
    expect(Buffer.from(b64, 'base64')).toHaveLength(20000);
  });
});
