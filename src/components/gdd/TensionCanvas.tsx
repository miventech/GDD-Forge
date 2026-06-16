"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { curvePath, screenToData } from "@/lib/tension-curve";
import type { TensionData, TensionPoint, TensionTheme } from "@/lib/segment-types";
import { useT } from "@/lib/i18n";

// ponytail: 2D chart editor. Click empty area to add a beat, drag a beat
// to move it. Per-beat: color override + glyph icon. Chart theme: line/fill
// bg/text colors. All edits update `data` in place; caller persists.

const VIEW_W = 100;
const VIEW_H = 100;
const AXIS_LEFT = 8;
const AXIS_BOTTOM = 92;
const AXIS_RIGHT = 96;
const AXIS_TOP = 6;

// ponytail: tiny curated palettes. Plenty of variety, easy to scan.
function getTensionColorOptions(t: (k: string) => string) {
  return [
    { value: "#0d9488", label: t("tension.color.teal") },
    { value: "#2563eb", label: t("tension.color.blue") },
    { value: "#7c3aed", label: t("tension.color.violet") },
    { value: "#dc2626", label: t("tension.color.red") },
    { value: "#ea580c", label: t("tension.color.orange") },
    { value: "#ca8a04", label: t("tension.color.yellow") },
    { value: "#16a34a", label: t("tension.color.green") },
    { value: "#db2777", label: t("tension.color.pink") },
    { value: "#475569", label: t("tension.color.gray") },
    { value: "#0f172a", label: t("tension.color.black") },
  ];
}

function getTensionIconOptions(t: (k: string) => string) {
  return [
    { value: "",       label: t("tension.icon.none"),   glyph: "" },
    { value: "heart",  label: t("tension.icon.heart"),  glyph: "♥" },
    { value: "star",   label: t("tension.icon.star"),   glyph: "★" },
    { value: "sword",  label: t("tension.icon.sword"),  glyph: "⚔" },
    { value: "flag",   label: t("tension.icon.flag"),   glyph: "⚑" },
    { value: "spark",  label: t("tension.icon.spark"),  glyph: "✦" },
    { value: "skull",  label: t("tension.icon.skull"),  glyph: "☠" },
    { value: "bolt",   label: t("tension.icon.bolt"),   glyph: "⚡" },
    { value: "sun",    label: t("tension.icon.sun"),    glyph: "☀" },
    { value: "moon",   label: t("tension.icon.moon"),   glyph: "☾" },
    { value: "snow",   label: t("tension.icon.snow"),   glyph: "❄" },
    { value: "warn",   label: t("tension.icon.warn"),   glyph: "⚠" },
    { value: "crown",  label: t("tension.icon.crown"),  glyph: "♛" },
    { value: "target", label: t("tension.icon.target"), glyph: "◎" },
    { value: "anchor", label: t("tension.icon.anchor"), glyph: "⚓" },
    { value: "fire",   label: t("tension.icon.fire"),   glyph: "✸" },
    { value: "music",  label: t("tension.icon.music"),  glyph: "♪" },
    { value: "drop",   label: t("tension.icon.drop"),   glyph: "◆" },
  ];
}

function getIconGlyph(value: string | undefined): string {
  if (!value) return "";
  const opt = ICON_OPTIONS.find((o) => o.value === value);
  return opt?.glyph ?? value;
}

function getDefaultTheme(): TensionTheme {
  return { lineColor: "#0d9488", fillColor: "#0d9488", bgColor: "#fafaf8", textColor: "#27272a" };
}

// ponytail: glyph-only constant. Labels are localized inside the component.
// The server-side export uses its own ICON_GLYPHS (tension-export.ts) and
// doesn't depend on the labels.
const ICON_OPTIONS: { value: string; label: string; glyph: string }[] = [
  { value: "",       label: "", glyph: "" },
  { value: "heart",  label: "", glyph: "♥" },
  { value: "star",   label: "", glyph: "★" },
  { value: "sword",  label: "", glyph: "⚔" },
  { value: "flag",   label: "", glyph: "⚑" },
  { value: "spark",  label: "", glyph: "✦" },
  { value: "skull",  label: "", glyph: "☠" },
  { value: "bolt",   label: "", glyph: "⚡" },
  { value: "sun",    label: "", glyph: "☀" },
  { value: "moon",   label: "", glyph: "☾" },
  { value: "snow",   label: "", glyph: "❄" },
  { value: "warn",   label: "", glyph: "⚠" },
  { value: "crown",  label: "", glyph: "♛" },
  { value: "target", label: "", glyph: "◎" },
  { value: "anchor", label: "", glyph: "⚓" },
  { value: "fire",   label: "", glyph: "✸" },
  { value: "music",  label: "", glyph: "♪" },
  { value: "drop",   label: "", glyph: "◆" },
];

function mergeTheme(t?: Partial<TensionTheme>): TensionTheme {
  return { ...getDefaultTheme(), ...(t ?? {}) };
}

export function TensionCanvas({
  data,
  onChange,
  readOnly,
}: {
  data: TensionData;
  onChange: (next: TensionData) => void;
  readOnly?: boolean;
}) {
  const { t } = useT();
  const TENSION_COLOR_OPTIONS = getTensionColorOptions(t);
  const TENSION_ICON_OPTIONS = getTensionIconOptions(t);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const beats = data.beats;
  const theme = mergeTheme(data.theme);
  const sortedBeats = [...beats].sort((a, b) => a.x - b.x);
  const path = curvePath(beats);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const p = screenToData(svg, e.clientX, e.clientY);
      if (!p) return;
      const nx = Math.max(0, Math.min(100, p.x - drag.offsetX));
      const ny = Math.max(0, Math.min(100, p.y - drag.offsetY));
      onChange({
        ...data,
        beats: beats.map((b) => (b.id === drag.id ? { ...b, x: nx, y: ny } : b)),
      });
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, beats]);

  const handleSvgClick = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (readOnly) return;
      if ((e.target as Element).closest("[data-tension-beat]")) return;
      const svg = svgRef.current;
      if (!svg) return;
      const p = screenToData(svg, e.clientX, e.clientY);
      if (!p) return;
      const used = new Set(beats.map((b) => b.id));
      let i = 1;
      while (used.has(`p${i}`)) i++;
      const id = `p${i}`;
      onChange({
        ...data,
        beats: [...beats, { id, label: t("tension.beatDefault", { n: i }), x: p.x, y: p.y }],
      });
      setSelectedId(id);
    },
    [readOnly, beats, data, onChange]
  );

  const handleBeatPointerDown = useCallback(
    (e: React.PointerEvent, beat: TensionPoint) => {
      e.stopPropagation();
      if (readOnly) {
        setSelectedId(beat.id);
        return;
      }
      setSelectedId(beat.id);
      const svg = svgRef.current;
      if (!svg) return;
      const p = screenToData(svg, e.clientX, e.clientY);
      if (!p) return;
      setDrag({ id: beat.id, offsetX: p.x - beat.x, offsetY: p.y - beat.y });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [readOnly]
  );

  function updateBeat(id: string, patch: Partial<TensionPoint>) {
    onChange({ ...data, beats: beats.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  }

  function deleteBeat(id: string) {
    onChange({ ...data, beats: beats.filter((b) => b.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }

  function updateTheme(patch: Partial<TensionTheme>) {
    onChange({ ...data, theme: { ...theme, ...patch } });
  }

  const selected = beats.find((b) => b.id === selectedId) ?? null;

  // SVG IDs need to be unique per chart instance to avoid collisions when
  // multiple TensionCanvas are mounted (e.g., the read-only view inside the
  // editor, or several tension segments on the same page).
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;
  const gradId = `tension-fill-${uid}`;
  const gridId = `tension-grid-${uid}`;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative w-full rounded-lg overflow-hidden border border-line",
          !readOnly && "cursor-crosshair"
        )}
        style={{ aspectRatio: "3 / 2", background: theme.bgColor }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="w-full h-full block select-none"
          onPointerDown={handleSvgClick}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.fillColor} stopOpacity="0.32" />
              <stop offset="100%" stopColor={theme.fillColor} stopOpacity="0.04" />
            </linearGradient>
            <pattern id={gridId} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={theme.textColor} strokeOpacity="0.08" strokeWidth="0.2" />
            </pattern>
          </defs>

          {/* Grid background */}
          <rect x={AXIS_LEFT} y={AXIS_TOP} width={AXIS_RIGHT - AXIS_LEFT} height={AXIS_BOTTOM - AXIS_TOP} fill={`url(#${gridId})`} />

          {/* Axes */}
          {data.showAxes ? (
            <g>
              <line x1={AXIS_LEFT} y1={AXIS_TOP} x2={AXIS_LEFT} y2={AXIS_BOTTOM} stroke={theme.textColor} strokeOpacity="0.6" strokeWidth="0.4" strokeLinecap="round" />
              <line x1={AXIS_LEFT} y1={AXIS_BOTTOM} x2={AXIS_RIGHT} y2={AXIS_BOTTOM} stroke={theme.textColor} strokeOpacity="0.6" strokeWidth="0.4" strokeLinecap="round" />
              {[0.25, 0.5, 0.75].map((t) => (
                <g key={`tx${t}`}>
                  <line
                    x1={AXIS_LEFT + (AXIS_RIGHT - AXIS_LEFT) * t}
                    y1={AXIS_BOTTOM}
                    x2={AXIS_LEFT + (AXIS_RIGHT - AXIS_LEFT) * t}
                    y2={AXIS_BOTTOM + 1.5}
                    stroke={theme.textColor}
                    strokeOpacity="0.5"
                    strokeWidth="0.3"
                  />
                  <line
                    x1={AXIS_LEFT}
                    y1={AXIS_BOTTOM - (AXIS_BOTTOM - AXIS_TOP) * t}
                    x2={AXIS_LEFT - 1.5}
                    y2={AXIS_BOTTOM - (AXIS_BOTTOM - AXIS_TOP) * t}
                    stroke={theme.textColor}
                    strokeOpacity="0.5"
                    strokeWidth="0.3"
                  />
                </g>
              ))}
              <text
                x={(AXIS_LEFT + AXIS_RIGHT) / 2}
                y={AXIS_BOTTOM + 7}
                textAnchor="middle"
                fontSize="3"
                fill={theme.textColor}
                fontWeight="500"
                style={{ pointerEvents: "none" }}
              >
                {data.xAxisLabel || "X"}
              </text>
              <text
                x={AXIS_LEFT - 3}
                y={(AXIS_TOP + AXIS_BOTTOM) / 2}
                textAnchor="middle"
                fontSize="3"
                fill={theme.textColor}
                fontWeight="500"
                transform={`rotate(-90, ${AXIS_LEFT - 3}, ${(AXIS_TOP + AXIS_BOTTOM) / 2})`}
                style={{ pointerEvents: "none" }}
              >
                {data.yAxisLabel || "Y"}
              </text>
            </g>
          ) : null}

          {/* Area under curve */}
          {path && beats.length > 1 ? (
            <path
              d={`${path} L ${beats[beats.length - 1].x} ${AXIS_BOTTOM} L ${beats[0].x} ${AXIS_BOTTOM} Z`}
              fill={`url(#${gradId})`}
            />
          ) : null}

          {/* Curve */}
          {path ? (
            <path
              d={path}
              fill="none"
              stroke={theme.lineColor}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 1px 1px ${theme.textColor}33)` }}
            />
          ) : null}

          {/* Beats */}
          {sortedBeats.map((b) => {
            const cx = b.x;
            const cy = 100 - b.y;
            const beatColor = b.color || theme.lineColor;
            const isSelected = b.id === selectedId;
            const isHovered = b.id === hoverId && !readOnly;
            const r = isSelected ? 2.6 : isHovered ? 2.2 : 1.8;
            const glyph = getIconGlyph(b.icon);
            return (
              <g
                key={b.id}
                data-tension-beat
                onPointerDown={(e) => handleBeatPointerDown(e, b)}
                onPointerEnter={() => !readOnly && setHoverId(b.id)}
                onPointerLeave={() => setHoverId((h) => (h === b.id ? null : h))}
                style={{ cursor: readOnly ? "default" : "grab" }}
              >
                {isSelected ? (
                  <circle cx={cx} cy={cy} r={4.5} fill={`${beatColor}2a`} />
                ) : null}
                <circle cx={cx} cy={cy} r={r + 0.8} fill={theme.bgColor} />
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={beatColor}
                  stroke={theme.bgColor}
                  strokeWidth="0.5"
                />
                {/* Icon glyph above the dot */}
                {glyph ? (
                  <text
                    x={cx}
                    y={cy - 3.6}
                    textAnchor="middle"
                    fontSize="3.4"
                    fill={beatColor}
                    style={{ pointerEvents: "none", fontWeight: 600 }}
                  >
                    {glyph}
                  </text>
                ) : null}
                {/* Label below the dot */}
                {data.showLabels ? (
                  <text
                    x={cx}
                    y={cy + (glyph ? 7 : 4.5)}
                    textAnchor="middle"
                    fontSize="2.8"
                    fill={theme.textColor}
                    fontWeight="500"
                    style={{ pointerEvents: "none" }}
                  >
                    {b.label.length > 22 ? b.label.slice(0, 21) + "…" : b.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* Empty hint */}
          {beats.length === 0 ? (
            <g style={{ pointerEvents: "none" }}>
              <text x="50" y="48" textAnchor="middle" fontSize="3.5" fill={theme.textColor} fillOpacity="0.5">
                {readOnly ? t("tension.noData") : t("tension.addFirst")}
              </text>
              {!readOnly ? (
                <text x="50" y="55" textAnchor="middle" fontSize="2.5" fill={theme.textColor} fillOpacity="0.35">
                  {t("tension.afterAdd")}
                </text>
              ) : null}
            </g>
          ) : null}
        </svg>
        {!readOnly ? (
          <div
            className="absolute bottom-1.5 right-2 text-[9px] px-1.5 py-0.5 rounded pointer-events-none"
            style={{ color: theme.textColor, background: `${theme.bgColor}d0` }}
          >
            {t("tension.hint")}
          </div>
        ) : null}
      </div>

      {/* Bottom controls */}
      {!readOnly ? (
        <div className="space-y-2">
          {/* Theme colors */}
          <div className="rounded-md border border-line bg-bg-secondary/50 p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">
                {t("tension.colors")}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <ColorPicker
                label={t("tension.line")}
                value={theme.lineColor}
                onChange={(v) => updateTheme({ lineColor: v })}
                options={TENSION_COLOR_OPTIONS}
              />
              <ColorPicker
                label={t("tension.fill")}
                value={theme.fillColor}
                onChange={(v) => updateTheme({ fillColor: v })}
                options={TENSION_COLOR_OPTIONS}
              />
              <ColorPicker
                label={t("tension.bg")}
                value={theme.bgColor}
                onChange={(v) => updateTheme({ bgColor: v })}
                options={TENSION_COLOR_OPTIONS}
              />
              <ColorPicker
                label={t("tension.text")}
                value={theme.textColor}
                onChange={(v) => updateTheme({ textColor: v })}
                options={TENSION_COLOR_OPTIONS}
              />
            </div>
          </div>

          {/* Axis labels */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">
                {t("tension.xAxis")}
              </label>
              <input
                value={data.xAxisLabel}
                onChange={(e) => onChange({ ...data, xAxisLabel: e.target.value })}
                placeholder={t("tension.xAxisPlaceholder")}
                className="w-full h-8 text-xs px-2 border border-line rounded-md bg-bg-primary text-ink-primary focus:outline-none focus:border-teal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">
                {t("tension.yAxis")}
              </label>
              <input
                value={data.yAxisLabel}
                onChange={(e) => onChange({ ...data, yAxisLabel: e.target.value })}
                placeholder={t("tension.yAxisPlaceholder")}
                className="w-full h-8 text-xs px-2 border border-line rounded-md bg-bg-primary text-ink-primary focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          {/* Selected beat editor + toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div className="sm:col-span-2 space-y-1.5">
              {selected ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-ink-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded">
                      {selected.id}
                    </span>
                    <span className="text-[10px] text-ink-tertiary">
                      x {selected.x.toFixed(0)} · y {selected.y.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <select
                      value={selected.icon ?? ""}
                      onChange={(e) => updateBeat(selected.id, { icon: e.target.value || undefined })}
                      title={t("tension.icon")}
                      className="h-8 text-xs px-2 border border-line rounded-md bg-bg-primary text-ink-primary"
                    >
                      {TENSION_ICON_OPTIONS.map((opt) => (
                        <option key={opt.value || "none"} value={opt.value}>
                          {opt.glyph ? `${opt.glyph}  ${opt.label}` : opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={selected.label}
                      onChange={(e) => updateBeat(selected.id, { label: e.target.value })}
                      placeholder={t("tension.beatLabel")}
                      className="flex-1 min-w-[100px] h-8 text-xs px-2 border border-line rounded-md bg-bg-primary text-ink-primary focus:outline-none focus:border-teal"
                    />
                    <button
                      type="button"
                      onClick={() => deleteBeat(selected.id)}
                      className="h-8 px-2 inline-flex items-center gap-1 text-[11px] text-red hover:bg-red-light rounded-md border border-line"
                      title={t("tension.deleteBeat")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ColorPicker
                    label={t("tension.beatColor")}
                    value={selected.color ?? ""}
                    onChange={(v) => updateBeat(selected.id, { color: v || undefined })}
                    allowClear
                    options={TENSION_COLOR_OPTIONS}
                  />
                </>
              ) : (
                <p className="text-[11px] text-ink-tertiary italic">
                  {t("tension.beatHint")}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => onChange({ ...data, showLabels: !data.showLabels })}
                className={cn(
                  "h-7 px-2.5 rounded-md border transition-colors font-medium",
                  data.showLabels
                    ? "border-teal bg-teal-light/40 text-teal-dark"
                    : "border-line text-ink-tertiary hover:text-ink-primary"
                )}
              >
                {t("tension.labelsToggle")}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...data, showAxes: !data.showAxes })}
                className={cn(
                  "h-7 px-2.5 rounded-md border transition-colors font-medium",
                  data.showAxes
                    ? "border-teal bg-teal-light/40 text-teal-dark"
                    : "border-line text-ink-tertiary hover:text-ink-primary"
                )}
              >
                {t("tension.axesToggle")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
  allowClear,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowClear?: boolean;
  options: { value: string; label: string }[];
}) {
  const { t } = useT();
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <span
            className="w-3.5 h-3.5 rounded border border-line"
            style={{ background: value || "transparent" }}
            title={value || t("tension.emptyColor")}
          />
          {allowClear && value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[10px] text-ink-tertiary hover:text-red"
              title={t("tension.clearColor")}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            title={c.label}
            className={cn(
              "w-5 h-5 rounded border-2 transition-transform hover:scale-110",
              value === c.value ? "border-ink-primary" : "border-transparent"
            )}
            style={{ background: c.value }}
          />
        ))}
      </div>
    </div>
  );
}

export function TensionView({ d }: { d: TensionData }) {
  const theme = mergeTheme(d.theme);
  return (
    <div className="mb-7">
      {d.title ? (
        <header className="mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" style={{ color: theme.lineColor }} />
          <h3 className="text-base font-medium text-ink-primary">{d.title}</h3>
        </header>
      ) : null}
      <div className="rounded-lg overflow-hidden border border-line">
        <TensionCanvas data={d} onChange={() => {}} readOnly />
      </div>
      {d.beats.length > 0 ? (
        <ol className="mt-3 grid gap-1 text-[11px] text-ink-secondary">
          {d.beats.map((b, i) => {
            const glyph = getIconGlyph(b.icon);
            return (
              <li key={b.id} className="flex gap-2 items-center">
                <span className="text-ink-tertiary w-4 text-right tabular-nums">{i + 1}.</span>
                {glyph ? (
                  <span style={{ color: b.color || theme.lineColor, fontWeight: 600 }} className="w-4 text-center">
                    {glyph}
                  </span>
                ) : (
                  <span className="w-4" />
                )}
                <span className="font-medium text-ink-primary">{b.label}</span>
                <span className="text-ink-tertiary">— {d.yAxisLabel || "y"} {b.y.toFixed(0)}/100</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

// Helper exported for the server-side export to share the icon glyph table.
export { ICON_OPTIONS as _ICON_OPTIONS_FOR_EXPORT, getIconGlyph as _getIconGlyphForExport };
