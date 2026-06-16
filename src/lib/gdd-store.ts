// GDD store — single source of truth for the currently open .GDD file.
//
// Design:
//   - One global GddFile at a time. Opening a new file replaces it.
//   - All mutations go through store.update(fn). It auto-persists to
//     IndexedDB and notifies subscribers.
//   - Components read with useGdd() (useSyncExternalStore under the hook).
//   - Persistence is async (IDB), so initial load is async too. The
//     `ready` promise + useGddReady() hook let components block on the
//     first load to avoid flashing the "no project" state.
//
// Why not Zustand/Redux/Jotai: the whole app reads/writes one document.
// A useSyncExternalStore + tiny event emitter is the minimum that works.

"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  type GddFile,
  type Segment,
  type TaskGroup,
  type Decision,
  type Feature,
  type Project,
  type BrainstormData,
  validateGdd,
  newEmptyGdd,
} from "./gdd-file";
import { defaultSegmentData, type SegmentType } from "./segment-types";
import { clearAssetUrlCache } from "./asset-urls";
import {
  getCurrentDoc,
  setCurrentDoc,
  clearCurrentDoc,
} from "./asset-store";

// ponytail: legacy localStorage keys. Kept so the v1/v2 in-memory cache
// from earlier versions of the app migrates cleanly into IDB on first load.
const KEY_LS_V2 = "gddml:v2:current";
const KEY_LS_V1 = "gddml:v1:current";

let current: GddFile | null = null;
const listeners = new Set<() => void>();

// ponytail: `ready` resolves once the initial IDB load (or localStorage
// migration) is done. Components use useGddReady() to wait before
// rendering the editor — prevents flashing the "no project" state
// during the async read.
let readyFlag = false;
let resolveReady: () => void = () => {};
const ready = new Promise<void>((resolve) => { resolveReady = resolve; });

function notify(): void {
  for (const l of listeners) l();
}

async function loadFromIdb(): Promise<GddFile | null> {
  try {
    const doc = await getCurrentDoc();
    if (!doc || typeof doc !== "object") return null;
    const v = validateGdd(doc);
    return v.ok ? v.file : null;
  } catch (e) {
    console.warn("[gdd-store] IDB load failed:", e);
    return null;
  }
}

async function migrateFromLocalStorage(): Promise<GddFile | null> {
  if (typeof window === "undefined") return null;
  // v2 first.
  try {
    const raw = localStorage.getItem(KEY_LS_V2);
    if (raw) {
      const v = validateGdd(JSON.parse(raw));
      if (v.ok) {
        localStorage.removeItem(KEY_LS_V2);
        // ponytail: also drop the v1 key — if it was lingering, clean it up.
        localStorage.removeItem(KEY_LS_V1);
        return v.file;
      }
      localStorage.removeItem(KEY_LS_V2);
    }
  } catch {}
  // v1.
  try {
    const raw = localStorage.getItem(KEY_LS_V1);
    if (raw) {
      const v = validateGdd(JSON.parse(raw));
      if (v.ok) return v.file;
      localStorage.removeItem(KEY_LS_V1);
    }
  } catch {}
  return null;
}

async function initialLoad(): Promise<void> {
  // ponytail: IDB first. On a fresh install, that's empty. On a return
  // visit, the in-progress doc is right there.
  let doc = await loadFromIdb();
  if (!doc) {
    // Migration: lift the legacy localStorage v2 doc into IDB. This is
    // a one-shot per browser; after the first run, the keys are gone.
    const migrated = await migrateFromLocalStorage();
    if (migrated) {
      doc = migrated;
      try { await setCurrentDoc(doc); } catch (e) { console.warn("[gdd-store] migration persist failed:", e); }
    }
  }
  current = doc;
  readyFlag = true;
  resolveReady();
  notify();
}

// ponytail: kick off the initial load on module init. In the browser
// this fires before the first React render. The editor gates its first
// render on useGddReady() to avoid the "no project" flash.
if (typeof window !== "undefined") {
  void initialLoad();
}

async function persist(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (current) await setCurrentDoc(current);
    else await clearCurrentDoc();
  } catch (e) {
    // Quota exceeded or storage disabled. Surface to the user via console;
    // components also show inline error toasts.
    console.warn("[gdd-store] IDB persist failed:", e);
  }
}

function emit(): void {
  // ponytail: fire-and-forget. Multiple rapid mutations may overlap; IDB
  // writes serialize per transaction so the last persist wins. The save
  // flow (downloadGddFile) is independent and reads `current` directly,
  // so the user never sees stale data on explicit save.
  void persist();
  for (const l of listeners) l();
}

export const store = {
  get(): GddFile | null {
    return current;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  open(file: GddFile): void {
    // ponytail: clear the asset URL cache so a new document's assets
    // don't render under the previous doc's refs. Revokes all
    // outstanding object URLs.
    clearAssetUrlCache();
    current = { ...file, updatedAt: new Date().toISOString() };
    emit();
  },
  replace(file: GddFile): void {
    // ponytail: same as open but preserves createdAt from the file.
    clearAssetUrlCache();
    current = { ...file, updatedAt: new Date().toISOString() };
    emit();
  },
  close(): void {
    clearAssetUrlCache();
    current = null;
    emit();
  },
  update(fn: (f: GddFile) => GddFile): void {
    if (!current) return;
    const next = fn(current);
    next.updatedAt = new Date().toISOString();
    current = next;
    emit();
  },
  newEmpty(opts?: { title?: string; author?: string | null }): GddFile {
    clearAssetUrlCache();
    const f = newEmptyGdd(opts);
    current = f;
    emit();
    return f;
  },
};

// =====================================================================
// React hooks
// =====================================================================

const SERVER_SNAPSHOT: GddFile | null = null;

export function useGdd(): GddFile | null {
  return useSyncExternalStore(store.subscribe, store.get, () => SERVER_SNAPSHOT);
}

// ponytail: returns true once the initial IDB load (or localStorage
// migration) has resolved. Editors block on this to avoid flashing the
// "no project" state during the async read.
export function useGddReady(): boolean {
  const subscribe = useCallback((l: () => void) => {
    let cancelled = false;
    ready.then(() => { if (!cancelled) l(); });
    return () => { cancelled = true; };
  }, []);
  const getSnapshot = useCallback(() => readyFlag, []);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useProject(): Project | null {
  return useGdd()?.project ?? null;
}

export function useSegments(): Segment[] {
  return useGdd()?.segments ?? [];
}

export function useTaskGroups(): TaskGroup[] {
  return useGdd()?.taskGroups ?? [];
}

export function useDecisions(): Decision[] {
  return useGdd()?.decisions ?? [];
}

export function useFeatures(): Feature[] {
  return useGdd()?.features ?? [];
}

export function useBrainstorm(): BrainstormData {
  return (
    useGdd()?.brainstorm ?? { nodes: [], edges: [], shapes: [] }
  );
}

// ponytail: setters are tiny adapters so components don't reach into the
// store internals. Each one mutates the right slice and triggers a notify.
export const actions = {
  patchProject(patch: Partial<Project>): void {
    store.update((f) => ({
      ...f,
      project: { ...f.project, ...patch },
    }));
  },
  setAuthor(author: string | null): void {
    store.update((f) => ({ ...f, author }));
  },
  setSegments(segments: Segment[]): void {
    store.update((f) => ({ ...f, segments }));
  },
  addSegment(type: SegmentType, atIndex?: number): Segment {
    const seg: Segment = {
      id: cryptoId(),
      type,
      order: 0,
      data: defaultSegmentData(type) as any,
    };
    store.update((f) => {
      const next = [...f.segments];
      const insertAt = atIndex ?? next.length;
      next.splice(insertAt, 0, seg);
      return { ...f, segments: renumber(next) };
    });
    return seg;
  },
  updateSegment(id: string, data: any): void {
    store.update((f) => ({
      ...f,
      segments: f.segments.map((s) => (s.id === id ? { ...s, data } : s)),
    }));
  },
  removeSegment(id: string): void {
    store.update((f) => ({
      ...f,
      segments: renumber(f.segments.filter((s) => s.id !== id)),
    }));
  },
  reorderSegments(orderedIds: string[]): void {
    store.update((f) => {
      const map = new Map(f.segments.map((s) => [s.id, s]));
      const next: Segment[] = [];
      for (const id of orderedIds) {
        const s = map.get(id);
        if (s) next.push(s);
      }
      return { ...f, segments: renumber(next) };
    });
  },
  setTaskGroups(groups: TaskGroup[]): void {
    store.update((f) => ({ ...f, taskGroups: groups }));
  },
  setDecisions(decisions: Decision[]): void {
    store.update((f) => ({ ...f, decisions }));
  },
  setFeatures(features: Feature[]): void {
    store.update((f) => ({ ...f, features }));
  },
  setBrainstorm(data: BrainstormData): void {
    store.update((f) => ({ ...f, brainstorm: data }));
  },
};

// =====================================================================
// helpers
// =====================================================================

function renumber(segments: Segment[]): Segment[] {
  return segments.map((s, i) => ({ ...s, order: i }));
}

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
