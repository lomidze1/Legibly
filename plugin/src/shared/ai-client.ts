/**
 * AI assist — alt-text suggestion via the Anthropic Messages API (v0.3).
 *
 * BYOK architecture (approach.md D14): the user's own API key, held in
 * memory only, calls api.anthropic.com directly from the UI iframe. Trust
 * discipline (remediation research §3): structured output via a forced
 * strict tool, a deterministic validator gate, and ALWAYS review-required —
 * a suggestion never touches the design without an explicit user action.
 */
export const AI_MODEL = 'claude-opus-4-8';
export const API_URL = 'https://api.anthropic.com/v1/messages';
export const MAX_ALT_LENGTH = 150;
const BANNED_PREFIX = /^\s*(an?\s+)?(image|picture|photo|photograph|graphic|icon|illustration)\s+(of|showing|depicting)\b/i;

export interface AltSuggestion {
  decision: 'informative' | 'decorative';
  altText: string;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
}

/** Strict tool schema — grammar-constrained output, no parse failures. */
export const ALT_TOOL = {
  name: 'emit_alt_text',
  description:
    'Report the alt-text decision for the image. decision=decorative means the image conveys no information (set altText to an empty string). decision=informative requires altText: a concise, specific description of the information the image conveys, under 150 characters, without prefixes like "image of".',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['decision', 'altText', 'confidence', 'rationale'],
    properties: {
      decision: { type: 'string', enum: ['informative', 'decorative'] },
      altText: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      rationale: { type: 'string' },
    },
  },
} as const;

const SYSTEM_PROMPT = `You write alt text for images inside UI designs, for accessibility (WCAG 2.2 SC 1.1.1).
Judge THIS image in its surrounding context. Decide first whether it is informative (conveys information a user needs) or decorative (purely visual).
For informative images: describe the information, not the pixels; be specific; under 150 characters; no "image of"/"picture of" prefixes; no trailing period requirement.
For decorative images: altText must be an empty string.
Set confidence low when the image is ambiguous without more product context.`;

export interface AltRequestParams {
  imageBase64: string;
  nodeName: string;
  /** Nearby text from the design — grounding context. */
  contextText: string;
}

/** Pure request builder — unit-testable without network. */
export function buildAltTextRequest(params: AltRequestParams): object {
  return {
    model: AI_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [ALT_TOOL],
    tool_choice: { type: 'tool', name: ALT_TOOL.name },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: params.imageBase64 },
          },
          {
            type: 'text',
            text: `Layer name: "${params.nodeName}". Nearby text in the design: "${params.contextText || '(none)'}". Provide the alt-text decision for this image.`,
          },
        ],
      },
    ],
  };
}

export function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    // Required for direct browser (iframe) calls — BYOK only, never our key.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

/** Extract the forced tool call from a Messages API response body. */
export function parseAltTextResponse(body: unknown): AltSuggestion {
  const b = body as {
    stop_reason?: string;
    content?: { type: string; name?: string; input?: unknown }[];
    error?: { message?: string };
  };
  if (b.error?.message) throw new Error(`AI error: ${b.error.message}`);
  if (b.stop_reason === 'refusal') {
    throw new Error('The AI declined to describe this image — write the alt text manually');
  }
  const toolUse = b.content?.find((c) => c.type === 'tool_use' && c.name === ALT_TOOL.name);
  if (!toolUse || !toolUse.input) {
    throw new Error('AI returned no suggestion — try again or write it manually');
  }
  const s = toolUse.input as AltSuggestion;
  if (
    (s.decision !== 'informative' && s.decision !== 'decorative') ||
    typeof s.altText !== 'string' ||
    !['high', 'medium', 'low'].includes(s.confidence)
  ) {
    throw new Error('AI returned a malformed suggestion — try again');
  }
  return { ...s, altText: s.altText.trim(), rationale: String(s.rationale ?? '') };
}

/**
 * The deterministic validator gate (research §3.2): a candidate that fails
 * format rules is rejected before it can be staged — regardless of source.
 */
export function validateAltSuggestion(s: AltSuggestion): { ok: true } | { ok: false; error: string } {
  if (s.decision === 'decorative') {
    if (s.altText !== '') return { ok: false, error: 'Decorative images must have empty alt text' };
    return { ok: true };
  }
  if (s.altText.length < 3) return { ok: false, error: 'Alt text is too short to be useful' };
  if (s.altText.length > MAX_ALT_LENGTH) {
    return { ok: false, error: `Alt text exceeds ${MAX_ALT_LENGTH} characters — shorten it` };
  }
  if (BANNED_PREFIX.test(s.altText)) {
    return { ok: false, error: 'Drop the "image of…" prefix — describe the content directly' };
  }
  return { ok: true };
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/** End-to-end call: build → POST → parse → validate. Throws on any failure. */
export async function requestAltText(
  fetchFn: FetchLike,
  apiKey: string,
  params: AltRequestParams
): Promise<AltSuggestion> {
  if (!apiKey.trim()) throw new Error('Add your Anthropic API key in settings first');
  const res = await fetchFn(API_URL, {
    method: 'POST',
    headers: buildHeaders(apiKey.trim()),
    body: JSON.stringify(buildAltTextRequest(params)),
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`AI request failed: ${msg}`);
  }
  const suggestion = parseAltTextResponse(body);
  const verdict = validateAltSuggestion(suggestion);
  if (!verdict.ok) throw new Error(verdict.error);
  return suggestion;
}

/** Uint8Array → base64 without call-stack overflow on large images. */
export function bytesToBase64(bytes: Uint8Array, btoaFn: (s: string) => string): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoaFn(binary);
}
