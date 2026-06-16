"use client";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { I18nProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <I18nProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {mounted ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
      </ThemeProvider>
    </I18nProvider>
  );
}
