/**
 * APCA Lc — advisory readout ONLY, never a gate (F9; detection research §4).
 * Implements the public APCA-W3 0.0.98G-4g constants.
 * https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html
 */
import type { RGBA } from './types';
import { compositeOver } from './contrast';

const SA98G = {
  exp: 2.4,
  rCo: 0.2126729,
  gCo: 0.7151522,
  bCo: 0.072175,
  blkThrs: 0.022,
  blkClmp: 1.414,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWOffset: 0.027,
  loWoBOffset: 0.027,
  loClip: 0.1,
  deltaYMin: 0.0005,
} as const;

function screenLuminance(c: RGBA): number {
  const lin = (v: number) => Math.pow(v, SA98G.exp);
  return SA98G.rCo * lin(c.r) + SA98G.gCo * lin(c.g) + SA98G.bCo * lin(c.b);
}

function softClamp(y: number): number {
  return y >= SA98G.blkThrs ? y : y + Math.pow(SA98G.blkThrs - y, SA98G.blkClmp);
}

/**
 * APCA lightness contrast Lc. Positive = dark text on light bg, negative = reverse.
 * Both colors must be opaque; translucent fg is composited over bg first.
 */
export function apcaLc(fg: RGBA, bg: RGBA): number {
  const effFg = fg.a < 1 ? compositeOver(fg, { ...bg, a: 1 }) : fg;
  const yTxt = softClamp(screenLuminance(effFg));
  const yBg = softClamp(screenLuminance(bg));
  if (Math.abs(yBg - yTxt) < SA98G.deltaYMin) return 0;

  let sapc: number;
  if (yBg > yTxt) {
    sapc = (Math.pow(yBg, SA98G.normBG) - Math.pow(yTxt, SA98G.normTXT)) * SA98G.scaleBoW;
    if (sapc < SA98G.loClip) return 0;
    return (sapc - SA98G.loBoWOffset) * 100;
  }
  sapc = (Math.pow(yBg, SA98G.revBG) - Math.pow(yTxt, SA98G.revTXT)) * SA98G.scaleWoB;
  if (sapc > -SA98G.loClip) return 0;
  return (sapc + SA98G.loWoBOffset) * 100;
}
