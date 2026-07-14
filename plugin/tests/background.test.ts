/**
 * Phase 3 verify: effective-background resolver (F6 — the moat).
 * Correct bg on solid/opacity/fill-stack fixtures; anything ambiguous
 * degrades to a needs-review reason, never a guessed color (F8).
 */
import { describe, expect, it } from 'vitest';
import { resolveTextColors } from '../src/shared/background';
import { BLACK, WHITE, box, node, page, solid, text, withParents } from './helpers';

const BLUE = { r: 0, g: 0, b: 1 };
const RED = { r: 1, g: 0, b: 0 };

describe('resolveTextColors — happy paths', () => {
  it('text directly on a solid frame', () => {
    const t = text({});
    page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 200, 100), children: [t] })]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bg).toEqual({ ...WHITE, a: 1 });
      expect(r.fg).toEqual({ ...BLACK, a: 1 });
    }
  });

  it('frame without fill falls through to the page background', () => {
    const t = text({});
    page([node({ type: 'FRAME', fills: [], absoluteBoundingBox: box(0, 0, 200, 100), children: [t] })], [solid(RED)]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...RED, a: 1 });
  });

  it('semi-transparent frame fill composites over the page bg', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        fills: [solid(BLACK, { opacity: 0.5 })],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg.r).toBeCloseTo(0.5, 6);
  });

  it('fill stack composites bottom-to-top (blue below, 50% white above → light blue)', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        fills: [solid(BLUE), solid(WHITE, { opacity: 0.5 })],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bg.b).toBeCloseTo(1, 6);
      expect(r.bg.r).toBeCloseTo(0.5, 6);
    }
  });

  it('a covering sibling card wins over the frame fill (z-order)', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20) });
    const card = node({
      type: 'RECTANGLE',
      fills: [solid(BLUE)],
      absoluteBoundingBox: box(10, 10, 100, 50),
    });
    // children back-to-front: card renders behind text
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [card, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...BLUE, a: 1 });
  });

  it('siblings ABOVE the text (higher z) do not affect its background', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20) });
    const overlay = node({
      type: 'RECTANGLE',
      fills: [solid(RED)],
      absoluteBoundingBox: box(0, 0, 200, 100),
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t, overlay], // overlay is in front of the text
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...WHITE, a: 1 });
  });

  it('invisible covering sibling is ignored', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20) });
    const hidden = node({
      type: 'RECTANGLE',
      visible: false,
      fills: [solid(BLUE)],
      absoluteBoundingBox: box(0, 0, 200, 100),
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [hidden, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...WHITE, a: 1 });
  });

  it('translucent sibling composites over deeper layers', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20) });
    const veil = node({
      type: 'RECTANGLE',
      fills: [solid(WHITE, { opacity: 0.5 })],
      absoluteBoundingBox: box(0, 0, 200, 100),
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(BLACK)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [veil, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg.r).toBeCloseTo(0.5, 6);
  });

  it('node opacity multiplies the fill alpha (card at 50% node opacity)', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20) });
    const card = node({
      type: 'RECTANGLE',
      opacity: 0.5,
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(0, 0, 200, 100),
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(BLACK)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [card, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg.r).toBeCloseTo(0.5, 6);
  });

  it('ancestor group opacity folds into both fg and bg', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20), fills: [solid(WHITE)] });
    const inner = node({
      type: 'FRAME',
      opacity: 0.5,
      fills: [solid(BLACK)],
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [t],
    });
    page([inner]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bg.r).toBeCloseTo(0.5, 6); // black@0.5 over white page
      expect(r.fg.a).toBeCloseTo(0.5, 6); // text alpha reduced by the group
    }
  });

  it('multiple visible solid text fills composite into one fg', () => {
    const t = text({
      fills: [solid(BLACK), solid(WHITE, { opacity: 0.5 })],
    });
    page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 200, 100), children: [t] })]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.fg.r).toBeCloseTo(0.5, 6);
  });

  it('transparent wrapper frames are ignored — the imported-website case', () => {
    // html-import tools generate stacks of no-fill wrapper frames that
    // overlap everything; they must not poison the verdict.
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20) });
    const wrapper = node({
      type: 'FRAME',
      name: 'div.container',
      fills: [],
      absoluteBoundingBox: box(10, 15, 50, 40), // partial overlap, but paints nothing
      children: [],
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [wrapper, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...WHITE, a: 1 });
  });

  it('resolves THROUGH a no-fill wrapper to its painting child (recursion)', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20), fills: [solid(WHITE)] });
    const card = node({
      type: 'RECTANGLE',
      fills: [solid(BLUE)],
      absoluteBoundingBox: box(10, 10, 100, 50),
    });
    const wrapper = node({
      type: 'FRAME',
      name: 'div.hero',
      fills: [],
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [card],
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [wrapper, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...BLUE, a: 1 });
  });

  it('covering container: child card wins over the container own fill (z-order)', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20), fills: [solid(WHITE)] });
    const card = node({
      type: 'RECTANGLE',
      fills: [solid(RED)],
      absoluteBoundingBox: box(15, 15, 80, 40),
    });
    const section = node({
      type: 'FRAME',
      fills: [solid(BLUE)],
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [card],
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [section, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...RED, a: 1 });
  });

  it('image deep inside a covering wrapper still degrades to image-fill', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20) });
    const img = node({
      type: 'RECTANGLE',
      fills: [{ type: 'IMAGE' }],
      absoluteBoundingBox: box(0, 0, 200, 100),
    });
    const wrapper = node({
      type: 'FRAME',
      name: 'div.tile-image-wrapper',
      fills: [],
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [img],
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [wrapper, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('image-fill');
  });

  it('deeply nested transparent wrappers resolve to the real painted bg', () => {
    const t = text({ absoluteBoundingBox: box(40, 40, 40, 10), fills: [solid(WHITE)] });
    const deepBg = node({
      type: 'RECTANGLE',
      fills: [solid(BLACK)],
      absoluteBoundingBox: box(0, 0, 200, 100),
    });
    let inner = node({
      type: 'FRAME',
      fills: [],
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [deepBg],
    });
    for (let i = 0; i < 4; i++) {
      inner = node({
        type: 'FRAME',
        name: `div.wrap-${i}`,
        fills: [],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [inner],
      });
    }
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [inner, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...BLACK, a: 1 });
  });

  it('invisible paints in the stack are skipped', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE), solid(RED, { visible: false })],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toEqual({ ...WHITE, a: 1 });
  });
});

describe('resolveTextColors — gradient sampling', () => {
  const grad = (from: { r: number; g: number; b: number }, to: { r: number; g: number; b: number }) => ({
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { ...from, a: 1 } },
      { position: 1, color: { ...to, a: 1 } },
    ],
  });

  it('resolves a gradient into multiple samples covering both ends', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        fills: [grad(WHITE, BLACK)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bgs.length).toBeGreaterThan(10);
      const reds = r.bgs.map((b) => b.r);
      expect(Math.max(...reds)).toBeCloseTo(1, 4); // white end present
      expect(Math.min(...reds)).toBeCloseTo(0, 4); // black end present
      expect(r.bgs.every((b) => b.a === 1)).toBe(true);
    }
  });

  it('semi-transparent gradient composites each sample over the backdrop', () => {
    const t = text({});
    const halfGrad = {
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { position: 0, color: { r: 0, g: 0, b: 0, a: 0.5 } },
        { position: 1, color: { r: 0, g: 0, b: 0, a: 0.5 } },
      ],
    };
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE), halfGrad],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 50% black over white everywhere → all samples mid-gray
      for (const b of r.bgs) expect(b.r).toBeCloseTo(0.5, 4);
    }
  });

  it('two stacked gradients → honest gradient-fill needs-review', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        fills: [grad(WHITE, BLACK), { ...grad(BLACK, WHITE), opacity: 0.5 }],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('gradient-fill');
  });
});

describe('resolveTextColors — honest degradation (zero-false-positive contract, F8)', () => {
  it('gradient fill behind text → gradient-fill', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        fills: [{ type: 'GRADIENT_LINEAR' }],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('gradient-fill');
  });

  it('image fill behind text → image-fill', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        fills: [{ type: 'IMAGE' }],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('image-fill');
  });

  it('non-normal blend mode on a bg paint → blend-mode', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE, { blendMode: 'MULTIPLY' })],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('blend-mode');
  });

  it('non-normal blend mode on an ancestor node → blend-mode', () => {
    const t = text({});
    page([
      node({
        type: 'FRAME',
        blendMode: 'OVERLAY',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('blend-mode');
  });

  it('partially overlapping sibling → partial-overlap (text may span two bgs)', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 100, 20) });
    const half = node({
      type: 'RECTANGLE',
      fills: [solid(BLUE)],
      absoluteBoundingBox: box(0, 0, 60, 100), // covers only the left part
    });
    page([
      node({
        type: 'FRAME',
        fills: [solid(WHITE)],
        absoluteBoundingBox: box(0, 0, 200, 100),
        children: [half, t],
      }),
    ]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('partial-overlap');
  });

  it('painted child that only PARTIALLY covers the text → partial-overlap', () => {
    const t = text({ absoluteBoundingBox: box(20, 20, 60, 20) });
    const child = node({
      type: 'RECTANGLE',
      fills: [solid(RED)],
      absoluteBoundingBox: box(15, 15, 30, 40), // covers only the left edge
    });
    const group = node({
      type: 'FRAME',
      fills: [solid(BLUE)],
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [child],
    });
    const root = node({
      type: 'FRAME',
      fills: [solid(WHITE)],
      absoluteBoundingBox: box(0, 0, 200, 100),
      children: [group, t],
    });
    page([root]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('partial-overlap');
  });

  it('gradient text fill → non-solid-text-fill', () => {
    const t = text({ fills: [{ type: 'GRADIENT_LINEAR' }] });
    page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 200, 100), children: [t] })]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('non-solid-text-fill');
  });

  it('mixed text fills (figma.mixed symbol) → mixed-text-properties', () => {
    const t = text({ fills: Symbol('mixed') as unknown as never });
    page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 200, 100), children: [t] })]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('mixed-text-properties');
  });

  it('text with no fills → no-text-fill (skipped, not flagged)', () => {
    const t = text({ fills: [] });
    page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 200, 100), children: [t] })]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no-text-fill');
  });

  it('background never becomes opaque and no page bg → unresolved-background', () => {
    const t = text({});
    const p = node({
      type: 'PAGE',
      backgrounds: [],
      children: [
        node({
          type: 'FRAME',
          fills: [solid(WHITE, { opacity: 0.5 })],
          absoluteBoundingBox: box(0, 0, 200, 100),
          children: [t],
        }),
      ],
    });
    withParents(p);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unresolved-background');
  });

  it('non-solid page background → unresolved-background', () => {
    const t = text({});
    page(
      [node({ type: 'FRAME', fills: [], absoluteBoundingBox: box(0, 0, 200, 100), children: [t] })],
      [{ type: 'IMAGE' }]
    );
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unresolved-background');
  });

  it('text without a bounding box → unresolved-background', () => {
    const t = text({ absoluteBoundingBox: null });
    page([node({ type: 'FRAME', fills: [solid(WHITE)], absoluteBoundingBox: box(0, 0, 200, 100), children: [t] })]);
    const r = resolveTextColors(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unresolved-background');
  });
});
