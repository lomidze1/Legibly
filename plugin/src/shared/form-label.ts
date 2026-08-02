/**
 * Visible field labels — WCAG 2.2 SC 2.4.6 Headings and Labels (AA), presence only.
 *
 * The failure: a field labelled only by its placeholder. The moment someone
 * types, the label is gone — and it was never available to a screen reader in
 * the first place. Voice-control users have nothing to say, either.
 *
 * Honesty (detection research §1, the 2.4.6 row): Figma has no form semantics,
 * so "is this an input?" is a naming guess and "is this label descriptive?" is
 * judgement. We check only the mechanical part — is there ANY text next to it —
 * and always report needsReview, never a hard fail.
 */
import type { Finding } from './types';
import { NodeLite, RectLite, contains } from './figma-lite';

export const LABEL_SC = '2.4.6';

export const FIELD_HINT =
  /\b(input|field|textbox|text[-_ ]?field|textarea|select|dropdown|combo ?box|search[-_ ]?(box|bar|field))\b/i;

/**
 * How far a label may sit from its field and still read as attached. Beyond
 * this the pairing is a guess, and a wrong pairing is worse than silence.
 */
const LABEL_GAP_PX = 40;
/** Nearest-common-container search depth — a label lives with its field. */
const ANCESTOR_LEVELS = 2;

function isRendered(n: NodeLite): boolean {
  return n.visible !== false && (typeof n.opacity !== 'number' || n.opacity > 0);
}

interface Field {
  node: NodeLite;
  box: RectLite;
}

/** Name-hinted, rendered containers that look like form fields. */
export function collectFields(roots: readonly NodeLite[]): Field[] {
  const out: Field[] = [];
  const walk = (n: NodeLite): void => {
    if (!isRendered(n)) return;
    if (n.type !== 'TEXT' && FIELD_HINT.test(n.name) && n.absoluteBoundingBox) {
      out.push({ node: n, box: n.absoluteBoundingBox });
      return; // nested inputs inside an input are the same control
    }
    if (n.children) for (const c of n.children) walk(c);
  };
  for (const r of roots) walk(r);
  return out;
}

function textsUnder(root: NodeLite, out: NodeLite[]): void {
  if (!isRendered(root)) return;
  if (root.type === 'TEXT' && root.characters && root.characters.trim().length > 0) out.push(root);
  if (root.children) for (const c of root.children) textsUnder(c, out);
}

const overlapsX = (a: RectLite, b: RectLite): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width;
const overlapsY = (a: RectLite, b: RectLite): boolean =>
  a.y < b.y + b.height && b.y < a.y + a.height;

/** A label sits directly above the field, or directly to its left. */
export function isAttachedLabel(label: RectLite, field: RectLite): boolean {
  const above =
    overlapsX(label, field) &&
    label.y + label.height <= field.y + 4 &&
    field.y - (label.y + label.height) <= LABEL_GAP_PX;
  const left =
    overlapsY(label, field) &&
    label.x + label.width <= field.x + 4 &&
    field.x - (label.x + label.width) <= LABEL_GAP_PX;
  return above || left;
}

/** Text painted inside the field is a placeholder, not a label. */
function hasInnerText(field: Field): boolean {
  const inner: NodeLite[] = [];
  if (field.node.children) for (const c of field.node.children) textsUnder(c, inner);
  return inner.length > 0;
}

export function checkFormLabels(roots: readonly NodeLite[]): Finding[] {
  const fields = collectFields(roots);
  const findings: Finding[] = [];

  for (const field of fields) {
    let labelled = false;
    let scope: NodeLite | null | undefined = field.node.parent;
    for (let level = 0; level < ANCESTOR_LEVELS && scope && !labelled; level++) {
      const candidates: NodeLite[] = [];
      textsUnder(scope, candidates);
      labelled = candidates.some((t) => {
        const box = t.absoluteBoundingBox;
        if (!box) return false;
        if (contains(field.box, box)) return false; // inside the field = placeholder
        return isAttachedLabel(box, field.box);
      });
      scope = scope.parent;
    }
    if (labelled) continue;

    findings.push({
      nodeId: field.node.id,
      nodeName: field.node.name,
      tier: 'needsReview',
      sc: LABEL_SC,
      reason: 'no-visible-label',
      detail: hasInnerText(field)
        ? 'Looks like a field whose only text sits inside it — a placeholder disappears as soon as someone types'
        : 'Looks like a field with no visible label above or beside it',
    });
  }
  return findings;
}
