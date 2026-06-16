import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import es from "../../lang/es.json";

// ponytail: metadata is server-rendered, so it always uses the default
// locale (es). The client-side I18nProvider doesn't touch <title> or
// <meta name="description">. Same reason <html lang> is fixed to es;
// updating it would need cookie-based locale detection on the server,
// which this project intentionally skips.
export const metadata: Metadata = {
  title: es.strings["meta.title"],
  description: es.strings["meta.description"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
