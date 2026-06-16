// Parses a JSON file into typed segment data.
// Accepts a flexible "instructions" format and normalizes to the internal schema.
//
// Input shape (any of these):
//   { "segments": [...] }     (recommended)
//   { "instructions": [...] } (alias)
//   [ ... ]                   (bare array)
//
// Each item: { "type": "<SegmentType>", ...simple fields }
// Lenient: invalid items are skipped and reported, valid ones still import.
// Backwards-compat: old types from the previous 15-type set are migrated
// to the current 8 types where possible.

import { ACCENT_COLORS, AccentColor, defaultSegmentData, SEGMENT_TYPES, SegmentType } from "./segment-types";

export type { AccentColor };
export type ImportItem = { type: SegmentType; data: any };
export type ImportResult = { segments: ImportItem[]; errors: string[] };

const COLOR_SET = new Set<string>(ACCENT_COLORS);
const WIDTHS = new Set(["narrow", "normal", "wide", "full"]);
const PILL_PALETTE = ["#E24B4A", "#D85A30", "#7F77DD", "#378ADD", "#1D9E75", "#BA7517", "#D4537E", "#AFA9EC", "#5DCAA5", "#EF9F27"];

// ponytail: old types → new type migration. Each entry:
//   - fn: receives the raw item, returns { type, data } for the new type
//   - drop: if true, the item is dropped (no equivalent in the new set)
const OLD_TYPE_MIGRATION: Record<string, (item: any) => ImportItem | null> = {
  // accent / note / spoiler → callout
  accent: (item) => ({
    type: "callout",
    data: {
      color: asColor(item.color),
      title: asStr(item.title),
      body: asStr(item.body),
    },
  }),
  note: (item) => ({
    type: "callout",
    data: { color: asColor(item.color), title: "", body: asStr(item.body) },
  }),
  spoiler: (item) => ({
    type: "callout",
    data: { color: "red", title: asStr(item.warning, "Spoiler"), body: asStr(item.content) },
  }),
  // statgrid / relics / flow → grid
  statgrid: (item) => ({
    type: "grid",
    data: {
      columns: 2,
      items: normalizePills(item.pills).map((p) => ({ icon: "BarChart3", title: p.label, body: "" })),
    },
  }),
  relics: (item) => ({
    type: "grid",
    data: {
      columns: 2,
      items: (Array.isArray(item.items) ? item.items : []).map((r: any) => ({
        icon: r?.cursed ? "AlertCircle" : "Gem",
        title: asStr(r?.name),
        body: asStr(r?.description),
      })),
    },
  }),
  flow: (item) => ({
    type: "text",
    data: {
      heading: asStr(item.boxes?.[0]?.label, "Flujo"),
      body: (Array.isArray(item.boxes) ? item.boxes : []).map((b: any) => `→ ${asStr(typeof b === "string" ? b : b?.label)}`).join("\n"),
    },
  }),
  // richtext → text (HTML stripped, body as plain text)
  richtext: (item) => ({
    type: "text",
    data: { heading: "", body: asStr(item.html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() },
  }),
  // characters → character (first item only)
  characters: (item) => {
    const first = Array.isArray(item.items) ? item.items[0] : null;
    if (!first) return null;
    return {
      type: "character",
      data: {
        name: asStr(first?.name),
        role: asStr(first?.role),
        description: asStr(first?.description),
        icon: asStr(first?.icon, "User"),
        avatarUrl: asStr(first?.avatarUrl),
      },
    };
  },
  // bosses → boss (first item only)
  bosses: (item) => {
    const first = Array.isArray(item.items) ? item.items[0] : null;
    if (!first) return null;
    return {
      type: "boss",
      data: {
        name: asStr(first?.name),
        description: asStr(first?.role),
        phases: [],
        weakness: "",
        avatarUrl: asStr(first?.avatarUrl),
      },
    };
  },
  // toc → skip (auto-generated now)
  toc: () => null,
  // divider → skip
  divider: () => null,
};

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

function asColor(v: unknown, fallback: AccentColor = "purple"): AccentColor {
  return typeof v === "string" && COLOR_SET.has(v) ? (v as AccentColor) : fallback;
}

function asWidth(v: unknown): "narrow" | "normal" | "wide" | "full" {
  return typeof v === "string" && WIDTHS.has(v) ? (v as any) : "normal";
}

function asColumns(v: unknown): 2 | 3 {
  return v === 3 || v === "3" ? 3 : 2;
}

function normalizeTags(tags: unknown): { label: string; color: AccentColor }[] {
  if (!Array.isArray(tags)) return [];
  return tags.map((t, i) => {
    if (typeof t === "string") return { label: t, color: "purple" };
    if (t && typeof t === "object" && "label" in (t as any)) {
      return { label: asStr((t as any).label), color: asColor((t as any).color, "purple") };
    }
    return { label: asStr(t), color: "purple" };
  });
}

function normalizePills(pills: unknown): { label: string; color: string }[] {
  if (!Array.isArray(pills)) return [];
  return pills.map((p, i) => {
    if (typeof p === "string") return { label: p, color: PILL_PALETTE[i % PILL_PALETTE.length] };
    if (p && typeof p === "object" && "label" in (p as any)) {
      return { label: asStr((p as any).label), color: asStr((p as any).color, PILL_PALETTE[i % PILL_PALETTE.length]) };
    }
    return { label: asStr(p), color: PILL_PALETTE[i % PILL_PALETTE.length] };
  });
}

function buildData(type: SegmentType, item: any): any {
  const d = defaultSegmentData(type) as any;
  switch (type) {
    case "hero":
      return {
        eyebrow: asStr(item.eyebrow, d.eyebrow),
        title: asStr(item.title, d.title),
        accentWord: asStr(item.accentWord),
        subtitle: asStr(item.subtitle, d.subtitle),
        tags: normalizeTags(item.tags),
      };
    case "text":
      return { heading: asStr(item.heading), body: asStr(item.body) };
    case "image":
      return {
        url: asStr(item.url),
        alt: asStr(item.alt),
        caption: asStr(item.caption),
        width: asWidth(item.width),
      };
    case "grid": {
      const items = (Array.isArray(item.items) ? item.items : []).map((it: any) => ({
        icon: asStr(it?.icon, "Box"),
        title: asStr(it?.title),
        body: asStr(it?.body),
      }));
      return { columns: asColumns(item.columns), items };
    }
    case "callout":
      return {
        color: asColor(item.color),
        title: asStr(item.title),
        body: asStr(item.body, d.body),
      };
    case "character":
      return {
        name: asStr(item.name, d.name),
        role: asStr(item.role),
        description: asStr(item.description),
        icon: asStr(item.icon, "User"),
        avatarUrl: asStr(item.avatarUrl),
      };
    case "enemy":
      return {
        name: asStr(item.name, d.name),
        description: asStr(item.description),
        tier: item.tier === "elite" ? "elite" : "common",
        behaviors: (Array.isArray(item.behaviors) ? item.behaviors : []).map((b: any) => ({
          trigger: asStr(b?.trigger),
          action: asStr(b?.action),
        })),
        stats: {
          health: Number(item.stats?.health ?? d.stats.health),
          damage: Number(item.stats?.damage ?? d.stats.damage),
          speed: Number(item.stats?.speed ?? d.stats.speed),
        },
      };
    case "boss":
      return {
        name: asStr(item.name, d.name),
        description: asStr(item.description),
        phases: (Array.isArray(item.phases) ? item.phases : []).map((p: any) => ({
          name: asStr(p?.name),
          trigger: asStr(p?.trigger),
          description: asStr(p?.description),
          attacks: Array.isArray(p?.attacks) ? p.attacks.map((a: any) => asStr(a)) : [],
        })),
        weakness: asStr(item.weakness),
      };
    case "loop":
      return {
        name: asStr(item.name, d.name),
        description: asStr(item.description),
        nodes: (Array.isArray(item.nodes) ? item.nodes : []).map((n: any) => ({
          id: asStr(n?.id, `n${Math.random().toString(36).slice(2, 7)}`),
          label: asStr(n?.label),
          description: asStr(n?.description),
        })),
        edges: (Array.isArray(item.edges) ? item.edges : []).map((e: any) => ({
          from: asStr(e?.from),
          to: asStr(e?.to),
          label: asStr(e?.label),
        })),
      };
  }
}

export function parseSegmentsJson(input: string): ImportResult {
  const errors: string[] = [];
  let parsed: any;
  try {
    parsed = JSON.parse(input);
  } catch (e: any) {
    return { segments: [], errors: [`JSON inválido: ${e.message}`] };
  }

  const list = Array.isArray(parsed) ? parsed : parsed?.segments ?? parsed?.instructions;
  if (!Array.isArray(list)) {
    return {
      segments: [],
      errors: [
        'El JSON debe tener un array "segments" o "instructions" (o ser un array directo).',
      ],
    };
  }

  const segments: ImportItem[] = [];
  list.forEach((item: any, i: number) => {
    if (!item || typeof item !== "object") {
      errors.push(`Item #${i + 1}: no es un objeto`);
      return;
    }
    const type = item.type;
    if (!SEGMENT_TYPES.includes(type)) {
      // Try backwards-compat migration
      const migrate = OLD_TYPE_MIGRATION[type];
      if (migrate) {
        try {
          const migrated = migrate(item);
          if (migrated) {
            segments.push(migrated);
            errors.push(`Item #${i + 1}: "${type}" migrado a "${migrated.type}"`);
            return;
          }
          // drop=true
          errors.push(`Item #${i + 1}: "${type}" omitido (sin equivalente)`);
          return;
        } catch (e: any) {
          errors.push(`Item #${i + 1} (${type}): error migrando — ${e.message ?? "desconocido"}`);
          return;
        }
      }
      errors.push(`Item #${i + 1}: tipo "${type}" desconocido`);
      return;
    }
    try {
      segments.push({ type, data: buildData(type, item) });
    } catch (e: any) {
      errors.push(`Item #${i + 1} (${type}): ${e.message ?? "error parseando"}`);
    }
  });

  return { segments, errors };
}
