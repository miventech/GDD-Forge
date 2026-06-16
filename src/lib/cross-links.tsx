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

function getTypeIcon(t: (k: string) => string): Record<string, string> {
  return {
    hero: t("seg.title.hero"),
    text: t("seg.title.text"),
    image: t("seg.title.image"),
    grid: t("seg.title.grid"),
    callout: t("seg.title.callout"),
    character: t("seg.title.character"),
    enemy: t("seg.title.enemy"),
    boss: t("seg.title.boss"),
    loop: t("seg.title.loop"),
    dialogue: t("seg.title.dialogue"),
    note: t("seg.title.note"),
    tension: t("seg.title.tension"),
  };
}

export function renderTextWithLinks(
  body: string,
  allSegments: SegmentForLinks[],
  t: (k: string, vars?: Record<string, string | number>, fb?: string) => string
): React.ReactNode {
  if (!body) return null;
  const TYPE_ICON = getTypeIcon(t);
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
          title={t("link.notFound", { query })}
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
        title={t("link.target", { icon: TYPE_ICON[target.type] ?? target.type, title })}
      >
        <Link2 className="w-2.5 h-2.5" />
        {title}
      </a>
    );
  });
}
