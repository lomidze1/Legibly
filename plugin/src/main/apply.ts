/**
 * Canvas mutation with commit-time verification (F12, F15, NF1).
 *
 * The invariant: a fix is committed iff re-running the SAME deterministic
 * check on the post-mutation node passes. On verification failure the
 * previous fills are restored — a bad fix physically cannot stay on canvas.
 */
import type { AppliedFix, RGBA, Settings, TokenCandidate } from '../shared/types';
import { classifyTextNode, CONTRAST_SC } from '../shared/classify';
import type { NodeLite } from '../shared/figma-lite';
import { rgbaToHex } from '../shared/fix';

export type FixInstruction =
  | { kind: 'token'; token: TokenCandidate }
  | { kind: 'proposal'; color: RGBA; tokenName: string };

const PROPOSAL_COLLECTION = 'Legibly';

async function findTextNode(nodeId: string): Promise<TextNode> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || node.type !== 'TEXT') throw new Error(`Text node ${nodeId} not found`);
  return node;
}

function describeCurrentFill(node: TextNode): string {
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills) || fills.length === 0) return 'current color';
  const top = fills[fills.length - 1] as SolidPaint;
  if (top.type === 'SOLID') {
    return rgbaToHex({ ...top.color, a: 1 });
  }
  return 'current color';
}

async function bindVariableFill(node: TextNode, variableId: string, color: RGBA): Promise<void> {
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) throw new Error(`Variable ${variableId} not found`);
  // Base color mirrors the variable value so any reader of paint.color —
  // including our own commit-time verifier — sees the true rendered color.
  const base: SolidPaint = { type: 'SOLID', color: { r: color.r, g: color.g, b: color.b } };
  const bound = figma.variables.setBoundVariableForPaint(base, 'color', variable);
  node.fills = [bound];
}

async function createProposalVariable(color: RGBA, tokenName: string): Promise<Variable> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.name === PROPOSAL_COLLECTION) ?? collections[0];
  if (!collection) collection = figma.variables.createVariableCollection(PROPOSAL_COLLECTION);
  const variable = figma.variables.createVariable(tokenName, collection, 'COLOR');
  variable.setValueForMode(collection.defaultModeId, { r: color.r, g: color.g, b: color.b, a: 1 });
  return variable;
}

/**
 * Apply one fix and verify it with the same check that flagged the finding.
 * Throws (after restoring the original fills) when verification fails.
 */
export async function applyFix(
  nodeId: string,
  instruction: FixInstruction,
  settings: Settings,
  beforeRatio: number
): Promise<AppliedFix> {
  const node = await findTextNode(nodeId);
  const prevFills = node.fills === figma.mixed ? figma.mixed : [...(node.fills as readonly Paint[])];
  const fromDescription = describeCurrentFill(node);

  let changeDescription: string;
  try {
    if (instruction.kind === 'token') {
      if (instruction.token.kind === 'variable') {
        await bindVariableFill(node, instruction.token.id, instruction.token.color);
      } else {
        await node.setFillStyleIdAsync(instruction.token.id);
      }
      changeDescription = `${fromDescription} → ${instruction.token.name}`;
    } else {
      const variable = await createProposalVariable(instruction.color, instruction.tokenName);
      await bindVariableFill(node, variable.id, instruction.color);
      changeDescription = `${fromDescription} → new token ${instruction.tokenName} (${rgbaToHex(instruction.color)})`;
    }

    // COMMIT-TIME VERIFICATION: same classifier, same math (NF1).
    const verdict = classifyTextNode(node as unknown as NodeLite, settings);
    if (verdict.kind !== 'pass') {
      throw new Error('Post-fix verification failed — fix reverted');
    }
    return {
      nodeId,
      nodeName: node.name,
      sc: CONTRAST_SC,
      beforeRatio,
      afterRatio: verdict.ratio,
      requiredRatio: 0, // filled by caller from the plan
      changeDescription,
    };
  } catch (e) {
    if (prevFills !== figma.mixed) node.fills = prevFills as Paint[];
    throw e;
  }
}

export interface BatchResult {
  applied: AppliedFix[];
  failed: { nodeId: string; error: string }[];
}

/** Batch fix (F17): apply all, then a single commitUndo → one Cmd-Z. */
export async function applyBatch(
  fixes: { nodeId: string; instruction: FixInstruction; beforeRatio: number }[],
  settings: Settings
): Promise<BatchResult> {
  const result: BatchResult = { applied: [], failed: [] };
  for (const f of fixes) {
    try {
      result.applied.push(await applyFix(f.nodeId, f.instruction, settings, f.beforeRatio));
    } catch (e) {
      result.failed.push({ nodeId: f.nodeId, error: e instanceof Error ? e.message : String(e) });
    }
  }
  figma.commitUndo();
  return result;
}
