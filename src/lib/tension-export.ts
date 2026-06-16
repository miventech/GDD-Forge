// ponytail: server-side renderer for TensionData. Mirrors the client
// TensionCanvas so the exported HTML/MD look the same.

import type { TensionPoint, TensionData, TensionTheme } from "./segment-types";

const flipY = (y: number) => 100 - y;
const AXIS_LEFT = 8;
const AXIS_BOTTOM = 92;
const AXIS_RIGHT = 96;
const AXIS_TOP = 6;

// Mirrors the client TENSION_ICON_OPTIONS in TensionCanvas.tsx.
const ICON_GLYPHS: Record<string, string> = {
  heart: "♥", star: "★", sword: "⚔", flag: "⚑", spark: "✦",
  skull: "☠", bolt: "⚡", sun: "☀", moon: "☾", snow: "❄",
  warn: "⚠", crown: "♛", target: "◎", anchor: "⚓", fire: "✸",
  music: "♪", drop: "◆",
};

function getGlyph(value: string | undefined): string {
  if (!value) return "";
  return ICON_GLYPHS[value] ?? "";
}

function escapeHtmlStatic(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const DEFAULT_THEME: TensionTheme = {
  lineColor: "#0d9488",
  fillColor: "#0d9488",
  bgColor: "#fafaf8",
  textColor: "#27272a",
};

function mergeTheme(t?: Partial<TensionTheme>): TensionTheme {
  return { ...DEFAULT_THEME, ...(t ?? {}) };
}

export function tensionCurvePath(beats: TensionPoint[]): string {
  const sorted = [...beats].sort((a, b) => a.x - b.x);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return `M ${sorted[0].x} ${flipY(sorted[0].y)}`;
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

export function tensionSvg(d: TensionData): string {
  const theme = mergeTheme(d.theme);
  const sorted = [...d.beats].sort((a, b) => a.x - b.x);
  if (sorted.length === 0) return "";
  const path = tensionCurvePath(sorted);

  const uid = Math.random().toString(36).slice(2, 8);
  const gradId = `tension-fill-exp-${uid}`;
  const gridId = `tension-grid-exp-${uid}`;

  const area = sorted.length > 1
    ? `<path d="${path} L ${sorted[sorted.length - 1].x} ${AXIS_BOTTOM} L ${sorted[0].x} ${AXIS_BOTTOM} Z" fill="url(#${gradId})"/>`
    : "";

  const ticks = d.showAxes
    ? [0.25, 0.5, 0.75]
        .map((t) => {
          const tx = AXIS_LEFT + (AXIS_RIGHT - AXIS_LEFT) * t;
          const ty = AXIS_BOTTOM - (AXIS_BOTTOM - AXIS_TOP) * t;
          return `<line x1="${tx}" y1="${AXIS_BOTTOM}" x2="${tx}" y2="${AXIS_BOTTOM + 1.5}" stroke="${theme.textColor}" stroke-opacity="0.5" stroke-width="0.3"/>` +
                 `<line x1="${AXIS_LEFT}" y1="${ty}" x2="${AXIS_LEFT - 1.5}" y2="${ty}" stroke="${theme.textColor}" stroke-opacity="0.5" stroke-width="0.3"/>`;
        })
        .join("")
    : "";

  const axes = d.showAxes
    ? `<line x1="${AXIS_LEFT}" y1="${AXIS_TOP}" x2="${AXIS_LEFT}" y2="${AXIS_BOTTOM}" stroke="${theme.textColor}" stroke-opacity="0.6" stroke-width="0.4" stroke-linecap="round"/>
       <line x1="${AXIS_LEFT}" y1="${AXIS_BOTTOM}" x2="${AXIS_RIGHT}" y2="${AXIS_BOTTOM}" stroke="${theme.textColor}" stroke-opacity="0.6" stroke-width="0.4" stroke-linecap="round"/>
       ${ticks}
       <text x="${(AXIS_LEFT + AXIS_RIGHT) / 2}" y="${AXIS_BOTTOM + 7}" text-anchor="middle" font-size="3" fill="${theme.textColor}" font-weight="500">${escapeHtmlStatic(d.xAxisLabel || "X")}</text>
       <text x="${AXIS_LEFT - 3}" y="${(AXIS_TOP + AXIS_BOTTOM) / 2}" text-anchor="middle" font-size="3" fill="${theme.textColor}" font-weight="500" transform="rotate(-90, ${AXIS_LEFT - 3}, ${(AXIS_TOP + AXIS_BOTTOM) / 2})">${escapeHtmlStatic(d.yAxisLabel || "Y")}</text>`
    : "";

  const grid = `<rect x="${AXIS_LEFT}" y="${AXIS_TOP}" width="${AXIS_RIGHT - AXIS_LEFT}" height="${AXIS_BOTTOM - AXIS_TOP}" fill="url(#${gridId})"/>`;

  const dots = sorted
    .map((b) => {
      const cx = b.x;
      const cy = flipY(b.y);
      const color = b.color || theme.lineColor;
      const glyph = getGlyph(b.icon);
      const hasGlyph = !!glyph;
      const labelOffset = hasGlyph ? 7 : 4.5;
      return `<circle cx="${cx}" cy="${cy}" r="2.6" fill="${theme.bgColor}"/>
              <circle cx="${cx}" cy="${cy}" r="2.2" fill="${color}" stroke="${theme.bgColor}" stroke-width="0.5"/>` +
        (hasGlyph
          ? `<text x="${cx}" y="${cy - 3.6}" text-anchor="middle" font-size="3.4" fill="${color}" font-weight="600">${escapeHtmlStatic(glyph)}</text>`
          : "") +
        (d.showLabels && b.label
          ? `<text x="${cx}" y="${cy + labelOffset}" text-anchor="middle" font-size="2.8" fill="${theme.textColor}" font-weight="500">${escapeHtmlStatic(b.label.length > 22 ? b.label.slice(0, 21) + "…" : b.label)}</text>`
          : "");
    })
    .join("");

  const defs = `<defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.fillColor}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${theme.fillColor}" stop-opacity="0.04"/>
    </linearGradient>
    <pattern id="${gridId}" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="${theme.textColor}" stroke-opacity="0.08" stroke-width="0.2"/>
    </pattern>
  </defs>`;

  return `<svg viewBox="0 0 100 100" style="width:100%;max-width:520px;display:block;margin:0 auto;background:${theme.bgColor}">${defs}${grid}${area}<path d="${path}" fill="none" stroke="${theme.lineColor}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>${axes}${dots}</svg>`;
}
