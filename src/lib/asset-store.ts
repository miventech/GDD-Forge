// asset-store.ts — IndexedDB-backed blob storage for GDD assets.
//
// Database: gddml (version 1)
// Object store: assets (keyPath: "hash")
// Stored value: { hash, blob, mime }
//
// Why Blob and not Uint8Array: Blobs survive IDB structured-clone as opaque
// references and can be served straight to <img> via createObjectURL. Going
// through Uint8Array would force a copy + encode step on every display.
//
// Raw indexedDB (no `idb` dep) — the wrapper is ~50 lines and we don't need
// the rest of `idb`'s surface. Lazy DB open, cached per session.

const DB_NAME = "gddml";
const DB_VERSION = 2;
const STORE = "assets";
const STORE_CURRENT = "current";
const CURRENT_KEY = "doc";

export type StoredAsset = {
  hash: string;
  blob: Blob;
  mime: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      // v1: asset blob store (keyed by SHA-256 hash).
      if (oldVersion < 1 && !db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "hash" });
      }
      // v2: single-slot "current" store for the active GddFile. Holds
      // the manifest-shaped file (refs, not data URLs) so localStorage
      // stays small. Asset blobs live in STORE; they're loaded on demand
      // by the resolver hook.
      if (oldVersion < 2 && !db.objectStoreNames.contains(STORE_CURRENT)) {
        db.createObjectStore(STORE_CURRENT);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error(`No se pudo abrir IndexedDB: ${req.error?.message ?? "error desconocido"}`));
    // ponytail: if the user has stale caches from another version, allow the
    // DB to be recreated on the next load. `blocked` fires when another tab
    // is holding an older version open — we just wait it out.
    req.onblocked = () => {
      // noop: the older tab will close eventually and onsuccess will fire
    };
  });
  return dbPromise;
}

function reqOk<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB request failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
  });
}

export async function putAsset(asset: StoredAsset): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  // ponytail: put() is upsert — same hash means same content (we keyed by
  // sha256), so re-storing is a no-op write.
  await reqOk(store.put(asset));
  await txDone(tx);
}

export async function getAsset(hash: string): Promise<StoredAsset | null> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const result = await reqOk(tx.objectStore(STORE).get(hash) as IDBRequest<StoredAsset | undefined>);
  return result ?? null;
}

export async function deleteAsset(hash: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  await reqOk(tx.objectStore(STORE).delete(hash));
  await txDone(tx);
}

export async function getAllAssets(): Promise<Map<string, StoredAsset>> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const all = await reqOk(tx.objectStore(STORE).getAll() as IDBRequest<StoredAsset[]>);
  return new Map(all.map((a) => [a.hash, a]));
}

// ponytail: clear() is destructive and irreversible. Used by the
// "reset local storage" devtools action and the future "wipe GDD" flow.
export async function clearAssets(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  await reqOk(tx.objectStore(STORE).clear());
  await txDone(tx);
}

// =====================================================================
// Current document — the active GddFile lives in IDB so localStorage
// stays out of the way (no quota fights with large manifests).
// ponytail: these are typed as `unknown` to avoid a circular import with
// gdd-file.ts. Callers narrow to GddFile at the boundary.
// =====================================================================

export async function getCurrentDoc(): Promise<unknown | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_CURRENT, "readonly");
  const result = await reqOk(tx.objectStore(STORE_CURRENT).get(CURRENT_KEY));
  return result ?? null;
}

export async function setCurrentDoc(doc: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_CURRENT, "readwrite");
  await reqOk(tx.objectStore(STORE_CURRENT).put(doc, CURRENT_KEY));
  await txDone(tx);
}

export async function clearCurrentDoc(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_CURRENT, "readwrite");
  await reqOk(tx.objectStore(STORE_CURRENT).delete(CURRENT_KEY));
  await txDone(tx);
}

// ponytail: orphan assets are blobs in STORE that the current doc doesn't
// reference. Removing them shrinks IDB without breaking the active doc.
// Caveat: a second GDD open in another tab could reference these —
// single-active-doc model only. Surfaced as an opt-in action; no UI yet.
export async function pruneOrphanAssets(keepHashes: Set<string>): Promise<number> {
  const db = await openDb();
  const all = await getAllAssets();
  const toDelete: string[] = [];
  for (const hash of all.keys()) {
    if (!keepHashes.has(hash)) toDelete.push(hash);
  }
  if (toDelete.length === 0) return 0;
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const hash of toDelete) store.delete(hash);
  await txDone(tx);
  return toDelete.length;
}

// ponytail: SSR/build-time guard. The store is a browser-only API; calling
// these from a server context throws. Components that use the store
// already have "use client" directives.
export function isAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
