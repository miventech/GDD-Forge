"use client";
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

// =====================================================
// 2D node canvas — drag nodes to move, drag from a port
// to create a connection. Supports zoom (Ctrl+scroll) and
// pan (scroll, or drag empty area). Used by loop and
// dialogue editors.
// =====================================================

export const NODE_W = 200;
export const NODE_H = 76;
export const WORLD_W = 4000;
export const WORLD_H = 4000;

export type PositionedNode = {
  id: string;
  x: number;
  y: number;
};

export type Port = { x: number; y: number };

// 8 connection points per node: N, NE, E, SE, S, SW, W, NW
export const PORT_IDS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
export type PortId = (typeof PORT_IDS)[number];

export function getPortPos(node: { x: number; y: number }, portId: PortId): Port {
  const w = NODE_W, h = NODE_H;
  const cx = node.x + w / 2;
  const cy = node.y + h / 2;
  switch (portId) {
    case "n":  return { x: cx, y: node.y };
    case "ne": return { x: node.x + w, y: node.y };
    case "e":  return { x: node.x + w, y: cy };
    case "se": return { x: node.x + w, y: node.y + h };
    case "s":  return { x: cx, y: node.y + h };
    case "sw": return { x: node.x, y: node.y + h };
    case "w":  return { x: node.x, y: cy };
    case "nw": return { x: node.x, y: node.y };
  }
}

// The closest port on a node to a given world point.
export function closestPortId(node: { x: number; y: number }, target: { x: number; y: number }): PortId {
  let best: PortId = "e";
  let bestD = Infinity;
  for (const id of PORT_IDS) {
    const p = getPortPos(node, id);
    const dx = p.x - target.x;
    const dy = p.y - target.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

export type Shape = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: "purple" | "teal" | "coral" | "amber";
  label?: string;
};

type View = { panX: number; panY: number; zoom: number };
type DragState =
  | { kind: "node"; id: string; offsetX: number; offsetY: number }
  | { kind: "port"; fromId: string; fromPort: PortId; fromX: number; fromY: number; cursorX: number; cursorY: number; hoveredId: string | null; hoveredPort: PortId | null }
  | { kind: "shape-move"; id: string; offsetX: number; offsetY: number }
  | { kind: "shape-resize"; id: string; corner: "nw" | "ne" | "sw" | "se"; startX: number; startY: number; startW: number; startH: number; originX: number; originY: number }
  | null;

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;

export function NodeCanvas<T extends PositionedNode>({
  nodes,
  edges,
  renderNode,
  onMoveNode,
  onConnect,
  onDeleteEdge,
  onSelectNode,
  onDeleteNode,
  selectedNodeId,
  startNodeId,
  readOnly,
  className,
  portPosition = "right",
  emptyHint,
  shapes,
  onMoveShape,
  onResizeShape,
  onDeleteShape,
  selectedShapeId,
  onSelectShape,
}: {
  nodes: T[];
  edges: { from: string; to: string; fromPort?: PortId; toPort?: PortId; label?: string }[];
  renderNode: (node: T, opts: { isStart: boolean; isSelected: boolean }) => ReactNode;
  onMoveNode?: (id: string, x: number, y: number) => void;
  onConnect?: (fromId: string, toId: string, fromPort?: PortId, toPort?: PortId) => void;
  onDeleteEdge?: (edgeIndex: number) => void;
  onSelectNode?: (id: string | null) => void;
  onDeleteNode?: (id: string) => void;
  selectedNodeId?: string | null;
  startNodeId?: string | null;
  readOnly?: boolean;
  className?: string;
  portPosition?: "right" | "bottom";
  emptyHint?: string;
  shapes?: Shape[];
  onMoveShape?: (id: string, x: number, y: number) => void;
  onResizeShape?: (id: string, x: number, y: number, w: number, h: number) => void;
  onDeleteShape?: (id: string) => void;
  selectedShapeId?: string | null;
  onSelectShape?: (id: string | null) => void;
}) {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [view, setView] = useState<View>({ panX: 0, panY: 0, zoom: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Convert a screen-relative-to-container point to world coords.
  const toWorld = useCallback((sx: number, sy: number, v: View) => {
    return { x: (sx - v.panX) / v.zoom, y: (sy - v.panY) / v.zoom };
  }, []);

  // Anchor a zoom operation on a screen point so the point stays under the cursor.
  const zoomAt = useCallback((newZoom: number, screenX: number, screenY: number) => {
    const v = viewRef.current;
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    const w = toWorld(screenX, screenY, v);
    setView({
      zoom: z,
      panX: screenX - w.x * z,
      panY: screenY - w.y * z,
    });
  }, [toWorld]);

  // Zoom centered on the container.
  const zoomCentered = useCallback((newZoom: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      setView((v) => ({ ...v, zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom)) }));
      return;
    }
    zoomAt(newZoom, rect.width / 2, rect.height / 2);
  }, [zoomAt]);

  const resetView = useCallback(() => {
    setView({ panX: 0, panY: 0, zoom: 1 });
  }, []);

  const fitView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || nodes.length === 0) {
      setView({ panX: 0, panY: 0, zoom: 1 });
      return;
    }
    const pad = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
      if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
    }
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(rect.width / (w + pad * 2), rect.height / (h + pad * 2))));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({
      zoom: z,
      panX: rect.width / 2 - cx * z,
      panY: rect.height / 2 - cy * z,
    });
  }, [nodes]);

  // Wheel: Ctrl/Meta = zoom (anchored at cursor); plain = pan.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomAt(viewRef.current.zoom * factor, mx, my);
      } else {
        setView((v) => ({ ...v, panX: v.panX - e.deltaX, panY: v.panY - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Pan via drag on empty area (anything that isn't a node/port/edge).
  // Works in both edit and read-only — read-only just disables node/edge editing.
  const onContainerPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-node-id]") ||
      target.closest("[data-port]") ||
      target.closest("[data-no-drag]") ||
      target.closest("[data-edge]")
    ) {
      return;
    }
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startView = { ...viewRef.current };
    let didDrag = false;
    setIsPanning(true);
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
      setView({ ...startView, panX: startView.panX + dx, panY: startView.panY + dy });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setIsPanning(false);
      if (!didDrag) onSelectNode?.(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [readOnly, onSelectNode]);

  const onNodePointerDown = useCallback(
    (e: React.PointerEvent, n: T) => {
      if (readOnly) return;
      if ((e.target as HTMLElement).closest("[data-port]")) return;
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current!.getBoundingClientRect();
      const v = viewRef.current;
      const nodeScreenX = n.x * v.zoom + v.panX;
      const nodeScreenY = n.y * v.zoom + v.panY;
      setDrag({
        kind: "node",
        id: n.id,
        offsetX: e.clientX - rect.left - nodeScreenX,
        offsetY: e.clientY - rect.top - nodeScreenY,
      });
      onSelectNode?.(n.id);
    },
    [readOnly, onSelectNode]
  );

  const onPortPointerDown = useCallback(
    (e: React.PointerEvent, n: T, portId: PortId) => {
      if (readOnly) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current!.getBoundingClientRect();
      const v = viewRef.current;
      const port = getPortPos(n, portId);
      const startWorld = toWorld(e.clientX - rect.left, e.clientY - rect.top, v);
      setDrag({
        kind: "port",
        fromId: n.id,
        fromPort: portId,
        fromX: port.x,
        fromY: port.y,
        cursorX: startWorld.x,
        cursorY: startWorld.y,
        hoveredId: null,
        hoveredPort: null,
      });
    },
    [readOnly, toWorld]
  );

  // Global move/up handlers for active drags.
  useEffect(() => {
    if (!drag) return;
    const d = drag;
    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const v = viewRef.current;
      if (d.kind === "node") {
        const sx = e.clientX - rect.left - d.offsetX;
        const sy = e.clientY - rect.top - d.offsetY;
        const x = (sx - v.panX) / v.zoom;
        const y = (sy - v.panY) / v.zoom;
        onMoveNode?.(d.id, x, y);
      } else if (d.kind === "shape-move") {
        const sx = e.clientX - rect.left - d.offsetX;
        const sy = e.clientY - rect.top - d.offsetY;
        const x = (sx - v.panX) / v.zoom;
        const y = (sy - v.panY) / v.zoom;
        onMoveShape?.(d.id, x, y);
      } else if (d.kind === "shape-resize") {
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const dxw = (sx - v.panX) / v.zoom - d.originX;
        const dyw = (sy - v.panY) / v.zoom - d.originY;
        let nx = d.startX, ny = d.startY, nw = d.startW, nh = d.startH;
        if (d.corner === "se") { nw = Math.max(40, d.startW + dxw); nh = Math.max(40, d.startH + dyw); }
        if (d.corner === "sw") { nw = Math.max(40, d.startW - dxw); nh = Math.max(40, d.startH + dyw); nx = d.startX + (d.startW - nw); }
        if (d.corner === "ne") { nw = Math.max(40, d.startW + dxw); nh = Math.max(40, d.startH - dyw); ny = d.startY + (d.startH - nh); }
        if (d.corner === "nw") { nw = Math.max(40, d.startW - dxw); nh = Math.max(40, d.startH - dyw); nx = d.startX + (d.startW - nw); ny = d.startY + (d.startH - nh); }
        onResizeShape?.(d.id, nx, ny, nw, nh);
      } else {
        const w = toWorld(e.clientX - rect.left, e.clientY - rect.top, v);
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const nodeEl = el?.closest("[data-node-id]") as HTMLElement | null;
        const portEl = el?.closest("[data-port-id]") as HTMLElement | null;
        const hoveredId = nodeEl?.getAttribute("data-node-id") || null;
        const hoveredPort = (portEl?.getAttribute("data-port-id") as PortId) || null;
        setDrag({ ...d, cursorX: w.x, cursorY: w.y, hoveredId, hoveredPort });
      }
    };
    const onUp = () => {
      if (d.kind === "port" && d.hoveredId && d.hoveredId !== d.fromId) {
        // Pick the target port: prefer the one the user is hovering, else closest.
        const targetNode = nodes.find((n) => n.id === d.hoveredId);
        const targetPort: PortId = d.hoveredPort ?? (targetNode ? closestPortId(targetNode, { x: d.cursorX, y: d.cursorY }) : "e");
        onConnect?.(d.fromId, d.hoveredId, d.fromPort, targetPort);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, onMoveNode, onConnect, toWorld, nodes, onMoveShape, onResizeShape]);

  return (
    <div
      ref={containerRef}
      data-canvas
      className={cn(
        "relative overflow-hidden bg-bg-secondary border border-line rounded-lg select-none",
        isPanning ? "cursor-grabbing" : "cursor-grab",
        className
      )}
      onPointerDown={onContainerPointerDown}
    >
      {/* World content layer — everything here is in world coords and gets transformed. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: WORLD_W,
          height: WORLD_H,
          transformOrigin: "0 0",
          transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
          pointerEvents: "none", // children re-enable
        }}
      >
        <svg width={WORLD_W} height={WORLD_H} className="absolute top-0 left-0" style={{ overflow: "visible", pointerEvents: "none" }}>
          <defs>
            <pattern id="canvas-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="var(--line, rgba(0,0,0,0.08))" />
            </pattern>
            <marker id="canvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-tertiary, #9a9a96)" />
            </marker>
          </defs>
          <rect width={WORLD_W} height={WORLD_H} fill="url(#canvas-dots)" />

          {/* Shapes (groups) — rendered behind nodes */}
          {(shapes ?? []).map((s) => {
            const isSel = s.id === selectedShapeId;
            const fill = `var(--${s.color}-light, rgba(124,58,237,0.08))`;
            const stroke = `var(--${s.color}-mid, #7c3aed)`;
            return (
              <g
                key={s.id}
                onPointerDown={(ev) => {
                  if (readOnly) return;
                  ev.stopPropagation();
                  onSelectShape?.(s.id);
                  const r = containerRef.current!.getBoundingClientRect();
                  const v = viewRef.current;
                  setDrag({
                    kind: "shape-move",
                    id: s.id,
                    offsetX: ev.clientX - r.left - (s.x * v.zoom + v.panX),
                    offsetY: ev.clientY - r.top - (s.y * v.zoom + v.panY),
                  });
                }}
                style={{ pointerEvents: "auto", cursor: readOnly ? "default" : "move" }}
              >
                <rect
                  x={s.x} y={s.y} width={s.w} height={s.h}
                  rx={10} ry={10}
                  fill={fill} stroke={stroke}
                  strokeWidth={isSel ? 2 / view.zoom : 1 / view.zoom}
                  strokeDasharray={isSel ? undefined : `${4 / view.zoom} ${3 / view.zoom}`}
                />
                {s.label ? (
                  <text x={s.x + 8} y={s.y + 16 / view.zoom + 12} fontSize={11} fill={`var(--${s.color}-dark, #5b21b6)`} fontWeight="600">
                    {s.label}
                  </text>
                ) : null}
                {/* Resize handles — only when selected */}
                {isSel && !readOnly ? (
                  <>
                    {(["nw", "ne", "sw", "se"] as const).map((c) => {
                      const cx = c.includes("w") ? s.x : s.x + s.w;
                      const cy = c.includes("n") ? s.y : s.y + s.h;
                      return (
                        <rect
                          key={c}
                          x={cx - 4 / view.zoom} y={cy - 4 / view.zoom}
                          width={8 / view.zoom} height={8 / view.zoom}
                          fill="var(--bg-primary, #fff)" stroke={stroke} strokeWidth={1.5 / view.zoom}
                          style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            const r = containerRef.current!.getBoundingClientRect();
                            const v = viewRef.current;
                            const originX = (ev.clientX - r.left - v.panX) / v.zoom;
                            const originY = (ev.clientY - r.top - v.panY) / v.zoom;
                            setDrag({ kind: "shape-resize", id: s.id, corner: c, startX: s.x, startY: s.y, startW: s.w, startH: s.h, originX, originY });
                          }}
                        />
                      );
                    })}
                    {/* Delete button */}
                    <g
                      onPointerDown={(ev) => { ev.stopPropagation(); onDeleteShape?.(s.id); }}
                      style={{ cursor: "pointer", pointerEvents: "auto" }}
                    >
                      <circle cx={s.x + s.w} cy={s.y} r={8 / view.zoom} fill="var(--red, #dc2626)" />
                      <text x={s.x + s.w} y={s.y + 3 / view.zoom} fontSize={12} fill="#fff" textAnchor="middle" fontWeight="700">×</text>
                    </g>
                  </>
                ) : null}
              </g>
            );
          })}

          {/* Edges */}
          {edges.map((e, i) => {
            const a = nodes.find((n) => n.id === e.from);
            const b = nodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            const ap = getPortPos(a, e.fromPort ?? closestPortId(a, b));
            const bp = getPortPos(b, e.toPort ?? closestPortId(b, a));
            const isLoop = e.label?.toLowerCase() === "loop";
            const dx = Math.max(40, Math.abs(bp.x - ap.x) / 2);
            const path = `M ${ap.x} ${ap.y} C ${ap.x + dx} ${ap.y} ${bp.x - dx} ${bp.y} ${bp.x} ${bp.y}`;
            return (
              <g key={i} data-edge={i} style={{ pointerEvents: "auto", cursor: readOnly ? "default" : "pointer" }} onClick={(ev) => {
                ev.stopPropagation();
                if (!readOnly && confirm(t("node.deleteEdgeConfirm"))) onDeleteEdge?.(i);
              }}>
                <path d={path} fill="none" stroke="transparent" strokeWidth="12" />
                <path
                  d={path}
                  fill="none"
                  stroke={isLoop ? "var(--teal-mid, #1d9e75)" : "var(--ink-tertiary, #9a9a96)"}
                  strokeWidth={isLoop ? 2 : 1.4}
                  strokeDasharray={isLoop ? "4 3" : undefined}
                  markerEnd="url(#canvas-arrow)"
                />
                {e.label && !isLoop ? (
                  <text x={(ap.x + bp.x) / 2} y={(ap.y + bp.y) / 2 - 6} fontSize="9" fill="var(--ink-tertiary, #9a9a96)" textAnchor="middle">
                    {e.label.length > 22 ? e.label.slice(0, 21) + "…" : e.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {/* Active drag line */}
          {drag?.kind === "port" ? (
            <line
              x1={drag.fromX} y1={drag.fromY}
              x2={drag.cursorX} y2={drag.cursorY}
              stroke={drag.hoveredId && drag.hoveredId !== drag.fromId ? "var(--teal-mid, #1d9e75)" : "var(--ink-tertiary, #9a9a96)"}
              strokeWidth={2 / view.zoom}
              strokeDasharray={`${4 / view.zoom} ${3 / view.zoom}`}
            />
          ) : null}
        </svg>

        {/* Nodes (in world coords) */}
        {nodes.map((n) => {
          const isStart = n.id === startNodeId;
          const isSelected = n.id === selectedNodeId;
          const showPorts = !readOnly && (isSelected || hoveredNodeId === n.id || drag?.kind === "port");
          return (
            <div
              key={n.id}
              data-node-id={n.id}
              onPointerDown={(e) => onNodePointerDown(e, n)}
              onPointerEnter={() => !readOnly && setHoveredNodeId(n.id)}
              onPointerLeave={() => setHoveredNodeId((id) => (id === n.id ? null : id))}
              className={cn(
                "absolute",
                !readOnly && "cursor-grab active:cursor-grabbing",
                isSelected && "ring-2 ring-teal ring-offset-1 ring-offset-bg-secondary rounded-lg"
              )}
              style={{
                left: n.x,
                top: n.y,
                width: NODE_W,
                height: NODE_H,
                pointerEvents: "auto",
              }}
            >
              {renderNode(n, { isStart, isSelected })}
              {/* 8 connection points — visible on hover/select/during port drag */}
              {!readOnly && showPorts ? (
                <>
                  {PORT_IDS.map((pid) => {
                    const p = getPortPos(n, pid);
                    const dx = p.x - n.x;
                    const dy = p.y - n.y;
                    const isCorner = pid.length === 2;
                    return (
                      <div
                        key={pid}
                        data-port
                        data-port-id={pid}
                        onPointerDown={(e) => onPortPointerDown(e, n, pid)}
                        className={cn(
                          "absolute w-3 h-3 rounded-full bg-bg-primary border-2 border-teal cursor-crosshair hover:scale-150 z-10",
                          isCorner && "w-2.5 h-2.5"
                        )}
                        style={{
                          left: dx,
                          top: dy,
                          transform: "translate(-50%, -50%)",
                          pointerEvents: "auto",
                        }}
                        title={t("node.connectFrom", { port: pid })}
                      />
                    );
                  })}
                </>
              ) : null}
              {!readOnly && onDeleteNode ? (
                <button
                  data-no-drag
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t("node.deleteConfirm"))) onDeleteNode(n.id);
                  }}
                  className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-bg-primary border border-line text-ink-tertiary hover:text-red hover:border-red text-[10px] grid place-items-center z-10"
                  style={{ pointerEvents: "auto" }}
                  title={t("node.deleteNode")}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {nodes.length === 0 && emptyHint ? (
        <div className="absolute inset-0 grid place-items-center text-xs text-ink-tertiary pointer-events-none">
          {emptyHint}
        </div>
      ) : null}

      {/* Zoom controls (top-left) */}
      <div
        className="absolute top-2 left-2 flex items-center gap-0.5 bg-bg-primary/90 backdrop-blur border border-line rounded-md p-0.5 text-[11px] z-20"
        data-no-drag
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => zoomCentered(view.zoom / 1.2)}
          className="w-6 h-6 grid place-items-center text-ink-secondary hover:text-ink-primary hover:bg-bg-secondary rounded"
          title={t("node.zoomOut")}
        >−</button>
        <button
          type="button"
          onClick={resetView}
          className="px-1.5 h-6 text-ink-secondary hover:text-ink-primary hover:bg-bg-secondary rounded font-mono"
          title={t("node.zoomReset")}
        >{Math.round(view.zoom * 100)}%</button>
        <button
          type="button"
          onClick={() => zoomCentered(view.zoom * 1.2)}
          className="w-6 h-6 grid place-items-center text-ink-secondary hover:text-ink-primary hover:bg-bg-secondary rounded"
          title={t("node.zoomIn")}
        >+</button>
        <button
          type="button"
          onClick={fitView}
          className="px-1.5 h-6 text-ink-secondary hover:text-ink-primary hover:bg-bg-secondary rounded"
          title={t("node.zoomFit")}
        >fit</button>
      </div>

      {/* Hint (bottom-right) */}
      <div className="absolute bottom-2 right-2 text-[9px] text-ink-tertiary bg-bg-primary/80 backdrop-blur px-1.5 py-0.5 rounded pointer-events-none">
        {t("node.hint")}
      </div>
    </div>
  );
}
