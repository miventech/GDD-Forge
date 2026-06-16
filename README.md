# GDD-Forge

Una herramienta local, simple y bonita para escribir y mantener **Game Design Documents** (GDDs). Múltiples proyectos, segmentos editables, checklist con grupos de tareas, assets, todo en tu navegador.

Stack: **Next.js 15** (App Router) · **TypeScript** · **Tailwind** · **Lucide Icons** · **100% client-side**

---

## Características

- **100% local, sin servidor**
  - Todo corre en tu navegador
  - Sin cuenta, sin login, sin base de datos
  - Tus datos se guardan en archivos `.GDD` en tu disco
- **Múltiples GDDs**
  - Cada proyecto es un archivo `.GDD` independiente
  - Abrí, editá, guardá donde quieras
- **Editor visual con segmentos** (12 tipos):
  - Hero (portada), Texto, Imagen, Grilla de tarjetas
  - Callout, Personaje, Enemigo, Jefe
  - Core loop, Diálogo NPC, Lienzo, Curva de tensión
- **Checklist con grupos de tareas**
  - Grupos personalizables (color + icono Lucide)
  - Estados: Pendiente / En progreso / Hecho / Bloqueado
  - Prioridades: Baja / Media / Alta
  - Mover tareas entre grupos
- **Decisiones de diseño**
  - Registro de decisiones con estado (abierta/tomada/revertida)
  - Link a segmentos afectados
- **Features con dependencias**
  - Mapeo de features del juego
  - Dependencias entre features
  - Link a segmentos que las implementan
- **Brainstorm visual**
  - Canvas de nodos para lluvia de ideas
  - Conexiones entre nodos
  - Grupos visuales
- **Upload de imágenes**
  - Las imágenes se guardan como archivos sueltos dentro del `.GDD` (ZIP)
  - Sin servidor de archivos
- **Export a HTML/Markdown/PDF**
  - Generá documentos portables desde tu GDD
- **Tema claro/oscuro** con tokens de diseño consistentes
- **Iconos Lucide** (ISC) — sin emojis genéricos

---

## Requisitos

- Node.js 20+ (probado en 24.x)
- npm 10+

---

## Setup rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Correr en desarrollo
npm run dev
# → http://localhost:3000
```

## Build para producción

```bash
npm run build
# Genera un directorio `out/` con archivos estáticos
# Podés hostearlo en cualquier servidor estático (Vercel, Netlify, GitHub Pages, etc.)
```

### Nota sobre Windows + exFAT

Si tu proyecto está en un disco formateado como **exFAT** (común en discos externos), vas a ver errores durante el build. Esto es un problema conocido de Node.js + Windows + exFAT.

**Soluciones:**
1. **Mové el proyecto a un disco NTFS** (recomendado)
2. **Usá WSL** (Windows Subsystem for Linux)
3. **Usá el dev server** para desarrollo local: `npm run dev`

El dev server funciona correctamente en exFAT. El problema es solo con el build de producción.

---

## Cómo funciona

1. **Nuevo GDD**: Creá un proyecto vacío desde la landing
2. **Abrir .GDD**: Cargá un archivo `.GDD` existente
3. **Editar**: Agregá segmentos, checklist, decisiones, features, brainstorm
4. **Guardar .GDD**: Descargá el archivo con todos tus cambios
5. **Compartir**: Enviá el archivo `.GDD` por email, Discord, lo que sea

Todo se guarda automáticamente en **IndexedDB** mientras editás, pero el archivo `.GDD` es la fuente de verdad. Si limpiás los datos del navegador, perdés los cambios no guardados.

---

## Formato del archivo .GDD

Desde la versión 2, el archivo `.GDD` es un **ZIP** con esta estructura:

```
mi-gdd-v0.1.gdd                ← ZIP
├── manifest.json               ← metadata + segmentos (refs a assets)
└── assets/
    ├── 7a3f…f2c1.png           ← una entrada por imagen única
    ├── c91e…0a4b.jpg
    └── 4d2b…b81d.svg
```

El `manifest.json` es el JSON completo del GDD, igual que antes, excepto que los campos con imágenes (`image.url`, `character.avatarUrl`, `enemy.avatarUrl`, `boss.avatarUrl`, `note.drawing`) guardan **referencias** a archivos en `assets/` en vez de data URLs base64:

```json
{
  "magic": "GDDFORGE/2",
  "version": 2,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "author": "Tu nombre",
  "project": { "id": "uuid", "title": "Mi GDD", "version": "0.1", "status": "draft", "accent": "purple" },
  "segments": [
    {
      "id": "s1",
      "type": "image",
      "order": 0,
      "data": { "url": "assets/7a3f…f2c1.png", "alt": "…", "width": "normal" }
    }
  ],
  "taskGroups": [...],
  "decisions": [...],
  "features": [...],
  "brainstorm": {...}
}
```

**Beneficios del formato v2:**

- **Archivos más chicos**: las imágenes se almacenan una sola vez (dedup por SHA-256) y los PNG/JPG no se recomprimen
- **Compatible con v1**: la app abre archivos `.GDD` viejos (JSON con data URLs) y los upgradea automáticamente al guardar
- **Inspeccionable**: cualquier unzip-tool abre el archivo y se ve todo

### Migración desde v1

Si tenés archivos `.GDD` de la versión anterior (JSON plano):

1. Abrilos normalmente desde la app (los lee como v1)
2. Apretá "Guardar .GDD" — se guardan como v2 (ZIP) automáticamente

No hace falta tocar nada en disco. El `magic`/`version` se actualizan solos en memoria.

---

## Almacenamiento

El GDD activo y todas las imágenes viven en **IndexedDB** (no `localStorage`), organizados en una sola base `gddml` (versión 2):

- `current` (object store) → GddFile activo, serializado con refs (`gdd-asset://<hash>.<ext>`)
- `assets` (object store) → blobs por SHA-256 hash

**Cómo funciona en runtime:**

1. Al cargar la app, `initialLoad()` lee el `current` de IDB (o migra desde `localStorage` v1/v2 si es la primera vez)
2. Los refs `gdd-asset://` en los segmentos **no se resuelven hasta que un componente los pide** — el hook `useAssetUrl(ref)` hace el fetch de IDB on-demand
3. Los blob URLs (`URL.createObjectURL`) se cachean en memoria y se revocan al cerrar el doc
4. Al guardar, `buildManifest` lee los blobs de IDB y los empaqueta en el ZIP

**Beneficios:**

- **`localStorage` no se satura**: el doc activo es chico (refs en vez de data URLs) y el índice de recientes cabe en unos pocos KB
- **Archivos en disco más chicos**: dedup por SHA-256 + DEFLATE selectivo por MIME (PNG/JPG en STORE, SVG y manifest en DEFLATE)
- **Carga rápida de GDDs grandes**: las imágenes no se materializan en RAM hasta que se renderizan

**Migración v1 → v2**: si tenías un GDD abierto en `localStorage` de una versión previa, se levanta automáticamente a IDB en el primer load. La key vieja se borra.

**GC de assets huérfanos**: hay `pruneOrphanAssets(keepHashes)` en `src/lib/asset-store.ts` para borrar blobs no referenciados. Sin UI por ahora — disponible desde devtools si hace falta limpiar.

---

## Tipos de segmento

Todos se almacenan como JSON en el archivo `.GDD`. Las definiciones tipadas viven en `src/lib/segment-types.ts`.

| Tipo | Uso |
|---|---|
| `hero` | Portada del GDD (eyebrow, título, palabra acentuada, tags) |
| `text` | Párrafo con heading opcional |
| `image` | Imagen (asset ref) + caption + ancho configurable |
| `grid` | Grilla 2, 3 o 4 columnas con icono, título y body |
| `callout` | Caja destacada con borde lateral de color |
| `character` | Tarjeta de personaje (nombre, rol, descripción, avatar) |
| `enemy` | Enemigo con stats, comportamientos, fórmulas |
| `boss` | Jefe con fases, stats, debilidades |
| `loop` | Core loop (grafo de nodos con conexiones) |
| `dialogue` | Diálogo NPC (árbol de decisiones) |
| `note` | Lienzo libre (texto + dibujo) |
| `tension` | Curva de tensión (puntos en gráfico 2D) |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── editor/              # Editor principal (tabs: Doc/Checklist/Decisiones/Features/Brainstorm)
│   ├── layout.tsx
│   ├── page.tsx             # Landing + recientes + Nuevo/Abrir
│   └── globals.css
├── components/
│   ├── gdd/                 # SegmentEditors, SegmentViews, GddEditor, NodeCanvas, etc.
│   ├── ui/                  # Button, Input, Primitives
│   ├── ChecklistClient.tsx
│   ├── DecisionsClient.tsx
│   ├── FeaturesClient.tsx
│   ├── BrainstormCanvas.tsx
│   ├── ExportButton.tsx
│   ├── ImportSegmentsButton.tsx
│   ├── IconMap.tsx
│   ├── Providers.tsx
│   └── ThemeToggle.tsx
└── lib/
    ├── gdd-file.ts          # Formato .GDD v2 (ZIP), import/export
    ├── gdd-manifest.ts      # buildManifest / hydrateFile / uploadAsset
    ├── gdd-store.ts         # Store cliente con IDB + useGddReady
    ├── asset-store.ts       # IndexedDB wrapper (assets + current)
    ├── asset-urls.ts        # useAssetUrl hook + cache de blob URLs
    ├── export.ts            # Export a HTML/Markdown/PDF
    ├── segment-types.ts     # Tipos de segmento y default data
    ├── templates.ts         # Templates de GDD por género
    └── utils.ts

out/                         # Build estático (generado por `npm run build`)
```

---

## Atajos para desarrollo

```bash
npm run dev          # Servidor dev (Turbopack)
npm run build        # Build producción (estático)
npm run lint         # Linter
```

---

## Deploy

El build genera archivos estáticos en `out/`. Podés deployarlo en:

- **Vercel**: `vercel --prod` (detecta Next.js automáticamente)
- **Netlify**: Drag & drop de `out/` o conectar repo
- **GitHub Pages**: Push `out/` a la rama `gh-pages`
- **Cualquier servidor estático**: Apache, Nginx, S3, etc.

No necesitás base de datos, variables de entorno, ni servidor.

---

## Iconos

Todos los iconos vienen de [**Lucide**](https://lucide.dev) (licencia ISC, equivalente a CC0 en la práctica). Hay 100+ iconos permitidos, seleccionables desde los editores (segmentos, grupos de checklist).

---

## Migración desde la versión anterior

Si tenías la versión con base de datos (SQLite + Prisma + NextAuth):

1. Exportá tus proyectos desde la versión anterior (si aún tenés la DB)
2. Abrí la nueva versión
3. Creá nuevos GDDs o importá archivos `.GDD` si los tenías

La nueva versión no tiene migración automática. Si necesitás migrar datos, podés escribir un script que lea la DB SQLite y genere archivos `.GDD`.

---

## Créditos

- **Iconos**: [Lucide](https://lucide.dev) (ISC) — 100+ iconos seleccionables en editores
- **Formato v2 (ZIP + IndexedDB + lazy-load)**: la migración completa fue asistida por [opencode](https://opencode.ai)
- **fflate**: la librería de ZIP que usa el formato v2 ([fflate](https://github.com/101arrowz/fflate), MIT)

---

## Licencia

MIT — hacé lo que quieras.
