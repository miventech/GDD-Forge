import { useState } from "react";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/IconMap";
import {
  HeroData, TextData, ImageData, GridData, CalloutData,
  CharacterData, EnemyData, BossData, LoopData, DialogueData, NoteData,
} from "@/lib/segment-types";
import { renderTextWithLinks, SegmentForLinks } from "@/lib/cross-links";
import { evalFormula, FormulaContext } from "@/lib/formula";
import { NodeCanvas } from "@/components/gdd/NodeCanvas";
import { ensureLoopPositions, ensureDialoguePositions } from "@/lib/auto-layout";
import { useAssetUrl } from "@/lib/asset-urls";
import { useT } from "@/lib/i18n";

// =====================================================
// HERO
// =====================================================
export function HeroView({ d }: { d: HeroData }) {
  return (
    <div className="border-b border-line pb-8 mb-10">
      {d.eyebrow ? (
        <p className="text-[11px] tracking-[0.14em] text-ink-tertiary uppercase mb-2">
          {d.eyebrow}
        </p>
      ) : null}
      <h1 className="text-[52px] font-medium leading-[1.05] text-ink-primary">
        {d.title}
        {d.accentWord ? (
          <>
            {" "}
            <span className="text-purple">{d.accentWord}</span>
          </>
        ) : null}
      </h1>
      {d.subtitle ? (
        <p className="text-[15px] text-ink-secondary mt-3 max-w-[580px] leading-relaxed">
          {d.subtitle}
        </p>
      ) : null}
      {d.tags.length ? (
        <div className="flex flex-wrap gap-2 mt-5">
          {d.tags.map((t, i) => (
            <span
              key={i}
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium",
                `bg-${t.color}-light text-${t.color}-dark`
              )}
            >
              {t.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// =====================================================
// TEXT
// =====================================================
export function TextView({ d, allSegments }: { d: TextData; allSegments?: SegmentForLinks[] }) {
  return (
    <div className="mb-7">
      {d.heading ? (
        <h3 className="text-base font-medium text-ink-primary mb-2">{d.heading}</h3>
      ) : null}
      <p className="text-[13px] text-ink-secondary leading-[1.7] whitespace-pre-wrap">
        {allSegments ? renderTextWithLinks(d.body, allSegments) : d.body}
      </p>
    </div>
  );
}

// =====================================================
// IMAGE
// =====================================================
export function ImageView({ d }: { d: ImageData }) {
  const url = useAssetUrl(d.url);
  if (!url) return null;
  const widthClass = {
    narrow: "max-w-md",
    normal: "max-w-2xl",
    wide: "max-w-4xl",
    full: "max-w-full",
  }[d.width || "normal"];
  return (
    <figure className={cn("mb-8", widthClass, "mx-auto")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={d.alt || ""}
        className="w-full h-auto rounded-lg border border-line"
      />
      {d.caption ? (
        <figcaption className="text-[12px] text-ink-tertiary mt-2 text-center">
          {d.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

// =====================================================
// GRID (generic reusable cards)
// =====================================================
export function GridView({ d }: { d: GridData }) {
  return (
    <div
      className={cn(
        "grid gap-3 mb-7",
        d.columns === 3
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2"
      )}
    >
      {d.items.map((it, i) => (
        <div key={i} className="bg-bg-primary border border-line rounded-lg p-4">
          <div className="w-8 h-8 rounded-md bg-purple-light text-purple-dark grid place-items-center mb-2">
            <DynamicIcon name={it.icon} size={14} />
          </div>
          <p className="text-sm font-medium text-ink-primary mb-1">{it.title}</p>
          <p className="text-xs text-ink-secondary leading-relaxed">{it.body}</p>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// CALLOUT (replaces accent + note)
// =====================================================
export function CalloutView({ d }: { d: CalloutData }) {
  const hasTitle = !!d.title?.trim();
  return (
    <div
      className={cn(
        "rounded-md px-4 py-3 mb-3",
        hasTitle ? "border-l-[3px]" : ""
      )}
      style={{
        background: `var(--${d.color}-light)`,
        color: `var(--${d.color}-dark)`,
        ...(hasTitle ? { borderLeftColor: `var(--${d.color}-mid)` } : {}),
      }}
    >
      {hasTitle ? (
        <p className="text-sm font-medium mb-1">{d.title}</p>
      ) : null}
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{d.body}</p>
    </div>
  );
}

// =====================================================
// CHARACTER (single)
// =====================================================
export function CharacterView({ d }: { d: CharacterData }) {
  // ponytail: useAssetUrl resolves the in-memory ref to a blob URL on
  // first render. The hook re-renders when the URL lands in the cache.
  const { t } = useT();
  const avatarUrl = useAssetUrl(d.avatarUrl);
  return (
    <div className="bg-bg-primary border border-line rounded-lg p-4 mb-7 max-w-md">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-purple-light text-purple-dark grid place-items-center flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={d.name} className="w-full h-full object-cover" />
          ) : (
            <DynamicIcon name={d.icon || "User"} size={20} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-ink-primary">{d.name || t("seg.view.noName")}</p>
          {d.role ? (
            <p className="text-xs text-purple bg-purple-light inline-block px-2 py-0.5 rounded-full mt-1 font-medium">
              {d.role}
            </p>
          ) : null}
          {d.description ? (
            <p className="text-xs text-ink-secondary leading-relaxed mt-2 whitespace-pre-wrap">
              {d.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ENEMY
// =====================================================
export function EnemyView({ d }: { d: EnemyData }) {
  const { t } = useT();
  const isElite = d.tier === "elite";
  const hasFormulas = !!(d.formulas?.health || d.formulas?.damage || d.formulas?.speed);
  const [level, setLevel] = useState(1);
  const ctx: FormulaContext = { level, base: 0 };
  const stat = (formula: string | undefined, base: number) => {
    if (!formula || !formula.trim()) return base;
    const v = evalFormula(formula, { ...ctx, base });
    return Number.isNaN(v) ? base : v;
  };
  const hp = stat(d.formulas?.health, d.stats.health);
  const dmg = stat(d.formulas?.damage, d.stats.damage);
  const spd = stat(d.formulas?.speed, d.stats.speed);
  return (
    <div className={cn(
      "border rounded-lg p-4 mb-7",
      isElite ? "bg-coral-light/30 border-coral" : "bg-bg-primary border-line"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "w-7 h-7 rounded-md grid place-items-center",
          isElite ? "bg-coral text-white" : "bg-teal-light text-teal-dark"
        )}>
          <DynamicIcon name="Bug" size={14} />
        </div>
        <h3 className="text-base font-medium text-ink-primary">{d.name || t("seg.view.noName")}</h3>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide",
          isElite ? "bg-coral text-white" : "bg-bg-tertiary text-ink-secondary"
        )}>
          {d.tier}
        </span>
      </div>
      {d.description ? (
        <p className="text-xs text-ink-secondary leading-relaxed mb-3 whitespace-pre-wrap">
          {d.description}
        </p>
      ) : null}
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-bg-secondary border border-line rounded-md px-3 py-2">
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider">{t("seg.view.life")}</p>
          <p className="text-sm font-semibold text-ink-primary">{hp}</p>
        </div>
        <div className="bg-bg-secondary border border-line rounded-md px-3 py-2">
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider">{t("seg.view.damage")}</p>
          <p className="text-sm font-semibold text-ink-primary">{dmg}</p>
        </div>
        <div className="bg-bg-secondary border border-line rounded-md px-3 py-2">
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider">{t("seg.view.speed")}</p>
          <p className="text-sm font-semibold text-ink-primary">{spd}</p>
        </div>
      </div>
      {hasFormulas ? (
        <div className="bg-bg-tertiary border border-line rounded-md px-3 py-2 mb-3 flex items-center gap-3">
          <label className="text-[10px] text-ink-tertiary uppercase tracking-wider font-semibold">
            {t("seg.view.level")}
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="flex-1 accent-teal"
          />
          <span className="text-xs font-mono font-semibold text-ink-primary w-8 text-right">{level}</span>
        </div>
      ) : null}
      {/* Behaviors */}
      {d.behaviors.length > 0 ? (
        <div>
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider mb-1.5">
            {t("seg.view.behaviors")}
          </p>
          <ul className="space-y-1">
            {d.behaviors.map((b, i) => (
              <li key={i} className="text-xs text-ink-secondary">
                <span className="text-ink-tertiary">{t("seg.view.when")}</span>{" "}
                <span className="font-medium text-ink-primary">{b.trigger || "—"}</span>
                <span className="text-ink-tertiary"> → </span>
                <span className="text-ink-primary">{b.action || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// =====================================================
// BOSS
// =====================================================
export function BossView({ d }: { d: BossData }) {
  const { t } = useT();
  const hasFormulas = !!(d.formulas?.health || d.formulas?.damage || d.formulas?.speed);
  const hasStats = !!(d.stats?.health || d.stats?.damage || d.stats?.speed);
  const [level, setLevel] = useState(1);
  const baseStats = d.stats ?? { health: 0, damage: 0, speed: 0 };
  const stat = (formula: string | undefined, base: number) => {
    if (!formula || !formula.trim()) return base;
    const v = evalFormula(formula, { level, base });
    return Number.isNaN(v) ? base : v;
  };
  return (
    <div className="bg-gradient-to-br from-red-light to-amber-light border border-red rounded-lg p-4 mb-7">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-md bg-red text-white grid place-items-center">
          <DynamicIcon name="Crown" size={16} />
        </div>
        <h3 className="text-lg font-medium text-ink-primary">{d.name || t("seg.view.noName")}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red text-white font-medium uppercase tracking-wide">
          Boss
        </span>
      </div>
      {d.description ? (
        <p className="text-xs text-ink-secondary leading-relaxed mb-3 whitespace-pre-wrap">
          {d.description}
        </p>
      ) : null}
      {(hasStats || hasFormulas) ? (
        <div className="bg-bg-primary border border-line rounded-md p-3 mb-3">
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider font-semibold mb-2">
            {t("seg.view.stats")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-ink-tertiary">{t("seg.view.life")}</p>
              <p className="text-sm font-semibold text-ink-primary">
                {stat(d.formulas?.health, baseStats.health)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ink-tertiary">{t("seg.view.damage")}</p>
              <p className="text-sm font-semibold text-ink-primary">
                {stat(d.formulas?.damage, baseStats.damage)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ink-tertiary">{t("seg.view.speed")}</p>
              <p className="text-sm font-semibold text-ink-primary">
                {stat(d.formulas?.speed, baseStats.speed)}
              </p>
            </div>
          </div>
          {hasFormulas ? (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line">
              <label className="text-[10px] text-ink-tertiary uppercase tracking-wider font-semibold">
                {t("seg.view.level")}
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="flex-1 accent-teal"
              />
              <span className="text-xs font-mono font-semibold text-ink-primary w-8 text-right">{level}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {/* Phases */}
      {d.phases.length > 0 ? (
        <div className="mb-3">
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider mb-2">
            {t("seg.view.phasesCount", { n: d.phases.length })}
          </p>
          <div className="space-y-2">
            {d.phases.map((p, i) => (
              <div key={i} className="bg-bg-primary border border-line rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-red text-white text-[10px] font-bold grid place-items-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-ink-primary">{p.name || t("seg.view.noName")}</p>
                </div>
                {p.trigger ? (
                  <p className="text-[11px] text-ink-tertiary mb-1">
                    <span className="font-medium">{t("seg.view.trigger")}:</span> {p.trigger}
                  </p>
                ) : null}
                {p.description ? (
                  <p className="text-xs text-ink-secondary mb-2 whitespace-pre-wrap">
                    {p.description}
                  </p>
                ) : null}
                {p.attacks.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {p.attacks.map((a, j) => (
                      <span
                        key={j}
                        className="text-[10px] px-2 py-0.5 rounded bg-red-light text-red-dark font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {d.weakness ? (
        <div className="bg-teal-light border border-teal rounded-md px-3 py-2">
          <p className="text-[10px] text-teal-dark uppercase tracking-wider font-semibold">
            {t("seg.view.weakness")}
          </p>
          <p className="text-xs text-teal-dark mt-0.5">{d.weakness}</p>
        </div>
      ) : null}
    </div>
  );
}

// =====================================================
// CORE LOOP (directed graph, circular layout)
// =====================================================
export function LoopView({ d }: { d: LoopData }) {
  const rawNodes = d.nodes || [];
  const edges = (d.edges || []).filter((e) => rawNodes.some((n) => n.id === e.from) && rawNodes.some((n) => n.id === e.to));
  const nodes = ensureLoopPositions(rawNodes);

  return (
    <div className="mb-7">
      {(d.name || d.description) ? (
        <header className="mb-3">
          {d.name ? <h3 className="text-base font-medium text-ink-primary inline-flex items-center gap-2">
            <DynamicIcon name="RotateCw" size={14} />
            {d.name}
          </h3> : null}
          {d.description ? <p className="text-xs text-ink-secondary mt-1">{d.description}</p> : null}
        </header>
      ) : null}

      {nodes.length === 0 ? (
        <div className="text-center text-xs text-ink-tertiary border border-dashed border-line rounded-md p-6">
          Sin nodos. Agregá nodos en el editor para visualizar el loop.
        </div>
      ) : (
        <NodeCanvas
          nodes={nodes}
          edges={edges}
          readOnly
          renderNode={(n) => (
            <div className="w-full h-full bg-bg-primary border border-line rounded-lg p-2 flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-ink-tertiary">{n.id}</span>
                <span className="text-xs font-medium text-ink-primary truncate flex-1">
                  {n.label || "(sin nombre)"}
                </span>
              </div>
              {n.description ? (
                <p className="text-[10px] text-ink-secondary line-clamp-2 leading-tight">{n.description}</p>
              ) : null}
            </div>
          )}
          className="min-h-[300px]"
        />
      )}

      {nodes.length > 0 ? (
        <div className="mt-4 space-y-2">
          {nodes.map((n, i) => (
            <div key={n.id} className="bg-bg-primary border border-line rounded-md p-2.5 flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-light text-purple-dark text-xs font-medium grid place-items-center flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-primary">{n.label || "(sin nombre)"}</p>
                {n.description ? (
                  <p className="text-xs text-ink-secondary mt-0.5">{n.description}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// =====================================================
// DIALOGUE TREE (uses NodeCanvas, free-positioned)
// =====================================================

export function DialogueView({ d }: { d: DialogueData }) {
  const rawNodes = d.nodes || [];
  const startId = d.startNodeId && rawNodes.some((n) => n.id === d.startNodeId) ? d.startNodeId : rawNodes[0]?.id ?? null;
  const nodes = ensureDialoguePositions(rawNodes, startId);
  const byId = new Map(rawNodes.map((n) => [n.id, n]));
  const edges: { from: string; to: string; label?: string }[] = [];
  for (const n of rawNodes) {
    for (const c of n.choices) {
      if (byId.has(c.nextNodeId)) edges.push({ from: n.id, to: c.nextNodeId, label: c.label || undefined });
    }
    if (n.next && byId.has(n.next)) edges.push({ from: n.id, to: n.next });
  }

  return (
    <div className="mb-7">
      {(d.name || d.description) ? (
        <header className="mb-3">
          <h3 className="text-base font-medium text-ink-primary inline-flex items-center gap-2">
            <DynamicIcon name="MessageCircle" size={14} />
            {d.name || "Diálogo NPC"}
          </h3>
          {d.description ? <p className="text-xs text-ink-secondary mt-1">{d.description}</p> : null}
        </header>
      ) : null}

      {nodes.length === 0 ? (
        <div className="text-center text-xs text-ink-tertiary border border-dashed border-line rounded-md p-6">
          Sin nodos. Agregá nodos en el editor.
        </div>
      ) : (
        <NodeCanvas
          nodes={nodes}
          edges={edges}
          readOnly
          startNodeId={startId}
          renderNode={(n, { isStart }) => (
            <div className={cn(
              "w-full h-full bg-bg-primary border rounded-lg p-2 flex flex-col gap-0.5",
              isStart ? "border-teal bg-teal-light/30" : "border-line"
            )}>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-ink-tertiary">{n.id}</span>
                {isStart ? <span className="text-[8px] font-bold text-teal-dark">▶</span> : null}
                <span className="text-[10px] font-semibold text-ink-secondary truncate flex-1">
                  {n.speaker || "?"}
                </span>
              </div>
              <p className="text-[10px] text-ink-primary line-clamp-2 leading-tight">
                {n.text || "(sin texto)"}
              </p>
            </div>
          )}
          className="min-h-[300px]"
        />
      )}

      {rawNodes.length > 0 ? (
        <div className="mt-4 space-y-2">
          {rawNodes.map((n) => (
            <div key={n.id} className="bg-bg-primary border border-line rounded-md p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-dark bg-teal-light px-1.5 py-0.5 rounded">
                  {n.speaker || "?"}
                </span>
                {n.id === startId ? (
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-ink-tertiary">inicio</span>
                ) : null}
              </div>
              <p className="text-xs text-ink-primary whitespace-pre-wrap">{n.text || "(sin texto)"}</p>
              {n.choices.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-line pt-2">
                  {n.choices.map((c, j) => (
                    <li key={j} className="text-[11px] text-ink-secondary flex gap-2">
                      <span className="text-teal-dark font-semibold flex-shrink-0">▸</span>
                      <span>{c.label || "(sin texto)"}</span>
                      <span className="text-ink-tertiary">→ {c.nextNodeId}</span>
                    </li>
                  ))}
                </ul>
              ) : n.next ? (
                <p className="mt-2 text-[10px] text-ink-tertiary border-t border-line pt-1.5">→ {n.next}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// =====================================================
// NOTE (Lienzo) — drawing (data URL) + optional text
// =====================================================
export function NoteView({ d }: { d: NoteData }) {
  const drawingUrl = useAssetUrl(d.drawing);
  return (
    <div className="mb-7">
      {d.title ? (
        <header className="mb-3">
          <h3 className="text-base font-medium text-ink-primary inline-flex items-center gap-2">
            <DynamicIcon name="NotebookPen" size={14} />
            {d.title}
          </h3>
        </header>
      ) : null}
      {drawingUrl ? (
        <div className="bg-bg-secondary border border-line rounded-lg p-2 mb-3">
          <img src={drawingUrl} alt={d.title || "Lienzo"} className="w-full h-auto rounded bg-white" />
        </div>
      ) : null}
      {d.body ? (
        <pre className="bg-bg-secondary border border-line rounded-lg p-4 text-[13px] text-ink-primary leading-relaxed whitespace-pre-wrap font-sans">
          {d.body}
        </pre>
      ) : null}
      {!d.drawing && !d.body ? (
        <p className="text-xs text-ink-tertiary italic">Lienzo vacío. Editá el segmento para dibujar.</p>
      ) : null}
    </div>
  );
}
