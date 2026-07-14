/**
 * Main-thread entrypoint (sandbox — figma.* only, C1).
 * Routes RPC calls from the UI iframe: scan, harvest tokens, apply fixes,
 * node selection, settings persistence.
 */
import { createRpcServer } from '../shared/rpc';
import { scanNodes } from '../shared/scan';
import type { NodeLite } from '../shared/figma-lite';
import type { ScanReport, Settings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import { figmaTokenSource, harvestTokens } from './tokens';
import { applyBatch, applyFix, FixInstruction } from './apply';

const SETTINGS_KEY = 'legibly-settings-v1';

figma.showUI(__html__, { width: 380, height: 560, themeColors: true });

/** Resolve the variable/style name bound to the text's top fill, if any. */
async function currentTokenName(nodeId: string): Promise<string | undefined> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || node.type !== 'TEXT') return undefined;
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills) || fills.length === 0) return undefined;
  const top = fills[fills.length - 1] as SolidPaint;
  const variableId = top.boundVariables?.color?.id;
  if (variableId) {
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (variable) return variable.name;
  }
  const styleId = node.fillStyleId;
  if (typeof styleId === 'string' && styleId) {
    const style = await figma.getStyleByIdAsync(styleId);
    if (style) return style.name;
  }
  return undefined;
}

async function scan(payload: { scope: 'selection' | 'page'; settings: Settings }): Promise<ScanReport> {
  const roots =
    payload.scope === 'selection'
      ? (figma.currentPage.selection as unknown as NodeLite[])
      : ([figma.currentPage] as unknown as NodeLite[]);
  if (payload.scope === 'selection' && roots.length === 0) {
    throw new Error('Nothing selected — select frames or layers to scan');
  }
  const report = scanNodes(roots, payload.settings);
  // Enrich text-contrast violations with the bound token name (same-ramp, F13).
  for (const f of report.findings) {
    if (f.tier === 'violation' && f.sc === '1.4.3') {
      (f as { currentTokenName?: string }).currentTokenName = await currentTokenName(f.nodeId);
    }
  }
  return report;
}

const handlers = {
  scan,
  tokens: () => harvestTokens(figmaTokenSource()),
  'apply-fix': async (payload: {
    nodeId: string;
    instruction: FixInstruction;
    settings: Settings;
    before: string;
    target: string;
    sc: string;
  }) => {
    const applied = await applyFix(
      payload.nodeId,
      payload.instruction,
      payload.settings,
      payload.before,
      payload.target,
      payload.sc
    );
    figma.commitUndo();
    return applied;
  },
  'apply-batch': (payload: {
    fixes: { nodeId: string; instruction: FixInstruction; before: string; target: string; sc: string }[];
    settings: Settings;
  }) => applyBatch(payload.fixes, payload.settings),
  'select-node': async (payload: { nodeId: string }) => {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (node && 'absoluteBoundingBox' in node) {
      figma.currentPage.selection = [node as SceneNode];
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
  },
  'get-settings': async (): Promise<Settings> => {
    const stored = await figma.clientStorage.getAsync(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...(stored as Settings) } : DEFAULT_SETTINGS;
  },
  'set-settings': (payload: Settings) => figma.clientStorage.setAsync(SETTINGS_KEY, payload),
};

const route = createRpcServer(handlers, (msg) => figma.ui.postMessage(msg));
figma.ui.onmessage = (msg: unknown) => route(msg);
