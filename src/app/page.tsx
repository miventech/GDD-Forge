"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, CheckSquare, Image as ImageIcon, Sparkles, FolderOpen, Trash2 } from "lucide-react";
import * as Lucide from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useT } from "@/lib/i18n";
import { useGdd, store } from "@/lib/gdd-store";
import { readGddFromFile, newEmptyGdd, newGddFromTemplate } from "@/lib/gdd-file";
import { TEMPLATES, pickLocalized, type Template } from "@/lib/templates";
import type { GddFile } from "@/lib/gdd-file";

const RECENT_KEY = "gddml:v2:recent";
const RECENT_FILES_KEY = "gddml:v2:recent-files";

type RecentItem = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function HomePage() {
  const router = useRouter();
  const file = useGdd();
  const { t, locale } = useT();
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHydrated(true);
    loadRecent();
  }, []);

  async function onOpenFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.files?.[0];
    if (!input) return;
    const result = await readGddFromFile(input);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    store.open(result.file);
    addToRecent(result.file);
    // ponytail: clear value so picking the same file again still fires onChange.
    e.target.value = "";
    router.push("/editor");
  }

  function onNew() {
    const f = newEmptyGdd();
    store.open(f);
    addToRecent(f);
    router.push("/editor");
  }

  function onUseTemplate(t: Template) {
    const f = newGddFromTemplate(t);
    store.open(f);
    addToRecent(f);
    router.push("/editor");
  }

  function loadRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }

  function addToRecent(f: GddFile) {
    const item: RecentItem = {
      id: f.project.id,
      title: f.project.title,
      updatedAt: f.updatedAt,
    };
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.id !== item.id);
      const next = [item, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        // ponytail: persist full file alongside the index so the recent
        // list is actually clickable. Drop orphans to keep storage bounded.
        const files = readRecentFiles();
        files[item.id] = f;
        const keep = new Set(next.map((r) => r.id));
        for (const k of Object.keys(files)) if (!keep.has(k)) delete files[k];
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
      } catch {}
      return next;
    });
  }

  function readRecentFiles(): Record<string, GddFile> {
    try {
      const raw = localStorage.getItem(RECENT_FILES_KEY);
      return raw ? (JSON.parse(raw) as Record<string, GddFile>) : {};
    } catch {
      return {};
    }
  }

  function onOpenRecent(id: string) {
    const current = store.get();
    if (current && current.project.id === id) {
      router.push("/editor");
      return;
    }
    const files = readRecentFiles();
    const file = files[id];
    if (!file) {
      alert(t("home.openFileAlert"));
      return;
    }
    store.open(file);
    router.push("/editor");
  }

  function onDeleteRecent(id: string) {
    setRecent((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        const files = readRecentFiles();
        delete files[id];
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
      } catch {}
      return next;
    });
  }

  if (!hydrated) {
    return <div className="min-h-screen bg-bg-tertiary" />;
  }

  return (
    <main className="min-h-screen bg-bg-tertiary">
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-purple grid place-items-center text-white font-semibold text-sm">
            G
          </div>
          <span className="text-sm font-medium text-ink-primary">GDD Manager Lite</span>
        </div>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="text-[11px] tracking-[0.14em] text-ink-tertiary uppercase mb-3">
          {t("home.eyebrow")}
        </p>
        <h1 className="text-5xl sm:text-6xl font-medium leading-[1.05] text-ink-primary">
          {t("home.titleStart")}
          <span className="text-purple">{t("home.titleAccent")}</span>
          {t("home.titleEnd")}
        </h1>
        <p className="text-[15px] text-ink-secondary mt-4 max-w-xl mx-auto leading-relaxed">
          {t("home.subtitle")}
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button size="lg" onClick={onNew}>
            <Sparkles className="w-4 h-4" />
            {t("home.ctaNew")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen className="w-4 h-4" />
            {t("home.ctaOpen")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gdd,.json,application/json"
            onChange={onOpenFile}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <h2 className="text-sm font-medium text-ink-secondary mb-4">{t("nav.recent")}</h2>
          <div className="space-y-2">
            {recent.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 p-3 bg-bg-primary border border-line rounded-lg hover:border-line-strong transition-colors"
              >
                <button
                  onClick={() => onOpenRecent(r.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium text-ink-primary truncate">{r.title}</p>
                  <p className="text-[11px] text-ink-tertiary mt-0.5">
                    {new Date(r.updatedAt).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </button>
                <button
                  onClick={() => onDeleteRecent(r.id)}
                  className="p-1.5 text-ink-tertiary hover:text-red transition-colors"
                  title={t("home.removeFromRecent")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <h2 className="text-sm font-medium text-ink-secondary mb-4">{t("nav.templates")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TEMPLATES.map((t) => {
            const IconName = t.icon as keyof typeof Lucide;
            const Icon = (Lucide as any)[IconName] as React.ComponentType<{ className?: string }>;
            return (
              <button
                key={t.id}
                onClick={() => onUseTemplate(t)}
                className="text-left p-3 bg-bg-primary border border-line rounded-lg hover:border-line-strong transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-md grid place-items-center mb-2"
                  style={{ background: `var(--${t.accent}-light)`, color: `var(--${t.accent}-dark)` }}
                >
                  {Icon ? <Icon className="w-4 h-4" /> : null}
                </div>
                <p className="text-xs font-medium text-ink-primary mb-0.5 group-hover:text-purple-dark">{pickLocalized(t, "name", locale)}</p>
                <p className="text-[10px] text-ink-tertiary leading-snug line-clamp-3">{pickLocalized(t, "tagline", locale)}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          {
            icon: BookOpen,
            color: "purple",
            titleKey: "home.featureMulti.title",
            bodyKey: "home.featureMulti.body",
          },
          {
            icon: Sparkles,
            color: "teal",
            titleKey: "home.featureSegments.title",
            bodyKey: "home.featureSegments.body",
          },
          {
            icon: CheckSquare,
            color: "coral",
            titleKey: "home.featureChecklist.title",
            bodyKey: "home.featureChecklist.body",
          },
          {
            icon: ImageIcon,
            color: "amber",
            titleKey: "home.featureAssets.title",
            bodyKey: "home.featureAssets.body",
          },
          {
            icon: FolderOpen,
            color: "purple",
            titleKey: "home.featureFiles.title",
            bodyKey: "home.featureFiles.body",
          },
          {
            icon: ArrowRight,
            color: "teal",
            titleKey: "home.featureLocal.title",
            bodyKey: "home.featureLocal.body",
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.titleKey}
              className="bg-bg-primary border border-line rounded-lg p-4"
            >
              <div
                className={`w-9 h-9 rounded-md bg-${f.color}-light text-${f.color}-dark grid place-items-center mb-3`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-ink-primary mb-1">{t(f.titleKey)}</p>
              <p className="text-xs text-ink-secondary leading-relaxed">{t(f.bodyKey)}</p>
            </div>
          );
        })}
      </section>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-tertiary">
          <p>{t("home.footer.copy")}</p>
          <p>{t("home.footer.icons")}</p>
        </div>
      </footer>
    </main>
  );
}
