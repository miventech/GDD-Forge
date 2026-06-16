"use client";
import { useRef, useState } from "react";
import { Upload, FileJson, FileCode, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { parseSegmentsJson, ImportItem } from "@/lib/import-segments";
import { parseHtmlToSegments } from "@/lib/import-html";
import { getSegmentLabels, SegmentType } from "@/lib/segment-types";
import { useT } from "@/lib/i18n";

const EXAMPLE = `{
  "segments": [
    { "type": "hero", "title": "MADRE", "subtitle": "Roguelite de acción", "tags": ["Roguelite", "Acción"] },
    { "type": "text", "heading": "Concepto", "body": "Un espíritu llamado Madre guía al jugador..." },
    { "type": "grid", "items": [
      { "icon": "User", "title": "Base", "body": "Personaje inicial" },
      { "icon": "Crown", "title": "Padre", "body": "Jefe final" }
    ]},
    { "type": "note", "color": "amber", "body": "Esto es un roguelite, no un metroidvania." }
  ]
}`;

export function ImportSegmentsButton({
  onImport,
}: {
  onImport: (segments: ImportItem[]) => void;
}) {
  const { t } = useT();
  const SEGMENT_LABELS = getSegmentLabels(t);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ segments: ImportItem[]; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".html") || lower.endsWith(".htm") || text.trim().startsWith("<")) {
      setPreview(parseHtmlToSegments(text));
    } else {
      setPreview(parseSegmentsJson(text));
    }
  }

  function onPaste() {
    const text = window.prompt(t("import.promptPaste"));
    if (!text) return;
    if (text.trim().startsWith("<")) {
      setPreview(parseHtmlToSegments(text));
    } else {
      setPreview(parseSegmentsJson(text));
    }
  }

  function onConfirm() {
    if (!preview || preview.segments.length === 0) return;
    onImport(preview.segments);
    setOpen(false);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadExample() {
    const blob = new Blob([EXAMPLE], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gdd-segments.example.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="w-3.5 h-3.5" /> {t("import.title")}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in"
          onClick={() => {
            setOpen(false);
            setPreview(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
        >
          <div
            className="w-full max-w-lg bg-bg-primary rounded-lg border border-line p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-md bg-teal-light text-teal-dark grid place-items-center">
                <FileJson className="w-4 h-4" />
              </div>
              <h2 className="text-base font-medium text-ink-primary">{t("import.dialog.title")}</h2>
            </div>
            <p className="text-xs text-ink-tertiary mb-4">
              {t("import.dialog.body")}
            </p>

            <div className="space-y-3">
              <label className="block">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.html,.htm,application/json,text/html"
                  onChange={onFile}
                  className="block w-full text-sm text-ink-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-purple-light file:text-purple-dark hover:file:opacity-80 cursor-pointer"
                />
              </label>
              <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                <span>{t("import.dialog.or")}</span>
                <button
                  type="button"
                  onClick={onPaste}
                  className="text-purple hover:underline"
                >
                  {t("import.dialog.paste")}
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={downloadExample}
                  className="text-purple hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> {t("import.dialog.downloadExample")}
                </button>
              </div>
            </div>

            {preview ? (
              <div className="mt-4 space-y-2">
                {preview.segments.length > 0 ? (
                  <div className="p-3 rounded-md bg-teal-light text-teal-dark text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {t("import.dialog.ready", { n: preview.segments.length })}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {preview.segments.map((s, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-bg-primary text-ink-secondary"
                            >
                              {SEGMENT_LABELS[s.type as SegmentType]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                {preview.errors.length > 0 ? (
                  <div className="p-3 rounded-md bg-amber-light text-amber-dark text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {preview.errors.length === 1
                            ? t("import.dialog.warningOne")
                            : t("import.dialog.warningMany", { n: preview.errors.length })}
                        </p>
                        <ul className="text-xs mt-1 list-disc list-inside space-y-0.5">
                          {preview.errors.slice(0, 6).map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                          {preview.errors.length > 6 ? (
                            <li>{t("import.dialog.moreWarnings", { n: preview.errors.length - 6 })}</li>
                          ) : null}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  setPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={!preview || preview.segments.length === 0}
              >
                {t("import.dialog.cta", { n: preview?.segments.length ?? 0 })}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
