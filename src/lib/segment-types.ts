// GDD segment types. 8 types total.
//
// 4 generic structure blocks: hero, text, image, grid
// 4 GDD-specific:           callout, character, enemy, boss
//
// Generic structure types handle document layout.
// GDD-specific types encode domain concepts (characters, enemies, bosses, callouts).

export const ACCENT_COLORS = ["purple", "teal", "coral", "amber", "red"] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

export const SEGMENT_TYPES = [
  "hero",
  "text",
  "image",
  "grid",
  "callout",
  "character",
  "enemy",
  "boss",
  "loop",
  "dialogue",
  "note",
  "tension",
] as const;
export type SegmentType = (typeof SEGMENT_TYPES)[number];

// ponytail: a Segment is a type + an opaque payload. The payload shape is
// the discriminated union SegmentDataByType below, but editors and views
// treat it as `any` for ergonomics.
export type Segment = {
  id: string;
  type: SegmentType;
  order: number;
  data: any;
};

// ponytail: i18n keys for the long segment type labels (sidebar, drag overlay).
// Caller must pass through t() — SEGMENT_LABELS is a function for the
// resolved map, SEGMENT_LABEL_KEYS is the key-only map for callers that
// already have t() in scope.
export const SEGMENT_LABEL_KEYS: Record<SegmentType, string> = {
  hero: "seg.label.hero",
  text: "seg.label.text",
  image: "seg.label.image",
  grid: "seg.label.grid",
  callout: "seg.label.callout",
  character: "seg.label.character",
  enemy: "seg.label.enemy",
  boss: "seg.label.boss",
  loop: "seg.label.loop",
  dialogue: "seg.label.dialogue",
  note: "seg.label.note",
  tension: "seg.label.tension",
};

export function getSegmentLabels(t: (k: string) => string): Record<SegmentType, string> {
  return {
    hero: t("seg.label.hero"),
    text: t("seg.label.text"),
    image: t("seg.label.image"),
    grid: t("seg.label.grid"),
    callout: t("seg.label.callout"),
    character: t("seg.label.character"),
    enemy: t("seg.label.enemy"),
    boss: t("seg.label.boss"),
    loop: t("seg.label.loop"),
    dialogue: t("seg.label.dialogue"),
    note: t("seg.label.note"),
    tension: t("seg.label.tension"),
  };
}

export const SEGMENT_TITLE_KEYS: Record<SegmentType, string> = {
  hero: "seg.title.hero",
  text: "seg.title.text",
  image: "seg.title.image",
  grid: "seg.title.grid",
  callout: "seg.title.callout",
  character: "seg.title.character",
  enemy: "seg.title.enemy",
  boss: "seg.title.boss",
  loop: "seg.title.loop",
  dialogue: "seg.title.dialogue",
  note: "seg.title.note",
  tension: "seg.title.tension",
};

export const SEGMENT_ICONS: Record<SegmentType, string> = {
  hero: "Sparkles",
  text: "AlignLeft",
  image: "Image",
  grid: "LayoutGrid",
  callout: "Quote",
  character: "User",
  enemy: "Bug",
  boss: "Crown",
  loop: "RotateCw",
  dialogue: "MessageCircle",
  note: "NotebookPen",
  tension: "Activity",
};

// =====================================================
// Payload types
// =====================================================

// ponytail: every segment data shape can carry user-defined tags for
// filtering and search. Hero's `tags` field is a different thing
// (visual badges with colors) and is preserved alongside.
export type Taggable = { tags?: string[] };

// Hero's visual `tags` collide with the search `tags` from Taggable — we
// use a different field name (`metaTags`) for search on Hero segments.
export type HeroData = Omit<Taggable, "tags"> & {
  eyebrow: string;
  title: string;
  accentWord?: string;
  subtitle: string;
  tags: { label: string; color: AccentColor }[];
  metaTags?: string[];
};

export type TextData = Taggable & {
  heading?: string;
  body: string;
};

export type ImageData = Taggable & {
  url: string;
  alt: string;
  caption?: string;
  width?: "narrow" | "normal" | "wide" | "full";
};

export type GridItem = { icon: string; title: string; body: string };
export type GridData = Taggable & { columns: 1 | 2 | 3 | 4; items: GridItem[] };

// Callout — replaces the old accent + note. Optional title makes it "accent"-like,
// no title makes it "note"-like. Color drives the visual.
export type CalloutData = Taggable & {
  color: AccentColor;
  title?: string;
  body: string;
};

// Character — single character (was a list before). Domain fields for a GDD character.
export type CharacterData = Taggable & {
  name: string;
  role: string;
  description: string;
  icon: string;
  avatarUrl?: string;
};

// Enemy — single enemy with behaviors + stats.
export type EnemyData = Taggable & {
  name: string;
  description: string;
  tier: "common" | "elite";
  behaviors: { trigger: string; action: string }[];
  stats: { health: number; damage: number; speed: number };
  // Optional formulas. If set, override the static stat at the given level.
  // Available vars: `level` (1..N), `base` (the static value).
  formulas?: { health?: string; damage?: string; speed?: string };
  avatarUrl?: string;
};

// Boss — single boss with phases.
export type BossData = Taggable & {
  name: string;
  description: string;
  phases: { name: string; trigger: string; description: string; attacks: string[] }[];
  stats?: { health: number; damage: number; speed: number };
  formulas?: { health?: string; damage?: string; speed?: string };
  weakness?: string;
  avatarUrl?: string;
};

// Core loop — a directed graph of actions the player repeats.
// Nodes are the actions; edges are the transitions. A loop is any node that
// has an edge back to itself or to a previous node (creating a cycle).
export type LoopNode = {
  id: string;
  label: string;
  description: string;
  x?: number;  // free-positioned editor coordinates; missing = auto-layout
  y?: number;
};
export type LoopEdge = { from: string; to: string; label?: string };
export type LoopData = Taggable & {
  name: string;
  description: string;
  nodes: LoopNode[];
  edges: LoopEdge[];
};

// Dialogue — branching NPC conversation tree. Each node has a list of
// `choices` (outgoing connections). An empty choices list = end of dialogue.
// A single choice with empty label = linear continuation.
export type DialogueChoice = { label: string; nextNodeId: string };
export type DialogueNode = {
  id: string;        // short id, e.g. "n1"
  speaker: string;   // "Alice", "Player", "Narrator", or custom
  text: string;      // the line itself
  choices: DialogueChoice[];
  // Legacy field — kept on write for old data; treated as a single choice
  // with empty label when reading.
  next?: string | null;
  x?: number;
  y?: number;
};
export type DialogueData = Taggable & {
  name: string;        // NPC name (e.g. "Old Hermit")
  description: string; // context / where / when
  startNodeId: string | null;
  nodes: DialogueNode[];
};

// Note (Lienzo) — free-form section. A title plus an optional plain-text
// body and/or a free-draw canvas (stored as a PNG data URL).
export type NoteData = Taggable & {
  title: string;
  body?: string;       // legacy text, kept for old data
  drawing?: string;   // base64 PNG data URL of the drawing
};

// Tension / pacing curve. Beats are points on a 0–100 × 0–100 chart.
// x = position in time (left = game start, right = end).
// y = intensity (0 = quiet, 100 = climactic).
// The renderer draws a smooth Catmull-Rom curve through the points.
export type TensionPoint = {
  id: string;
  label: string;
  x: number;     // 0..100
  y: number;     // 0..100
  color?: string; // override the theme line color (hex)
  icon?: string;  // glyph character to display next to the point
};

export type TensionTheme = {
  lineColor: string;
  fillColor: string;
  bgColor: string;
  textColor: string;
};

export type TensionData = Taggable & {
  title: string;
  showLabels: boolean;
  showAxes: boolean;
  xAxisLabel: string;
  yAxisLabel: string;
  theme: TensionTheme;
  beats: TensionPoint[];
};

export type SegmentDataByType = {
  hero: HeroData;
  text: TextData;
  image: ImageData;
  grid: GridData;
  callout: CalloutData;
  character: CharacterData;
  enemy: EnemyData;
  boss: BossData;
  loop: LoopData;
  dialogue: DialogueData;
  note: NoteData;
  tension: TensionData;
};

// =====================================================
// Default factories
// =====================================================

export function defaultSegmentData(type: SegmentType): unknown {
  switch (type) {
    case "hero":
      return {
        eyebrow: "Game Design Document · v0.1 · Draft",
        title: "Untitled Project",
        accentWord: "",
        subtitle: "Breve descripción del proyecto.",
        tags: [
          { label: "Genre", color: "purple" },
          { label: "Platform", color: "teal" },
        ],
        metaTags: [],
      } satisfies HeroData & { metaTags: string[] };
    case "text":
      return { heading: "", body: "Escribí el contenido del segmento…", tags: [] } satisfies TextData;
    case "image":
      return { url: "", alt: "", caption: "", width: "normal", tags: [] } satisfies ImageData;
    case "grid":
      return {
        columns: 2,
        items: [
          { icon: "Box", title: "Tarjeta 1", body: "Descripción breve." },
          { icon: "Box", title: "Tarjeta 2", body: "Descripción breve." },
        ],
        tags: [],
      } satisfies GridData;
    case "callout":
      return { color: "purple", title: "", body: "Contenido del callout.", tags: [] } satisfies CalloutData;
    case "character":
      return {
        name: "",
        role: "",
        description: "",
        icon: "User",
        avatarUrl: "",
        tags: [],
      } satisfies CharacterData;
    case "enemy":
      return {
        name: "",
        description: "",
        tier: "common",
        behaviors: [{ trigger: "Player within 3 tiles", action: "Charges at player" }],
        stats: { health: 30, damage: 5, speed: 2 },
        formulas: {},
        tags: [],
      } satisfies EnemyData;
    case "boss":
      return {
        name: "",
        description: "",
        phases: [
          {
            name: "Phase 1",
            trigger: "HP > 50%",
            description: "Slow melee attacks",
            attacks: ["Slash", "Stomp"],
          },
        ],
        weakness: "",
        formulas: {},
        tags: [],
      } satisfies BossData;
    case "loop":
      return {
        name: "Core loop",
        description: "",
        nodes: [
          { id: "n1", label: "Explore", description: "" },
          { id: "n2", label: "Encounter", description: "" },
          { id: "n3", label: "Reward", description: "" },
          { id: "n4", label: "Progress", description: "" },
        ],
        edges: [
          { from: "n1", to: "n2" },
          { from: "n2", to: "n3" },
          { from: "n3", to: "n4" },
          { from: "n4", to: "n1", label: "loop" },
        ],
        tags: [],
      } satisfies LoopData;
    case "dialogue":
      return {
        name: "",
        description: "",
        startNodeId: "n1",
        nodes: [
          { id: "n1", speaker: "NPC", text: "Hello, traveler.", choices: [], next: "n2" },
          { id: "n2", speaker: "Player", text: "Who are you?", choices: [
            { label: "Tell me about the village", nextNodeId: "n3" },
            { label: "I should go", nextNodeId: "n4" },
          ], next: null },
          { id: "n3", speaker: "NPC", text: "It's been quiet for years...", choices: [], next: "n4" },
          { id: "n4", speaker: "NPC", text: "Safe travels.", choices: [], next: null },
        ],
        tags: [],
      } satisfies DialogueData;
    case "note":
      return {
        title: "",
        body: "",
        tags: [],
      } satisfies NoteData;
    case "tension":
      return {
        title: "Curva de tensión",
        showLabels: true,
        showAxes: true,
        xAxisLabel: "Tiempo",
        yAxisLabel: "Tensión",
        theme: {
          lineColor: "#0d9488",
          fillColor: "#0d9488",
          bgColor: "#fafaf8",
          textColor: "#27272a",
        },
        beats: [
          { id: "p1", label: "Inicio",   x: 5,  y: 20 },
          { id: "p2", label: "Tutorial", x: 20, y: 45 },
          { id: "p3", label: "Primer pico", x: 40, y: 70 },
          { id: "p4", label: "Calma",   x: 55, y: 30, icon: "☾" },
          { id: "p5", label: "Boss",    x: 80, y: 90, icon: "♛" },
          { id: "p6", label: "Final",   x: 95, y: 60 },
        ],
        tags: [],
      } satisfies TensionData;
  }
}
