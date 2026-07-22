/**
 * Main-thread entrypoint (sandbox — figma.* only, C1).
 * Routes RPC calls from the UI iframe: scan, harvest tokens, apply fixes,
 * node selection, settings persistence.
 */
import { createRpcServer } from '../shared/rpc';
import { collectTextNodes, scanNodes } from '../shared/scan';
import { ALT_KEY, ALT_NS, DECORATIVE_KEY } from '../shared/alt-text';
import type { NodeLite } from '../shared/figma-lite';
import type { RGBA, ScanReport, Settings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import { resolveTextColors } from '../shared/background';
import { isLargeText, requiredRatio } from '../shared/contrast';
import { findExportRoot, regionInRoot } from '../shared/deep-check';
import { figmaTokenSource, harvestTokens } from './tokens';
import { applyBatch, applyFix, boundVariablePaint, FixInstruction } from './apply';
import { findBgOwner, frameState, noRegression, planBgFix } from './bg-fix';
import { classifyTextNode } from '../shared/classify';
import type { TokenCandidate } from '../shared/types';

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
  /**
   * Deep check (pixel-true): make the text transparent (opacity — never
   * visible=false, which would reflow auto-layout), export its top-level
   * frame, and let the UI sample the real pixels under the text box.
   */
  'deep-check': async (payload: { nodeId: string; settings: Settings }) => {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node || node.type !== 'TEXT') throw new Error('Deep check applies to text layers');
    const lite = node as unknown as NodeLite;

    const resolved = resolveTextColors(lite);
    const fg: RGBA | undefined = resolved.ok ? resolved.fg : resolved.fg;
    if (!fg) throw new Error('The text color itself could not be determined');
    if (typeof lite.fontSize !== 'number') throw new Error('Mixed text sizes — check ranges manually');
    const fontWeight = typeof lite.fontWeight === 'number' ? lite.fontWeight : 400;
    const required = requiredRatio(isLargeText(lite.fontSize, fontWeight), payload.settings.level);

    const root = findExportRoot(lite);
    const rect = regionInRoot(lite, root);
    const rootNode = (await figma.getNodeByIdAsync(root.id)) as SceneNode & ExportMixin;
    if (!rootNode || !('exportAsync' in rootNode)) throw new Error('Frame cannot be exported');

    const prevOpacity = node.opacity;
    let png: Uint8Array;
    try {
      node.opacity = 0;
      png = await rootNode.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
    } finally {
      node.opacity = prevOpacity;
    }
    return { png, rect, imageCssWidth: root.absoluteBoundingBox!.width, fg, required };
  },
  'file-name': () => figma.root.name,
  /** Export an image node (≤512px) + nearby text — grounding for AI alt text. */
  'export-image': async (payload: { nodeId: string }) => {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node || !('exportAsync' in node)) throw new Error('Image node not found');
    const scene = node as SceneNode & ExportMixin;
    const box = (scene as unknown as NodeLite).absoluteBoundingBox;
    const longest = Math.max(box?.width ?? 512, box?.height ?? 512);
    const scale = Math.min(1, 512 / longest);
    const png = await scene.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } });

    // Grounding context: text near the image (its parent frame's copy).
    const parent = (scene as unknown as NodeLite).parent;
    const contextText = parent
      ? collectTextNodes([parent])
          .map((t) => t.characters ?? '')
          .join(' · ')
          .slice(0, 300)
      : '';
    return { png, nodeName: scene.name, contextText };
  },
  /** Record alt text / decorative flag in sharedPluginData (1.1.1). */
  'set-alt-text': async (payload: { nodeId: string; altText?: string; decorative?: boolean }) => {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node || !('setSharedPluginData' in node)) throw new Error('Node not found');
    const scene = node as SceneNode;
    if (payload.decorative) {
      scene.setSharedPluginData(ALT_NS, DECORATIVE_KEY, 'true');
      scene.setSharedPluginData(ALT_NS, ALT_KEY, '');
    } else {
      scene.setSharedPluginData(ALT_NS, ALT_KEY, (payload.altText ?? '').trim());
      scene.setSharedPluginData(ALT_NS, DECORATIVE_KEY, '');
    }
    figma.commitUndo();
    return {
      nodeId: scene.id,
      nodeName: scene.name,
      sc: '1.1.1',
      before: 'missing',
      after: payload.decorative ? 'decorative' : 'recorded',
      target: 'alt text',
      changeDescription: payload.decorative
        ? 'marked decorative (empty alt)'
        : `alt text: “${(payload.altText ?? '').trim()}”`,
    };
  },
  /** F13 step 3: can this violation be fixed by re-tokening the BACKGROUND? */
  'plan-bg-fix': async (payload: {
    nodeId: string;
    settings: Settings;
    requiredRatio: number;
    fg: RGBA;
  }) => {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node || node.type !== 'TEXT') return null;
    const tokens = (await harvestTokens(figmaTokenSource())).tokens;
    return planBgFix(node as unknown as NodeLite, tokens, payload.settings, payload.requiredRatio, payload.fg);
  },
  /** Apply the background token — frame-wide re-verified, reverted on any regression. */
  'apply-bg-fix': async (payload: {
    nodeId: string;
    ownerId: string;
    token: TokenCandidate;
    settings: Settings;
    before: string;
    target: string;
  }) => {
    const text = await figma.getNodeByIdAsync(payload.nodeId);
    const owner = await figma.getNodeByIdAsync(payload.ownerId);
    if (!text || text.type !== 'TEXT' || !owner) throw new Error('Layer not found');
    const textLite = text as unknown as NodeLite;
    const ownerLite = owner as unknown as NodeLite;
    if (findBgOwner(textLite)?.id !== owner.id) {
      throw new Error('The background changed since planning — rescan and retry');
    }
    const root = findExportRoot(textLite);
    const beforeState = frameState(root, payload.settings);
    const prevFills = [...((ownerLite.fills as readonly Paint[]) ?? [])];
    const mutable = owner as { fills?: unknown };
    try {
      const paint =
        payload.token.kind === 'variable'
          ? await boundVariablePaint(payload.token.id, payload.token.color)
          : ({ type: 'SOLID', color: payload.token.color } as SolidPaint);
      mutable.fills = [...prevFills.slice(0, -1), paint];
      const verdict = classifyTextNode(textLite, payload.settings);
      if (verdict.kind !== 'pass') throw new Error('Post-fix verification failed — fix reverted');
      const afterState = frameState(root, payload.settings);
      if (!noRegression(beforeState, afterState)) {
        throw new Error('Fix would break another layer on this frame — reverted');
      }
      figma.commitUndo();
      return {
        nodeId: text.id,
        nodeName: text.name,
        sc: '1.4.3',
        before: payload.before,
        after: `${verdict.ratio.toFixed(2)}:1`,
        target: payload.target,
        changeDescription: `background "${owner.name}" → ${payload.token.name}`,
      };
    } catch (e) {
      mutable.fills = prevFills;
      throw e;
    }
  },
  'notify': (payload: { message: string; error?: boolean }) => {
    figma.notify(payload.message, { error: payload.error ?? false });
  },
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
