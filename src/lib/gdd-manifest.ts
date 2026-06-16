// gdd-manifest.ts — v2 manifest format for .gdd files (ZIP-based), and
// the asset-ref model used in memory.
//
// v1: .gdd = JSON with data URLs embedded in segment fields.
// v2: .gdd = ZIP with manifest.json + assets/<hash>.<ext>
//
// In memory (GddFile + segment data) we use "gdd-asset://<hash>.<ext>"
// refs. Asset bytes live in IndexedDB (see asset-store.ts). On file save
// the refs are resolved through IDB and the bytes are written into the
// ZIP. On file load, the ZIP's bytes are written into IDB and the
// segments get refs in memory.
//
// For backwards compat with v1 GDDs, the load path also accepts segments
// that still carry a raw data URL — they're migrated to refs on the way
// in (dataUrlToAssetRef) so the in-memory state is consistent.

import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import type { GddFile } from "./gdd-file";
import type { Segment } from "./segment-types";
import { putAsset, getAsset } from "./asset-store";

export const MANIFEST_MAGIC = "GDDFORGE/2" as const;
export const MANIFEST_VERSION = 2 as const;

export type ManifestFile = Omit<GddFile, "version" | "magic"> & {
  magic: typeof MANIFEST_MAGIC;
  version: typeof MANIFEST_VERSION;
};

const ASSET_PREFIX = "assets/";
export const REF_SCHEME = "gdd-asset://";

// ponytail: covers everything the editor produces — file uploads, canvas
// drawings, paste. SVG included for completeness.
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const EXT_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXT).map(([k, v]) => [v, k]),
);

// ponytail: lenient data-URL parser. Some browsers emit
// `data:image/svg+xml;charset=utf-8;base64,...` — we split on the first
// comma, take the first semicolon-delimited chunk as the MIME, and only
// require that the rest of the header mentions `base64`.
function parseDataUrl(value: string): { mime: string; base64: string } | null {
  if (!value.startsWith("data:")) return null;
  const comma = value.indexOf(",");
  if (comma < 0) return null;
  const header = value.slice(5, comma);
  const base64 = value.slice(comma + 1);
  const mime = header.split(";")[0].toLowerCase();
  if (!header.toLowerCase().includes("base64")) return null;
  return { mime, base64 };
}

// ponytail: these return plain `boolean`, not type predicates, because the
// callers already narrow `value` to `string` upstream with a typeof check.
// Type predicates on a string-narrowed value would re-narrow the else
// branch to `never`, breaking subsequent reads.
export function isAssetRef(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(REF_SCHEME);
}

function isManifestAssetPath(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(ASSET_PREFIX);
}

function isAssetDataUrl(value: unknown): boolean {
  return typeof value === "string" && parseDataUrl(value) !== null;
}

// ponytail: which data field on each segment type carries an asset. Add a
// new image-bearing type here in one line.
function getAssetField(seg: Segment): "url" | "avatarUrl" | "drawing" | null {
  switch (seg.type) {
    case "image":
      return "url";
    case "character":
    case "enemy":
    case "boss":
      return "avatarUrl";
    case "note":
      return "drawing";
    default:
      return null;
  }
}

// ponytail: SHA-256 is the dedup key. Web Crypto is async-only — fine,
// buildManifest is called from the save flow, which is already async.
async function sha256(bytes: Uint8Array): Promise<string> {
  // ponytail: pass an ArrayBuffer view, not the typed array wrapper, so
  // TS 5.7+ strict ArrayBuffer types don't widen the buffer to
  // ArrayBufferLike (which crypto.subtle rejects).
  const hash = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  const view = new Uint8Array(hash);
  let hex = "";
  for (let i = 0; i < view.length; i++) hex += view[i].toString(16).padStart(2, "0");
  return hex;
}

function dataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array } {
  const m = parseDataUrl(dataUrl);
  if (!m) throw new Error(`Not a data URL: ${dataUrl.slice(0, 40)}…`);
  const bin = atob(m.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: m.mime, bytes };
}

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

function mimeOfFilename(filename: string): string {
  return EXT_TO_MIME[extOf(filename)] ?? "application/octet-stream";
}

// ponytail: split a "<hash>.<ext>" filename into (hash, ext). Returns null
// for malformed strings.
function splitFilename(filename: string): { hash: string; ext: string } | null {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return null;
  return { hash: filename.slice(0, dot), ext: filename.slice(dot + 1) };
}

// ponytail: "gdd-asset://<hash>.<ext>" → { hash, ext } or null.
function parseRef(value: string): { hash: string; ext: string } | null {
  if (!value.startsWith(REF_SCHEME)) return null;
  return splitFilename(value.slice(REF_SCHEME.length));
}

export function refToHash(value: string): string {
  // "gdd-asset://<hash>.<ext>" → "<hash>"
  const tail = value.slice(REF_SCHEME.length);
  const dot = tail.lastIndexOf(".");
  return dot >= 0 ? tail.slice(0, dot) : tail;
}

// =====================================================================
// Asset upload (file → IDB → ref)
// =====================================================================

export async function uploadAsset(file: File | Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const hash = await sha256(bytes);
  const mime = (file as File).type || "application/octet-stream";
  const ext = MIME_TO_EXT[mime] ?? extOf(file instanceof File ? file.name : "") ?? "bin";
  const blob = new Blob([buf], { type: mime });
  await putAsset({ hash, blob, mime });
  return `${REF_SCHEME}${hash}.${ext}`;
}

export async function dataUrlToAssetRef(dataUrl: string): Promise<string> {
  const { mime, bytes } = dataUrlToBytes(dataUrl);
  const hash = await sha256(bytes);
  const ext = MIME_TO_EXT[mime] ?? "bin";
  // ponytail: TS 5.7+ strict BlobPart typing rejects Uint8Array<ArrayBufferLike>
  // directly. Slice into a fresh ArrayBuffer so the type widens correctly.
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  await putAsset({ hash, blob, mime });
  return `${REF_SCHEME}${hash}.${ext}`;
}

// ponytail: walk a freshly-loaded v1 GddFile and migrate any data URLs to
// refs + IDB. Returns a new GddFile. Idempotent: already-ref values
// pass through unchanged.
export async function migrateDataUrlsToRefs(file: GddFile): Promise<GddFile> {
  const segments = await Promise.all(
    file.segments.map(async (seg) => {
      const field = getAssetField(seg);
      if (!field) return seg;
      const value = (seg.data as Record<string, unknown>)[field];
      if (typeof value !== "string") return seg;
      if (isAssetRef(value)) return seg; // already migrated
      if (isAssetDataUrl(value)) {
        const ref = await dataUrlToAssetRef(value);
        return { ...seg, data: { ...seg.data, [field]: ref } } as Segment;
      }
      return seg;
    })
  );
  return { ...file, segments };
}

// ponytail: resolve every asset ref in the file to a data URL. Used by
// the HTML/Markdown/PDF export pipeline — these formats need srcs that
// work standalone (no IDB at view time). External URLs and data URLs
// pass through; refs go through the IDB lookup. Empty values are skipped.
export async function buildExportUrls(file: GddFile): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  const seen = new Set<string>();
  for (const seg of file.segments) {
    const field = getAssetField(seg);
    if (!field) continue;
    const value = (seg.data as Record<string, unknown>)[field];
    if (typeof value !== "string" || value === "" || seen.has(value)) continue;
    seen.add(value);
    if (!isAssetRef(value)) {
      // ponytail: data URLs and external URLs are already self-contained.
      urls[value] = value;
      continue;
    }
    const hash = refToHash(value);
    const asset = await getAsset(hash);
    if (!asset) continue;
    const dataUrl = await blobToDataUrl(asset.blob);
    urls[value] = dataUrl;
  }
  return urls;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("readAsDataURL failed"));
    reader.readAsDataURL(blob);
  });
}

// =====================================================================
// Build / hydrate
// =====================================================================

export type BuildResult = {
  manifest: ManifestFile;
  assets: Map<string, Uint8Array>; // filename → bytes
};

export async function buildManifest(file: GddFile): Promise<BuildResult> {
  const assets = new Map<string, Uint8Array>();
  // ponytail: segments can carry three things in their asset field:
  //   - "gdd-asset://<hash>.<ext>" (canonical, post-hydrate)
  //   - data URL (legacy v1, or freshly uploaded but not yet normalized)
  //   - "" (empty)
  // Both ref and data URL paths land in the same assets map; dedup is by
  // SHA-256, so the same image in N places becomes 1 file.
  const tasks: Promise<Segment>[] = file.segments.map((seg) => {
    const field = getAssetField(seg);
    if (!field) return Promise.resolve(seg);
    const value = (seg.data as Record<string, unknown>)[field];
    if (typeof value !== "string" || value === "") return Promise.resolve(seg);
    return (async () => {
      // Path A: in-memory ref — read bytes from IDB.
      if (isAssetRef(value)) {
        const parsed = parseRef(value);
        if (!parsed) return seg;
        const filename = `${parsed.hash}.${parsed.ext}`;
        if (!assets.has(filename)) {
          const asset = await getAsset(parsed.hash);
          if (!asset) {
            // ponytail: orphan ref (asset removed from IDB). Empty the
            // field so the editor shows a placeholder rather than a
            // broken image. The next save won't include this asset.
            return { ...seg, data: { ...seg.data, [field]: "" } } as Segment;
          }
          const buf = await asset.blob.arrayBuffer();
          assets.set(filename, new Uint8Array(buf));
        }
        return {
          ...seg,
          data: { ...seg.data, [field]: `${ASSET_PREFIX}${filename}` },
        } as Segment;
      }
      // Path B: data URL (legacy or fresh upload edge case).
      if (isAssetDataUrl(value)) {
        const { mime, bytes } = dataUrlToBytes(value);
        const hash = await sha256(bytes);
        const ext = MIME_TO_EXT[mime] ?? "bin";
        const filename = `${hash}.${ext}`;
        if (!assets.has(filename)) assets.set(filename, bytes);
        return {
          ...seg,
          data: { ...seg.data, [field]: `${ASSET_PREFIX}${filename}` },
        } as Segment;
      }
      // Path C: external URL or unknown — pass through unchanged.
      return seg;
    })();
  });
  const segments = await Promise.all(tasks);
  const manifest: ManifestFile = {
    ...file,
    magic: MANIFEST_MAGIC,
    version: MANIFEST_VERSION,
    segments,
  };
  return { manifest, assets };
}

export async function hydrateFile(
  manifest: ManifestFile,
  assets: Map<string, Uint8Array>,
): Promise<GddFile> {
  // Step 1: write every asset into IDB so useAssetUrl() can resolve refs.
  // ponytail: parallel writes — IDB batches them efficiently.
  const writes: Promise<void>[] = [];
  for (const [filename, bytes] of assets) {
    const parsed = splitFilename(filename);
    if (!parsed) continue;
    const mime = mimeOfFilename(filename);
    // ponytail: same TS 5.7+ BlobPart issue as dataUrlToAssetRef — coerce
    // the buffer slice so the type widens to ArrayBuffer.
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
    writes.push(putAsset({ hash: parsed.hash, blob, mime }));
  }
  await Promise.all(writes);

  // Step 2: rewrite segments — manifest path "assets/<hash>.<ext>" becomes
  // the in-memory ref "gdd-asset://<hash>.<ext>". Missing assets become "".
  const segments: Segment[] = manifest.segments.map((seg) => {
    const field = getAssetField(seg);
    if (!field) return seg;
    const value = (seg.data as Record<string, unknown>)[field];
    if (typeof value !== "string") return seg;
    let parsed: { hash: string; ext: string } | null = null;
    if (isAssetRef(value)) {
      parsed = parseRef(value);
    } else if (isManifestAssetPath(value)) {
      parsed = splitFilename(value.slice(ASSET_PREFIX.length));
    }
    if (!parsed) return seg;
    const filename = `${parsed.hash}.${parsed.ext}`;
    if (!assets.has(filename)) {
      return { ...seg, data: { ...seg.data, [field]: "" } } as Segment;
    }
    return {
      ...seg,
      data: { ...seg.data, [field]: `${REF_SCHEME}${filename}` },
    } as Segment;
  });
  return { ...manifest, segments } as GddFile;
}

// =====================================================================
// ZIP pack / unpack
// =====================================================================

// ponytail: STORE for already-compressed rasters (PNG/JPG/GIF/WebP),
// DEFLATE for SVG (it's text — ~60% smaller) and the manifest. Level 6
// is fflate's default; raising it buys <1% on big docs at the cost of
// noticeably slower saves.
const TEXT_ASSET_EXTS = new Set(["svg"]);

export function packZip(result: BuildResult, deflateManifest = true): Uint8Array {
  const { manifest, assets } = result;
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  files["manifest.json"] = [strToU8(JSON.stringify(manifest)), { level: deflateManifest ? 6 : 0 }];
  for (const [name, bytes] of assets) {
    const ext = extOf(name);
    const level: 0 | 6 = TEXT_ASSET_EXTS.has(ext) ? 6 : 0;
    files[`${ASSET_PREFIX}${name}`] = [bytes, { level }];
  }
  return zipSync(files, { level: 0 });
}

export type Unpacked = {
  manifest: ManifestFile;
  assets: Map<string, Uint8Array>;
};

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04

export function isZipBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === ZIP_MAGIC[0] &&
    bytes[1] === ZIP_MAGIC[1] &&
    bytes[2] === ZIP_MAGIC[2] &&
    bytes[3] === ZIP_MAGIC[3]
  );
}

export function unpackZip(bytes: Uint8Array): Unpacked {
  // ponytail: UnzipFileInfo has no `dir` flag in fflate's types — directories
  // are represented by trailing slashes. We don't filter; we just ignore
  // empty-name / directory entries on the way out.
  const files = unzipSync(bytes);
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) throw new Error("Falta manifest.json en el .gdd");
  const manifest = JSON.parse(strFromU8(manifestBytes)) as ManifestFile;
  if (manifest.magic !== MANIFEST_MAGIC) {
    throw new Error(`Manifest inválido (magic: ${String(manifest.magic)})`);
  }
  if (manifest.version !== MANIFEST_VERSION) {
    throw new Error(`Versión de manifest no soportada: ${String(manifest.version)}`);
  }
  const assets = new Map<string, Uint8Array>();
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith(ASSET_PREFIX) && !path.endsWith("/")) {
      assets.set(path.slice(ASSET_PREFIX.length), data);
    }
  }
  return { manifest, assets };
}
