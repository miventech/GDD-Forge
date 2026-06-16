// GDD file format — what gets written to disk when the user hits "Save .GDD",
// and what gets parsed when they hit "Open .GDD". Everything the user authors
// for a single GDD lives here: project meta, segments, checklist, decisions,
// features, brainstorm.
//
// Versioned. magic + version let us migrate later without breaking old files.

import type {
  Segment,
  SegmentType,
  AccentColor,
} from "./segment-types";
// ponytail: re-export Segment so existing call sites that import it from
// gdd-file.ts keep working. The canonical home is segment-types.ts.
export type { Segment } from "./segment-types";
import {
  buildManifest,
  hydrateFile,
  packZip,
  unpackZip,
  isZipBytes,
  migrateDataUrlsToRefs,
} from "./gdd-manifest";

export const GDD_MAGIC = "GDDFORGE/2" as const;
export const GDD_MAGIC_V1 = "GDDFORGE/1" as const;
export type GddMagic = typeof GDD_MAGIC;

export type TaskStatus = "todo" | "in-progress" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  groupId: string | null;
};

export type TaskGroup = {
  id: string;
  name: string;
  color: AccentColor;
  icon: string;
  order: number;
  tasks: Task[];
};

export type DecisionStatus = "open" | "taken" | "reverted";

export type Decision = {
  id: string;
  title: string;
  description: string | null;
  status: DecisionStatus;
  segmentIds: string[];
  decidedAt: string | null;
  createdAt: string;
};

export type FeatureStatus = "planned" | "in-progress" | "done" | "cut";

export type Feature = {
  id: string;
  name: string;
  description: string | null;
  status: FeatureStatus;
  dependsOn: string[];
  segmentIds: string[];
};

export type BrainstormNode = {
  id: string;
  text: string;
  x: number;
  y: number;
};

export type BrainstormEdge = {
  id: string;
  from: string;
  to: string;
  fromPort?: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" | null;
  toPort?: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" | null;
  label?: string | null;
};

export type BrainstormShape = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: "purple" | "teal" | "coral" | "amber";
  label?: string | null;
};

export type BrainstormData = {
  nodes: BrainstormNode[];
  edges: BrainstormEdge[];
  shapes: BrainstormShape[];
};

export type ProjectStatus = "draft" | "in-progress" | "completed";

export type Project = {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  version: string;
  status: ProjectStatus;
  accent: AccentColor;
};

export type GddFile = {
  magic: GddMagic;
  version: 2;
  createdAt: string;
  updatedAt: string;
  author: string | null;
  project: Project;
  segments: Segment[];
  taskGroups: TaskGroup[];
  decisions: Decision[];
  features: Feature[];
  brainstorm: BrainstormData;
};

// =====================================================================
// Factories
// =====================================================================

export function newId(): string {
  // crypto.randomUUID is supported in all modern browsers and Node 19+.
  // Static export target = browser, so this is safe.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // ponytail: fallback for ancient runtimes; should never hit in practice.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newEmptyGdd(opts?: { title?: string; author?: string | null }): GddFile {
  const now = new Date().toISOString();
  return {
    magic: GDD_MAGIC,
    version: 2,
    createdAt: now,
    updatedAt: now,
    author: opts?.author ?? null,
    project: {
      id: newId(),
      title: opts?.title ?? "Nuevo GDD",
      subtitle: null,
      eyebrow: "Game Design Document · v0.1 · Draft",
      version: "0.1",
      status: "draft",
      accent: "purple",
    },
    segments: [],
    taskGroups: [],
    decisions: [],
    features: [],
    brainstorm: { nodes: [], edges: [], shapes: [] },
  };
}

// ponytail: templates are opinionated starters. We coerce the loose
// Template shape into the strict GddFile shape, generating ids and
// defaulting missing fields. No validation — templates are trusted
// (we own them).
import type { Template } from "./templates";
export function newGddFromTemplate(template: Template, opts?: { author?: string | null }): GddFile {
  const now = new Date().toISOString();
  const projectId = newId();
  const segments: Segment[] = template.segments.map((s, i) => ({
    id: newId(),
    type: s.type,
    order: i,
    data: s.data,
  }));
  const decisions: Decision[] = template.decisions.map((d) => ({
    id: newId(),
    title: d.title,
    description: d.body,
    status: "open",
    segmentIds: [],
    decidedAt: null,
    createdAt: now,
  }));
  const features: Feature[] = template.features.map((f) => ({
    id: newId(),
    name: f.title,
    description: f.body,
    status: "planned",
    dependsOn: f.dependsOn ? [f.dependsOn] : [],
    segmentIds: [],
  }));
  // ponytail: bucket tasks by group, keep "Sin grupo" for orphan tasks.
  const tasksByGroup = new Map<string, typeof template.tasks>();
  for (const t of template.tasks) {
    const g = t.group ?? "Sin grupo";
    if (!tasksByGroup.has(g)) tasksByGroup.set(g, []);
    tasksByGroup.get(g)!.push(t);
  }
  const taskGroups: TaskGroup[] = Array.from(tasksByGroup.entries()).map(([name, tasks], gi) => ({
    id: newId(),
    name,
    color: "purple",
    icon: "CheckSquare",
    order: gi,
    tasks: tasks.map((t, ti) => ({
      id: newId(),
      title: t.title,
      description: null,
      status: "todo" as const,
      priority: "medium" as const,
      order: ti,
      groupId: null, // ponytail: backfilled after groups are stable
    })),
  }));
  // Second pass: wire groupId now that group ids are known.
  for (let gi = 0; gi < taskGroups.length; gi++) {
    const gid = taskGroups[gi].id;
    for (const task of taskGroups[gi].tasks) task.groupId = gid;
  }
  // The project id is needed so the editor can reference it.
  void projectId;
  return {
    magic: GDD_MAGIC,
    version: 2,
    createdAt: now,
    updatedAt: now,
    author: opts?.author ?? null,
    project: {
      id: newId(),
      title: template.project.title,
      subtitle: template.project.subtitle,
      eyebrow: template.project.eyebrow,
      version: template.project.version,
      status: template.project.status,
      accent: template.accent,
    },
    segments,
    taskGroups,
    decisions,
    features,
    brainstorm: { nodes: [], edges: [], shapes: [] },
  };
}

// =====================================================================
// Serialize / parse
// =====================================================================

export type ParseResult =
  | { ok: true; file: GddFile }
  | { ok: false; error: string };

export function parseGddText(text: string): ParseResult {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch (e: any) {
    return { ok: false, error: `JSON inválido: ${e?.message ?? "error de parseo"}` };
  }
  return validateGdd(raw);
}

// ponytail: validation is shape-check, not zod. We don't want a dep here.
// Accepts both v1 (legacy JSON) and v2 (current ZIP) magic/version — v1
// entries are normalized to v2 in memory on the way out. Returns a fresh
// object so callers can keep their original input untouched.
export function validateGdd(raw: any): ParseResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "El archivo no contiene un objeto JSON" };
  }
  if (raw.magic !== GDD_MAGIC && raw.magic !== GDD_MAGIC_V1) {
    return { ok: false, error: `No es un archivo .GDD válido (magic: ${String(raw.magic)})` };
  }
  if (raw.version !== 1 && raw.version !== 2) {
    return { ok: false, error: `Versión de .GDD no soportada: ${String(raw.version)}` };
  }
  if (!raw.project || typeof raw.project !== "object") {
    return { ok: false, error: "Falta el bloque project" };
  }
  // ponytail: always normalize to v2 in memory. Auto-upgrade on first
  // read means saving the doc back out writes v2 — no explicit migration.
  // Clone into a fresh object so we don't mutate the caller's reference.
  const file: GddFile = {
    ...raw,
    magic: GDD_MAGIC,
    version: 2,
    segments: Array.isArray(raw.segments) ? raw.segments : [],
    taskGroups: Array.isArray(raw.taskGroups) ? raw.taskGroups : [],
    decisions: Array.isArray(raw.decisions) ? raw.decisions : [],
    features: Array.isArray(raw.features) ? raw.features : [],
    brainstorm: raw.brainstorm && typeof raw.brainstorm === "object"
      ? raw.brainstorm
      : { nodes: [], edges: [], shapes: [] },
  };
  return { ok: true, file };
}

// ponytail: pretty-printed JSON of the in-memory GddFile. The save button
// uses serializeGddZip() to write the .gdd file; this helper stays for
// anyone who wants a readable text dump (devtools, export, etc).
export function serializeGdd(file: GddFile): string {
  return JSON.stringify(file, null, 2);
}

// ponytail: bytes-level entry. Auto-detects ZIP vs legacy JSON. Used by
// readGddFromFile so the same path handles both on-disk formats. Async
// because hydrateFile writes assets into IndexedDB before returning.
export async function parseGddBytes(bytes: Uint8Array): Promise<ParseResult> {
  try {
    if (isZipBytes(bytes)) {
      const { manifest, assets } = unpackZip(bytes);
      const file = await hydrateFile(manifest, assets);
      return { ok: true, file };
    }
    const result = parseGddText(new TextDecoder().decode(bytes));
    if (!result.ok) return result;
    // ponytail: v1 GDDs embed image bytes as data URLs. Migrate them to
    // refs + IDB on load so the in-memory state is consistent and the
    // localStorage autosave stays small.
    const migrated = await migrateDataUrlsToRefs(result.file);
    return { ok: true, file: migrated };
  } catch (e: any) {
    return { ok: false, error: `Archivo .gdd inválido: ${e?.message ?? "error de parseo"}` };
  }
}

export async function serializeGddZip(file: GddFile): Promise<Uint8Array> {
  const built = await buildManifest(file);
  return packZip(built);
}

// =====================================================================
// File I/O (browser-only)
// =====================================================================

// ponytail: .gdd is now a ZIP. The MIME stays octet-stream so the OS
// doesn't try to "open" it — the user double-clicks expecting a download.
export async function downloadGddFile(file: GddFile): Promise<void> {
  const bytes = await serializeGddZip(file);
  // ponytail: spread into a fresh ArrayBuffer to satisfy TS 5.7+ strict
  // BlobPart typing. fflate already returns Uint8Array<ArrayBuffer>; the
  // extra .slice() defends against future widening in the fflate types.
  const blob = new Blob([bytes.slice().buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(file.project.title) || "gdd"}-v${file.project.version}.gdd`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // ponytail: revoke after a tick so the click handler has time to fire.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readGddFromFile(file: File): Promise<ParseResult> {
  try {
    const buf = await file.arrayBuffer();
    return parseGddBytes(new Uint8Array(buf));
  } catch (e: any) {
    return { ok: false, error: `No se pudo leer el archivo: ${e?.message ?? "error"}` };
  }
}

// ponytail: app is 100% local; images live as base64 data URLs inside the
// GddFile in memory. On disk (v2) they become separate asset files in the
// .gdd ZIP. The store-side dedup + IndexedDB migration comes in a later
// step; here we just want a small file on disk.
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "gdd";
}
