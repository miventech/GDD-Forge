// ponytail: Catmull-Rom-to-cubic-Bezier conversion for a smooth curve
// through N points. Endpoints are mirrored (P[-1] = P[0], P[n] = P[n-1]).

import type { TensionPoint } from "./segment-types";

// Curve is drawn in a 0..100 viewBox where y is inverted (SVG y goes down,
// data y goes up).
const flipY = (y: number) => 100 - y;

export function curvePath(beats: TensionPoint[]): string {
  const sorted = [...beats].sort((a, b) => a.x - b.x);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) {
    return `M ${sorted[0].x} ${flipY(sorted[0].y)}`;
  }
  if (sorted.length === 2) {
    return `M ${sorted[0].x} ${flipY(sorted[0].y)} L ${sorted[1].x} ${flipY(sorted[1].y)}`;
  }
  let path = `M ${sorted[0].x} ${flipY(sorted[0].y)}`;
  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[i - 1] ?? sorted[i];
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    const p3 = sorted[i + 2] ?? sorted[i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = flipY(p1.y + (p2.y - p0.y) / 6);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = flipY(p2.y - (p3.y - p1.y) / 6);
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${flipY(p2.y).toFixed(2)}`;
  }
  return path;
}

// Convert a screen-space point (clientX, clientY) into the SVG's viewBox
// coordinate system (0..100 × 0..100, y flipped to data orientation).
export function screenToData(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const t = pt.matrixTransform(ctm.inverse());
  return {
    x: Math.max(0, Math.min(100, t.x)),
    y: Math.max(0, Math.min(100, 100 - t.y)),
  };
}
