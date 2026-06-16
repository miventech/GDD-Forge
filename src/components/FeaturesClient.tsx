"use client";
import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Wrench, Scissors, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { SEGMENT_LABELS } from "@/lib/segment-types";
import { useFeatures, useSegments, actions } from "@/lib/gdd-store";
import type { Feature, FeatureStatus } from "@/lib/gdd-file";
import { newId } from "@/lib/gdd-file";

const STATUS_META: Record<FeatureStatus, { label: string; Icon: any; color: string }> = {
  planned: { label: "Planeada", Icon: Circle, color: "ink-tertiary" },
  "in-progress": { label: "En desarrollo", Icon: Wrench, color: "amber" },
  done: { label: "Hecha", Icon: CheckCircle2, color: "teal" },
  cut: { label: "Cortada", Icon: Scissors, color: "red" },
};

const STATUS_ORDER: FeatureStatus[] = ["planned", "in-progress", "done", "cut"];

export function FeaturesClient() {
  const items = useFeatures();
  const segments = useSegments();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    name: string;
    description: string;
    dependsOn: string[];
    segmentIds: string[];
  }>({ name: "", description: "", dependsOn: [], segmentIds: [] });
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDraft({ name: "", description: "", dependsOn: [], segmentIds: [] });
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  function onSave() {
    if (!draft.name.trim()) {
      setError("Nombre requerido");
      return;
    }
    if (editingId) {
      actions.setFeatures(
        items.map((f) =>
          f.id === editingId
            ? { ...f, name: draft.name, description: draft.description || null, dependsOn: draft.dependsOn, segmentIds: draft.segmentIds }
            : f
        )
      );
    } else {
      const feat: Feature = {
        id: newId(),
        name: draft.name,
        description: draft.description || null,
        status: "planned",
        dependsOn: draft.dependsOn,
        segmentIds: draft.segmentIds,
      };
      actions.setFeatures([...items, feat]);
    }
    reset();
  }

  function onEditStart(f: Feature) {
    setDraft({
      name: f.name,
      description: f.description || "",
      dependsOn: f.dependsOn,
      segmentIds: f.segmentIds,
    });
    setEditingId(f.id);
    setAdding(false);
  }

  function onSetStatus(id: string, status: FeatureStatus) {
    actions.setFeatures(items.map((f) => (f.id === id ? { ...f, status } : f)));
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta feature? Se quitará de las dependencias de las demás.")) return;
    const remaining = items
      .filter((f) => f.id !== id)
      .map((f) => ({
        ...f,
        dependsOn: f.dependsOn.filter((d) => d !== id),
        segmentIds: f.segmentIds.filter((s) => s !== id),
      }));
    actions.setFeatures(remaining);
  }

  function toggleDep(id: string) {
    setDraft((d) => ({
      ...d,
      dependsOn: d.dependsOn.includes(id)
        ? d.dependsOn.filter((x) => x !== id)
        : [...d.dependsOn, id],
    }));
  }

  function toggleSeg(id: string) {
    setDraft((d) => ({
      ...d,
      segmentIds: d.segmentIds.includes(id)
        ? d.segmentIds.filter((x) => x !== id)
        : [...d.segmentIds, id],
    }));
  }

  const nameById = new Map(items.map((f) => [f.id, f.name]));
  const segById = new Map(segments.map((s) => [s.id, s]));
  const counts = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, items.filter((f) => f.status === s).length])
  ) as Record<FeatureStatus, number>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-medium text-ink-primary flex items-center gap-2">
          Features y dependencias
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Mapeá las features del juego, sus dependencias entre sí, y los segmentos que las implementan.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2 text-xs text-ink-tertiary flex-wrap">
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            const Icon = meta.Icon;
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bg-secondary font-medium"
                style={{ color: `var(--${meta.color})` }}
              >
                <Icon className="w-3 h-3" /> {counts[s]} {meta.label.toLowerCase()}
              </span>
            );
          })}
        </div>

        {!adding && !editingId ? (
          <Button onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" /> Nueva feature
          </Button>
        ) : (
          <div className="bg-bg-primary border border-line rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-ink-secondary">
              {editingId ? "Editar feature" : "Nueva feature"}
            </p>
            <Field label="Nombre">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Dash con i-frames"
                autoFocus
              />
            </Field>
            <Field label="Descripción (opcional)">
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="min-h-[70px]"
              />
            </Field>
            {items.length > 1 ? (
              <Field label="Depende de (otras features)">
                <div className="border border-line rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                  {items
                    .filter((f) => f.id !== editingId)
                    .map((f) => (
                      <label
                        key={f.id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-secondary cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={draft.dependsOn.includes(f.id)}
                          onChange={() => toggleDep(f.id)}
                          style={{ width: "auto" }}
                        />
                        <span className="text-sm text-ink-primary truncate">{f.name}</span>
                      </label>
                    ))}
                </div>
              </Field>
            ) : null}
            {segments.length > 0 ? (
              <Field label="Implementa (segmentos del GDD)">
                <div className="border border-line rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {segments.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-secondary cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={draft.segmentIds.includes(s.id)}
                        onChange={() => toggleSeg(s.id)}
                        style={{ width: "auto" }}
                      />
                      <span className="text-[10px] uppercase tracking-wider text-ink-tertiary">
                        {SEGMENT_LABELS[s.type]}
                      </span>
                      <span className="text-sm text-ink-primary truncate">{titleOf(s)}</span>
                    </label>
                  ))}
                </div>
              </Field>
            ) : null}
            {error ? <p className="text-xs text-red">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Cancelar
              </Button>
              <Button onClick={onSave}>{editingId ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-bg-primary border border-dashed border-line-strong rounded-lg p-10 text-center">
            <p className="text-sm text-ink-secondary">Sin features todavía.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((f) => {
              const meta = STATUS_META[f.status];
              const Icon = meta.Icon;
              const linked = f.segmentIds
                .map((id) => segById.get(id))
                .filter(Boolean) as any[];
              return (
                <div
                  key={f.id}
                  className="bg-bg-primary border border-line rounded-lg p-3 flex items-start gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-md bg-bg-secondary grid place-items-center flex-shrink-0"
                    style={{ color: `var(--${meta.color})` }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-ink-primary">{f.name}</p>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider bg-bg-secondary"
                        style={{ color: `var(--${meta.color})` }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {f.description ? (
                      <p className="text-xs text-ink-secondary mt-1 line-clamp-2">{f.description}</p>
                    ) : null}
                    {linked.length > 0 ? (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-ink-tertiary uppercase tracking-wider inline-flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5" /> Implementa:
                        </span>
                        {linked.map((s) => (
                          <span
                            key={s.id}
                            className="text-[10px] px-2 py-0.5 rounded bg-teal-light text-teal-dark font-medium"
                            title={SEGMENT_LABELS[s.type as keyof typeof SEGMENT_LABELS]}
                          >
                            {titleOf(s)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {f.dependsOn.length > 0 ? (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-ink-tertiary uppercase tracking-wider">
                          Depende de:
                        </span>
                        {f.dependsOn.map((id) => (
                          <span
                            key={id}
                            className="text-[10px] px-2 py-0.5 rounded bg-purple-light text-purple-dark font-medium"
                          >
                            {nameById.get(id) || id.slice(0, 6)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {STATUS_ORDER.filter((s) => s !== f.status).map((s) => {
                      const M = STATUS_META[s];
                      return (
                        <button
                          key={s}
                          onClick={() => onSetStatus(f.id, s)}
                          className="p-1.5 text-ink-tertiary hover:text-ink-primary"
                          title={`Marcar como ${M.label}`}
                        >
                          <M.Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                    <button
                      onClick={() => onEditStart(f)}
                      className="p-1.5 text-ink-tertiary hover:text-ink-primary"
                      title="Editar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(f.id)}
                      className="p-1.5 text-ink-tertiary hover:text-red"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function titleOf(s: { type: string; data: any }): string {
  const d = s.data ?? {};
  switch (s.type) {
    case "text": return d.heading || "Sección";
    case "image": return d.caption || "Imagen";
    case "grid": return d.items?.[0]?.title || "Grilla";
    case "callout": return d.title || "Nota";
    case "character": return d.name || "Personaje";
    case "enemy": return d.name || "Enemigo";
    case "boss": return d.name || "Jefe";
    case "loop": return d.name || "Core loop";
    case "dialogue": return d.name || "Diálogo";
    case "note": return d.title || "Lienzo";
    case "tension": return d.title || "Curva de tensión";
    default: return "Sección";
  }
}
