// ponytail: auto-layout for legacy segments that don't have x/y stored.
// Returns a NEW array — does not mutate. Caller decides what to do with
// the positioned nodes (e.g. pass to canvas or save back to state).

import type { LoopNode, DialogueNode } from "./segment-types";
import { NODE_W, NODE_H } from "@/components/gdd/NodeCanvas";

const LOOP_W = 460, LOOP_H = 360, LOOP_CX = LOOP_W / 2, LOOP_CY = LOOP_H / 2, LOOP_R = 130;

export type PositionedLoopNode = LoopNode & { x: number; y: number };

export function ensureLoopPositions(nodes: LoopNode[]): PositionedLoopNode[] {
  return nodes.map((n, i) => {
    if (typeof n.x === "number" && typeof n.y === "number") return n as PositionedLoopNode;
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(nodes.length, 1);
    return {
      ...n,
      x: n.x ?? LOOP_CX - NODE_W / 2 + LOOP_R * Math.cos(angle),
      y: n.y ?? LOOP_CY - NODE_H / 2 + LOOP_R * Math.sin(angle),
    } as PositionedLoopNode;
  });
}

export type PositionedDialogueNode = DialogueNode & { x: number; y: number };

// BFS from startNodeId. Unreachable nodes pushed to the end.
export function ensureDialoguePositions(nodes: DialogueNode[], startNodeId: string | null): PositionedDialogueNode[] {
  const col = new Map<string, number>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (startNodeId && byId.has(startNodeId)) {
    const queue: { id: string; depth: number }[] = [{ id: startNodeId, depth: 0 }];
    while (queue.length) {
      const { id, depth } = queue.shift()!;
      if (col.has(id)) continue;
      col.set(id, depth);
      const n = byId.get(id)!;
      const nexts: string[] = [];
      for (const c of n.choices) if (c.nextNodeId) nexts.push(c.nextNodeId);
      if (n.next) nexts.push(n.next);
      for (const nx of nexts) if (!col.has(nx)) queue.push({ id: nx, depth: depth + 1 });
    }
  }
  const ordered = nodes.filter((n) => col.has(n.id)).concat(nodes.filter((n) => !col.has(n.id)));
  const colGapX = NODE_W + 90;
  const colGapY = NODE_H + 20;
  let maxDepth = 0;
  const rowByCol = new Map<number, number>();
  const out: PositionedDialogueNode[] = [];
  for (const n of ordered) {
    const c = col.has(n.id) ? col.get(n.id)! : -1;
    const r = c >= 0 ? (rowByCol.get(c) || 0) : 0;
    if (c >= 0) {
      rowByCol.set(c, r + 1);
      if (c > maxDepth) maxDepth = c;
    }
    out.push({
      ...n,
      x: n.x ?? (c >= 0 ? 20 + c * colGapX : 20 + (maxDepth + 1) * colGapX),
      y: n.y ?? (c >= 0 ? 20 + r * colGapY : 20 + r * colGapY),
    });
  }
  return out;
}
