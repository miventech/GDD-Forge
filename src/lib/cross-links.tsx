// Cross-link parsing for text segments. Syntax: [[Dragon King]] or [[seg-id]]
// Resolves against the provided list of project segments by id or title.

import React from "react";
import { SegmentType } from "./segment-types";
import { getSegmentTitle } from "./segment-titles";
import { Link2, AlertCircle } from "lucide-react";

export type SegmentForLinks = { id: string; type: SegmentType; data: any };

const RE = /(\[\[[^\]]+\]\])/g;
const EXACT = /^\[\[([^\]]+)\]\]$/;

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
}

const TYPE_ICON: Record<string, string> = {
  hero: "Hero",
  text: "Texto",
  image: "Imagen",
  grid: "Grilla",
  callout: "Callout",
  character: "Personaje",
  enemy: "Enemigo",
  boss: "Jefe",
  loop: "Loop",
  dialogue: "Diálogo",
  note: "Lienzo",
  tension: "Tensión",
};

export function renderTextWithLinks(
  body: string,
  allSegments: SegmentForLinks[]
): React.ReactNode {
  if (!body) return null;
  const parts = body.split(RE);
  return parts.map((part, i) => {
    const m = part.match(EXACT);
    if (!m) return <span key={i}>{part}</span>;
    const query = m[1].trim();
    const target =
      allSegments.find((s) => s.id === query) ||
      allSegments.find(
        (s) => getSegmentTitle(s.type, s.data).toLowerCase() === query.toLowerCase()
      );
    if (!target) {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-light text-red-dark text-[11px] font-medium align-baseline"
          title={`No se encontró: ${query}`}
        >
          <AlertCircle className="w-2.5 h-2.5" />
          {query}
        </span>
      );
    }
    const title = getSegmentTitle(target.type, target.data);
    const href = `#${slug(title) || "section"}`;
    return (
      <a
        key={i}
        href={href}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-light text-purple-dark text-[11px] font-medium hover:bg-purple hover:text-white transition-colors align-baseline no-underline"
        title={`${TYPE_ICON[target.type] ?? target.type}: ${title}`}
      >
        <Link2 className="w-2.5 h-2.5" />
        {title}
      </a>
    );
  });
}
