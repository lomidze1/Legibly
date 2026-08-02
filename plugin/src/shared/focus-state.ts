/**
 * Focus state capability — WCAG 2.2 SC 2.4.7 Focus Visible (AA).
 *
 * A static file cannot show focus happening, so the real criterion is
 * undecidable here (detection research §2.3). What IS decidable is whether the
 * design system has a focus state at all: a component set that defines Hover
 * and Pressed but no Focus is a keyboard user's dead end, and it is the reason
 * focus rings get invented ad hoc in code — or not at all.
 *
 * Scope: only component sets that already carry a state axis. A set varying by
 * size or icon alone says nothing about interaction, and flagging it would be
 * noise. Always needsReview — capability, never conformance.
 */
import type { Finding } from './types';
import { NodeLite } from './figma-lite';

export const FOCUS_SC = '2.4.7';

/** Values that mark a variant axis as describing interaction state. */
const STATE_VALUES = /^(hover|hovered|press(ed)?|active|focus(ed|-visible)?|disabled|selected|default|rest(ing)?)$/i;
const FOCUS_VALUE = /focus/i;

function isRendered(n: NodeLite): boolean {
  return n.visible !== false && (typeof n.opacity !== 'number' || n.opacity > 0);
}

/**
 * Figma encodes variants in the child component's name:
 * `"State=Hover, Size=Large"`. Returns property → values.
 */
export function parseVariantAxes(childNames: readonly string[]): Map<string, Set<string>> {
  const axes = new Map<string, Set<string>>();
  for (const name of childNames) {
    for (const pair of name.split(',')) {
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      const key = pair.slice(0, eq).trim().toLowerCase();
      const value = pair.slice(eq + 1).trim();
      if (!key || !value) continue;
      if (!axes.has(key)) axes.set(key, new Set());
      axes.get(key)!.add(value);
    }
  }
  return axes;
}

/** The axis whose values look like interaction states, if any. */
function stateAxis(axes: Map<string, Set<string>>): Set<string> | null {
  for (const values of axes.values()) {
    const stateLike = [...values].filter((v) => STATE_VALUES.test(v)).length;
    // Majority of the axis must read as states — "Type=Default|Danger" must not
    // qualify off the back of one matching word.
    if (values.size > 1 && stateLike * 2 > values.size) return values;
  }
  return null;
}

export function checkFocusStates(roots: readonly NodeLite[]): Finding[] {
  const findings: Finding[] = [];
  const walk = (n: NodeLite): void => {
    if (!isRendered(n)) return;
    if (n.type === 'COMPONENT_SET') {
      const finding = checkComponentSet(n);
      if (finding) findings.push(finding);
      return; // variants live inside; nothing deeper to judge
    }
    if (n.children) for (const c of n.children) walk(c);
  };
  for (const r of roots) walk(r);
  return findings;
}

export function checkComponentSet(set: NodeLite): Finding | null {
  if (!set.children || set.children.length === 0) return null;
  const axes = parseVariantAxes(set.children.map((c) => c.name));
  const states = stateAxis(axes);
  if (!states) return null;
  if ([...states].some((v) => FOCUS_VALUE.test(v))) return null;

  const listed = [...states].slice(0, 3).join(', ');
  return {
    nodeId: set.id,
    nodeName: set.name,
    tier: 'needsReview',
    sc: FOCUS_SC,
    reason: 'no-focus-state',
    detail: `Defines interaction states (${listed}) but no focus state — keyboard users get no visible indicator`,
  };
}
