"use client";
// asset-urls.ts — global cache of asset-ref → object-URL mappings + a
// React hook for components to resolve refs into displayable URLs.
//
// The cache is module-level so every component shares the same blob URL
// for the same asset (no duplicates, no extra IDB reads). gdd-store.ts
// calls clearAssetUrlCache() when the active document changes so closed
// documents don't leak their object URLs.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getAsset } from "./asset-store";
import { isAssetRef as isAssetRefFromManifest, refToHash as manifestRefToHash } from "./gdd-manifest";

const cache = new Map<string, string>();   // hash → objectURL
const inflight = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

// re-export the canonical detector and ref parser so callers don't need
// to pull from gdd-manifest directly.
export const isAssetRef = isAssetRefFromManifest;
export const refToHash = manifestRefToHash;

function getCached(hash: string): string | undefined {
  return cache.get(hash);
}

function loadHash(hash: string): Promise<string> {
  const cached = cache.get(hash);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(hash);
  if (pending) return pending;
  const promise = (async () => {
    const asset = await getAsset(hash);
    if (!asset) throw new Error(`Asset no encontrado: ${hash}`);
    const url = URL.createObjectURL(asset.blob);
    cache.set(hash, url);
    notify();
    return url;
  })();
  inflight.set(hash, promise);
  promise.catch(() => {}).finally(() => inflight.delete(hash));
  return promise;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ponytail: clear is called on doc open/replace/close. Revoke every URL
// we own — pages can't hold URL.createObjectURL across navigations safely.
export function clearAssetUrlCache(): void {
  for (const url of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
  // ponytail: in-flight loads are abandoned. Their notify() will fire on
  // resolve, but the cache is empty so useAssetUrl will see no change.
  inflight.clear();
  notify();
}

// ponytail: pre-warm the cache for a batch of refs (used on file open).
// Returns a promise that resolves when every ref has been loaded or failed.
export async function preloadAssetRefs(refs: string[]): Promise<void> {
  const hashes = new Set<string>();
  for (const ref of refs) {
    if (isAssetRef(ref)) hashes.add(refToHash(ref));
  }
  await Promise.all(
    Array.from(hashes).map((h) => loadHash(h).catch(() => ""))
  );
}

// ponytail: returns a snapshot getter that captures `ref` in a closure.
// useSyncExternalStore calls it on every render to detect cache changes
// without re-running effects.
function makeSnapshot(ref: string | undefined | null): () => string {
  return () => {
    if (!ref) return "";
    if (!isAssetRef(ref)) return ref;  // external URL or empty pass-through
    const hash = refToHash(ref);
    return cache.get(hash) ?? "";
  };
}

export function useAssetUrl(ref: string | undefined | null): string {
  // ponytail: useSyncExternalStore ties us to the cache's notify() so
  // components re-render exactly when a URL becomes available. The
  // snapshot closure is stable per ref.
  const getSnapshot = useCallback(makeSnapshot(ref), [ref]);
  const getServerSnapshot = useCallback(() => "", []);
  const url = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // ponytail: kick off the IDB read on first render if the cache is cold.
  // loadHash is idempotent (pending map dedupes), so multiple components
  // asking for the same ref share one read.
  useEffect(() => {
    if (!ref || !isAssetRef(ref)) return;
    const hash = refToHash(ref);
    if (cache.has(hash)) return;
    loadHash(hash).catch(() => {});
  }, [ref]);

  return url;
}
