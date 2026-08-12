/**
 * Main-thread entrypoint (sandbox — figma.* only, C1).
 * Routes RPC calls from the UI iframe: scan, harvest tokens, apply fixes,
 * node selection, settings persistence.
 */
import { createRpcServer } from '../shared/rpc';
import { byTier, scanNodes } from '../shared/scan';
import { ALT_KEY, ALT_NS, DECORATIVE_KEY, validateAltText } from '../shared/alt-text';
import { AUTH_TOKEN_KEY, type StoredToken } from '../shared/license';
import type { NodeLite } from '../shared/figma-lite';
import type { Finding, RGBA, ScanReport, Settings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import { resolveBackdrop, resolveTextColors } from '../shared/background';
import { isLargeText, requiredRatio } from '../shared/contrast';
import { findExportRoot, regionInRoot } from '../shared/deep-check';
import { figmaTokenSource, harvestTokens } from './tokens';
import { attachModeColors, buildModeProjections } from './modes';
import {
  findInTree,
  indexById,
  projectShallow,
  projectTree,
  touchesModeColors,
} from '../shared/project';
import { applyBatch, applyFix, boundVariablePaint, FixInstruction, ModeGuard } from './apply';
import { measureNonText, NON_TEXT_RATIO } from '../shared/non-text';
import { findBgOwner, frameState, noRegression, planBgFix } from './bg-fix';
import { classifyTextNode } from '../shared/classify';
import { rgbaToHex } from '../shared/fix';
import type { TokenCandidate } from '../shared/types';

const SETTINGS_KEY = 'legibly-settings-v1';

figma.showUI(__html__, { width: 380, height: 560, themeColors: true });

/**
 * B4 — stale detection. A "FIXED" badge must never outlive a Cmd-Z. We can't
 * tell a user undo from our own edit at the event level, so we count each of
 * our mutations and consume one documentchange per count; anything left over is
 * an external edit (an undo, a manual tweak) → tell the UI its results are stale.
 * The timeout self-heals a count that never gets its event, so a real edit is
 * never swallowed indefinitely.
 */
let selfEdits = 0;
function markSelfEdit(): void {
  selfEdits++;
  setTimeout(() => {
    if (selfEdits > 0) selfEdits--;
  }, 500);
}
/**
 * `documentAccess: "dynamic-page"` refuses a documentchange handler until every
 * page is loaded, so registration is deferred to the first scan: results can
 * only go stale once they exist, and the all-pages load stays off plugin open.
 */
let changeWatch: Promise<void> | undefined;
function watchCanvasChanges(): Promise<void> {
  if (!changeWatch) {
    changeWatch = figma.loadAllPagesAsync().then(() => {
      figma.on('documentchange', () => {
        if (selfEdits > 0) {
          selfEdits--;
          return;
        }
        figma.ui.postMessage({ legibly: 'event', type: 'canvas-changed' });
      });
    });
  }
  return changeWatch;
}

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

/** SCs whose verdict can change with a variable mode — colour checks only. */
const MODE_SENSITIVE_SCS = new Set(['1.4.3', '1.4.11']);

/**
 * Re-run the colour checks in every variable mode the canvas is not showing.
 * Reading `fills` yields one theme's colours, so a Light-mode file can pass on
 * screen while its Dark mode is unreadable. Projections are read-only mirrors
 * (shared/project.ts) — the document is never touched.
 *
 * A node already flagged in the base scan is not flagged again: its card
 * exists, and one issue per layer per criterion is what the user can act on.
 */
async function sweepModes(
  roots: readonly NodeLite[],
  report: ScanReport,
  settings: Settings
): Promise<void> {
  const page = figma.currentPage as unknown as NodeLite;
  const currentModes = new Map<string, string>(
    Object.entries((figma.currentPage as unknown as { explicitVariableModes?: Record<string, string> })
      .explicitVariableModes ?? {})
  );
  const { projections, skipped } = await buildModeProjections(figmaTokenSource(), currentModes);
  if (projections.length === 0) return;

  const rootIds = new Set(roots.map((r) => r.id));
  const seen = new Set(report.findings.map((f) => `${f.nodeId}:${f.sc}`));
  /** mode key → that mode's mirror of the page, indexed by node id. */
  const mirrors = new Map<string, Map<string, NodeLite>>();

  for (const projection of projections) {
    if (!touchesModeColors(page, projection.colors)) continue;
    const mirrorPage = projectTree(page, projection);
    mirrors.set(projection.key, indexById(mirrorPage));
    const mirrorRoots = rootIds.has(page.id) ? [mirrorPage] : findInTree(mirrorPage, rootIds);
    if (mirrorRoots.length === 0) continue;

    for (const finding of scanNodes(mirrorRoots, settings).findings) {
      if (!MODE_SENSITIVE_SCS.has(finding.sc)) continue;
      const key = `${finding.nodeId}:${finding.sc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      report.findings.push({
        ...finding,
        mode: projection.label,
        detail: `In ${projection.label}: ${finding.detail}`,
      });
    }
  }

  attachBackgroundsPerMode(report, page, mirrors);

  if (skipped > 0) {
    report.notChecked = [
      ...report.notChecked,
      `${skipped} further variable mode${skipped === 1 ? '' : 's'} — not swept (scan-time limit)`,
    ];
  }
}

/** The backgrounds a colour finding is measured against, in one mode's tree. */
function backgroundsFor(finding: Finding, node: NodeLite): RGBA[] | null {
  if (finding.sc === '1.4.3') {
    const resolved = resolveTextColors(node);
    return resolved.ok ? [...resolved.bgs] : null;
  }
  const backdrop = resolveBackdrop(node);
  return backdrop.ok ? [...backdrop.bgs] : null;
}

/**
 * Record each colour finding's background in EVERY mode, so the fix engine can
 * pick a token that clears all of them at once instead of repairing the theme
 * on screen and breaking the other one (which the ModeGuard would then reject,
 * costing the user a click and an error).
 *
 * `''` keys the mode actually on screen.
 */
function attachBackgroundsPerMode(
  report: ScanReport,
  page: NodeLite,
  mirrors: ReadonlyMap<string, Map<string, NodeLite>>
): void {
  if (mirrors.size === 0) return;
  const live = indexById(page);

  for (const finding of report.findings) {
    if (!MODE_SENSITIVE_SCS.has(finding.sc) || !finding.fg) continue;
    const byMode: Record<string, RGBA[]> = {};

    const liveNode = live.get(finding.nodeId);
    if (liveNode) {
      const bgs = backgroundsFor(finding, liveNode);
      if (bgs) byMode[''] = bgs;
    }
    for (const [key, index] of mirrors) {
      const node = index.get(finding.nodeId);
      if (!node) continue;
      const bgs = backgroundsFor(finding, node);
      if (bgs) byMode[key] = bgs;
    }
    // One context is what planFix already assumes — only store real extra work.
    if (Object.keys(byMode).length > 1) finding.bgByMode = byMode;
  }
}

/**
 * Build the cross-mode guard for a fix (see apply.ts ModeGuard).
 *
 * Only the branch around the node is projected — its top-level frame, plus a
 * shallow page mirror as the parent so a variable-bound page background is
 * still measured in the right mode. Projecting the whole page per fix would
 * cost a full tree walk on every card of a batch.
 *
 * Returns undefined when the file has no other modes, so unthemed files pay
 * nothing for this.
 */
async function buildModeGuard(settings: Settings): Promise<ModeGuard | undefined> {
  const currentModes = new Map<string, string>(
    Object.entries((figma.currentPage as unknown as { explicitVariableModes?: Record<string, string> })
      .explicitVariableModes ?? {})
  );
  const { projections } = await buildModeProjections(figmaTokenSource(), currentModes);
  if (projections.length === 0) return undefined;

  return (node, paintTarget) => {
    const root = findExportRoot(node);
    for (const projection of projections) {
      const parent = root.parent ? projectShallow(root.parent, projection) : null;
      const mirror = findInTree(projectTree(root, projection, parent), new Set([node.id]))[0];
      if (!mirror) continue;
      if (paintTarget === 'text-fill') {
        const verdict = classifyTextNode(mirror, settings);
        // Only a certain failure blocks: an unresolvable backdrop in another
        // mode is not evidence the fix is wrong (F8 applies to us too).
        if (verdict.kind === 'finding' && verdict.finding.tier === 'violation') {
          return `Fix reverted — it would leave this text at ${verdict.finding.ratio?.toFixed(2)}:1 in ${projection.label}`;
        }
      } else {
        const measured = measureNonText(mirror, paintTarget);
        if (measured && measured.max < NON_TEXT_RATIO) {
          return `Fix reverted — it would leave this element at ${measured.min.toFixed(2)}:1 in ${projection.label}`;
        }
      }
    }
    return null;
  };
}

async function scan(payload: { scope: 'selection' | 'page'; settings: Settings }): Promise<ScanReport> {
  await watchCanvasChanges();
  const roots =
    payload.scope === 'selection'
      ? (figma.currentPage.selection as unknown as NodeLite[])
      : ([figma.currentPage] as unknown as NodeLite[]);
  if (payload.scope === 'selection' && roots.length === 0) {
    throw new Error('Nothing selected — select frames or layers to scan');
  }
  const report = scanNodes(roots, payload.settings);
  await sweepModes(roots, report, payload.settings);
  report.findings.sort(byTier);
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
  /**
   * The token index the UI plans fixes with. On a themed file each token also
   * carries its per-mode value, so a candidate is judged by what it will
   * actually be in every theme (NF1) rather than by the one on screen.
   */
  tokens: async () => {
    const api = figmaTokenSource();
    const index = await harvestTokens(api);
    const currentModes = new Map<string, string>(
      Object.entries((figma.currentPage as unknown as { explicitVariableModes?: Record<string, string> })
        .explicitVariableModes ?? {})
    );
    const { projections } = await buildModeProjections(api, currentModes);
    return { ...index, tokens: attachModeColors(index.tokens, projections) };
  },
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
      payload.sc,
      await buildModeGuard(payload.settings)
    );
    markSelfEdit();
    figma.commitUndo();
    return applied;
  },
  'apply-batch': async (payload: {
    fixes: { nodeId: string; instruction: FixInstruction; before: string; target: string; sc: string }[];
    settings: Settings;
  }) => {
    const guard = await buildModeGuard(payload.settings);
    markSelfEdit();
    return applyBatch(payload.fixes, payload.settings, guard);
  },
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
  /** Record alt text / decorative flag in sharedPluginData (1.1.1). */
  'set-alt-text': async (payload: { nodeId: string; altText?: string; decorative?: boolean }) => {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node || !('setSharedPluginData' in node)) throw new Error('Node not found');
    const scene = node as SceneNode;
    if (payload.decorative) {
      scene.setSharedPluginData(ALT_NS, DECORATIVE_KEY, 'true');
      scene.setSharedPluginData(ALT_NS, ALT_KEY, '');
    } else {
      const alt = (payload.altText ?? '').trim();
      const verdict = validateAltText(alt); // B7: same gate as the AI path — no garbage passes
      if (!verdict.ok) throw new Error(verdict.error);
      scene.setSharedPluginData(ALT_NS, ALT_KEY, alt);
      scene.setSharedPluginData(ALT_NS, DECORATIVE_KEY, '');
    }
    markSelfEdit();
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
    // B6: a background swap is invisible on the card that triggered it, so the
    // record has to say which colour actually became which.
    const prevTop = prevFills[prevFills.length - 1];
    const prevHex =
      prevTop && prevTop.type === 'SOLID' ? rgbaToHex({ ...prevTop.color, a: 1 }) : null;
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
      markSelfEdit();
      figma.commitUndo();
      return {
        nodeId: text.id,
        nodeName: text.name,
        sc: '1.4.3',
        before: payload.before,
        after: `${verdict.ratio.toFixed(2)}:1`,
        target: payload.target,
        changeDescription: `background "${owner.name}" → ${payload.token.name}${
          prevHex ? ` (${prevHex} → ${rgbaToHex(payload.token.color)})` : ''
        }`,
      };
    } catch (e) {
      mutable.fills = prevFills;
      throw e;
    }
  },
  /** The UI iframe cannot navigate, so outbound links round-trip through here. */
  'open-url': (payload: { url: string }) => {
    if (!/^https:\/\//.test(payload.url)) throw new Error('Only https links can be opened');
    figma.openExternal(payload.url);
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
  /**
   * `clientStorage` exists only on the main thread, so the licence token has to
   * round-trip through RPC. Stored as an object — a bare string would lose the
   * expiry the UI checks before every call.
   */
  'get-auth-token': async (): Promise<unknown> =>
    (await figma.clientStorage.getAsync(AUTH_TOKEN_KEY)) ?? null,
  'set-auth-token': (payload: StoredToken) => figma.clientStorage.setAsync(AUTH_TOKEN_KEY, payload),
  'clear-auth-token': () => figma.clientStorage.deleteAsync(AUTH_TOKEN_KEY),
};

const route = createRpcServer(handlers, (msg) => figma.ui.postMessage(msg));
figma.ui.onmessage = (msg: unknown) => route(msg);
