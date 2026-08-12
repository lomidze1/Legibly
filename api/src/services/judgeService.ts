import Anthropic from '@anthropic-ai/sdk';

import { JUDGE_MAX_TOKENS, MAX_PNG_BYTES, MAX_TREE_NODES, type JudgeConfig } from '../config/judge';
import { isPlainObject } from '../lib/validators';
import {
  JUDGE_SYSTEM_PROMPT,
  VERDICT_SCHEMA,
  type JudgeFinding,
  type JudgeVerdict,
} from './judgeRubric';

const MAX_TEXT_LENGTH = 200;
const MAX_NAME_LENGTH = 80;

export class JudgeInputError extends Error {
  override name = 'JudgeInputError';
}

/** The model declined. Not our bug, and not something a retry fixes. */
export class JudgeRefusedError extends Error {
  override name = 'JudgeRefusedError';
}

/** Anything else — timeout, overload, a shape we could not use after retrying. */
export class JudgeUnavailableError extends Error {
  override name = 'JudgeUnavailableError';
}

export interface JudgeNode {
  type: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
}

export interface JudgeInput {
  /** base64 PNG of the selected frame, exported at 2×. */
  png: string;
  nodes: JudgeNode[];
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function shortString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.slice(0, max);
}

/**
 * Validates what the plugin sent. Everything here is attacker-shaped input: the
 * caller holds a valid token, but a token proves who they are, not what they send.
 */
export function parseJudgeInput(body: unknown): JudgeInput {
  if (!isPlainObject(body)) throw new JudgeInputError('Expected an object');

  const png = body.png;
  if (typeof png !== 'string' || png === '') throw new JudgeInputError('Missing frame image');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(png)) throw new JudgeInputError('Frame image is not base64');
  // base64 carries 3 bytes per 4 characters.
  if ((png.length * 3) / 4 > MAX_PNG_BYTES) throw new JudgeInputError('Frame image is too large');

  const rawNodes = body.nodes;
  if (!Array.isArray(rawNodes)) throw new JudgeInputError('Missing layer listing');
  if (rawNodes.length > MAX_TREE_NODES) {
    throw new JudgeInputError(`Too many layers — select a smaller frame (limit ${MAX_TREE_NODES})`);
  }

  const nodes: JudgeNode[] = [];
  for (const raw of rawNodes) {
    if (!isPlainObject(raw)) throw new JudgeInputError('Malformed layer');
    const type = shortString(raw.type, MAX_NAME_LENGTH);
    const name = shortString(raw.name, MAX_NAME_LENGTH);
    const x = finiteNumber(raw.x);
    const y = finiteNumber(raw.y);
    const w = finiteNumber(raw.w);
    const h = finiteNumber(raw.h);
    if (type === undefined || name === undefined) throw new JudgeInputError('Malformed layer');
    if (x === undefined || y === undefined || w === undefined || h === undefined) {
      throw new JudgeInputError('Malformed layer');
    }

    const text = shortString(raw.text, MAX_TEXT_LENGTH);
    nodes.push(text === undefined ? { type, name, x, y, w, h } : { type, name, x, y, w, h, text });
  }

  return { png, nodes };
}

/** One line per layer — dense enough that measurements are countable. */
export function renderNodes(nodes: readonly JudgeNode[]): string {
  const lines = nodes.map((node) => {
    const box = `${Math.round(node.x)},${Math.round(node.y)} ${Math.round(node.w)}×${Math.round(node.h)}`;
    const text = node.text === undefined ? '' : ` — "${node.text}"`;
    return `${node.type} "${node.name}" ${box}${text}`;
  });
  return `Layers (${nodes.length}), positions and sizes in px:\n${lines.join('\n')}`;
}

function isFinding(value: unknown): value is JudgeFinding {
  if (!isPlainObject(value)) return false;
  const fields = ['dimension', 'severity', 'what', 'where', 'why', 'suggestion'] as const;
  return fields.every((field) => typeof value[field] === 'string' && value[field] !== '');
}

/**
 * The schema is enforced server-side, so a mismatch here means something went
 * wrong upstream — a truncated response, a refusal we failed to catch. Either
 * way the caller gets an error, never a half-verdict.
 */
export function parseVerdict(text: string): JudgeVerdict | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;

  const overall = parsed.overall;
  if (!isPlainObject(overall)) return null;
  const score = overall.score;
  const summary = overall.summary;
  if (!Number.isInteger(score) || (score as number) < 1 || (score as number) > 5) return null;
  if (typeof summary !== 'string' || summary === '') return null;

  const findings = parsed.findings;
  if (!Array.isArray(findings) || !findings.every(isFinding)) return null;

  return { overall: { score: score as number, summary }, findings: findings as JudgeFinding[] };
}

export interface ModelReply {
  /** Null when the model produced no text block. */
  text: string | null;
  stopReason: string | null;
}

export type RunModel = (input: JudgeInput) => Promise<ModelReply>;

/**
 * Asks once, and once more if the first answer is unusable.
 *
 * ⚠️ Neither attempt touches the quota — the caller books the call only after
 * this resolves. A model timeout must not cost a user one of three free trials.
 */
export async function judge(input: JudgeInput, runModel: RunModel): Promise<JudgeVerdict> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const reply = await runModel(input);

    // Check the stop reason before reading content: on a refusal the content is
    // empty or partial, and reading it as an answer would surface nonsense.
    if (reply.stopReason === 'refusal') {
      throw new JudgeRefusedError('The model declined to review this frame');
    }
    if (reply.stopReason === 'max_tokens') continue;
    if (reply.text === null) continue;

    const verdict = parseVerdict(reply.text);
    if (verdict !== null) return verdict;
  }

  throw new JudgeUnavailableError('The judge could not produce a usable verdict');
}

/**
 * The live model call.
 *
 * Structured outputs rather than backend-spec §8.2's "strict tool schema": the
 * guarantee is the same — the response cannot violate the schema — and it avoids
 * forcing a tool choice on a model whose thinking is on by default.
 *
 * No temperature or top_p: Opus 5 rejects them.
 */
export function anthropicRunner(config: JudgeConfig): RunModel {
  const client = new Anthropic({ apiKey: config.apiKey });

  return async (input) => {
    let message;
    try {
      message = await client.messages.create({
        model: config.model,
        max_tokens: JUDGE_MAX_TOKENS,
        system: JUDGE_SYSTEM_PROMPT,
        output_config: { format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/png', data: input.png },
              },
              { type: 'text', text: renderNodes(input.nodes) },
            ],
          },
        ],
      });
    } catch (error) {
      throw new JudgeUnavailableError(
        error instanceof Error ? error.message : 'The judge is unavailable',
      );
    }

    const text = message.content.find((block) => block.type === 'text');
    return {
      text: text === undefined ? null : text.text,
      stopReason: message.stop_reason,
    };
  };
}
