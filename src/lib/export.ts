// GDD export. Produces 3 formats from the same segment list:
//   HTML — full styled document (CSS embedded, no external deps)
//   MD   — plain Markdown
//   PDF  — HTML with print stylesheet, opened in a new tab (user prints via browser)
//
// Client-side. No React rendering.
// Images are already data URLs in the segment data, so no inlining needed.

import { HeroData, TextData, ImageData, GridData, CalloutData, CharacterData, EnemyData, BossData, LoopData, DialogueData, NoteData, TensionData, TensionPoint, AccentColor, SEGMENT_LABELS } from "./segment-types";
import { tensionSvg } from "./tension-export";
import { SegmentType } from "./segment-types";
import { evalFormula } from "./formula";
import { getSegmentTitle } from "./segment-titles";

export type ExportSegment = {
  id: string;
  type: SegmentType;
  data: any;
};

export type ExportPayload = {
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  version: string;
  segments: ExportSegment[];
};

const COLOR_HEX: Record<AccentColor, { light: string; mid: string; dark: string }> = {
  purple: { light: "#EEEDFE", mid: "#7F77DD", dark: "#3C3489" },
  teal:   { light: "#E1F5EE", mid: "#1D9E75", dark: "#085041" },
  coral:  { light: "#FAECE7", mid: "#D85A30", dark: "#712B13" },
  amber:  { light: "#FAEEDA", mid: "#BA7517", dark: "#633806" },
  red:    { light: "#FCEBEB", mid: "#E24B4A", dark: "#791F1F" },
};

const DARK_COLORS = `
  :root { --bg-primary: #1c1c1a; --bg-secondary: #252523; --bg-tertiary: #2e2e2b;
    --text-primary: #f0ede8; --text-secondary: #a8a8a3; --text-tertiary: #6a6a66;
    --border: rgba(255,255,255,0.1); --border-strong: rgba(255,255,255,0.22); }
`;

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg-primary: #ffffff; --bg-secondary: #f5f5f3; --bg-tertiary: #eeece8;
    --text-primary: #1a1a18; --text-secondary: #5a5a57; --text-tertiary: #9a9a96;
    --border: rgba(0,0,0,0.12); --border-strong: rgba(0,0,0,0.25);
    --radius-md: 8px; --radius-lg: 12px;
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: var(--bg-tertiary); color: var(--text-primary); line-height: 1.6; }
  .gdd-root { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }
  .hero { border-bottom: 0.5px solid var(--border); padding-bottom: 2rem; margin-bottom: 2.5rem; }
  .hero-eyebrow { font-size: 11px; letter-spacing: 0.14em; color: var(--text-tertiary);
    text-transform: uppercase; margin-bottom: 0.5rem; }
  .hero-title { font-size: 52px; font-weight: 500; line-height: 1.05; color: var(--text-primary); }
  .hero-title span { color: #7F77DD; }
  .hero-sub { font-size: 15px; color: var(--text-secondary); margin-top: 0.75rem;
    line-height: 1.65; max-width: 580px; }
  .hero-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 1.25rem; }
  .tag { font-size: 12px; padding: 4px 12px; border-radius: 20px; font-weight: 500; }
  .section { margin-bottom: 3.5rem; }
  .section-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 1.25rem;
    padding-bottom: 0.75rem; border-bottom: 0.5px solid var(--border); }
  .section-num { font-size: 11px; color: var(--text-tertiary); font-weight: 500;
    letter-spacing: 0.08em; min-width: 28px; }
  .section-title { font-size: 20px; font-weight: 500; }
  .card { background: var(--bg-primary); border: 0.5px solid var(--border);
    border-radius: var(--radius-lg); padding: 1rem 1.25rem; margin-bottom: 0.75rem; }
  .card-title { font-size: 14px; font-weight: 500; margin-bottom: 0.5rem; }
  .card-body { font-size: 13px; color: var(--text-secondary); line-height: 1.65; }
  .grid { display: grid; gap: 12px; margin-bottom: 1.5rem; }
  .grid.cols-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  .grid.cols-3 { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
  .accent-card { border-radius: 0 var(--radius-md) var(--radius-md) 0;
    padding: 1rem 1.25rem; background: var(--bg-secondary); margin-bottom: 0.75rem;
    border-left: 3px solid; }
  .accent-card .body { font-size: 13px; color: var(--text-secondary); line-height: 1.65; }
  .accent-card .title { font-size: 14px; font-weight: 500; margin-bottom: 0.5rem; color: var(--text-primary); }
  .callout { border-radius: var(--radius-md); padding: 0.75rem 1rem;
    font-size: 13px; line-height: 1.6; margin-top: 1rem; margin-bottom: 0.75rem; }
  .callout.has-title { padding: 1rem 1.25rem; border-left: 3px solid; }
  .callout .title { font-weight: 500; margin-bottom: 0.5rem; }
  .character, .enemy, .boss { background: var(--bg-primary);
    border: 0.5px solid var(--border); border-radius: var(--radius-lg);
    padding: 1rem 1.25rem; margin-bottom: 1rem; }
  .character { display: flex; gap: 1rem; align-items: flex-start; max-width: 480px; }
  .character-avatar { width: 48px; height: 48px; border-radius: 50%;
    background: var(--bg-secondary); display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; font-size: 22px; }
  .character .name { font-size: 16px; font-weight: 500; }
  .character .role { font-size: 11px; color: var(--text-tertiary);
    text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.25rem; }
  .character .desc { font-size: 13px; color: var(--text-secondary);
    margin-top: 0.5rem; line-height: 1.5; }
  .enemy .name, .boss .name { font-size: 16px; font-weight: 500; }
  .enemy .tier { font-size: 10px; padding: 2px 8px; border-radius: 10px;
    background: var(--bg-secondary); margin-left: 0.5rem; }
  .enemy.elite .tier { background: #FAECE7; color: #712B13; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    margin: 0.75rem 0; }
  .stats .stat { background: var(--bg-secondary); border: 0.5px solid var(--border);
    border-radius: var(--radius-md); padding: 0.5rem 0.75rem; }
  .stats .stat .label { font-size: 10px; color: var(--text-tertiary);
    text-transform: uppercase; letter-spacing: 0.08em; }
  .stats .stat .val { font-size: 16px; font-weight: 600; }
  .behaviors { font-size: 13px; color: var(--text-secondary); }
  .behaviors li { margin-bottom: 0.25rem; }
  .boss { border-left: 4px solid #E24B4A; }
  .boss .name { color: #791F1F; }
  .phase { background: var(--bg-secondary); border: 0.5px solid var(--border);
    border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 0.5rem; }
  .phase .phase-name { font-size: 14px; font-weight: 500; }
  .phase .phase-trigger { font-size: 11px; color: var(--text-tertiary); margin: 0.25rem 0; }
  .phase .attacks { margin-top: 0.5rem; }
  .phase .attack { display: inline-block; font-size: 11px; padding: 2px 8px;
    border-radius: 10px; background: #FCEBEB; color: #791F1F; margin-right: 4px; }
  .weakness { background: #E1F5EE; border-radius: var(--radius-md);
    padding: 0.5rem 0.75rem; font-size: 12px; color: #085041; margin-top: 0.75rem; }
  .footer { border-top: 0.5px solid var(--border); padding-top: 1.5rem;
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 8px; }
  .footer p { font-size: 12px; color: var(--text-tertiary); }
  @media (prefers-color-scheme: dark) { ${DARK_COLORS} }
  @media print {
    body { background: #fff; color: #000; }
    .gdd-root { max-width: none; padding: 0; }
    .section, .hero, .callout, .character, .enemy, .boss { page-break-inside: avoid; }
    .section-header { border-bottom: 1px solid #000; }
  }
`;

// =====================================================================
// HTML
// =====================================================================

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Resolve [[link]] tokens to anchors. Body is plain text (will be escaped by caller).
function resolveLinksPlain(body: string, allSegments: ExportSegment[]): string {
  return body.replace(/\[\[([^\]]+)\]\]/g, (_, raw: string) => {
    const target = findSegmentTarget(raw.trim(), allSegments);
    const label = raw.trim();
    if (!target) {
      return `<span style="color:#dc2626;text-decoration:line-through" title="Link roto">${escapeHtml(label)}</span>`;
    }
    return `<a href="#${slug(getSegmentTitle(target.type, target.data))}" style="color:#0d9488;text-decoration:underline">${escapeHtml(label)}</a>`;
  });
}

function findSegmentTarget(query: string, all: ExportSegment[]) {
  // Try id match first
  const idMatch = all.find((s) => s.id === query);
  if (idMatch) return idMatch;
  // Then case-insensitive title match
  const lower = query.toLowerCase();
  return all.find((s) => getSegmentTitle(s.type, s.data).toLowerCase() === lower);
}

// Evaluate formula at level 1 for static export, or return base.
function applyFormula(formula: string | undefined, base: number): number {
  if (!formula || !formula.trim()) return base;
  const v = evalFormula(formula, { level: 1, base });
  return Number.isNaN(v) ? base : v;
}

// Resolve [[link]] to markdown links or italic broken links.
function resolveLinksMd(body: string, allSegments: ExportSegment[]): string {
  return body.replace(/\[\[([^\]]+)\]\]/g, (_, raw: string) => {
    const target = findSegmentTarget(raw.trim(), allSegments);
    const label = raw.trim();
    if (!target) return `*${label}* (link roto)`;
    return `[${label}](#${slug(getSegmentTitle(target.type, target.data))})`;
  });
}

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
}

function renderSegmentToHtml(seg: ExportSegment, idx: number, urls: Record<string, string> = {}, allSegments: ExportSegment[] = []): string {
  const sectionNum = String(idx).padStart(2, "0");
  const sectionTitle = (() => {
    const d = seg.data;
    if (seg.type === "text") return d.heading || "Sección";
    if (seg.type === "image") return d.caption || "Imagen";
    if (seg.type === "grid") return d.items?.[0]?.title || "Grilla";
    if (seg.type === "callout") return d.title || "Nota";
    if (seg.type === "character") return d.name || "Personaje";
    if (seg.type === "enemy") return d.name || "Enemigo";
    if (seg.type === "boss") return d.name || "Jefe";
    return "Sección";
  })();
  const id = slug(sectionTitle);

  switch (seg.type) {
    case "hero": {
      const d = seg.data as HeroData;
      return `
        <div class="hero">
          ${d.eyebrow ? `<p class="hero-eyebrow">${escapeHtml(d.eyebrow)}</p>` : ""}
          <h1 class="hero-title">${escapeHtml(d.title)}${d.accentWord ? ` <span>${escapeHtml(d.accentWord)}</span>` : ""}</h1>
          ${d.subtitle ? `<p class="hero-sub">${escapeHtml(d.subtitle)}</p>` : ""}
          ${d.tags.length ? `<div class="hero-tags">${d.tags.map((t) => `<span class="tag" style="background:${COLOR_HEX[t.color].light};color:${COLOR_HEX[t.color].dark}">${escapeHtml(t.label)}</span>`).join("")}</div>` : ""}
        </div>`;
    }
    case "text": {
      const d = seg.data as TextData;
      const bodyHtml = resolveLinksPlain(d.body, allSegments).replace(/\n/g, "<br>");
      const inner = (d.heading ? `<h3 class="card-title" style="font-size:16px;margin-bottom:0.5rem">${escapeHtml(d.heading)}</h3>` : "")
        + `<p>${bodyHtml}</p>`;
      return wrapSection(sectionNum, sectionTitle, id, inner);
    }
    case "image": {
      const d = seg.data as ImageData;
      if (!d.url) return "";
      const src = urls[d.url] || d.url;
      return wrapSection(sectionNum, sectionTitle, id,
        `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(d.alt)}" style="max-width:100%;border-radius:8px"/>${d.caption ? `<figcaption style="font-size:12px;color:var(--text-tertiary);text-align:center;margin-top:0.5rem">${escapeHtml(d.caption)}</figcaption>` : ""}</figure>`
      );
    }
    case "grid": {
      const d = seg.data as GridData;
      return wrapSection(sectionNum, sectionTitle, id,
        `<div class="grid cols-${d.columns}">${d.items.map((it) => `<div class="card"><p class="card-title">${escapeHtml(it.title)}</p><p class="card-body">${escapeHtml(it.body)}</p></div>`).join("")}</div>`
      );
    }
    case "callout": {
      const d = seg.data as CalloutData;
      const c = COLOR_HEX[d.color];
      const hasTitle = !!d.title?.trim();
      const style = hasTitle
        ? `background:${c.light};border-left:3px solid ${c.mid};color:${c.dark};border-radius:0 var(--radius-md) var(--radius-md) 0;padding:1rem 1.25rem`
        : `background:${c.light};color:${c.dark};border-radius:var(--radius-md);padding:0.75rem 1rem`;
      const inner = (hasTitle ? `<p class="title" style="font-size:14px;font-weight:500;margin-bottom:0.5rem">${escapeHtml(d.title!)}</p>` : "")
        + `<p>${resolveLinksPlain(d.body, allSegments).replace(/\n/g, "<br>")}</p>`;
      return wrapSection(sectionNum, sectionTitle, id, `<div class="callout${hasTitle ? " has-title" : ""}" style="${style}">${inner}</div>`);
    }
    case "character": {
      const d = seg.data as CharacterData;
      const avatar = d.avatarUrl ? urls[d.avatarUrl] || d.avatarUrl : null;
      const avatarEl = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(d.name)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover"/>`
        : escapeHtml(d.name.charAt(0) || "?");
      return wrapSection(sectionNum, sectionTitle, id,
        `<div class="character"><div class="character-avatar">${avatarEl}</div><div><p class="name">${escapeHtml(d.name)}</p>${d.role ? `<p class="role">${escapeHtml(d.role)}</p>` : ""}${d.description ? `<p class="desc">${resolveLinksPlain(d.description, allSegments).replace(/\n/g, "<br>")}</p>` : ""}</div></div>`
      );
    }
    case "enemy": {
      const d = seg.data as EnemyData;
      const isElite = d.tier === "elite";
      const avatar = d.avatarUrl ? urls[d.avatarUrl] || d.avatarUrl : null;
      const avatarEl = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(d.name)}" style="width:64px;height:64px;border-radius:8px;object-fit:cover;float:right;margin-left:0.75rem"/>`
        : "";
      return wrapSection(sectionNum, sectionTitle, id, `
        <div class="enemy ${isElite ? "elite" : ""}">
          ${avatarEl}
          <p><span class="name">${escapeHtml(d.name)}</span><span class="tier">${d.tier}</span></p>
          ${d.description ? `<p style="font-size:13px;color:var(--text-secondary);margin:0.5rem 0">${resolveLinksPlain(d.description, allSegments).replace(/\n/g, "<br>")}</p>` : ""}
          <div class="stats">
            <div class="stat"><div class="label">Vida</div><div class="val">${applyFormula(d.formulas?.health, d.stats.health)}</div></div>
            <div class="stat"><div class="label">Daño</div><div class="val">${applyFormula(d.formulas?.damage, d.stats.damage)}</div></div>
            <div class="stat"><div class="label">Velocidad</div><div class="val">${applyFormula(d.formulas?.speed, d.stats.speed)}</div></div>
          </div>
          ${d.formulas?.health || d.formulas?.damage || d.formulas?.speed ? `<p style="font-size:10px;color:var(--text-tertiary);font-style:italic;margin-top:0.25rem">Stats calculados con fórmulas (nivel 1)</p>` : ""}
          ${d.behaviors.length ? `<ul class="behaviors">${d.behaviors.map((b) => `<li><strong>Cuando</strong> ${escapeHtml(b.trigger)} → <strong>${escapeHtml(b.action)}</strong></li>`).join("")}</ul>` : ""}
        </div>
      `);
    }
    case "boss": {
      const d = seg.data as BossData;
      const phasesHtml = d.phases
        .map((p, i) => {
          const desc = p.description
            ? `<p style="font-size:13px;color:var(--text-secondary);margin:0.5rem 0">${escapeHtml(p.description).replace(/\n/g, "<br>")}</p>`
            : "";
          const trig = p.trigger
            ? `<p class="phase-trigger"><strong>Trigger:</strong> ${escapeHtml(p.trigger)}</p>`
            : "";
          const atks = p.attacks.length
            ? `<div class="attacks">${p.attacks.map((a) => `<span class="attack">${escapeHtml(a)}</span>`).join("")}</div>`
            : "";
          return `<div class="phase"><p class="phase-name">Fase ${i + 1}: ${escapeHtml(p.name)}</p>${trig}${desc}${atks}</div>`;
        })
        .join("");
      const desc = d.description
        ? `<p style="font-size:13px;color:var(--text-secondary);margin:0.5rem 0">${resolveLinksPlain(d.description, allSegments).replace(/\n/g, "<br>")}</p>`
        : "";
      const weak = d.weakness
        ? `<div class="weakness"><strong>Debilidad:</strong> ${escapeHtml(d.weakness)}</div>`
        : "";
      const avatar = d.avatarUrl ? urls[d.avatarUrl] || d.avatarUrl : null;
      const avatarEl = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(d.name)}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;float:right;margin-left:0.75rem"/>`
        : "";
      const bossStats = d.stats ?? { health: 0, damage: 0, speed: 0 };
      const statsHtml = (d.formulas?.health || d.formulas?.damage || d.formulas?.speed || bossStats.health || bossStats.damage || bossStats.speed)
        ? `<div class="stats" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin:0.75rem 0">
            <div class="stat"><div class="label">Vida</div><div class="val">${applyFormula(d.formulas?.health, bossStats.health)}</div></div>
            <div class="stat"><div class="label">Daño</div><div class="val">${applyFormula(d.formulas?.damage, bossStats.damage)}</div></div>
            <div class="stat"><div class="label">Velocidad</div><div class="val">${applyFormula(d.formulas?.speed, bossStats.speed)}</div></div>
          </div>
          ${d.formulas?.health || d.formulas?.damage || d.formulas?.speed ? `<p style="font-size:10px;color:var(--text-tertiary);font-style:italic;margin-top:0.25rem">Stats calculados con fórmulas (nivel 1)</p>` : ""}`
        : "";
      return wrapSection(
        sectionNum,
        sectionTitle,
        id,
        `<div class="boss">${avatarEl}<p class="name">${escapeHtml(d.name)}</p>${desc}${statsHtml}${phasesHtml}${weak}</div>`
      );
    }
    case "loop": {
      const d = seg.data as LoopData;
      const nodes = d.nodes || [];
      const edges = (d.edges || []).filter(
        (e) => nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to)
      );
      const W = 460, H = 360, CX = W / 2, CY = H / 2, R = 130, NR = 32;
      const nodePos = (i: number) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(nodes.length, 1);
        return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
      };
      const edgesSvg = edges
        .map((e) => {
          const fi = nodes.findIndex((n) => n.id === e.from);
          const ti = nodes.findIndex((n) => n.id === e.to);
          if (fi < 0 || ti < 0) return "";
          const a = nodePos(fi);
          const b = nodePos(ti);
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / dist, uy = dy / dist;
          const x1 = a.x + ux * NR;
          const y1 = a.y + uy * NR;
          const x2 = b.x - ux * (NR + 6);
          const y2 = b.y - uy * (NR + 6);
          const isWrap = fi > ti || (fi === nodes.length - 1 && ti === 0);
          const label = e.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 4}" font-size="10" fill="var(--ink-tertiary, #9a9a96)" text-anchor="middle">${escapeHtml(e.label)}</text>` : "";
          if (isWrap || (e.label && e.label.toLowerCase() === "loop")) {
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const offX = (mx - CX) * 0.4;
            const offY = (my - CY) * 0.4;
            return `<path d="M ${x1} ${y1} Q ${mx + offX} ${my + offY} ${x2} ${y2}" fill="none" stroke="var(--teal-mid, #1d9e75)" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#loop-arrow)"/>${label}`;
          }
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink-tertiary, #9a9a96)" stroke-width="1.5" marker-end="url(#loop-arrow)"/>${label}`;
        })
        .join("");
      const nodesSvg = nodes
        .map((n, i) => {
          const { x, y } = nodePos(i);
          const lbl = n.label.length > 10 ? n.label.slice(0, 9) + "…" : escapeHtml(n.label);
          return `<g><circle cx="${x}" cy="${y}" r="${NR}" fill="var(--purple-light, #eeedfe)" stroke="var(--purple-mid, #7f77dd)" stroke-width="2"/><text x="${x}" y="${y + 1}" font-size="11" font-weight="500" fill="var(--purple-dark, #3c3489)" text-anchor="middle" dominant-baseline="middle">${lbl}</text><text x="${x}" y="${y + 14}" font-size="8" fill="var(--ink-tertiary, #9a9a96)" text-anchor="middle" dominant-baseline="middle">${i + 1}</text></g>`;
        })
        .join("");
      const stepsList = nodes
        .map(
          (n, i) =>
            `<li><strong>${i + 1}. ${escapeHtml(n.label || "(sin nombre)")}</strong>${n.description ? ` — ${escapeHtml(n.description)}` : ""}</li>`
        )
        .join("");
      const svg = nodes.length
        ? `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:460px;margin:0 auto;display:block"><defs><marker id="loop-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-tertiary, #9a9a96)"/></marker></defs>${edgesSvg}${nodesSvg}</svg>`
        : "";
      const body = svg + (nodes.length ? `<ol style="margin-top:12px;padding-left:20px;font-size:13px;color:var(--text-secondary);line-height:1.7">${stepsList}</ol>` : "");
      return wrapSection(
        sectionNum,
        sectionTitle,
        id,
        (d.name ? `<h3 style="font-size:16px;font-weight:500;margin-bottom:0.5rem">${escapeHtml(d.name)}</h3>` : "") +
          (d.description ? `<p style="font-size:13px;color:var(--text-secondary);margin:0.5rem 0 0.75rem">${escapeHtml(d.description)}</p>` : "") +
          body
      );
    }
    case "dialogue": {
      const d = seg.data as DialogueData;
      const nodes = d.nodes || [];
      const startId = d.startNodeId && nodes.some((n) => n.id === d.startNodeId) ? d.startNodeId : nodes[0]?.id ?? null;
      const byId = new Map(nodes.map((n) => [n.id, n]));
      const inner = nodes.map((n) => {
        const isStart = n.id === startId;
        const choices = n.choices.length
          ? `<ul style="margin-top:6px;padding-left:16px;list-style:none">${n.choices.map((c) => `<li style="font-size:12px;margin:2px 0"><span style="color:#1d9e75;font-weight:600">▸</span> ${escapeHtml(c.label || "(sin texto)")} <span style="color:var(--text-tertiary)">→ ${escapeHtml(c.nextNodeId)}</span></li>`).join("")}</ul>`
          : n.next
            ? `<p style="font-size:11px;color:var(--text-tertiary);margin-top:4px">→ ${escapeHtml(n.next)}</p>`
            : `<p style="font-size:11px;color:var(--text-tertiary);margin-top:4px;font-style:italic">[fin]</p>`;
        return `<div style="background:${isStart ? "#e1f5ee" : "var(--bg-secondary, #f5f5f3)"};border:1px solid ${isStart ? "#1d9e75" : "var(--border, rgba(0,0,0,0.12))"};border-radius:6px;padding:8px 10px;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-family:monospace;font-size:10px;font-weight:600;color:var(--text-tertiary)">${escapeHtml(n.id)}</span>
            <span style="font-size:10px;font-weight:600;background:#e1f5ee;color:#085041;padding:1px 6px;border-radius:4px">${escapeHtml(n.speaker || "?")}</span>
            ${isStart ? `<span style="font-size:9px;font-weight:600;color:#085041;background:#1d9e75;color:#fff;padding:1px 5px;border-radius:3px">START</span>` : ""}
          </div>
          <p style="font-size:13px;color:var(--text-primary);line-height:1.5;margin:0;white-space:pre-wrap">${escapeHtml(n.text || "(sin texto)")}</p>
          ${choices}
        </div>`;
      }).join("");
      return wrapSection(
        sectionNum,
        sectionTitle,
        id,
        (d.name ? `<h3 style="font-size:16px;font-weight:500;margin-bottom:0.5rem">${escapeHtml(d.name)}</h3>` : "") +
          (d.description ? `<p style="font-size:13px;color:var(--text-secondary);margin:0.5rem 0 0.75rem">${escapeHtml(d.description)}</p>` : "") +
          (nodes.length ? `<div>${inner}</div><p style="font-size:10px;color:var(--text-tertiary);margin-top:8px;text-align:center">${nodes.length} líneas · start: ${escapeHtml(startId || "—")}</p>` : `<p style="font-size:12px;color:var(--text-tertiary)">Sin nodos</p>`)
      );
    }
    case "note": {
      const d = seg.data as NoteData;
      const drawingSrc = d.drawing ? (urls[d.drawing] || d.drawing) : "";
      const img = drawingSrc
        ? `<div style="background:var(--bg-secondary, #f5f5f3);border:0.5px solid var(--border, rgba(0,0,0,0.12));border-radius:var(--radius-md, 8px);padding:0.5rem;margin-bottom:0.75rem"><img src="${escapeHtml(drawingSrc)}" alt="${escapeHtml(d.title || "Lienzo")}" style="width:100%;height:auto;border-radius:6px;background:#fff;display:block"/></div>`
        : "";
      const text = d.body
        ? `<pre style="background:var(--bg-secondary, #f5f5f3);border:0.5px solid var(--border, rgba(0,0,0,0.12));border-radius:var(--radius-md, 8px);padding:1rem;font-size:13px;line-height:1.6;white-space:pre-wrap;font-family:system-ui;color:var(--text-primary);margin:0">${escapeHtml(d.body)}</pre>`
        : "";
      const body = img + text || `<p style="font-size:12px;color:var(--text-tertiary);font-style:italic">Lienzo vacío</p>`;
      return wrapSection(sectionNum, sectionTitle, id, body);
    }
    case "tension": {
      const d = seg.data as TensionData;
      const chart = d.beats.length
        ? `<div style="background:#fafaf8;border:0.5px solid var(--border, rgba(0,0,0,0.12));border-radius:var(--radius-md, 8px);padding:1rem;margin-bottom:0.75rem">${tensionSvg(d)}</div>
           <ol style="font-size:12px;line-height:1.7;color:var(--text-secondary);padding-left:1.5rem;margin:0">${d.beats.map((b) => `<li><strong style="color:var(--text-primary)">${escapeHtml(b.label)}</strong> <span style="color:var(--text-tertiary)">— ${escapeHtml(d.yAxisLabel || "y")} ${b.y.toFixed(0)}/100</span></li>`).join("")}</ol>`
        : `<p style="font-size:12px;color:var(--text-tertiary);font-style:italic">Sin datos</p>`;
      return wrapSection(sectionNum, sectionTitle, id, chart);
    }
  }
}

function wrapSection(num: string, title: string, id: string, body: string): string {
  return `
    <div class="section" id="${id}">
      <div class="section-header">
        <span class="section-num">${num}</span>
        <h2 class="section-title">${escapeHtml(title)}</h2>
      </div>
      ${body}
    </div>`;
}

export function exportToHtml(p: ExportPayload, inlinedUrls: Record<string, string> = {}): string {
  const body = p.segments.map((s, i) => renderSegmentToHtml(s, i, inlinedUrls, p.segments)).join("\n");
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(p.title)} · GDD v${escapeHtml(p.version)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="gdd-root">
${body}
<div class="footer">
  <p>${escapeHtml(p.title)} · GDD v${escapeHtml(p.version)}</p>
  <p>Exportado desde GDD-Forge</p>
</div>
</div>
</body>
</html>`;
}

// =====================================================================
// Markdown
// =====================================================================

export function exportToMarkdown(p: ExportPayload, inlinedUrls: Record<string, string> = {}): string {
  const lines: string[] = [];
  lines.push(`# ${p.title}`);
  if (p.subtitle) lines.push(`\n*${p.subtitle}*`);
  lines.push(`\n`);

  let n = 0;
  for (const seg of p.segments) {
    n++;
    switch (seg.type) {
      case "hero": {
        const d = seg.data as HeroData;
        lines.push(`# ${d.title}${d.accentWord ? " " + d.accentWord : ""}`);
        if (d.eyebrow) lines.push(`*${d.eyebrow}*`);
        if (d.subtitle) lines.push(`\n${d.subtitle}`);
        if (d.tags.length) {
          lines.push(`\n${d.tags.map((t) => `\`${t.label}\``).join(" · ")}`);
        }
        lines.push("\n---\n");
        break;
      }
      case "text": {
        const d = seg.data as TextData;
        const heading = d.heading || `Sección ${n}`;
        lines.push(`## ${heading}\n`);
        lines.push(resolveLinksMd(d.body, p.segments));
        lines.push("");
        break;
      }
      case "image": {
        const d = seg.data as ImageData;
        if (!d.url) break;
        const url = inlinedUrls[d.url] || d.url;
        lines.push(`## ${d.caption || "Imagen"}\n`);
        lines.push(`![${d.alt || ""}](${url})`);
        if (d.caption) lines.push(`\n*${d.caption}*`);
        lines.push("");
        break;
      }
      case "grid": {
        const d = seg.data as GridData;
        lines.push(`## ${d.items[0]?.title || "Grilla"}\n`);
        for (const it of d.items) {
          lines.push(`### ${it.title}`);
          lines.push(it.body);
          lines.push("");
        }
        break;
      }
      case "callout": {
        const d = seg.data as CalloutData;
        const bodyMd = resolveLinksMd(d.body, p.segments);
        if (d.title) {
          lines.push(`> **${d.title}**`);
          lines.push(`> `);
        }
        for (const ln of bodyMd.split("\n")) lines.push(`> ${ln}`);
        lines.push("");
        break;
      }
      case "character": {
        const d = seg.data as CharacterData;
        if (d.avatarUrl) {
          const url = inlinedUrls[d.avatarUrl] || d.avatarUrl;
          lines.push(`<img src="${url}" alt="${d.name}" width="80" style="float:right;border-radius:50%"/>`);
        }
        lines.push(`## ${d.name} *(Personaje)*\n`);
        if (d.role) lines.push(`**${d.role}**\n`);
        if (d.description) lines.push(resolveLinksMd(d.description, p.segments));
        lines.push("");
        break;
      }
      case "enemy": {
        const d = seg.data as EnemyData;
        if (d.avatarUrl) {
          const url = inlinedUrls[d.avatarUrl] || d.avatarUrl;
          lines.push(`<img src="${url}" alt="${d.name}" width="100" style="float:right;border-radius:6px"/>`);
        }
        lines.push(`## ${d.name} *(${d.tier})*\n`);
        if (d.description) lines.push(resolveLinksMd(d.description, p.segments));
        lines.push(`\n**Stats:** Vida ${applyFormula(d.formulas?.health, d.stats.health)} · Daño ${applyFormula(d.formulas?.damage, d.stats.damage)} · Velocidad ${applyFormula(d.formulas?.speed, d.stats.speed)}`);
        if (d.formulas?.health || d.formulas?.damage || d.formulas?.speed) {
          lines.push(`*Stats calculados con fórmulas (nivel 1)*`);
        }
        if (d.behaviors.length) {
          lines.push(`\n**Comportamientos:**`);
          for (const b of d.behaviors) {
            lines.push(`- Cuando *${b.trigger}* → ${b.action}`);
          }
        }
        lines.push("");
        break;
      }
      case "boss": {
        const d = seg.data as BossData;
        if (d.avatarUrl) {
          const url = inlinedUrls[d.avatarUrl] || d.avatarUrl;
          lines.push(`<img src="${url}" alt="${d.name}" width="120" style="float:right;border-radius:6px"/>`);
        }
        lines.push(`## ${d.name} *(Boss)*\n`);
        if (d.description) lines.push(resolveLinksMd(d.description, p.segments));
        const bossStats = d.stats ?? { health: 0, damage: 0, speed: 0 };
        if (d.formulas?.health || d.formulas?.damage || d.formulas?.speed || bossStats.health || bossStats.damage || bossStats.speed) {
          lines.push(`\n**Stats:** Vida ${applyFormula(d.formulas?.health, bossStats.health)} · Daño ${applyFormula(d.formulas?.damage, bossStats.damage)} · Velocidad ${applyFormula(d.formulas?.speed, bossStats.speed)}`);
          if (d.formulas?.health || d.formulas?.damage || d.formulas?.speed) {
            lines.push(`*Stats calculados con fórmulas (nivel 1)*`);
          }
        }
        if (d.phases.length) {
          lines.push(`\n### Fases`);
          d.phases.forEach((p, i) => {
            lines.push(`\n**Fase ${i + 1}: ${p.name}**`);
            if (p.trigger) lines.push(`*Trigger: ${p.trigger}*`);
            if (p.description) lines.push(p.description);
            if (p.attacks.length) {
              lines.push(`\nAtaques: ${p.attacks.map((a) => `\`${a}\``).join(", ")}`);
            }
          });
        }
        if (d.weakness) lines.push(`\n**Debilidad:** ${d.weakness}`);
        lines.push("");
        break;
      }
      case "loop": {
        const d = seg.data as LoopData;
        if (d.name) lines.push(`## ${d.name} *(Core loop)*\n`);
        if (d.description) lines.push(d.description);
        if (d.nodes.length) {
          lines.push(`\n### Pasos`);
          d.nodes.forEach((n, i) => {
            lines.push(`${i + 1}. **${n.label || "(sin nombre)"}**${n.description ? ` — ${n.description}` : ""}`);
          });
        }
        if (d.edges.length) {
          lines.push(`\n### Conexiones`);
          d.edges.forEach((e) => {
            const fromNode = d.nodes.find((n) => n.id === e.from);
            const toNode = d.nodes.find((n) => n.id === e.to);
            const fromLabel = fromNode?.label || e.from;
            const toLabel = toNode?.label || e.to;
            const arrow = e.label ? ` (${e.label})` : "";
            lines.push(`- ${fromLabel} → ${toLabel}${arrow}`);
          });
        }
        lines.push("");
        break;
      }
      case "dialogue": {
        const d = seg.data as DialogueData;
        const startId = d.startNodeId && d.nodes.some((n) => n.id === d.startNodeId) ? d.startNodeId : d.nodes[0]?.id;
        if (d.name) lines.push(`## ${d.name} *(Diálogo NPC)*\n`);
        if (d.description) lines.push(d.description);
        if (d.nodes.length) {
          lines.push(`\n### Guion (${d.nodes.length} líneas, inicio: ${startId || "—"})`);
          d.nodes.forEach((n) => {
            const isStart = n.id === startId;
            const tag = isStart ? ` **[START]**` : "";
            lines.push(`\n**${n.speaker || "?"}** *(${n.id})*${tag}`);
            lines.push(`> ${(n.text || "(sin texto)").replace(/\n/g, "\n> ")}`);
            if (n.choices.length) {
              n.choices.forEach((c) => {
                lines.push(`- ▸ ${c.label || "(sin texto)"} → *${c.nextNodeId}*`);
              });
            } else if (n.next) {
              lines.push(`- → *${n.next}*`);
            } else {
              lines.push(`- *[fin]*`);
            }
          });
        }
        lines.push("");
        break;
      }
      case "note": {
        const d = seg.data as NoteData;
        if (d.title) lines.push(`## ${d.title} *(Lienzo)*\n`);
        if (d.body) {
          lines.push(`\n\`\`\`\n${d.body}\n\`\`\``);
        } else if (!d.drawing) {
          lines.push(`*Lienzo vacío*`);
        } else {
          lines.push(`*[Dibujo embebido — ver export HTML]*`);
        }
        lines.push("");
        break;
      }
      case "tension": {
        const d = seg.data as TensionData;
        const xLabel = d.xAxisLabel || "X";
        const yLabel = d.yAxisLabel || "Y";
        if (d.title) lines.push(`## ${d.title} *(Curva de tensión — ${xLabel} × ${yLabel})*\n`);
        if (d.beats.length) {
          lines.push("");
          d.beats.forEach((b) => {
            const icon = b.icon ? ` ${b.icon}` : "";
            lines.push(`- **${b.label}**${icon} — ${yLabel} ${b.y.toFixed(0)}/100`);
          });
          lines.push("");
          lines.push(`*[Curva embebida — ver export HTML]*`);
        } else {
          lines.push(`*Sin datos*`);
        }
        lines.push("");
        break;
      }
    }
  }
  return lines.join("\n");
}

// =====================================================================
// PDF — same as HTML but with print flag. Returns the HTML string;
// the route handler opens it in a new tab with autoPrint().
// =====================================================================
export function exportToPrintableHtml(p: ExportPayload, inlinedUrls: Record<string, string> = {}): string {
  return exportToHtml(p, inlinedUrls);
}
