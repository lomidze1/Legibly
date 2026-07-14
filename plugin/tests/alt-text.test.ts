/**
 * v0.3 verify: SC 1.1.1 alt-text presence check — deterministic presence,
 * always needsReview (quality is judgment), decorative marker honored.
 */
import { describe, expect, it } from 'vitest';
import { checkAltText, hasImageFill, MIN_IMAGE_SIZE, readAltData } from '../src/shared/alt-text';
import type { NodeLite } from '../src/shared/figma-lite';
import { box, node } from './helpers';

function imageNode(over: Partial<NodeLite> = {}, data: Record<string, string> = {}): NodeLite {
  return node({
    type: 'RECTANGLE',
    name: 'hero-photo',
    fills: [{ type: 'IMAGE' }],
    absoluteBoundingBox: box(0, 0, 200, 120),
    getSharedPluginData: (ns: string, key: string) => (ns === 'legibly' ? (data[key] ?? '') : ''),
    ...over,
  });
}

describe('hasImageFill', () => {
  it('true for a visible image fill', () => {
    expect(hasImageFill(imageNode())).toBe(true);
  });
  it('false for solid fills and hidden image fills', () => {
    expect(hasImageFill(node({ type: 'RECTANGLE', fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] }))).toBe(false);
    expect(hasImageFill(imageNode({ fills: [{ type: 'IMAGE', visible: false }] }))).toBe(false);
  });
});

describe('checkAltText', () => {
  it('image without recorded alt → needsReview missing-alt', () => {
    const r = checkAltText(imageNode());
    expect(r).not.toBeNull();
    expect(r).not.toBe('pass');
    const f = r as Exclude<typeof r, 'pass' | null>;
    expect(f.tier).toBe('needsReview');
    expect(f.sc).toBe('1.1.1');
    expect(f.reason).toBe('missing-alt');
  });

  it('recorded alt text → pass', () => {
    expect(checkAltText(imageNode({}, { altText: 'Team photo at the 2026 offsite' }))).toBe('pass');
  });

  it('decorative marker → pass', () => {
    expect(checkAltText(imageNode({}, { altDecorative: 'true' }))).toBe('pass');
  });

  it('whitespace-only alt does NOT count as recorded', () => {
    const r = checkAltText(imageNode({}, { altText: '   ' }));
    expect(r).not.toBe('pass');
  });

  it(`tiny images (< ${MIN_IMAGE_SIZE}px) are skipped as noise`, () => {
    expect(checkAltText(imageNode({ absoluteBoundingBox: box(0, 0, 16, 16) }))).toBeNull();
  });

  it('non-image nodes are skipped', () => {
    expect(checkAltText(node({ type: 'RECTANGLE', fills: [] }))).toBeNull();
  });
});

describe('readAltData', () => {
  it('reads and trims stored values', () => {
    expect(readAltData(imageNode({}, { altText: '  hi  ' }))).toEqual({ alt: 'hi', decorative: false });
  });
  it('tolerates nodes without plugin-data access', () => {
    expect(readAltData(node({ type: 'RECTANGLE' }))).toEqual({ alt: '', decorative: false });
  });
});
