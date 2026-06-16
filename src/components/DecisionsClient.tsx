"use client";
import { useState } from "react";
import { Plus, Trash2, Check, X, RotateCcw, Circle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { getSegmentLabels } from "@/lib/segment-types";
import { useDecisions, useSegments, actions } from "@/lib/gdd-store";
import type { Decision, DecisionStatus } from "@/lib/gdd-file";
import { newId } from "@/lib/gdd-file";
import { useT } from "@/lib/i18n";

function getStatusMeta(t: (k: string) => string): Record<DecisionStatus, { label: string; Icon: any; color: string }> {
  return {
    open: { label: t("decisions.status.open"), Icon: Circle, color: "amber" },
    taken: { label: t("decisions.status.taken"), Icon: Check, color: "teal" },
    reverted: { label: t("decisions.status.reverted"), Icon: RotateCcw, color: "red" },
  };
}

export function DecisionsClient() {
  const t = useT();
  const STATUS_META = getStatusMeta(t);
  const SEGMENT_LABELS = getSegmentLabels(t);
  const items = useDecisions();
  const segments = useSegments();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", segmentIds: [] as string[] });
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDraft({ title: "", description: "", segmentIds: [] });
    setAdding(false);
    setError(null);
  }

  function onAdd() {
    if (!draft.title.trim()) {
      setError(t("decisions.titleRequired"));
      return;
    }
    const dec: Decision = {
      id: newId(),
      title: draft.title,
      description: draft.description || null,
      status: "open",
      segmentIds: draft.segmentIds,
      decidedAt: null,
      createdAt: new Date().toISOString(),
    };
    actions.setDecisions([dec, ...items]);
    reset();
  }

  function onSetStatus(id: string, status: DecisionStatus) {
    actions.setDecisions(
      items.map((d) =>
        d.id === id
          ? { ...d, status, decidedAt: status === "open" ? null : new Date().toISOString() }
          : d
      )
    );
  }

  function onDelete(id: string) {
    if (!confirm(t("decisions.deleteConfirm"))) return;
    actions.setDecisions(items.filter((d) => d.id !== id));
  }

  function toggleSeg(id: string) {
    setDraft((d) => ({
      ...d,
      segmentIds: d.segmentIds.includes(id)
        ? d.segmentIds.filter((x) => x !== id)
        : [...d.segmentIds, id],
    }));
  }

  const segById = new Map(segments.map((s) => [s.id, s]));
  const counts = {
    open: items.filter((d) => d.status === "open").length,
    taken: items.filter((d) => d.status === "taken").length,
    reverted: items.filter((d) => d.status === "reverted").length,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-medium text-ink-primary flex items-center gap-2">
          {t("decisions.title")}
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          {t("decisions.subtitle")}
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2 text-xs text-ink-tertiary">
          <span className="px-2 py-0.5 rounded-full bg-amber-light text-amber-dark font-medium">
            {t("decisions.counts.open", { n: counts.open })}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-teal-light text-teal-dark font-medium">
            {t("decisions.counts.taken", { n: counts.taken })}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-light text-red-dark font-medium">
            {t("decisions.counts.reverted", { n: counts.reverted })}
          </span>
        </div>

        {!adding ? (
          <Button onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" /> {t("decisions.new")}
          </Button>
        ) : (
          <div className="bg-bg-primary border border-line rounded-lg p-4 space-y-3">
            <Field label={t("decisions.titleField")}>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder={t("decisions.placeholderTitle")}
                autoFocus
              />
            </Field>
            <Field label={t("decisions.context")}>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="min-h-[70px]"
                placeholder={t("decisions.placeholderContext")}
              />
            </Field>
            {segments.length > 0 ? (
              <Field label={t("decisions.affects")} hint={t("decisions.affectsHint")}>
                <div className="border border-line rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
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
                {t("common.cancel")}
              </Button>
              <Button onClick={onAdd}>{t("common.create")}</Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-bg-primary border border-dashed border-line-strong rounded-lg p-10 text-center">
            <p className="text-sm text-ink-secondary">{t("decisions.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((d) => {
              const meta = STATUS_META[d.status];
              const Icon = meta.Icon;
              const linked = d.segmentIds.map((id) => segById.get(id)).filter(Boolean) as any[];
              return (
                <div
                  key={d.id}
                  className="bg-bg-primary border border-line rounded-lg p-3 flex items-start gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-md grid place-items-center flex-shrink-0"
                    style={{
                      background: `var(--${meta.color}-light)`,
                      color: `var(--${meta.color}-dark)`,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-primary">{d.title}</p>
                    {d.description ? (
                      <p className="text-xs text-ink-secondary mt-1 whitespace-pre-wrap line-clamp-3">
                        {d.description}
                      </p>
                    ) : null}
                    {linked.length > 0 ? (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-ink-tertiary uppercase tracking-wider inline-flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5" /> {t("decisions.affectsLabel")}
                        </span>
                        {linked.map((s) => (
                          <span
                            key={s.id}
                            className="text-[10px] px-2 py-0.5 rounded bg-bg-secondary text-ink-secondary font-medium"
                            title={SEGMENT_LABELS[s.type as keyof typeof SEGMENT_LABELS]}
                          >
                            {titleOf(s)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
                        style={{
                          background: `var(--${meta.color}-light)`,
                          color: `var(--${meta.color}-dark)`,
                        }}
                      >
                        {meta.label}
                      </span>
                      {d.decidedAt ? (
                        <span className="text-[10px] text-ink-tertiary">
                          {new Date(d.decidedAt).toLocaleDateString("es")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {d.status !== "open" ? (
                      <button
                        onClick={() => onSetStatus(d.id, "open")}
                        className="p-1.5 text-ink-tertiary hover:text-ink-primary"
                        title={t("decisions.reopen")}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    {d.status !== "taken" ? (
                      <button
                        onClick={() => onSetStatus(d.id, "taken")}
                        className="p-1.5 text-ink-tertiary hover:text-teal-dark"
                        title={t("decisions.markTaken")}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    {d.status !== "reverted" ? (
                      <button
                        onClick={() => onSetStatus(d.id, "reverted")}
                        className="p-1.5 text-ink-tertiary hover:text-red"
                        title={t("decisions.markReverted")}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => onDelete(d.id)}
                      className="p-1.5 text-ink-tertiary hover:text-red"
                      title={t("common.delete")}
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
