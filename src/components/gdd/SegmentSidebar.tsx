"use client";
import { useDraggable } from "@dnd-kit/core";
import { Sparkles, AlignLeft, Image as ImageIcon, LayoutGrid, Quote, User, Bug, Crown, RotateCw, MessageCircle, NotebookPen, Activity } from "lucide-react";
import { SEGMENT_LABELS, SegmentType } from "@/lib/segment-types";

const ICONS: Record<SegmentType, any> = {
  hero: Sparkles,
  text: AlignLeft,
  image: ImageIcon,
  grid: LayoutGrid,
  callout: Quote,
  character: User,
  enemy: Bug,
  boss: Crown,
  loop: RotateCw,
  dialogue: MessageCircle,
  note: NotebookPen,
  tension: Activity,
};

export const SIDEBAR_TYPES: SegmentType[] = [
  "hero", "text", "image", "grid", "callout", "character", "enemy", "boss", "loop", "dialogue", "note", "tension",
];

export function SegmentSidebar({ onAdd }: { onAdd: (type: SegmentType) => void }) {
  return (
    <aside className="hidden md:flex flex-col gap-1.5 w-48 sticky top-20 self-start p-2 border border-line rounded-lg bg-bg-primary max-h-[calc(100vh-6rem)] overflow-y-auto">
      <p className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium px-2 pt-1 pb-0.5">
        Segmentos
      </p>
      {SIDEBAR_TYPES.map((t) => (
        <DraggableSegmentItem key={t} type={t} onAdd={onAdd} />
      ))}
      <p className="text-[10px] text-ink-tertiary px-2 pt-2 leading-relaxed">
        Arrastrá al documento, o hacé clic para agregar al final.
      </p>
    </aside>
  );
}

function DraggableSegmentItem({ type, onAdd }: { type: SegmentType; onAdd: (t: SegmentType) => void }) {
  const Icon = ICONS[type];
  const id = `new:${type}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAdd(type)}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs hover:bg-bg-secondary transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="w-7 h-7 rounded-md bg-purple-light text-purple-dark grid place-items-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-ink-primary font-medium truncate">{SEGMENT_LABELS[type]}</span>
    </button>
  );
}
