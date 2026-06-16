"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className={cn(
          "w-9 h-9 grid place-items-center rounded-md border border-line text-ink-secondary",
          className
        )}
        aria-label="Cambiar tema"
      >
        <Sun className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-bg-primary p-0.5",
        className
      )}
    >
      {[
        { v: "light", Icon: Sun },
        { v: "system", Icon: Monitor },
        { v: "dark", Icon: Moon },
      ].map(({ v, Icon }) => (
        <button
          key={v}
          onClick={() => setTheme(v)}
          className={cn(
            "w-7 h-7 grid place-items-center rounded transition-colors",
            theme === v
              ? "bg-purple-light text-purple-dark dark:bg-purple-light/40"
              : "text-ink-tertiary hover:text-ink-secondary"
          )}
          aria-label={`Tema ${v}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
