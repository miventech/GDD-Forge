"use client";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangSwitcher({ className }: { className?: string }) {
  const { locale, locales, setLocale, t } = useT();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-bg-primary p-0.5",
        className
      )}
      role="group"
      aria-label={t("lang.label")}
      title={t("lang.label")}
    >
      {locales.map(({ code }) => {
        const short = code.split("-")[0].toUpperCase();
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "h-7 px-2 text-[11px] font-medium rounded transition-colors",
              active
                ? "bg-purple-light text-purple-dark dark:bg-purple-light/40"
                : "text-ink-tertiary hover:text-ink-secondary"
            )}
            aria-pressed={active}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
