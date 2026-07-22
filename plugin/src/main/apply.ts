/**
 * Canvas mutation with commit-time verification (F12, F15, NF1).
 *
 * The invariant: a fix is committed iff re-running the SAME deterministic
 * check on the post-mutation node passes. On verification failure the
 * previous state is restored — a bad fix physically cannot stay on canvas.
 *
 * Fix kinds: color token/proposal (1.4.3 text fill, 1.4.11 icon fill or
 * stroke), min-size (2.5.8), line-height (1.4.12 capability).
 */
import type { AppliedFix, RGBA, Settings, TokenCandidate } from '../shared/types';
import { classifyTextNode } from '../shared/classify';
import type { NodeLite } from '../shared/figma-lite';
import { rgbaToHex } from '../shared/fix';
import { measureNonText, NON_TEXT_RATIO } from '../shared/non-text';
import { lineHeightRatio, LINE_HEIGHT_FLOOR } from '../shared/text-spacing';

export type PaintTarget = 'text-fill' | 'shape-fill' | 'stroke';

export type FixInstruction =
  | { kind: 'token'; token: TokenCandidate; paintTarget?: PaintTarget }
  | { kind: 'proposal'; color: RGBA; tokenName: string; paintTarget?: PaintTarget }
  | { kind: 'min-size'; required: number }
  | { kind: 'line-height'; percent: number };

const PROPOSAL_COLLECTION = 'Legibly';

async function findSceneNode(nodeId: string): Promise<SceneNode> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') {
    throw new Error(`Node ${nodeId} not found`);
  }
  return node as SceneNode;
}

function describeTopPaint(paints: unknown): string {
  if (!Array.isArray(paints) || paints.length === 0) return 'current color';
  const top = paints[paints.length - 1] as SolidPaint;
  return top.type === 'SOLID' ? rgbaToHex({ ...top.color, a: 1 }) : 'current color';
}

export async function boundVariablePaint(variableId: string, color: RGBA): Promise<SolidPaint> {
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) throw new Error(`Variable ${variableId} not found`);
  // Base color mirrors the variable value so any reader of paint.color —
  // including our own commit-time verifier — sees the true rendered color.
  const base: SolidPaint = { type: 'SOLID', color: { r: color.r, g: color.g, b: color.b } };
  return figma.variables.setBoundVariableForPaint(base, 'color', variable);
}

async function createProposalVariable(color: RGBA, tokenName: string): Promise<Variable> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  // Always our own collection — never fall back to the user's first collection (B3).
  const collection =
    collections.find((c) => c.name === PROPOSAL_COLLECTION) ??
    figma.variables.createVariableCollection(PROPOSAL_COLLECTION);
  const modeId = collection.defaultModeId;

  // Reuse an existing Legibly token of this exact color — one color, one token,
  // across sessions and batches (B5). This also means the name counter, which
  // resets to 1 each session, can never collide into a duplicate crash (B1).
  const locals = (await figma.variables.getLocalVariablesAsync('COLOR')).filter(
    (v) => v.variableCollectionId === collection.id
  );
  const eq = 0.5 / 255;
  const reuse = locals.find((v) => {
    const val = v.valuesByMode[modeId] as { r: number; g: number; b: number } | undefined;
    return (
      !!val &&
      Math.abs(val.r - color.r) < eq &&
      Math.abs(val.g - color.g) < eq &&
      Math.abs(val.b - color.b) < eq
    );
  });
  if (reuse) return reuse;

  // New color: pick a name no existing token already holds.
  const taken = new Set(locals.map((v) => v.name));
  let name = tokenName;
  for (let n = 2; taken.has(name); n++) name = `${tokenName}-${n}`;
  const variable = figma.variables.createVariable(name, collection, 'COLOR');
  variable.setValueForMode(modeId, { r: color.r, g: color.g, b: color.b, a: 1 });
  return variable;
}

interface Mutable {
  fills?: unknown;
  strokes?: readonly Paint[];
  setFillStyleIdAsync?: (id: string) => Promise<void>;
  setStrokeStyleIdAsync?: (id: string) => Promise<void>;
  minWidth?: number | null;
  minHeight?: number | null;
  lineHeight?: unknown;
  fontName?: unknown;
  width?: number;
  height?: number;
  layoutMode?: string;
  name: string;
}

/**
 * Apply one fix and verify it with the same check that flagged the finding.
 * Throws (after restoring the original state) when verification fails.
 * `before`/`target` are display labels computed by the caller from the plan.
 */
export async function applyFix(
  nodeId: string,
  instruction: FixInstruction,
  settings: Settings,
  before: string,
  target: string,
  sc: string
): Promise<AppliedFix> {
  const node = (await findSceneNode(nodeId)) as SceneNode & Mutable;

  const applied = await (() => {
    switch (instruction.kind) {
      case 'token':
      case 'proposal':
        return applyColorFix(node, instruction, settings, before, target);
      case 'min-size':
        return applyMinSize(node, instruction.required, before, target);
      case 'line-height':
        return applyLineHeight(node, instruction.percent, before, target);
    }
  })();
  applied.sc = sc;
  return applied;
}

async function applyColorFix(
  node: SceneNode & Mutable,
  instruction: Extract<FixInstruction, { kind: 'token' | 'proposal' }>,
  settings: Settings,
  before: string,
  target: string
): Promise<AppliedFix> {
  const paintTarget: PaintTarget = instruction.paintTarget ?? 'text-fill';
  const prop = paintTarget === 'stroke' ? 'strokes' : 'fills';
  const prev = node[prop];
  const prevSnapshot = prev === figma.mixed ? figma.mixed : [...((prev as readonly Paint[]) ?? [])];
  const fromDescription = describeTopPaint(prev);

  let changeDescription: string;
  try {
    if (instruction.kind === 'token' && instruction.token.kind === 'style') {
      if (paintTarget === 'stroke') {
        if (!node.setStrokeStyleIdAsync) throw new Error('Cannot style this stroke');
        await node.setStrokeStyleIdAsync(instruction.token.id);
      } else {
        if (!node.setFillStyleIdAsync) throw new Error('Cannot style this fill');
        await node.setFillStyleIdAsync(instruction.token.id);
      }
      changeDescription = `${fromDescription} → ${instruction.token.name}`;
    } else {
      let paint: SolidPaint;
      if (instruction.kind === 'token') {
        paint = await boundVariablePaint(instruction.token.id, instruction.token.color);
        changeDescription = `${fromDescription} → ${instruction.token.name}`;
      } else {
        const variable = await createProposalVariable(instruction.color, instruction.tokenName);
        paint = await boundVariablePaint(variable.id, instruction.color);
        changeDescription = `${fromDescription} → new token ${instruction.tokenName} (${rgbaToHex(instruction.color)})`;
      }
      (node as Mutable)[prop] = [paint] as never;
    }

    // COMMIT-TIME VERIFICATION — same judge as the detector (NF1).
    let after: string;
    if (paintTarget === 'text-fill') {
      const verdict = classifyTextNode(node as unknown as NodeLite, settings);
      if (verdict.kind !== 'pass') throw new Error('Post-fix verification failed — fix reverted');
      after = `${verdict.ratio.toFixed(2)}:1`;
    } else {
      const measured = measureNonText(node as unknown as NodeLite, paintTarget);
      if (!measured || measured.min < NON_TEXT_RATIO) {
        throw new Error('Post-fix verification failed — fix reverted');
      }
      after = `${measured.min.toFixed(2)}:1`;
    }
    return { nodeId: node.id, nodeName: node.name, sc: '', before, after, target, changeDescription };
  } catch (e) {
    if (prevSnapshot !== figma.mixed) (node as Mutable)[prop] = prevSnapshot as never;
    throw e;
  }
}

async function applyMinSize(
  node: SceneNode & Mutable,
  required: number,
  before: string,
  target: string
): Promise<AppliedFix> {
  if (typeof node.layoutMode !== 'string' || node.layoutMode === 'NONE') {
    throw new Error('Automatic resize needs auto layout — enable it or enlarge the tap area manually');
  }
  const prevMinW = node.minWidth ?? null;
  const prevMinH = node.minHeight ?? null;
  try {
    if ((node.width ?? 0) < required) node.minWidth = required;
    if ((node.height ?? 0) < required) node.minHeight = required;
    const w = node.width ?? 0;
    const h = node.height ?? 0;
    if (w < required || h < required) {
      throw new Error('Post-fix verification failed — fix reverted');
    }
    return {
      nodeId: node.id,
      nodeName: node.name,
      sc: '',
      before,
      after: `${Math.round(w)}×${Math.round(h)}px`,
      target,
      changeDescription: `min size set to ${required}×${required}`,
    };
  } catch (e) {
    node.minWidth = prevMinW;
    node.minHeight = prevMinH;
    throw e;
  }
}

async function applyLineHeight(
  node: SceneNode & Mutable,
  percent: number,
  before: string,
  target: string
): Promise<AppliedFix> {
  if (node.type !== 'TEXT') throw new Error('Line height fix applies to text only');
  const text = node as unknown as TextNode;
  const fontName = node.fontName;
  if (fontName === figma.mixed) throw new Error('Mixed fonts — adjust line height manually');
  await figma.loadFontAsync(fontName as FontName);
  const prev = node.lineHeight;
  const prevResize = text.textAutoResize;
  try {
    node.lineHeight = { unit: 'PERCENT', value: percent } as never;
    const ratio = lineHeightRatio(node as unknown as NodeLite);
    if (ratio === null || ratio < LINE_HEIGHT_FLOOR) {
      throw new Error('Post-fix verification failed — fix reverted');
    }
    // B8: on a fixed-size text box, taller line height can clip the text. Measure
    // the natural content height (temporarily) and refuse the fix if it no longer fits.
    if (prevResize === 'NONE' || prevResize === 'TRUNCATE') {
      const boxHeight = text.height;
      text.textAutoResize = 'HEIGHT';
      const contentHeight = text.height;
      text.textAutoResize = prevResize;
      if (contentHeight > boxHeight + 0.5) {
        throw new Error('Line height 150% would clip this fixed-size text box — resize it or fix spacing manually');
      }
    }
    return {
      nodeId: node.id,
      nodeName: node.name,
      sc: '',
      before,
      after: `${percent}%`,
      target,
      changeDescription: `line height set to ${percent}%`,
    };
  } catch (e) {
    text.textAutoResize = prevResize;
    node.lineHeight = prev as never;
    throw e;
  }
}

export interface BatchResult {
  applied: AppliedFix[];
  failed: { nodeId: string; error: string }[];
}

/** Batch fix (F17): apply all, then a single commitUndo → one Cmd-Z. */
export async function applyBatch(
  fixes: { nodeId: string; instruction: FixInstruction; before: string; target: string; sc: string }[],
  settings: Settings
): Promise<BatchResult> {
  const result: BatchResult = { applied: [], failed: [] };
  for (const f of fixes) {
    try {
      result.applied.push(await applyFix(f.nodeId, f.instruction, settings, f.before, f.target, f.sc));
    } catch (e) {
      result.failed.push({ nodeId: f.nodeId, error: e instanceof Error ? e.message : String(e) });
    }
  }
  figma.commitUndo();
  return result;
}
