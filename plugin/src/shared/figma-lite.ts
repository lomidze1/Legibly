/**
 * Minimal structural view of Figma scene nodes.
 * Real Figma nodes satisfy these shapes at runtime; tests build plain-object
 * fixtures against the same interfaces, so the resolver/scanner logic is
 * testable without a live `figma` global (C1).
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface SolidPaintLite {
  type: 'SOLID';
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  color: RGB;
  boundVariables?: { color?: { id: string } };
}

export interface GradientStopLite {
  position: number;
  color: { r: number; g: number; b: number; a: number };
}

export interface OtherPaintLite {
  type: string; // GRADIENT_LINEAR | GRADIENT_RADIAL | ... | IMAGE | VIDEO
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  gradientStops?: readonly GradientStopLite[];
}

export type PaintLite = SolidPaintLite | OtherPaintLite;

export function isGradientPaint(p: PaintLite): p is OtherPaintLite {
  return p.type.startsWith('GRADIENT');
}

export function isSolidPaint(p: PaintLite): p is SolidPaintLite {
  return p.type === 'SOLID';
}

export interface RectLite {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Structural node. `fills` may be a unique symbol (figma.mixed) on text nodes
 * with mixed styling — we model that as the string sentinel check via
 * `isMixed` below, since figma.mixed is only available at runtime.
 */
export interface NodeLite {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  fills?: readonly PaintLite[] | unknown; // unknown covers figma.mixed
  parent?: NodeLite | null;
  children?: readonly NodeLite[];
  absoluteBoundingBox?: RectLite | null;
  // text-only
  fontSize?: number | unknown;
  fontWeight?: number | unknown;
  fontName?: { family: string; style: string } | unknown;
  characters?: string;
  // page-only
  backgrounds?: readonly PaintLite[];
}

/** True when a figma "mixed" sentinel (or any non-plain value) is present. */
export function isMixed(v: unknown): boolean {
  return typeof v === 'symbol';
}

export function isPaintArray(fills: unknown): fills is readonly PaintLite[] {
  return Array.isArray(fills);
}

/** a fully contains b */
export function contains(a: RectLite, b: RectLite): boolean {
  return (
    a.x <= b.x &&
    a.y <= b.y &&
    a.x + a.width >= b.x + b.width &&
    a.y + a.height >= b.y + b.height
  );
}

/** a and b overlap at all */
export function intersects(a: RectLite, b: RectLite): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}
