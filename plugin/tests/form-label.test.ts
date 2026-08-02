/**
 * Wave 3 verify: SC 2.4.6 label presence — a field with no attached label is
 * flagged, placeholder text inside it does not count, and the pairing rule
 * stays tight enough that a distant caption is not mistaken for a label.
 */
import { describe, expect, it } from 'vitest';
import { checkFormLabels, collectFields, isAttachedLabel, LABEL_SC } from '../src/shared/form-label';
import { box, node, page, text } from './helpers';

const field = (over: Record<string, unknown> = {}) =>
  node({ type: 'FRAME', name: 'Email input', absoluteBoundingBox: box(0, 40, 200, 40), ...over });

describe('collectFields', () => {
  it('picks up name-hinted containers', () => {
    const names = ['Email input', 'search-bar', 'Dropdown', 'password field', 'Combo box'];
    for (const name of names) {
      const f = node({ type: 'FRAME', name, absoluteBoundingBox: box(0, 0, 100, 40) });
      expect(collectFields([page([f])])).toHaveLength(1);
    }
  });

  it('ignores plain frames and text layers named like fields', () => {
    const plain = node({ type: 'FRAME', name: 'Card', absoluteBoundingBox: box(0, 0, 100, 40) });
    const label = text({ name: 'input label', absoluteBoundingBox: box(0, 0, 50, 12) });
    expect(collectFields([page([plain, label])])).toHaveLength(0);
  });

  it('does not descend into a field it already collected', () => {
    const inner = node({ type: 'FRAME', name: 'input-inner', absoluteBoundingBox: box(4, 44, 190, 32) });
    const outer = field({ children: [inner] });
    expect(collectFields([page([outer])])).toHaveLength(1);
  });
});

describe('isAttachedLabel — the pairing rule', () => {
  const target = box(100, 100, 200, 40);

  it('accepts a label directly above', () => {
    expect(isAttachedLabel(box(100, 80, 60, 14), target)).toBe(true);
  });

  it('accepts a label directly to the left', () => {
    expect(isAttachedLabel(box(20, 108, 60, 14), target)).toBe(true);
  });

  it('rejects a label too far above to be attached', () => {
    expect(isAttachedLabel(box(100, 20, 60, 14), target)).toBe(false);
  });

  it('rejects a label that does not line up on either axis', () => {
    expect(isAttachedLabel(box(600, 20, 60, 14), target)).toBe(false);
  });
});

describe('checkFormLabels', () => {
  it('flags a field whose only text is inside it', () => {
    const placeholder = text({ name: 'placeholder', absoluteBoundingBox: box(8, 50, 80, 16) });
    const input = field({ children: [placeholder] });
    page([node({ type: 'FRAME', name: 'Form', children: [input], absoluteBoundingBox: box(0, 0, 300, 200) })]);
    const findings = checkFormLabels([input.parent!]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.sc).toBe(LABEL_SC);
    expect(findings[0]!.tier).toBe('needsReview');
    expect(findings[0]!.reason).toBe('no-visible-label');
    expect(findings[0]!.detail).toContain('placeholder disappears');
  });

  it('stays quiet when a label sits above the field', () => {
    const label = text({ name: 'Email', absoluteBoundingBox: box(0, 20, 60, 14) });
    const input = field();
    const form = node({
      type: 'FRAME',
      name: 'Form',
      children: [label, input],
      absoluteBoundingBox: box(0, 0, 300, 200),
    });
    page([form]);
    expect(checkFormLabels([form])).toHaveLength(0);
  });

  it('finds a label one container further up', () => {
    const label = text({ name: 'Email', absoluteBoundingBox: box(0, 20, 60, 14) });
    const input = field();
    const wrapper = node({ type: 'FRAME', name: 'Row', children: [input], absoluteBoundingBox: box(0, 40, 200, 40) });
    const form = node({
      type: 'FRAME',
      name: 'Form',
      children: [label, wrapper],
      absoluteBoundingBox: box(0, 0, 300, 200),
    });
    page([form]);
    expect(checkFormLabels([form])).toHaveLength(0);
  });

  it('never emits a violation — field detection is a naming guess', () => {
    const input = field();
    page([node({ type: 'FRAME', name: 'Form', children: [input], absoluteBoundingBox: box(0, 0, 300, 200) })]);
    expect(checkFormLabels([input.parent!]).every((f) => f.tier === 'needsReview')).toBe(true);
  });

  it('skips hidden fields', () => {
    const input = field({ visible: false });
    page([node({ type: 'FRAME', name: 'Form', children: [input], absoluteBoundingBox: box(0, 0, 300, 200) })]);
    expect(checkFormLabels([input.parent!])).toHaveLength(0);
  });
});
