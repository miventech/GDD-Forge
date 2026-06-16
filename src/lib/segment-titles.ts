// ponytail: extract a short title from a segment's data so decisions/features
// can show "Afecta: Dragon King, Goblin" instead of "Afecta: cmqfk...".
import { LoopData, DialogueData, NoteData, TensionData, SegmentType } from "./segment-types";

export function getSegmentTitle(type: SegmentType, data: any): string {
  if (!data) return "(sin título)";
  switch (type) {
    case "hero":
      return [data.title, data.accentWord].filter(Boolean).join(" ") || "Hero";
    case "text":
      return data.heading || truncate(data.body, 40) || "Texto";
    case "image":
      return data.caption || "Imagen";
    case "grid":
      return data.items?.[0]?.title || "Grilla";
    case "callout":
      return data.title || truncate(data.body, 40) || "Nota";
    case "character":
      return data.name || "Personaje";
    case "enemy":
      return data.name || "Enemigo";
    case "boss":
      return data.name || "Jefe";
    case "loop":
      return (data as LoopData).name || "Core loop";
    case "dialogue":
      return (data as DialogueData).name || "Diálogo";
    case "note":
      return (data as NoteData).title || "Lienzo";
    case "tension":
      return (data as TensionData).title || "Curva de tensión";
  }
}

function truncate(s: string, n: number): string {
  s = (s ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export type SegmentSummary = { id: string; type: SegmentType; title: string };
