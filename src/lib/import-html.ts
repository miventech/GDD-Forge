// Parses a GDD_MADRE-style HTML file into typed segment data.
// Maps CSS classes used in the reference HTML to the editor's 8 segment types.
//
// Client-side only — uses DOMParser. Returns the same shape as the JSON parser.

import { AccentColor, ImportItem, ImportResult } from "./import-segments";

const EMOJI_TO_ICON: Record<string, string> = {
  "🧙": "User", "⚔️": "Swords", "🗡️": "Swords",
  "👶": "User", "🧑": "User", "🧔": "User",
  "👨‍👩": "Users", "👴": "User", "👵": "User",
  "👑": "Crown", "🔫": "Target", "💥": "Zap",
  "✨": "Sparkles", "⏱️": "Clock", "💫": "Sparkles",
  "📈": "BarChart3", "⚠️": "AlertCircle", "🕳️": "Box",
  "📦": "Package", "🔒": "Lock", "🗿": "Box",
  "⭐": "Star", "💰": "Coins", "💀": "Skull",
  "👻": "Ghost", "🩸": "Droplets", "🎯": "Target",
  "🧠": "Brain", "🗺️": "Map", "🎮": "Gamepad2",
};

const COLOR_VARS: Record<string, AccentColor> = {
  "--purple": "purple", "--teal": "teal", "--coral": "coral",
  "--amber": "amber", "--red": "red",
};

function mapEmoji(emoji: string): string {
  return EMOJI_TO_ICON[emoji] ?? "User";
}

function mapAccentColor(el: Element): AccentColor {
  for (const c of ["teal", "coral", "amber", "red"]) {
    if (el.classList.contains(c)) return c as AccentColor;
  }
  return "purple";
}

function mapBgVarToColor(style: string): AccentColor {
  const m = style.match(/var\((--[a-z]+)/);
  if (m) {
    const v = m[1].replace(/^--[a-z]+-/, "").replace(/-light$|-dark$|-mid$/, "");
    if (v in COLOR_VARS) return COLOR_VARS[v];
  }
  return "purple";
}

function extractHexColor(style: string): string {
  const m = style.match(/#[0-9A-Fa-f]{3,6}/);
  return m ? m[0] : "#888888";
}

function isIntroParagraph(el: Element): boolean {
  if (el.tagName !== "P") return false;
  const style = el.getAttribute("style") || "";
  return /font-size:\s*13px/.test(style) && /color:\s*var\(--text-secondary\)/.test(style);
}

function isSubheading(el: Element): boolean {
  if (el.tagName !== "P") return false;
  const style = el.getAttribute("style") || "";
  return /font-size:\s*13px/.test(style) && /font-weight:\s*500/.test(style);
}

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function parseHero(hero: Element): ImportItem {
  const eyebrow = textOf(hero.querySelector(".hero-eyebrow"));
  const titleEl = hero.querySelector(".hero-title");
  const titleSpan = titleEl?.querySelector("span");
  const accentWord = textOf(titleSpan);
  const title = titleSpan ? "" : textOf(titleEl);
  const subtitle = textOf(hero.querySelector(".hero-sub"));
  const tags: { label: string; color: AccentColor }[] = [];
  hero.querySelectorAll(".hero-tags .tag").forEach((tag) => {
    const label = textOf(tag);
    let color: AccentColor = "purple";
    for (const c of Array.from(tag.classList)) {
      if (c.startsWith("tag-")) {
        const k = c.replace("tag-", "") as AccentColor;
        if (["purple", "teal", "coral", "amber"].includes(k)) color = k;
      }
    }
    tags.push({ label, color });
  });
  return { type: "hero", data: { eyebrow, title, accentWord, subtitle, tags } };
}

function parseAccentCard(el: Element): ImportItem {
  const color = mapAccentColor(el);
  const title = textOf(el.querySelector(".card-title"));
  const body = textOf(el.querySelector(".card-body"));
  return { type: "callout", data: { color, title, body } };
}

function parseNoteBox(el: Element): ImportItem {
  const color = mapAccentColor(el);
  const body = textOf(el);
  return { type: "callout", data: { color, title: "", body } };
}

function parseSpoilerBox(el: Element): ImportItem {
  const overlayPs = el.querySelectorAll(".spoiler-overlay p");
  const warning = textOf(overlayPs[1]) || "Spoiler";
  const content = textOf(el.querySelector(".spoiler-content"));
  return { type: "callout", data: { color: "red", title: warning, body: content } };
}

function parseCard(card: Element): { icon: string; title: string; body: string } {
  const titleEl = card.querySelector(".card-title");
  const rawTitle = textOf(titleEl);
  const emojiMatch = rawTitle.match(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]+/u);
  const icon = emojiMatch ? mapEmoji(emojiMatch[0]) : "Box";
  const title = emojiMatch ? rawTitle.slice(emojiMatch[0].length).trim() : rawTitle;
  const body = textOf(card.querySelector(".card-body"));
  return { icon, title, body };
}

function parseCharacter(card: Element): ImportItem {
  const avatar = card.querySelector(".char-avatar");
  const emoji = (avatar?.textContent ?? "").trim();
  const icon = mapEmoji(emoji);
  const name = textOf(card.querySelector(".char-name"));
  const description = textOf(card.querySelector(".char-desc"));
  return {
    type: "character",
    data: { name, role: "", description, icon },
  };
}

function parseRelic(card: Element): { name: string; description: string } {
  return {
    name: textOf(card.querySelector(".relic-name")),
    description: textOf(card.querySelector(".relic-desc")),
  };
}

function parseBossRow(row: Element): { icon: string; name: string; role: string } {
  const iconEl = row.querySelector(".boss-icon");
  const emoji = (iconEl?.textContent ?? "").trim();
  return {
    icon: mapEmoji(emoji),
    name: textOf(row.querySelector(".boss-name")),
    role: textOf(row.querySelector(".boss-rel")),
  };
}

function parseGrid(el: Element, errors: string[]): ImportItem[] {
  const out: ImportItem[] = [];
  const columns = el.classList.contains("grid-3") ? 3 : 2;

  const charCards = el.querySelectorAll(".char-card");
  if (charCards.length) {
    out.push({ type: "character", data: parseCharacter(charCards[0]) });
    return out;
  }

  const relicCards = el.querySelectorAll(".relic-card");
  if (relicCards.length) {
    // Subsume relics into a grid card of items
    const items = Array.from(relicCards).map((r) => {
      const d = parseRelic(r);
      return { icon: r.classList.contains("relic-cursed") ? "AlertCircle" : "Gem", title: d.name, body: d.description };
    });
    out.push({ type: "grid", data: { columns, items } });
    return out;
  }

  const bossRows = el.querySelectorAll(".boss-row");
  if (bossRows.length) {
    // First boss becomes a boss segment with no phases (legacy GDD_MADRE has no phases)
    const first = bossRows[0];
    const d = parseBossRow(first);
    out.push({
      type: "boss",
      data: {
        name: d.name,
        description: d.role,
        phases: [],
        weakness: "",
      },
    });
    return out;
  }

  const directCards = el.querySelectorAll(":scope > .card");
  if (directCards.length) {
    out.push({
      type: "grid",
      data: { columns, items: Array.from(directCards).map(parseCard) },
    });
    return out;
  }

  const accentCards = el.querySelectorAll(".accent-card");
  if (accentCards.length) {
    Array.from(accentCards).forEach((card) => out.push(parseAccentCard(card)));
    return out;
  }

  errors.push("Grid sin items reconocibles");
  return out;
}

function parseSection(section: Element, idx: number, errors: string[]): ImportItem[] {
  const sectionTitle = textOf(section.querySelector(".section-title")) || `Sección ${idx + 1}`;
  const out: ImportItem[] = [];
  let pendingIntro: string | null = null;

  const flushIntro = () => {
    if (pendingIntro) {
      out.push({ type: "text", data: { heading: sectionTitle, body: pendingIntro } });
      pendingIntro = null;
    }
  };

  Array.from(section.children).forEach((child) => {
    if (child.classList.contains("section-header")) return;
    if (isSubheading(child)) return;

    if (isIntroParagraph(child)) {
      pendingIntro = textOf(child);
      return;
    }

    flushIntro();

    if (child.classList.contains("accent-card")) {
      out.push(parseAccentCard(child));
    } else if (child.classList.contains("note-box")) {
      out.push(parseNoteBox(child));
    } else if (child.classList.contains("spoiler-box")) {
      out.push(parseSpoilerBox(child));
    } else if (child.classList.contains("grid-2") || child.classList.contains("grid-3")) {
      out.push(...parseGrid(child, errors));
    } else if (child.classList.contains("card")) {
      const bossRows = child.querySelectorAll(".boss-row");
      if (bossRows.length) {
        const first = bossRows[0];
        const d = parseBossRow(first);
        out.push({
          type: "boss",
          data: { name: d.name, description: d.role, phases: [], weakness: "" },
        });
      } else {
        out.push({ type: "grid", data: { columns: 1, items: [parseCard(child)] } });
      }
    } else if (child.classList.contains("relic-card")) {
      const d = parseRelic(child);
      out.push({
        type: "grid",
        data: { columns: 1, items: [{ icon: child.classList.contains("relic-cursed") ? "AlertCircle" : "Gem", title: d.name, body: d.description }] },
      });
    }
  });

  flushIntro();
  return out;
}

export function parseHtmlToSegments(html: string): ImportResult {
  const errors: string[] = [];
  if (typeof DOMParser === "undefined") {
    return { segments: [], errors: ["El parser HTML solo funciona en el navegador."] };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const segments: ImportItem[] = [];

  const hero = doc.querySelector(".hero");
  if (hero) {
    try { segments.push(parseHero(hero)); }
    catch (e: any) { errors.push(`Hero: ${e.message}`); }
  }

  doc.querySelectorAll(".section").forEach((section, i) => {
    try {
      segments.push(...parseSection(section, i, errors));
    } catch (e: any) {
      errors.push(`Sección #${i + 1}: ${e.message}`);
    }
  });

  return { segments, errors };
}
