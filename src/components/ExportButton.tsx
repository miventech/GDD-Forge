"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, FileCode, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportToHtml, exportToMarkdown, exportToPrintableHtml, type ExportSegment, type ExportPayload } from "@/lib/export";
import { buildExportUrls } from "@/lib/gdd-manifest";
import { useGdd } from "@/lib/gdd-store";

type Format = "html" | "md" | "pdf";

const FORMATS: { key: Format; label: string; icon: any; mime: string; ext: string }[] = [
  { key: "html", label: "HTML", icon: FileCode, mime: "text/html", ext: "html" },
  { key: "md", label: "Markdown", icon: FileText, mime: "text/markdown", ext: "md" },
  { key: "pdf", label: "PDF (print)", icon: Printer, mime: "text/html", ext: "html" },
];

export function ExportButton(props: {
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  version: string;
  segments: ExportSegment[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const file = useGdd();

  async function download(fmt: Format) {
    setBusy(fmt);
    setExportError(null);
    try {
      // ponytail: resolve every asset ref to a data URL so the exported
      // file is self-contained. IDB is not available at view time.
      const urls = file ? await buildExportUrls(file) : {};
      const payload: ExportPayload = {
        title: props.title,
        subtitle: props.subtitle,
        eyebrow: props.eyebrow,
        version: props.version,
        segments: props.segments,
      };

      if (fmt === "pdf") {
        const html = exportToPrintableHtml(payload, urls);
        const blob = new Blob([html], { type: "text/html; charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank");
        if (w) {
          setTimeout(() => {
            try { w.focus(); w.print(); } catch {}
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
          }, 800);
        }
        return;
      }

      const content = fmt === "html" ? exportToHtml(payload, urls) : exportToMarkdown(payload, urls);
      const blob = new Blob([content], { type: "text/plain; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = FORMATS.find((f) => f.key === fmt)!.ext;
      a.download = `${slug(props.title) || "gdd"}-v${props.version}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError(e?.message ?? "No se pudo exportar el archivo");
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <Download className="w-3.5 h-3.5" /> Exportar
      </Button>
      {open ? createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-bg-primary rounded-lg border border-line p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-medium text-ink-primary mb-1">Exportar GDD</h2>
            <p className="text-xs text-ink-tertiary mb-4">
              El documento se genera desde los segmentos actuales.
            </p>
            <div className="space-y-2">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.key}
                    onClick={() => download(f.key)}
                    disabled={busy !== null}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-line hover:bg-bg-secondary transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-md bg-purple-light text-purple-dark grid place-items-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-primary">{f.label}</p>
                      <p className="text-[11px] text-ink-tertiary">.{f.ext}</p>
                    </div>
                    {busy === f.key ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-purple border-r-transparent animate-spin" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-ink-tertiary text-center">
              PDF: se abre el HTML en una pestaña nueva; usá Imprimir → Guardar como PDF.
            </p>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
