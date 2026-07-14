/**
 * v0.2 Phase C verify: pixel-true deep check — pure sampler verdicts and
 * export-root geometry. Pixels are ground truth; translucency refuses to guess.
 */
import { describe, expect, it } from 'vitest';
import { DEEP_CHECKABLE, deepVerdict, findExportRoot, regionInRoot } from '../src/shared/deep-check';
import { box, node, page, rgba, solid, text, WHITE } from './helpers';

/** Build RGBA8 image data w×h filled by a per-pixel function. */
function image(w: number, h: number, at: (x: number, y: number) => [number, number, number, number]): number[] {
  const data: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data.push(...at(x, y));
  }
  return data;
}

const BLACK_FG = rgba(0, 0, 0);

describe('deepVerdict', () => {
  it('all-white region under black text → pass with 21:1', () => {
    const data = image(20, 10, () => [255, 255, 255, 255]);
    const v = deepVerdict(data, 20, 10, BLACK_FG, 4.5);
    expect(v.kind).toBe('pass');
    expect(v.min).toBeCloseTo(21, 1);
  });

  it('all-dark region under black text → fail (best pixel below target)', () => {
    const data = image(20, 10, () => [40, 40, 40, 255]);
    const v = deepVerdict(data, 20, 10, BLACK_FG, 4.5);
    expect(v.kind).toBe('fail');
    expect(v.max!).toBeLessThan(4.5);
  });

  it('half white / half dark → mixed with an honest range', () => {
    const data = image(20, 10, (x) => (x < 10 ? [255, 255, 255, 255] : [40, 40, 40, 255]));
    const v = deepVerdict(data, 20, 10, BLACK_FG, 4.5);
    expect(v.kind).toBe('mixed');
    expect(v.min!).toBeLessThan(4.5);
    expect(v.max!).toBeGreaterThanOrEqual(4.5);
    expect(v.detail).toMatch(/vary/);
  });

  it('any translucent pixel → unresolved (refuse to guess)', () => {
    const data = image(4, 4, (x, y) => (x === 0 && y === 0 ? [255, 255, 255, 128] : [255, 255, 255, 255]));
    expect(deepVerdict(data, 4, 4, BLACK_FG, 4.5).kind).toBe('unresolved');
  });

  it('empty region → unresolved', () => {
    expect(deepVerdict([], 0, 0, BLACK_FG, 4.5).kind).toBe('unresolved');
  });

  it('translucent fg is composited over each pixel first', () => {
    // 50% black text over white pixels ≈ #808080 → 3.95:1, fails 4.5
    const data = image(8, 8, () => [255, 255, 255, 255]);
    const v = deepVerdict(data, 8, 8, rgba(0, 0, 0, 0.5), 4.5);
    expect(v.kind).toBe('fail');
  });

  it('large regions are sub-sampled but still catch both extremes', () => {
    const w = 400;
    const h = 100;
    const data = image(w, h, (x) => (x < w / 2 ? [255, 255, 255, 255] : [0, 0, 0, 255]));
    const v = deepVerdict(data, w, h, rgba(0.5, 0.5, 0.5), 4.5);
    expect(v.kind).toBe('mixed');
  });
});

describe('findExportRoot / regionInRoot', () => {
  it('finds the top-level frame and maps the region', () => {
    const t = text({ absoluteBoundingBox: box(30, 40, 100, 20) });
    const inner = node({
      type: 'FRAME',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(10, 10, 300, 200),
      children: [t],
    });
    const top = node({
      type: 'FRAME',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(0, 0, 400, 300),
      children: [inner],
    });
    page([top]);
    const root = findExportRoot(t);
    expect(root.id).toBe(top.id);
    expect(regionInRoot(t, root)).toEqual(box(30, 40, 100, 20));
  });

  it('throws when the text overflows its frame (unsafe mapping)', () => {
    const t = text({ absoluteBoundingBox: box(380, 40, 100, 20) }); // sticks out
    const top = node({
      type: 'FRAME',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(0, 0, 400, 300),
      children: [t],
    });
    page([top]);
    expect(() => findExportRoot(t)).toThrow('overflows');
  });

  it('throws for a page-level text with no frame', () => {
    const t = text({});
    page([t]);
    expect(() => findExportRoot(t)).toThrow('no parent frame');
  });
});

describe('DEEP_CHECKABLE', () => {
  it('covers backdrop-uncertainty reasons and excludes judgment/content ones', () => {
    expect(DEEP_CHECKABLE.has('image-fill')).toBe(true);
    expect(DEEP_CHECKABLE.has('gradient-range')).toBe(true);
    expect(DEEP_CHECKABLE.has('partial-overlap')).toBe(true);
    expect(DEEP_CHECKABLE.has('mixed-text-properties')).toBe(false);
    expect(DEEP_CHECKABLE.has('invisible-text')).toBe(false);
    expect(DEEP_CHECKABLE.has('line-height-floor')).toBe(false);
  });
});
