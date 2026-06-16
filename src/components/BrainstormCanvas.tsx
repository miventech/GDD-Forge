"use client";
import { useCallback, useState } from "react";
import { Plus, Group, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NodeCanvas } from "@/components/gdd/NodeCanvas";
import { useBrainstorm, actions } from "@/lib/gdd-store";
import type { BrainstormNode, BrainstormEdge } from "@/lib/gdd-file";
import { newId } from "@/lib/gdd-file";
import { useT } from "@/lib/i18n";

export function BrainstormCanvas() {
  const { t } = useT();
  const data = useBrainstorm();
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  const addNode = useCallback(() => {
    const used = new Set(data.nodes.map((n) => n.id));
    let i = 1;
    while (used.has(`n${i}`)) i++;
    const id = `n${i}`;
    const baseX = data.nodes[0]?.x ?? 80;
    const baseY = data.nodes[0]?.y ?? 80;
    actions.setBrainstorm({
      ...data,
      nodes: [...data.nodes, { id, text: "", x: baseX + 80, y: baseY + 80 }],
    });
  }, [data]);

  const addGroup = useCallback(() => {
    const id = `g_${Date.now()}`;
    actions.setBrainstorm({
      ...data,
      shapes: [...(data.shapes ?? []), { id, x: 60, y: 60, w: 320, h: 200, color: "purple" }],
    });
    setSelectedShapeId(id);
  }, [data]);

  const deleteNode = useCallback((id: string) => {
    actions.setBrainstorm({
      ...data,
      nodes: data.nodes.filter((n) => n.id !== id),
      edges: data.edges.filter((e) => e.from !== id && e.to !== id),
    });
  }, [data]);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    actions.setBrainstorm({
      ...data,
      nodes: data.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    });
  }, [data]);

  const moveShape = useCallback((id: string, x: number, y: number) => {
    actions.setBrainstorm({
      ...data,
      shapes: (data.shapes ?? []).map((s) => (s.id === id ? { ...s, x, y } : s)),
    });
  }, [data]);

  const resizeShape = useCallback((id: string, x: number, y: number, w: number, h: number) => {
    actions.setBrainstorm({
      ...data,
      shapes: (data.shapes ?? []).map((s) => (s.id === id ? { ...s, x, y, w, h } : s)),
    });
  }, [data]);

  const deleteShape = useCallback((id: string) => {
    actions.setBrainstorm({
      ...data,
      shapes: (data.shapes ?? []).filter((s) => s.id !== id),
    });
    setSelectedShapeId(null);
  }, [data]);

  const connect = useCallback(
    (fromId: string, toId: string, fromPort?: any, toPort?: any) => {
      if (data.edges.some((e) => e.from === fromId && e.to === toId)) return;
      const edge: BrainstormEdge = {
        id: newId(),
        from: fromId,
        to: toId,
        fromPort: fromPort ?? null,
        toPort: toPort ?? null,
      };
      actions.setBrainstorm({ ...data, edges: [...data.edges, edge] });
    },
    [data]
  );

  const deleteEdgeByIndex = useCallback((i: number) => {
    actions.setBrainstorm({
      ...data,
      edges: data.edges.filter((_, idx) => idx !== i),
    });
  }, [data]);

  const updateText = useCallback((id: string, text: string) => {
    actions.setBrainstorm({
      ...data,
      nodes: data.nodes.map((n) => (n.id === id ? { ...n, text } : n)),
    });
  }, [data]);

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h1 className="text-lg font-medium text-ink-primary inline-flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            {t("brainstorm.title")}
          </h1>
          <p className="text-[11px] text-ink-tertiary mt-0.5">
            {t("brainstorm.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={addNode} size="sm" variant="outline">
            <Plus className="w-3.5 h-3.5" /> {t("brainstorm.idea")}
          </Button>
          <Button onClick={addGroup} size="sm" variant="outline">
            <Group className="w-3.5 h-3.5" /> {t("brainstorm.group")}
          </Button>
        </div>
      </div>

      <div className="text-[11px] text-ink-tertiary mb-2">
        {t("brainstorm.stats", { nodes: data.nodes.length, edges: data.edges.length, shapes: data.shapes?.length ?? 0 })}
        <span className="ml-2 text-ink-tertiary">· {t("editor.autoSaved")}</span>
      </div>

      <div className="flex-1 min-h-0">
        <NodeCanvas
          nodes={data.nodes}
          edges={data.edges.map((e) => ({
            from: e.from,
            to: e.to,
            fromPort: e.fromPort ?? undefined,
            toPort: e.toPort ?? undefined,
            label: e.label ?? undefined,
          }))}
          shapes={(data.shapes ?? []).map((s) => ({ ...s, label: s.label ?? undefined }))}
          selectedShapeId={selectedShapeId}
          onSelectShape={setSelectedShapeId}
          onMoveShape={moveShape}
          onResizeShape={resizeShape}
          onDeleteShape={deleteShape}
          onMoveNode={moveNode}
          onConnect={connect}
          onDeleteEdge={deleteEdgeByIndex}
          onDeleteNode={deleteNode}
          renderNode={(n) => <BrainstormNodeBody node={n as BrainstormNode} onText={updateText} />}
          className="h-full"
        />
      </div>
    </div>
  );
}

function BrainstormNodeBody({ node, onText }: { node: BrainstormNode; onText: (id: string, t: string) => void }) {
  const { t } = useT();
  return (
    <div className="w-full h-full bg-bg-primary border border-line rounded-lg p-2 flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-mono text-ink-tertiary">{node.id}</span>
        <span className="text-[10px] text-ink-tertiary truncate flex-1">idea</span>
      </div>
      <textarea
        data-no-drag
        value={node.text}
        onChange={(e) => onText(node.id, e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder={t("brainstorm.placeholder")}
        className="flex-1 w-full text-[11px] text-ink-primary bg-transparent border-none outline-none resize-none placeholder:text-ink-tertiary leading-tight"
      />
    </div>
  );
}
