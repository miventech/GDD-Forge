"use client";
import { useState, useCallback, useMemo } from "react";
import {
  Trash2, ChevronUp, ChevronDown, Edit3, Eye, Plus, Sparkles,
  Search, X, Filter,
} from "lucide-react";
import * as Lucide from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea } from "@/components/ui/Input";
import { ImportSegmentsButton } from "@/components/ImportSegmentsButton";
import { ImportItem } from "@/lib/import-segments";
import { SegmentSidebar } from "@/components/gdd/SegmentSidebar";
import { TagEditor } from "@/components/gdd/TagEditor";
import { segmentMatchesQuery } from "@/lib/segment-search";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  KeyboardSensor, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SEGMENT_ICONS, SEGMENT_LABELS, SEGMENT_TYPES, SegmentType, defaultSegmentData, ACCENT_COLORS } from "@/lib/segment-types";
import {
  HeroView, TextView, ImageView, GridView, CalloutView,
  CharacterView, EnemyView, BossView, LoopView, DialogueView, NoteView,
} from "@/components/gdd/SegmentViews";
import {
  HeroEditor, TextEditor, ImageEditor, GridEditor, CalloutEditor,
  CharacterEditor, EnemyEditor, BossEditor, LoopEditor, DialogueEditor, NoteEditor, TensionEditor,
} from "@/components/gdd/SegmentEditors";
import { TensionView } from "@/components/gdd/TensionCanvas";
import { ExportButton } from "@/components/ExportButton";
import { useGdd, actions, store } from "@/lib/gdd-store";
import type { Segment, Project } from "@/lib/gdd-file";
import { newId } from "@/lib/gdd-file";

export function GddEditor() {
  const file = useGdd();
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SegmentType | "all">("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const segments = file?.segments ?? [];

  function addSegment(type: SegmentType, atIndex?: number) {
    const ns: Segment = {
      id: newId(),
      type,
      order: 0,
      data: defaultSegmentData(type) as any,
    };
    store.update((f) => {
      const next = [...f.segments];
      const insertAt = atIndex ?? next.length;
      next.splice(insertAt, 0, ns);
      return { ...f, segments: renumber(next) };
    });
    setEditingId(ns.id);
    setMode("edit");
  }

  function updateSegment(id: string, data: any) {
    store.update((f) => ({
      ...f,
      segments: f.segments.map((s) => (s.id === id ? { ...s, data } : s)),
    }));
  }

  function removeSegment(id: string) {
    store.update((f) => ({
      ...f,
      segments: renumber(f.segments.filter((s) => s.id !== id)),
    }));
  }

  function moveSegment(id: string, dir: -1 | 1) {
    store.update((f) => {
      const i = f.segments.findIndex((s) => s.id === id);
      if (i < 0) return f;
      const j = i + dir;
      if (j < 0 || j >= f.segments.length) return f;
      const next = [...f.segments];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, segments: renumber(next) };
    });
  }

  function importSegments(items: ImportItem[]) {
    const ns: Segment[] = items.map((it, i) => ({
      id: newId(),
      type: it.type,
      order: 0,
      data: it.data,
    }));
    store.update((f) => ({
      ...f,
      segments: renumber([...f.segments, ...ns]),
    }));
    setEditingId(ns[0]?.id ?? null);
    setMode("edit");
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;

    if (String(active.id).startsWith("new:")) {
      const type = String(active.id).slice(4) as SegmentType;
      if (!SEGMENT_TYPES.includes(type)) return;
      const overId = String(over.id);
      let insertAt = segments.length;
      if (overId !== "list-end") {
        const overIdx = segments.findIndex((s) => s.id === overId);
        if (overIdx >= 0) insertAt = overIdx;
      }
      addSegment(type, insertAt);
      return;
    }

    if (active.id === over.id) return;
    const oldIdx = segments.findIndex((s) => s.id === active.id);
    const newIdx = segments.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    store.update((f) => ({
      ...f,
      segments: renumber(arrayMove(f.segments, oldIdx, newIdx)),
    }));
  }

  function updateProject(patch: Partial<Project>) {
    store.update((f) => ({
      ...f,
      project: { ...f.project, ...patch },
    }));
  }

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const s of segments) {
      for (const t of getSegmentTagArray(s.type, s.data)) set.add(t);
    }
    return Array.from(set).sort();
  }, [segments]);

  const visibleSegments = useMemo(() => {
    if (!query.trim() && typeFilter === "all") return segments;
    return segments.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (!query.trim()) return true;
      return segmentMatchesQuery(s, query);
    });
  }, [segments, query, typeFilter]);

  if (!file) return null;
  const project = file.project;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="sticky top-14 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-bg-tertiary/85 backdrop-blur border-b border-line mb-6 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex items-center rounded-md border border-line bg-bg-primary p-0.5">
              <button
                onClick={() => setMode("view")}
                className={cn(
                  "h-7 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium rounded transition-colors",
                  mode === "view"
                    ? "bg-purple-light text-purple-dark"
                    : "text-ink-tertiary hover:text-ink-secondary"
                )}
              >
                <Eye className="w-3.5 h-3.5" /> Ver
              </button>
              <button
                onClick={() => setMode("edit")}
                className={cn(
                  "h-7 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium rounded transition-colors",
                  mode === "edit"
                    ? "bg-purple-light text-purple-dark"
                    : "text-ink-tertiary hover:text-ink-secondary"
                )}
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar
              </button>
            </div>
            <span className="text-[11px] text-ink-tertiary">auto-guardado</span>
          </div>
          <div className="flex items-center gap-2">
            {mode === "edit" ? <ImportSegmentsButton onImport={importSegments} /> : null}
            <ExportButton
              title={project.title}
              subtitle={project.subtitle}
              eyebrow={project.eyebrow}
              version={project.version}
              segments={segments}
            />
          </div>
        </div>

        {mode === "view" && segments.length > 0 ? (
          <button
            onClick={() => setMode("edit")}
            className="w-full mb-4 p-2.5 rounded-md border border-dashed border-line-strong text-xs text-ink-secondary hover:bg-bg-secondary hover:text-ink-primary transition-colors flex items-center justify-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Estás en modo lectura. Hacé clic acá o arriba en <strong>Editar</strong> para modificar segmentos.
          </button>
        ) : null}

        <div className="flex gap-6">
          <article className="flex-1 min-w-0 max-w-[820px]">
            {mode === "edit" ? (
              <ProjectMetaEditor project={project} onChange={updateProject} />
            ) : (
              <ProjectMetaView project={project} />
            )}

            {segments.length > 0 ? (
              <div className="mb-4">
                <SearchBar
                  query={query}
                  onQuery={setQuery}
                  typeFilter={typeFilter}
                  onTypeFilter={setTypeFilter}
                  allTags={allTags}
                  visible={visibleSegments.length}
                  total={segments.length}
                />
              </div>
            ) : null}

            {segments.length === 0 ? (
              <EmptyState onAdd={(t) => addSegment(t)} />
            ) : visibleSegments.length === 0 ? (
              <div className="text-center text-sm text-ink-tertiary border border-dashed border-line rounded-md p-8">
                Nada matchea &quot;{query}&quot;. Probá con menos palabras o cambiá el filtro.
              </div>
            ) : (
              <SortableContext
                items={visibleSegments.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableList>
                  {visibleSegments.map((s, idx) => (
                    <SortableSegmentBlock
                      key={s.id}
                      segment={s}
                      index={segments.indexOf(s)}
                      total={segments.length}
                      allSegments={segments}
                      isEditing={mode === "edit"}
                      isOpen={editingId === s.id}
                      onToggle={() => setEditingId(editingId === s.id ? null : s.id)}
                      onDataChange={(d) => updateSegment(s.id, d)}
                      onMoveUp={() => moveSegment(s.id, -1)}
                      onMoveDown={() => moveSegment(s.id, 1)}
                      onRemove={() => removeSegment(s.id)}
                    />
                  ))}
                  <ListEndDropZone hasItems={segments.length > 0} />
                </DroppableList>
              </SortableContext>
            )}
          </article>

          {mode === "edit" ? (
            <SegmentSidebar onAdd={(t) => addSegment(t)} />
          ) : null}
        </div>

        <DragOverlay>
          {activeDragId && activeDragId.startsWith("new:") ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-line bg-bg-primary shadow-lg text-xs pointer-events-none">
              <div className="w-7 h-7 rounded-md bg-purple-light text-purple-dark grid place-items-center flex-shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="text-ink-primary font-medium">
                {SEGMENT_LABELS[String(activeDragId).slice(4) as SegmentType] ?? "Segmento"}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

function renumber(segments: Segment[]): Segment[] {
  return segments.map((s, i) => ({ ...s, order: i }));
}

function ListEndDropZone({ hasItems }: { hasItems: boolean }) {
  const { setNodeRef, isOver } = useSortable({ id: "list-end", disabled: true });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-8 rounded-md border-2 border-dashed transition-colors",
        hasItems ? "mt-1" : "mt-3",
        isOver ? "border-purple bg-purple-light/40" : "border-transparent"
      )}
    />
  );
}

function DroppableList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>;
}

function SortableSegmentBlock({
  segment,
  index,
  total,
  allSegments,
  isEditing,
  isOpen,
  onToggle,
  onDataChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  segment: Segment;
  index: number;
  total: number;
  allSegments: Segment[];
  isEditing: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onDataChange: (d: any) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: segment.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const IconName = SEGMENT_ICONS[segment.type] as keyof typeof Lucide;
  const Icon = (Lucide as any)[IconName] as React.ComponentType<{ className?: string }>;
  const sectionNum = String(index + 1).padStart(2, "0");

  return (
    <div ref={setNodeRef} style={style}>
      {isEditing ? (
        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-0.5 pt-2">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-0.5 text-ink-tertiary hover:text-ink-primary disabled:opacity-30"
              type="button"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="p-0.5 text-ink-tertiary hover:text-ink-primary disabled:opacity-30"
              type="button"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            {...attributes}
            {...listeners}
            className="mt-2 p-1 text-ink-tertiary cursor-grab active:cursor-grabbing touch-none"
            title="Arrastrá para reordenar"
          >
            ⠿
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={onToggle}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                isOpen
                  ? "bg-purple-light text-purple-dark border-purple"
                  : "border-line bg-bg-primary text-ink-secondary hover:bg-bg-secondary"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">
                {sectionNum} · {SEGMENT_LABELS[segment.type]}
              </span>
              <span className="text-ink-tertiary text-[10px]">{isOpen ? "cerrar" : "editar"}</span>
            </button>
            {isOpen ? (
              <div className="mt-2 p-3 bg-bg-primary border border-line rounded-md">
                <EditorRouter type={segment.type} data={segment.data} onChange={onDataChange} />
                <div className="mt-3 pt-3 border-t border-line">
                  <label className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold mb-1.5 block">
                    Tags
                  </label>
                  <TagEditor
                    tags={getSegmentTagArray(segment.type, segment.data)}
                    onChange={(tags) => onDataChange(setSegmentTagArray(segment.type, segment.data, tags))}
                  />
                </div>
                <div className="flex justify-end mt-3 pt-3 border-t border-line">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="text-red hover:bg-red-light"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar segmento
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div>
          <DisplayRouter segment={segment} sectionNum={sectionNum} allSegments={allSegments} />
        </div>
      )}
    </div>
  );
}

function DisplayRouter({ segment, sectionNum, allSegments }: { segment: Segment; sectionNum: string; allSegments: Segment[] }) {
  if (segment.type === "hero") {
    return <HeroView d={segment.data} />;
  }
  const heading = sectionHeading(segment);
  return (
    <section id={heading.id} className="mb-12 scroll-mt-20">
      <header className="flex items-baseline gap-3 mb-4 pb-3 border-b border-line">
        <span className="text-[11px] text-ink-tertiary font-medium tracking-[0.08em] min-w-[28px]">
          {sectionNum}
        </span>
        <h2 className="text-xl font-medium text-ink-primary">{heading.title}</h2>
      </header>
      <BodyRouter segment={segment} allSegments={allSegments} />
    </section>
  );
}

function BodyRouter({ segment, allSegments }: { segment: Segment; allSegments: Segment[] }) {
  switch (segment.type) {
    case "text": return <TextView d={segment.data} allSegments={allSegments} />;
    case "image": return <ImageView d={segment.data} />;
    case "grid": return <GridView d={segment.data} />;
    case "callout": return <CalloutView d={segment.data} />;
    case "character": return <CharacterView d={segment.data} />;
    case "enemy": return <EnemyView d={segment.data} />;
    case "boss": return <BossView d={segment.data} />;
    case "loop": return <LoopView d={segment.data} />;
    case "dialogue": return <DialogueView d={segment.data} />;
    case "note": return <NoteView d={segment.data} />;
    case "tension": return <TensionView d={segment.data} />;
    default: return null;
  }
}

function EditorRouter({ type, data, onChange }: { type: SegmentType; data: any; onChange: (d: any) => void }) {
  switch (type) {
    case "hero": return <HeroEditor data={data} onChange={onChange} />;
    case "text": return <TextEditor data={data} onChange={onChange} />;
    case "image": return <ImageEditor data={data} onChange={onChange} />;
    case "grid": return <GridEditor data={data} onChange={onChange} />;
    case "callout": return <CalloutEditor data={data} onChange={onChange} />;
    case "character": return <CharacterEditor data={data} onChange={onChange} />;
    case "enemy": return <EnemyEditor data={data} onChange={onChange} />;
    case "boss": return <BossEditor data={data} onChange={onChange} />;
    case "loop": return <LoopEditor data={data} onChange={onChange} />;
    case "dialogue": return <DialogueEditor data={data} onChange={onChange} />;
    case "note": return <NoteEditor data={data} onChange={onChange} />;
    case "tension": return <TensionEditor data={data} onChange={onChange} />;
  }
}

function sectionHeading(segment: Segment) {
  switch (segment.type) {
    case "text": return { id: slugify(segment.data.heading || "section"), title: segment.data.heading || "Sección" };
    case "image": return { id: slugify(segment.data.caption || "imagen"), title: segment.data.caption || "Imagen" };
    case "grid": return { id: slugify(segment.data.items?.[0]?.title || "grilla"), title: segment.data.items?.[0]?.title || "Grilla" };
    case "callout": return { id: slugify(segment.data.title || "nota"), title: segment.data.title || "Nota" };
    case "character": return { id: slugify(segment.data.name || "personaje"), title: segment.data.name || "Personaje" };
    case "enemy": return { id: slugify(segment.data.name || "enemigo"), title: segment.data.name || "Enemigo" };
    case "boss": return { id: slugify(segment.data.name || "jefe"), title: segment.data.name || "Jefe" };
    case "loop": return { id: slugify(segment.data.name || "loop"), title: segment.data.name || "Core loop" };
    case "dialogue": return { id: slugify(segment.data.name || "dialogo"), title: segment.data.name || "Diálogo" };
    case "note": return { id: slugify(segment.data.title || "lienzo"), title: segment.data.title || "Lienzo" };
    case "tension": return { id: slugify(segment.data.title || "tension"), title: segment.data.title || "Curva de tensión" };
    default: return { id: "section", title: "Sección" };
  }
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `s-${Math.random().toString(36).slice(2, 7)}`;
}

function ProjectMetaView({ project }: { project: Project }) {
  return (
    <header className="border-b border-line pb-8 mb-10">
      {project.eyebrow ? (
        <p className="text-[11px] tracking-[0.14em] text-ink-tertiary uppercase mb-2">
          {project.eyebrow}
        </p>
      ) : null}
      <h1 className="text-[52px] font-medium leading-[1.05] text-ink-primary">
        {project.title}
      </h1>
      {project.subtitle ? (
        <p className="text-[15px] text-ink-secondary mt-3 max-w-[580px] leading-relaxed">
          {project.subtitle}
        </p>
      ) : null}
      <div className="flex items-center gap-2 mt-4">
        <span
          className="text-xs px-3 py-1 rounded-full font-medium"
          style={{ background: `var(--${project.accent}-light)`, color: `var(--${project.accent}-dark)` }}
        >
          v{project.version}
        </span>
        <span
          className={cn(
            "text-xs px-3 py-1 rounded-full font-medium",
            project.status === "completed" && "bg-teal-light text-teal-dark",
            project.status === "in-progress" && "bg-amber-light text-amber-dark",
            project.status === "draft" && "bg-bg-secondary text-ink-secondary"
          )}
        >
          {project.status === "completed" ? "Completado" : project.status === "in-progress" ? "En progreso" : "Borrador"}
        </span>
      </div>
    </header>
  );
}

function ProjectMetaEditor({ project, onChange }: { project: Project; onChange: (p: Partial<Project>) => void }) {
  return (
    <header className="border border-line rounded-lg bg-bg-primary p-4 mb-8 space-y-3">
      <Field label="Eyebrow">
        <Input
          value={project.eyebrow || ""}
          onChange={(e) => onChange({ eyebrow: e.target.value })}
          placeholder="Game Design Document · v0.1 · Draft"
        />
      </Field>
      <Field label="Título">
        <Input
          value={project.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>
      <Field label="Subtítulo">
        <Textarea
          value={project.subtitle || ""}
          onChange={(e) => onChange({ subtitle: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Versión">
          <Input
            value={project.version}
            onChange={(e) => onChange({ version: e.target.value })}
          />
        </Field>
        <Field label="Estado">
          <select value={project.status} onChange={(e) => onChange({ status: e.target.value as any })}>
            <option value="draft">Borrador</option>
            <option value="in-progress">En progreso</option>
            <option value="completed">Completado</option>
          </select>
        </Field>
      </div>
      <Field label="Color de acento">
        <div className="flex gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ accent: c })}
              className={cn(
                "flex-1 h-8 rounded-md border text-xs capitalize transition-all",
                project.accent === c && "ring-2 ring-purple"
              )}
              style={{
                background: `var(--${c}-light)`,
                color: `var(--${c}-dark)`,
                borderColor: `var(--${c}-mid)`,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>
    </header>
  );
}

function SearchBar({
  query, onQuery, typeFilter, onTypeFilter, allTags, visible, total,
}: {
  query: string;
  onQuery: (s: string) => void;
  typeFilter: SegmentType | "all";
  onTypeFilter: (t: SegmentType | "all") => void;
  allTags: string[];
  visible: number;
  total: number;
}) {
  const hasFilter = query.trim() !== "" || typeFilter !== "all";
  return (
    <div className="mb-4 p-2.5 rounded-lg border border-line bg-bg-primary flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar por título, body, tag…"
          className="w-full pl-8 pr-7 h-8 text-xs text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-tertiary hover:text-ink-primary"
            title="Limpiar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-ink-tertiary">
        <Filter className="w-3 h-3" />
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilter(e.target.value as any)}
          className="text-xs text-ink-primary pl-2 pr-7 cursor-pointer"
          style={{ width: "auto", minWidth: "150px" }}
        >
          <option value="all">Todos los tipos</option>
          {SEGMENT_TYPES.map((t) => (
            <option key={t} value={t}>{SEGMENT_LABELS[t]}</option>
          ))}
        </select>
      </div>
      {allTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 max-w-full">
          <span className="text-[9px] text-ink-tertiary uppercase tracking-wider">Tags:</span>
          {allTags.slice(0, 8).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onQuery(query === `#${t}` ? "" : `#${t}`)}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full border transition-colors",
                query === `#${t}`
                  ? "bg-purple-light text-purple-dark border-purple"
                  : "border-line text-ink-tertiary hover:border-purple-mid hover:text-purple-dark"
              )}
            >
              #{t}
            </button>
          ))}
          {allTags.length > 8 ? (
            <span className="text-[10px] text-ink-tertiary">+{allTags.length - 8} más</span>
          ) : null}
        </div>
      ) : null}
      {hasFilter ? (
        <span className="text-[10px] text-ink-tertiary ml-auto">
          {visible} / {total}
        </span>
      ) : null}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: (t: SegmentType) => void }) {
  return (
    <div className="text-center py-12 border border-dashed border-line-strong rounded-lg">
      <div className="w-12 h-12 rounded-lg bg-purple-light text-purple-dark grid place-items-center mx-auto mb-3">
        <Plus className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-medium text-ink-primary mb-1">Empezá tu GDD</h3>
      <p className="text-xs text-ink-secondary mb-4">Arrastrá un tipo de segmento desde la barra lateral, o usá los atajos de abajo.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => onAdd("hero")} size="sm">
          <Sparkles className="w-3.5 h-3.5" /> Empezar con Hero
        </Button>
        <Button variant="outline" onClick={() => onAdd("text")} size="sm">
          <Plus className="w-3.5 h-3.5" /> Bloque de texto
        </Button>
      </div>
    </div>
  );
}

function getSegmentTagArray(type: SegmentType, data: any): string[] {
  if (!data) return [];
  if (type === "hero") return Array.isArray(data.metaTags) ? data.metaTags : [];
  return Array.isArray(data.tags) ? data.tags : [];
}

function setSegmentTagArray(type: SegmentType, data: any, next: string[]): any {
  if (type === "hero") return { ...(data ?? {}), metaTags: next };
  return { ...(data ?? {}), tags: next };
}
