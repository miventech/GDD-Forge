// ponytail: build a single lowercase haystack string from a segment so the
// search input can do a substring match across all visible text. Includes
// tags so users can find segments by tag with a query like "boss".

import { getSegmentTitle } from "./segment-titles";
import type { SegmentType } from "./segment-types";

export type SearchableSegment = {
  id: string;
  type: SegmentType;
  data: any;
};

const typeNames: Record<SegmentType, string> = {
  hero: "hero portada",
  text: "texto sección",
  image: "imagen asset",
  grid: "grilla tarjetas",
  callout: "callout nota",
  character: "personaje",
  enemy: "enemigo",
  boss: "jefe boss",
  loop: "core loop bucle",
  dialogue: "diálogo npc conversación",
  note: "lienzo nota libre",
  tension: "tensión pacing curva ritmo intensidad",
};

export function getSearchableText(seg: SearchableSegment): string {
  const d = seg.data ?? {};
  const title = getSegmentTitle(seg.type, d);
  const tags: string[] = Array.isArray(d?.tags) ? d.tags : (Array.isArray(d?.metaTags) ? d.metaTags : []);
  const parts: string[] = [
    title,
    typeNames[seg.type] ?? seg.type,
    ...tags,
  ];
  // Drill into body-ish fields per type.
  if (typeof d?.body === "string") parts.push(d.body);
  if (typeof d?.heading === "string") parts.push(d.heading);
  if (typeof d?.description === "string") parts.push(d.description);
  if (typeof d?.name === "string") parts.push(d.name);
  if (typeof d?.title === "string") parts.push(d.title);
  if (typeof d?.subtitle === "string") parts.push(d.subtitle);
  if (typeof d?.caption === "string") parts.push(d.caption);
  if (typeof d?.alt === "string") parts.push(d.alt);
  if (typeof d?.weakness === "string") parts.push(d.weakness);
  if (Array.isArray(d?.items)) {
    for (const it of d.items) {
      if (typeof it?.title === "string") parts.push(it.title);
      if (typeof it?.body === "string") parts.push(it.body);
    }
  }
  if (Array.isArray(d?.phases)) {
    for (const p of d.phases) {
      if (typeof p?.name === "string") parts.push(p.name);
      if (typeof p?.description === "string") parts.push(p.description);
      if (Array.isArray(p?.attacks)) for (const a of p.attacks) if (typeof a === "string") parts.push(a);
    }
  }
  if (Array.isArray(d?.behaviors)) {
    for (const b of d.behaviors) {
      if (typeof b?.trigger === "string") parts.push(b.trigger);
      if (typeof b?.action === "string") parts.push(b.action);
    }
  }
  if (Array.isArray(d?.nodes)) {
    for (const n of d.nodes) {
      if (typeof n?.label === "string") parts.push(n.label);
      if (typeof n?.text === "string") parts.push(n.text);
      if (typeof n?.description === "string") parts.push(n.description);
      if (typeof n?.speaker === "string") parts.push(n.speaker);
    }
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function segmentMatchesQuery(seg: SearchableSegment, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return getSearchableText(seg).includes(q);
}
