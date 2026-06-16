"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Eraser, Pen, Highlighter, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n";

// ponytail: minimal HTML canvas drawing tool. 3 brushes (pen, marker,
// eraser), 6 colors, 3 sizes, clear. State lives in the canvas itself;
// we emit a data URL on every stroke end + on clear.

const COLORS = [
  { id: "ink", value: "#1a1a18", label: "Negro" },
  { id: "red", value: "#dc2626", label: "Rojo" },
  { id: "orange", value: "#ea580c", label: "Naranja" },
  { id: "yellow", value: "#ca8a04", label: "Amarillo" },
  { id: "green", value: "#16a34a", label: "Verde" },
  { id: "blue", value: "#2563eb", label: "Azul" },
  { id: "purple", value: "#7c3aed", label: "Violeta" },
];

const SIZES = [2, 5, 10];

type Tool = "pen" | "marker" | "eraser";

export function DrawingCanvas({
  value,
  onChange,
  width = 800,
  height = 480,
  className,
}: {
  value?: string;
  onChange: (dataUrl: string) => void;
  width?: number;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const loadedRef = useRef(false);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(3);
  const { t } = useT();

  // Load saved drawing on mount (only once).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loadedRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Always fill with white so PNG export has a background.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
    loadedRef.current = true;
  }, [value]);

  const getPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) * canvas.width) / rect.width,
        y: ((e.clientY - rect.top) * canvas.height) / rect.height,
      };
    },
    []
  );

  const flush = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = size * 4;
    } else if (tool === "marker") {
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 3;
    } else {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    lastPoint.current = p;
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    flush();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    flush();
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-bg-secondary border border-line rounded-md">
        <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} title={t("draw.pen")}>
          <Pen className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={tool === "marker"} onClick={() => setTool("marker")} title={t("draw.marker")}>
          <Highlighter className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")} title={t("draw.eraser")}>
          <Eraser className="w-3.5 h-3.5" />
        </ToolButton>
        <div className="w-px h-5 bg-line mx-0.5" />
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { setColor(c.value); setTool("pen"); }}
            title={c.label}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-transform",
              color === c.value && tool !== "eraser"
                ? "border-ink-primary scale-110"
                : "border-transparent hover:scale-110"
            )}
            style={{ background: c.value }}
          />
        ))}
        <div className="w-px h-5 bg-line mx-0.5" />
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            title={t("draw.size", { n: s })}
            className={cn(
              "rounded-full bg-ink-primary",
              size === s && "ring-2 ring-teal ring-offset-1"
            )}
            style={{ width: s + 4, height: s + 4 }}
          />
        ))}
        <div className="ml-auto" />
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-[10px] text-ink-tertiary hover:text-red px-1.5 py-1"
          title={t("draw.clearAll")}
        >
          <Trash2 className="w-3 h-3" /> {t("draw.clear")}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full max-w-full bg-white border border-line rounded-md touch-none cursor-crosshair"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{ aspectRatio: `${width} / ${height}` }}
      />
    </div>
  );
}

function ToolButton({
  active, onClick, title, children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "w-7 h-7 rounded grid place-items-center transition-colors",
        active ? "bg-purple-light text-purple-dark" : "text-ink-tertiary hover:text-ink-primary hover:bg-bg-primary"
      )}
    >
      {children}
    </button>
  );
}
