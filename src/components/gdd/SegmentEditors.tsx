"use client";
import { useRef, useState } from "react";
import { Plus, Trash2, Upload, Loader2, Image as ImageIcon, ChevronUp, ChevronDown, Calculator } from "lucide-react";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DynamicIcon, ICON_OPTIONS } from "@/components/IconMap";
import { ACCENT_COLORS, AccentColor, DialogueData, DialogueNode, NoteData, TensionData } from "@/lib/segment-types";
import { DrawingCanvas } from "@/components/gdd/DrawingCanvas";
import { TensionCanvas } from "@/components/gdd/TensionCanvas";
import { NodeCanvas } from "@/components/gdd/NodeCanvas";
import { ensureLoopPositions, ensureDialoguePositions } from "@/lib/auto-layout";
import { evalFormula, FORMULA_PRESETS, FormulaContext } from "@/lib/formula";
import { readFileAsDataUrl } from "@/lib/gdd-file";
import { uploadAsset, dataUrlToAssetRef, isAssetRef } from "@/lib/gdd-manifest";
import { useAssetUrl } from "@/lib/asset-urls";
import { cn } from "@/lib/utils";

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `s-${Math.random().toString(36).slice(2, 7)}`;
}

// =====================================================
// HERO
// =====================================================
export function HeroEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Eyebrow (texto pequeño arriba)">
        <Input value={data.eyebrow} onChange={(e) => onChange({ ...data, eyebrow: e.target.value })} />
      </Field>
      <Field label="Título">
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="MADRE"
        />
      </Field>
      <Field label="Palabra acentuada (opcional)" hint="Aparece en color de acento al final del título.">
        <Input
          value={data.accentWord || ""}
          onChange={(e) => onChange({ ...data, accentWord: e.target.value })}
        />
      </Field>
      <Field label="Subtítulo / descripción">
        <Textarea
          value={data.subtitle}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
        />
      </Field>
      <div>
        <label>Tags</label>
        <div className="space-y-2">
          {data.tags.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={t.label}
                onChange={(e) => {
                  const next = [...data.tags];
                  next[i] = { ...t, label: e.target.value };
                  onChange({ ...data, tags: next });
                }}
                placeholder="Etiqueta"
              />
              <select
                value={t.color}
                onChange={(e) => {
                  const next = [...data.tags];
                  next[i] = { ...t, color: e.target.value };
                  onChange({ ...data, tags: next });
                }}
                className="max-w-[120px]"
              >
                {ACCENT_COLORS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={() => onChange({ ...data, tags: data.tags.filter((_: any, idx: number) => idx !== i) })}
                className="text-ink-tertiary hover:text-red p-1.5"
                type="button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ ...data, tags: [...data.tags, { label: "", color: "purple" }] })}>
            <Plus className="w-3.5 h-3.5" /> Agregar tag
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// TEXT
// =====================================================
export function TextEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Encabezado (opcional)">
        <Input
          value={data.heading || ""}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
        />
      </Field>
      <Field label="Contenido">
        <Textarea
          value={data.body}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
          className="min-h-[120px]"
        />
      </Field>
    </div>
  );
}

// =====================================================
// IMAGE
// =====================================================
export function ImageEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false);
  // ponytail: useAssetUrl resolves the in-memory ref to a blob URL on
  // first render; subsequent renders are sync from the cache.
  const previewUrl = useAssetUrl(data.url);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    let ref = "";
    try { ref = await uploadAsset(file); } catch (err) { console.error(err); }
    setUploading(false);
    e.target.value = "";
    if (ref) onChange({ ...data, url: ref });
  }

  return (
    <div className="space-y-3">
      <Field label="Imagen">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={data.alt} className="w-full max-w-md rounded-md border border-line" />
        ) : (
          <div className="w-full max-w-md aspect-video rounded-md border border-dashed border-line-strong grid place-items-center text-ink-tertiary text-sm gap-2 flex-col">
            <ImageIcon className="w-5 h-5" />
            Sin imagen
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line-strong bg-bg-primary text-xs cursor-pointer hover:bg-bg-secondary">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Subir imagen
            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </label>
          {data.url ? (
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...data, url: "" })}>
              Quitar
            </Button>
          ) : null}
        </div>
      </Field>
      <Field label="Texto alternativo">
        <Input
          value={data.alt}
          onChange={(e) => onChange({ ...data, alt: e.target.value })}
          placeholder="Descripción de la imagen"
        />
      </Field>
      <Field label="Pie de imagen (opcional)">
        <Input
          value={data.caption || ""}
          onChange={(e) => onChange({ ...data, caption: e.target.value })}
        />
      </Field>
      <Field label="Ancho">
        <select value={data.width} onChange={(e) => onChange({ ...data, width: e.target.value })}>
          <option value="narrow">Angosta</option>
          <option value="normal">Normal</option>
          <option value="wide">Ancha</option>
          <option value="full">Completa</option>
        </select>
      </Field>
    </div>
  );
}

// =====================================================
// GRID
// =====================================================
export function GridEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Columnas">
        <select
          value={data.columns}
          onChange={(e) => onChange({ ...data, columns: Number(e.target.value) as 2 | 3 })}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </Field>
      <div>
        <label>Tarjetas</label>
        <div className="space-y-2">
          {data.items.map((it: any, idx: number) => (
            <div key={idx} className="border border-line rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={it.icon}
                  onChange={(e) => {
                    const items = [...data.items];
                    items[idx] = { ...it, icon: e.target.value };
                    onChange({ ...data, items });
                  }}
                  className="max-w-[200px]"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
                <Input
                  value={it.title}
                  onChange={(e) => {
                    const items = [...data.items];
                    items[idx] = { ...it, title: e.target.value };
                    onChange({ ...data, items });
                  }}
                  placeholder="Título"
                />
                <button
                  onClick={() => onChange({ ...data, items: data.items.filter((_: any, i: number) => i !== idx) })}
                  className="text-ink-tertiary hover:text-red p-1.5"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Textarea
                value={it.body}
                onChange={(e) => {
                  const items = [...data.items];
                  items[idx] = { ...it, body: e.target.value };
                  onChange({ ...data, items });
                }}
                className="min-h-[60px]"
                placeholder="Descripción"
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...data, items: [...data.items, { icon: "Box", title: "", body: "" }] })}
          >
            <Plus className="w-3.5 h-3.5" /> Agregar tarjeta
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// CALLOUT
// =====================================================
export function CalloutEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Color">
        <div className="flex gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...data, color: c })}
              className={cn(
                "flex-1 h-8 rounded-md border text-xs capitalize transition-all",
                data.color === c && "ring-2 ring-purple"
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
      <Field label="Título (opcional)" hint="Sin título = se ve como una nota al pie.">
        <Input
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
        />
      </Field>
      <Field label="Contenido">
        <Textarea
          value={data.body}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
          className="min-h-[100px]"
        />
      </Field>
    </div>
  );
}

// =====================================================
// CHARACTER
// =====================================================
export function CharacterEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const previewUrl = useAssetUrl(data.avatarUrl);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    let ref = "";
    try { ref = await uploadAsset(file); } catch (err) { console.error(err); }
    setUploading(false);
    e.target.value = "";
    if (ref) onChange({ ...data, avatarUrl: ref });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre">
          <Input
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="Lena Voss"
          />
        </Field>
        <Field label="Rol">
          <Input
            value={data.role}
            onChange={(e) => onChange({ ...data, role: e.target.value })}
            placeholder="Protagonista, NPC, Compañero…"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Icono (fallback)" hint="Se muestra si no hay imagen de concepto.">
          <select value={data.icon} onChange={(e) => onChange({ ...data, icon: e.target.value })}>
            {ICON_OPTIONS.map((ic) => (
              <option key={ic} value={ic}>{ic}</option>
            ))}
          </select>
        </Field>
        <Field label="Imagen de concepto" hint="Opcional. Reemplaza al icono en el GDD.">
          <div className="flex items-center gap-2">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={data.name}
                className="w-10 h-10 rounded-full object-cover border border-line flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-bg-secondary border border-dashed border-line flex-shrink-0" />
            )}
            <label className="flex-1 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line-strong bg-bg-primary text-xs cursor-pointer hover:bg-bg-secondary">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {data.avatarUrl ? "Cambiar" : "Subir"}
              <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
            </label>
            {data.avatarUrl ? (
              <button
                type="button"
                onClick={() => onChange({ ...data, avatarUrl: "" })}
                className="p-1.5 text-ink-tertiary hover:text-red"
                title="Quitar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </Field>
      </div>

      <Field label="Descripción / Lore">
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="min-h-[120px]"
        />
      </Field>
    </div>
  );
}

// =====================================================
// ENEMY
// =====================================================

// Stat row with optional formula + simulator
function StatFormulaRow({
  label,
  base,
  formula,
  onBaseChange,
  onFormulaChange,
}: {
  label: string;
  base: number;
  formula?: string;
  onBaseChange: (v: number) => void;
  onFormulaChange: (v: string | undefined) => void;
}) {
  const [showSim, setShowSim] = useState(false);
  const ctx: FormulaContext = { level: 1, base };
  const active = formula && formula.trim() && formula !== "base";
  const lvl1Val = active ? evalFormula(formula!, { ...ctx, level: 1 }) : base;
  const valid = !active || !Number.isNaN(lvl1Val);

  return (
    <div className="border border-line rounded-md p-2.5 space-y-1.5">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label={label}>
            <Input
              type="number"
              value={base}
              onChange={(e) => onBaseChange(Number(e.target.value))}
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => setShowSim((s) => !s)}
          className={cn(
            "mt-5 p-1.5 rounded-md text-xs",
            active ? "bg-teal-light text-teal-dark" : "text-ink-tertiary hover:text-ink-primary hover:bg-bg-secondary"
          )}
          title={active ? "Fórmula activa" : "Sin fórmula"}
        >
          <Calculator className="w-3.5 h-3.5" />
        </button>
      </div>
      {showSim ? (
        <div className="space-y-1.5 pt-1">
          <select
            value=""
            onChange={(e) => {
              const preset = FORMULA_PRESETS.find((p) => p.id === e.target.value);
              if (preset) {
                onFormulaChange(preset.formula);
                e.target.value = "";
              }
            }}
            className="text-xs"
          >
            <option value="">Preset…</option>
            {FORMULA_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label} — {p.description}</option>
            ))}
          </select>
          <Input
            value={formula || ""}
            onChange={(e) => onFormulaChange(e.target.value || undefined)}
            placeholder="base + 5 * (level - 1)"
            className="font-mono text-[11px]"
          />
          {active ? (
            <div className="bg-bg-tertiary rounded-md p-2 text-[10px] font-mono">
              {valid ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {[1, 2, 3, 5, 10, 20].map((lvl) => {
                    const v = evalFormula(formula!, { ...ctx, level: lvl });
                    return (
                      <div key={lvl} className="flex justify-between text-ink-secondary">
                        <span>L{lvl}:</span>
                        <span className="text-ink-primary font-semibold">
                          {Number.isNaN(v) ? "—" : v}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-red">Fórmula inválida</span>
              )}
              <button
                type="button"
                onClick={() => onFormulaChange(undefined)}
                className="mt-1.5 text-ink-tertiary hover:text-red text-[10px] underline"
              >
                Quitar fórmula
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function EnemyEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const previewUrl = useAssetUrl(data.avatarUrl);
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    let ref = "";
    try { ref = await uploadAsset(file); } catch (err) { console.error(err); }
    setUploading(false);
    e.target.value = "";
    if (ref) onChange({ ...data, avatarUrl: ref });
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre">
          <Input
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="Swarmer"
          />
        </Field>
        <Field label="Tier">
          <select value={data.tier} onChange={(e) => onChange({ ...data, tier: e.target.value })}>
            <option value="common">Común</option>
            <option value="elite">Élite</option>
          </select>
        </Field>
      </div>
      <Field label="Imagen (opcional)" hint="Concept art. Se muestra en el GDD y en el export.">
        <div className="flex items-center gap-2">
          {data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={data.name} className="w-10 h-10 rounded object-cover border border-line flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded bg-bg-secondary border border-dashed border-line flex-shrink-0" />
          )}
          <label className="flex-1 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line-strong bg-bg-primary text-xs cursor-pointer hover:bg-bg-secondary">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {data.avatarUrl ? "Cambiar" : "Subir"}
            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </label>
          {data.avatarUrl ? (
            <button type="button" onClick={() => onChange({ ...data, avatarUrl: "" })} className="p-1.5 text-ink-tertiary hover:text-red">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </Field>
      <Field label="Descripción">
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="min-h-[80px]"
        />
      </Field>
      <div>
        <label>Stats</label>
        <div className="grid grid-cols-3 gap-2">
          <StatFormulaRow
            label="Vida"
            base={data.stats.health}
            formula={data.formulas?.health}
            onBaseChange={(v) => onChange({ ...data, stats: { ...data.stats, health: v } })}
            onFormulaChange={(v) => onChange({ ...data, formulas: { ...(data.formulas ?? {}), health: v } })}
          />
          <StatFormulaRow
            label="Daño"
            base={data.stats.damage}
            formula={data.formulas?.damage}
            onBaseChange={(v) => onChange({ ...data, stats: { ...data.stats, damage: v } })}
            onFormulaChange={(v) => onChange({ ...data, formulas: { ...(data.formulas ?? {}), damage: v } })}
          />
          <StatFormulaRow
            label="Velocidad"
            base={data.stats.speed}
            formula={data.formulas?.speed}
            onBaseChange={(v) => onChange({ ...data, stats: { ...data.stats, speed: v } })}
            onFormulaChange={(v) => onChange({ ...data, formulas: { ...(data.formulas ?? {}), speed: v } })}
          />
        </div>
        <p className="text-[10px] text-ink-tertiary mt-1.5">
          Tocá el ícono <Calculator className="w-2.5 h-2.5 inline" /> para asignar una fórmula (level, base, Math.*).
        </p>
      </div>
      <div>
        <label>Comportamientos</label>
        <div className="space-y-2">
          {data.behaviors.map((b: any, i: number) => (
            <div key={i} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-start">
              <Input
                value={b.trigger}
                onChange={(e) => {
                  const next = [...data.behaviors];
                  next[i] = { ...b, trigger: e.target.value };
                  onChange({ ...data, behaviors: next });
                }}
                placeholder="Cuándo (Player within 3 tiles)"
              />
              <Input
                value={b.action}
                onChange={(e) => {
                  const next = [...data.behaviors];
                  next[i] = { ...b, action: e.target.value };
                  onChange({ ...data, behaviors: next });
                }}
                placeholder="Acción (Charges at player)"
              />
              <button
                onClick={() => onChange({ ...data, behaviors: data.behaviors.filter((_: any, idx: number) => idx !== i) })}
                className="text-ink-tertiary hover:text-red p-1.5 mt-1.5"
                type="button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...data, behaviors: [...data.behaviors, { trigger: "", action: "" }] })}
          >
            <Plus className="w-3.5 h-3.5" /> Agregar comportamiento
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// BOSS
// =====================================================
export function BossEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const previewUrl = useAssetUrl(data.avatarUrl);
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    let ref = "";
    try { ref = await uploadAsset(file); } catch (err) { console.error(err); }
    setUploading(false);
    e.target.value = "";
    if (ref) onChange({ ...data, avatarUrl: ref });
  }
  return (
    <div className="space-y-3">
      <Field label="Nombre">
        <Input
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="El Vigilante"
        />
      </Field>
      <Field label="Imagen (opcional)" hint="Concept art. Se muestra en el GDD y en el export.">
        <div className="flex items-center gap-2">
          {data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={data.name} className="w-10 h-10 rounded object-cover border border-line flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded bg-bg-secondary border border-dashed border-line flex-shrink-0" />
          )}
          <label className="flex-1 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line-strong bg-bg-primary text-xs cursor-pointer hover:bg-bg-secondary">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {data.avatarUrl ? "Cambiar" : "Subir"}
            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </label>
          {data.avatarUrl ? (
            <button type="button" onClick={() => onChange({ ...data, avatarUrl: "" })} className="p-1.5 text-ink-tertiary hover:text-red">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </Field>
      <Field label="Descripción / Lore">
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="min-h-[100px]"
        />
      </Field>
      <div>
        <label>Fases</label>
        <div className="space-y-3">
          {data.phases.map((p: any, i: number) => (
            <div key={i} className="border border-line rounded-md p-3 space-y-2 bg-bg-secondary/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">Fase {i + 1}</span>
                <button
                  onClick={() => onChange({ ...data, phases: data.phases.filter((_: any, idx: number) => idx !== i) })}
                  className="text-ink-tertiary hover:text-red p-1"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Nombre">
                  <Input
                    value={p.name}
                    onChange={(e) => {
                      const next = [...data.phases];
                      next[i] = { ...p, name: e.target.value };
                      onChange({ ...data, phases: next });
                    }}
                    placeholder="Phase 1"
                  />
                </Field>
                <Field label="Trigger">
                  <Input
                    value={p.trigger}
                    onChange={(e) => {
                      const next = [...data.phases];
                      next[i] = { ...p, trigger: e.target.value };
                      onChange({ ...data, phases: next });
                    }}
                    placeholder="HP > 50%"
                  />
                </Field>
              </div>
              <Field label="Descripción">
                <Textarea
                  value={p.description}
                  onChange={(e) => {
                    const next = [...data.phases];
                    next[i] = { ...p, description: e.target.value };
                    onChange({ ...data, phases: next });
                  }}
                  className="min-h-[60px]"
                />
              </Field>
              <Field label="Ataques (uno por línea)">
                <Textarea
                  value={p.attacks.join("\n")}
                  onChange={(e) => {
                    const next = [...data.phases];
                    next[i] = { ...p, attacks: e.target.value.split("\n").filter((s) => s.trim()) };
                    onChange({ ...data, phases: next });
                  }}
                  className="min-h-[60px] font-mono text-xs"
                  placeholder={"Slash\nStomp\nSweep"}
                />
              </Field>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...data, phases: [...data.phases, { name: `Phase ${data.phases.length + 1}`, trigger: "", description: "", attacks: [] }] })}
          >
            <Plus className="w-3.5 h-3.5" /> Agregar fase
          </Button>
        </div>
      </div>
      <div>
        <label>Stats del boss</label>
        <p className="text-[10px] text-ink-tertiary mb-1.5">Stats por fase. Tocá <Calculator className="w-2.5 h-2.5 inline" /> para asignar fórmula.</p>
        <div className="grid grid-cols-3 gap-2">
          <StatFormulaRow
            label="Vida base"
            base={data.stats?.health ?? 100}
            formula={data.formulas?.health}
            onBaseChange={(v) => onChange({ ...data, stats: { ...(data.stats ?? { health: v, damage: 10, speed: 1 }), health: v } })}
            onFormulaChange={(v) => onChange({ ...data, formulas: { ...(data.formulas ?? {}), health: v } })}
          />
          <StatFormulaRow
            label="Daño base"
            base={data.stats?.damage ?? 10}
            formula={data.formulas?.damage}
            onBaseChange={(v) => onChange({ ...data, stats: { ...(data.stats ?? { health: 100, damage: v, speed: 1 }), damage: v } })}
            onFormulaChange={(v) => onChange({ ...data, formulas: { ...(data.formulas ?? {}), damage: v } })}
          />
          <StatFormulaRow
            label="Velocidad"
            base={data.stats?.speed ?? 1}
            formula={data.formulas?.speed}
            onBaseChange={(v) => onChange({ ...data, stats: { ...(data.stats ?? { health: 100, damage: 10, speed: v }), speed: v } })}
            onFormulaChange={(v) => onChange({ ...data, formulas: { ...(data.formulas ?? {}), speed: v } })}
          />
        </div>
      </div>
      <Field label="Debilidad (opcional)">
        <Input
          value={data.weakness || ""}
          onChange={(e) => onChange({ ...data, weakness: e.target.value })}
          placeholder="Vulnerable a fuego"
        />
      </Field>
    </div>
  );
}

// =====================================================
// =====================================================
// DIALOGUE TREE
// =====================================================

function truncate(s: string, n: number) {
  s = (s ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function DialogueEditor({ data, onChange }: { data: DialogueData; onChange: (d: DialogueData) => void }) {
  const rawNodes: DialogueNode[] = data.nodes || [];
  const startId = data.startNodeId;
  const nodes = ensureDialoguePositions(rawNodes, startId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function setNodes(next: DialogueNode[]) { onChange({ ...data, nodes: next }); }
  function setStart(id: string) { onChange({ ...data, startNodeId: id || null }); }

  function addNode() {
    const used = new Set(rawNodes.map((n) => n.id));
    let i = 1;
    while (used.has(`n${i}`)) i++;
    const id = `n${i}`;
    const baseX = rawNodes[0]?.x ?? 60;
    const baseY = rawNodes[0]?.y ?? 60;
    setNodes([...rawNodes, { id, speaker: "NPC", text: "", choices: [], next: null, x: baseX + 80, y: baseY + 80 }]);
    if (!startId) setStart(id);
    setSelectedId(id);
  }

  function deleteNode(id: string) {
    const next = rawNodes
      .filter((n) => n.id !== id)
      .map((n) => ({
        ...n,
        next: n.next === id ? null : n.next,
        choices: n.choices.filter((c) => c.nextNodeId !== id),
      }));
    setNodes(next);
    if (startId === id) setStart(next[0]?.id ?? null);
    if (selectedId === id) setSelectedId(null);
  }

  function moveNode(id: string, x: number, y: number) {
    setNodes(rawNodes.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }

  // Build edges from choices (new model) + legacy next field
  const edges: { from: string; to: string; label?: string }[] = [];
  for (const n of rawNodes) {
    for (const c of n.choices) {
      if (c.nextNodeId) edges.push({ from: n.id, to: c.nextNodeId, label: c.label || undefined });
    }
    if (n.next && rawNodes.some((x) => x.id === n.next)) {
      edges.push({ from: n.id, to: n.next, label: undefined });
    }
  }

  function connect(fromId: string, toId: string) {
    const fromNode = rawNodes.find((n) => n.id === fromId);
    if (!fromNode) return;
    // If the node has no choices yet, this becomes a single linear connection
    // (we add a choice with empty label for visual continuity in the editor).
    if (fromNode.choices.length === 0) {
      // Legacy `next` migration: if `next` is set, replace it with a choice.
      setNodes(rawNodes.map((n) => n.id === fromId
        ? { ...n, choices: [{ label: n.next ? "" : "", nextNodeId: toId }], next: null }
        : n
      ));
    } else {
      setNodes(rawNodes.map((n) => n.id === fromId
        ? { ...n, choices: [...n.choices, { label: "", nextNodeId: toId }] }
        : n
      ));
    }
  }

  function deleteEdge(globalIndex: number) {
    // Map global edge index to the node/choice to remove
    let i = 0;
    for (const n of rawNodes) {
      for (let c = 0; c < n.choices.length; c++) {
        if (i === globalIndex) {
          setNodes(rawNodes.map((x) => x.id === n.id
            ? { ...x, choices: x.choices.filter((_, j) => j !== c) }
            : x
          ));
          return;
        }
        i++;
      }
      if (n.next) {
        if (i === globalIndex) {
          setNodes(rawNodes.map((x) => x.id === n.id ? { ...x, next: null } : x));
          return;
        }
        i++;
      }
    }
  }

  function updateChoice(nodeId: string, i: number, patch: Partial<{ label: string; nextNodeId: string }>) {
    setNodes(rawNodes.map((n) => {
      if (n.id !== nodeId) return n;
      return { ...n, choices: n.choices.map((c, j) => j === i ? { ...c, ...patch } : c) };
    }));
  }

  function addChoice(nodeId: string) {
    setNodes(rawNodes.map((n) => {
      if (n.id !== nodeId) return n;
      const fallback = rawNodes.find((x) => x.id !== nodeId);
      return { ...n, choices: [...n.choices, { label: "", nextNodeId: fallback?.id ?? "" }], next: null };
    }));
  }

  const selectedNode = rawNodes.find((n) => n.id === selectedId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="NPC">
          <Input
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="Viejo ermitaño"
          />
        </Field>
        <Field label="Nodo inicial">
          <select
            value={startId || ""}
            onChange={(e) => setStart(e.target.value)}
            className="text-xs"
            disabled={rawNodes.length === 0}
          >
            {rawNodes.length === 0 ? <option value="">—</option> : null}
            {rawNodes.map((n) => (
              <option key={n.id} value={n.id}>{n.id} — {truncate(n.speaker || "?", 18)}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Contexto (opcional)">
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Encuentro en el cruce del bosque, después del tutorial."
          className="min-h-[50px]"
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="!mb-0 text-xs font-medium text-ink-secondary">Diagrama ({rawNodes.length} líneas)</label>
          <Button variant="outline" size="sm" onClick={addNode}>
            <Plus className="w-3.5 h-3.5" /> Línea
          </Button>
        </div>
        <NodeCanvas
          nodes={nodes}
          edges={edges}
          onMoveNode={moveNode}
          onConnect={connect}
          onDeleteEdge={deleteEdge}
          onDeleteNode={deleteNode}
          onSelectNode={setSelectedId}
          selectedNodeId={selectedId}
          startNodeId={startId}
          renderNode={(n, { isStart }) => (
            <div className={cn(
              "w-full h-full bg-bg-primary border rounded-lg p-2 flex flex-col gap-0.5",
              isStart ? "border-teal bg-teal-light/30" : "border-line"
            )}>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-ink-tertiary">{n.id}</span>
                {isStart ? <span className="text-[8px] font-bold text-teal-dark">▶</span> : null}
                <span className="text-[10px] font-semibold text-ink-secondary truncate flex-1" data-no-drag>
                  {n.speaker || "?"}
                </span>
              </div>
              <p className="text-[10px] text-ink-primary line-clamp-2 leading-tight" data-no-drag>
                {n.text || "(sin texto)"}
              </p>
            </div>
          )}
          emptyHint="Hacé clic en «Línea» para empezar"
          className="min-h-[420px]"
        />
      </div>

      {selectedNode ? (
        <div className="border border-teal/40 bg-teal-light/20 rounded-md p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-dark">
              Editando {selectedNode.id}
            </span>
            <button onClick={() => setSelectedId(null)} className="text-ink-tertiary hover:text-ink-primary text-xs" type="button">
              cerrar
            </button>
          </div>
          <Input
            value={selectedNode.speaker}
            onChange={(e) => setNodes(rawNodes.map((n) => n.id === selectedNode.id ? { ...n, speaker: e.target.value } : n))}
            placeholder="NPC / Player / Narrator"
            className="text-xs"
          />
          <Textarea
            value={selectedNode.text}
            onChange={(e) => setNodes(rawNodes.map((n) => n.id === selectedNode.id ? { ...n, text: e.target.value } : n))}
            placeholder="Texto de la línea…"
            className="min-h-[60px] text-xs"
          />
          <div className="border-t border-line pt-1.5 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">
                Opciones ({selectedNode.choices.length})
              </label>
              <button onClick={() => addChoice(selectedNode.id)} className="text-[10px] text-teal-dark hover:underline" type="button">
                + opción
              </button>
            </div>
            {selectedNode.choices.length === 0 ? (
              <p className="text-[10px] text-ink-tertiary italic">Sin opciones — el diálogo termina acá.</p>
            ) : null}
            {selectedNode.choices.map((c, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-[10px] text-teal-dark font-bold w-3">▸</span>
                <Input
                  value={c.label}
                  onChange={(e) => updateChoice(selectedNode.id, i, { label: e.target.value })}
                  placeholder="Texto de la opción"
                  className="text-[11px] flex-1"
                />
                <select
                  value={c.nextNodeId}
                  onChange={(e) => updateChoice(selectedNode.id, i, { nextNodeId: e.target.value })}
                  className="text-[10px]"
                >
                  {rawNodes.filter((x) => x.id !== selectedNode.id).map((x) => (
                    <option key={x.id} value={x.id}>→ {x.id}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// =====================================================
// NOTE (Lienzo) — title + free-draw canvas (+ legacy text body)
// =====================================================
export function NoteEditor({ data, onChange }: { data: NoteData; onChange: (d: NoteData) => void }) {
  // ponytail: the canvas emits PNG data URLs on every stroke. We convert
  // each one to an IDB-backed ref so the in-memory state stays small.
  // The token guards against out-of-order completions when the user
  // makes rapid strokes: only the last conversion wins the onChange call.
  const tokenRef = useRef(0);
  const drawingUrl = useAssetUrl(data.drawing);

  async function handleDrawing(drawing: string) {
    if (!drawing) { onChange({ ...data, drawing: "" }); return; }
    if (isAssetRef(drawing)) { onChange({ ...data, drawing }); return; }
    const token = ++tokenRef.current;
    try {
      const ref = await dataUrlToAssetRef(drawing);
      if (token !== tokenRef.current) return; // a newer stroke took over
      onChange({ ...data, drawing: ref });
    } catch (err) { console.error(err); }
  }

  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Brainstorm combate, Referencias, Lo que tengo en la cabeza…"
        />
      </Field>
      <Field label="Lienzo" hint="Dibujá con el mouse o el dedo. 3 pinceles, 7 colores, 3 tamaños.">
        <DrawingCanvas
          value={drawingUrl}
          onChange={handleDrawing}
        />
      </Field>
      {data.body !== undefined ? (
        <Field label="Texto (opcional)" hint="Notas escritas al lado del dibujo. Dejá vacío si no usás.">
          <Textarea
            value={data.body || ""}
            onChange={(e) => onChange({ ...data, body: e.target.value })}
            placeholder="Notas, links, contexto del dibujo…"
            className="min-h-[100px] text-xs"
          />
        </Field>
      ) : null}
    </div>
  );
}

// =====================================================
// TENSION CURVE — interactive 2D chart of pacing/intensity
// =====================================================
export function TensionEditor({ data, onChange }: { data: TensionData; onChange: (d: TensionData) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Curva de tensión, Pacing, Ritmo del juego…"
        />
      </Field>
      <Field label="Curva" hint="Click en el gráfico para agregar un beat. Arrastrá un beat para moverlo.">
        <TensionCanvas data={data} onChange={onChange} />
      </Field>
    </div>
  );
}

// CORE LOOP
// =====================================================
export function LoopEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const rawNodes: any[] = data.nodes || [];
  const edges: any[] = data.edges || [];
  const nodes = ensureLoopPositions(rawNodes);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function setNodes(next: any[]) { onChange({ ...data, nodes: next }); }
  function setEdges(next: any[]) { onChange({ ...data, edges: next }); }

  function addNode() {
    const used = new Set(rawNodes.map((n) => n.id));
    let i = 1;
    while (used.has(`n${i}`)) i++;
    const id = `n${i}`;
    // Place near the first existing node (or 60,60)
    const baseX = rawNodes[0]?.x ?? 60;
    const baseY = rawNodes[0]?.y ?? 60;
    setNodes([...rawNodes, { id, label: `Paso ${rawNodes.length + 1}`, description: "", x: baseX + 60, y: baseY + 60 }]);
    setSelectedId(id);
  }

  function deleteNode(id: string) {
    setNodes(rawNodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e: any) => e.from !== id && e.to !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function moveNode(id: string, x: number, y: number) {
    setNodes(rawNodes.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }

  function connect(fromId: string, toId: string) {
    if (edges.some((e: any) => e.from === fromId && e.to === toId)) return; // dedupe
    setEdges([...edges, { from: fromId, to: toId, label: "" }]);
  }

  function deleteEdge(i: number) {
    setEdges(edges.filter((_, idx) => idx !== i));
  }

  const selectedNode = rawNodes.find((n) => n.id === selectedId);

  return (
    <div className="space-y-3">
      <Field label="Nombre del loop">
        <Input
          value={data.name || ""}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="Core loop / Loop de combate / Loop de progresión…"
        />
      </Field>
      <Field label="Descripción (opcional)">
        <Textarea
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="min-h-[50px]"
          placeholder="Qué representa este loop y por qué importa."
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="!mb-0">Diagrama ({nodes.length} pasos)</label>
          <Button variant="outline" size="sm" onClick={addNode}>
            <Plus className="w-3.5 h-3.5" /> Paso
          </Button>
        </div>
        <NodeCanvas
          nodes={nodes}
          edges={edges}
          onMoveNode={moveNode}
          onConnect={connect}
          onDeleteEdge={deleteEdge}
          onDeleteNode={deleteNode}
          onSelectNode={setSelectedId}
          selectedNodeId={selectedId}
          startNodeId={null}
          renderNode={(n, { isStart }) => (
            <div className={cn(
              "w-full h-full bg-bg-primary border rounded-lg p-2 flex flex-col gap-0.5",
              isStart ? "border-teal bg-teal-light/30" : "border-line"
            )}>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-ink-tertiary">{n.id}</span>
                <span className="text-xs font-medium text-ink-primary truncate flex-1" data-no-drag>
                  {n.label || "(sin nombre)"}
                </span>
              </div>
              {n.description ? (
                <p className="text-[10px] text-ink-secondary line-clamp-2 leading-tight" data-no-drag>{n.description}</p>
              ) : null}
            </div>
          )}
          emptyHint="Hacé clic en «Paso» para empezar"
          className="min-h-[420px]"
        />
      </div>

      {/* Selected node editor */}
      {selectedNode ? (
        <div className="border border-teal/40 bg-teal-light/20 rounded-md p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-dark">
              Editando {selectedNode.id}
            </span>
            <button
              onClick={() => setSelectedId(null)}
              className="text-ink-tertiary hover:text-ink-primary text-xs"
              type="button"
            >
              cerrar
            </button>
          </div>
          <Input
            value={selectedNode.label}
            onChange={(e) => setNodes(rawNodes.map((n) => n.id === selectedNode.id ? { ...n, label: e.target.value } : n))}
            placeholder="Nombre del paso"
            className="text-xs"
          />
          <Textarea
            value={selectedNode.description}
            onChange={(e) => setNodes(rawNodes.map((n) => n.id === selectedNode.id ? { ...n, description: e.target.value } : n))}
            placeholder="Qué hace el jugador, qué siente, qué decide…"
            className="min-h-[60px] text-xs"
          />
        </div>
      ) : null}

      {/* Edges list — for editing labels (esp. "loop" marker) */}
      {edges.length > 0 ? (
        <div>
          <label className="!mb-1">Conexiones ({edges.length})</label>
          <div className="space-y-1">
            {edges.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-1 text-[11px]">
                <span className="font-mono text-ink-tertiary">{e.from}</span>
                <span className="text-ink-tertiary">→</span>
                <span className="font-mono text-ink-tertiary">{e.to}</span>
                <Input
                  value={e.label || ""}
                  onChange={(ev) => setEdges(edges.map((x: any, j: number) => j === i ? { ...x, label: ev.target.value } : x))}
                  placeholder="label (escribí 'loop' para la flecha dashed)"
                  className="text-[11px] flex-1"
                />
                <button
                  onClick={() => deleteEdge(i)}
                  className="p-1 text-ink-tertiary hover:text-red"
                  type="button"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
