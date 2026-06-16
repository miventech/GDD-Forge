"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

// Compact, keyboard-friendly tag editor. Used inside any segment editor
// to let the user assign search/filter tags.

export function TagEditor({
  tags,
  onChange,
  suggestions = [],
  className,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const { t } = useT();

  function add(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t || tags.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...tags, t]);
    setDraft("");
  }

  function remove(t: string) {
    onChange(tags.filter((x) => x !== t));
  }

  const available = suggestions.filter((s) => !tags.includes(s));
  const showSuggest = available.length > 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-light text-purple-dark font-medium"
          >
            #{tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="hover:text-red"
              title={t("tags.removeTag", { tag })}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              e.preventDefault();
              remove(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length ? t("tags.addTag") : t("tags.addTagHint")}
          className="text-[10px] bg-transparent border-none outline-none placeholder:text-ink-tertiary min-w-[100px] flex-1"
        />
      </div>
      {showSuggest ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-ink-tertiary uppercase tracking-wider">{t("tags.suggested")}</span>
          {available.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border border-line text-ink-tertiary hover:border-purple-mid hover:text-purple-dark transition-colors"
            >
              <Plus className="w-2.5 h-2.5" />#{s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Read-only tag chips — used in the view/header of a segment to surface tags
// without an editor.
export function TagChips({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((t) => (
        <span
          key={t}
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-ink-tertiary font-medium"
        >
          #{t}
        </span>
      ))}
    </div>
  );
}
