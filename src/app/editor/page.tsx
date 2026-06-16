"use client";
// Single GDD editor page. Hosts all the sub-tools as tabs.
// All state lives in the gdd-store; this page just orchestrates.

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, FileText, FolderOpen, Loader2 } from "lucide-react";
import { useGdd, useGddReady } from "@/lib/gdd-store";
import { downloadGddFile } from "@/lib/gdd-file";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useT } from "@/lib/i18n";
import { GddEditor } from "@/components/gdd/GddEditor";
import { ChecklistClient } from "@/components/ChecklistClient";
import { DecisionsClient } from "@/components/DecisionsClient";
import { FeaturesClient } from "@/components/FeaturesClient";
import { BrainstormCanvas } from "@/components/BrainstormCanvas";

type Tab = "doc" | "checklist" | "decisions" | "features" | "brainstorm";

const TAB_KEYS: { key: Tab; labelKey: string }[] = [
  { key: "doc", labelKey: "editor.tab.doc" },
  { key: "checklist", labelKey: "editor.tab.checklist" },
  { key: "decisions", labelKey: "editor.tab.decisions" },
  { key: "features", labelKey: "editor.tab.features" },
  { key: "brainstorm", labelKey: "editor.tab.brainstorm" },
];

export default function EditorPage() {
  const file = useGdd();
  const ready = useGddReady();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("doc");
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ponytail: with static export + async IDB load, the first render is
  // the server snapshot (null). Wait for both React hydration AND the
  // IDB initial load so we don't flash the empty state.
  useEffect(() => setHydrated(true), []);

  // ponytail: save is async (ZIP + SHA-256 of every asset). Surface the
  // busy state and any crypto/IO failure instead of swallowing them.
  async function onSave() {
    if (!file || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await downloadGddFile(file);
    } catch (e: any) {
      setSaveError(e?.message ?? t("editor.saveErrorDefault"));
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || !ready) {
    return <div className="min-h-screen bg-bg-tertiary" />;
  }

  if (!file) {
    return <NoProjectState />;
  }

  return (
    <div className="min-h-screen bg-bg-tertiary flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-bg-tertiary/85 border-b border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-ink-secondary hover:text-ink-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">{t("editor.back")}</span>
          </Link>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-medium text-ink-primary truncate">
              {file.project.title || t("editor.untitled")}
              <span className="ml-2 text-[10px] text-ink-tertiary font-normal">
                v{file.project.version}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{saving ? t("editor.saving") : t("editor.save")}</span>
              <span className="sm:hidden">{saving ? t("editor.savingShort") : t("editor.saveShort")}</span>
            </Button>
          </div>
          {saveError ? (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-1 text-[11px] text-red">
              {saveError}
            </div>
          ) : null}
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
          {TAB_KEYS.map((tk) => (
            <button
              key={tk.key}
              onClick={() => setTab(tk.key)}
              className={
                "h-9 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap " +
                (tab === tk.key
                  ? "border-purple text-ink-primary"
                  : "border-transparent text-ink-tertiary hover:text-ink-secondary")
              }
            >
              {t(tk.labelKey)}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {tab === "doc" && <GddEditor />}
        {tab === "checklist" && <ChecklistClient />}
        {tab === "decisions" && <DecisionsClient />}
        {tab === "features" && <FeaturesClient />}
        {tab === "brainstorm" && <BrainstormCanvas />}
      </main>
    </div>
  );
}

function NoProjectState() {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-bg-tertiary grid place-items-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-lg bg-purple-light text-purple-dark grid place-items-center mx-auto mb-4">
          <FileText className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-medium text-ink-primary mb-1">{t("editor.noFile.title")}</h1>
        <p className="text-sm text-ink-secondary mb-6">
          {t("editor.noFile.body")}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/">
            <Button>
              <FolderOpen className="w-4 h-4" /> {t("editor.noFile.cta")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
