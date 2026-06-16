"use client";
// Tiny i18n. JSONs are bundled at build via direct import (so they're
// loaded as part of the server's build, not via a runtime fetch), then
// the active locale is picked on the client and persisted in localStorage.
//
// ponytail: no next-intl, no routing, no middleware. The whole app is
// one tree and one switcher; anything heavier is over-engineering.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import en from "../../lang/en.json";
import es from "../../lang/es.json";
import ptBR from "../../lang/pt-BR.json";

type LangFile = {
  code: string;
  name: string;
  author: string;
  strings: Record<string, string>;
};

const LOCALES: LangFile[] = [es, en, ptBR];
const DEFAULT_LOCALE = "es";
const STORAGE_KEY = "gddml:locale";

function pickByBrowser(): string {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of langs) {
    const lc = raw.toLowerCase();
    if (lc.startsWith("pt")) return "pt-BR";
    if (lc.startsWith("en")) return "en";
    if (lc.startsWith("es")) return "es";
  }
  return DEFAULT_LOCALE;
}

function findLocale(code: string): LangFile {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

function validateLocales(): void {
  // ponytail: drift check. If a key exists in one locale but not another,
  // the missing one would render as "[key]" at runtime — surface it here
  // so translators see the gap in the console instead of in production.
  if (typeof console === "undefined") return;
  const base = LOCALES[0];
  for (const other of LOCALES.slice(1)) {
    const missing = Object.keys(base.strings).filter((k) => !(k in other.strings));
    const extra = Object.keys(other.strings).filter((k) => !(k in base.strings));
    if (missing.length || extra.length) {
      console.warn(
        `[i18n] locale "${other.code}" out of sync with "${base.code}":`,
        { missing, extra }
      );
    }
  }
}
validateLocales();

type Ctx = {
  locale: string;
  locales: { code: string; name: string; author: string }[];
  setLocale: (code: string) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY) || undefined;
      } catch {
        return undefined;
      }
    })();
    setLocaleState(stored && LOCALES.some((l) => l.code === stored) ? stored : pickByBrowser());
  }, []);

  const setLocale = useCallback((code: string) => {
    if (!LOCALES.some((l) => l.code === code)) return;
    setLocaleState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(() => {
    const active = findLocale(locale);
    const interpolate = (s: string, vars?: Record<string, string | number>) => {
      if (!vars) return s;
      return s.replace(/\{(\w+)\}/g, (_, k) => {
        const v = vars[k];
        return v == null ? `{${k}}` : String(v);
      });
    };
    return {
      locale,
      locales: LOCALES.map(({ code, name, author }) => ({ code, name, author })),
      setLocale,
      t: (key: string, varsOrFallback?: string | Record<string, string | number>, fallback?: string) => {
        const vars = typeof varsOrFallback === "object" ? varsOrFallback : undefined;
        const fb = typeof varsOrFallback === "string" ? varsOrFallback : fallback;
        const raw = active.strings[key] ?? fb ?? `[${key}]`;
        return interpolate(raw, vars);
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside <I18nProvider>");
  return ctx;
}

export function getLocaleMeta(code: string) {
  const f = findLocale(code);
  return { code: f.code, name: f.name, author: f.author };
}
