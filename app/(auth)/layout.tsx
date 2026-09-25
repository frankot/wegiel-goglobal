import type { Metadata } from "next";
import { ViewTransition } from "react";
import { BrandMark, BrandWordmark } from "@/components/layout/brand";

export const metadata: Metadata = {
  title: "Ślad węglowy — GO GLOBAL GROUP",
  description: "System monitorowania śladu węglowego",
};

const SCOPES = [
  { tone: "bg-green", label: "Zakres 1", hint: "paliwa, flota, kotłownie" },
  { tone: "bg-blue", label: "Zakres 2", hint: "prąd, ciepło, chłodzenie" },
  { tone: "bg-purple", label: "ESRS E1", hint: "raport zgodny z CSRD" },
];

/**
 * Ekran logowania w barwach panelu: granatowy pas marki po lewej,
 * płaska biała karta na jasnym płótnie po prawej. Na telefonie pas znika,
 * a znak marki ląduje nad kartą.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Te same nazwy co w panelu bocznym — po zalogowaniu granatowy pas
          zwęża się w sidebar, a logo przesuwa się na swoje miejsce. */}
      <ViewTransition name="brand-panel" share="brand-panel" default="none">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy px-12 py-10 text-navy-foreground lg:flex">
          <ViewTransition name="brand-logo" share="brand-logo" default="none">
            <div className="flex items-center gap-3">
              <BrandMark />
              <BrandWordmark />
            </div>
          </ViewTransition>

          <div className="relative max-w-md">
            <p className="text-[2rem] leading-tight font-light">
              Ślad węglowy firmy,
              <br />
              policzony prosto z faktur.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Faktury z KSeF, wskaźniki KOBIZE i GHG Protocol, pełna ścieżka
              audytu — w jednym miejscu.
            </p>
          </div>

          <ul className="relative space-y-3 text-sm">
            {SCOPES.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                <span aria-hidden="true" className={`size-2 rounded-full ${s.tone}`} />
                <span className="font-semibold">{s.label}</span>
                <span className="text-white/50">{s.hint}</span>
              </li>
            ))}
          </ul>

          {/* Duży, ledwo widoczny znak marki jako tło pasa. */}
          <BrandMark className="pointer-events-none absolute -right-24 -bottom-24 size-[26rem] text-white/[0.04]" />
        </aside>
      </ViewTransition>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-3 text-navy lg:hidden">
          <BrandMark />
          <BrandWordmark tone="light" />
        </div>

        <ViewTransition enter="auth-enter" exit="auth-exit" default="none">
          <div className="w-full max-w-sm animate-page-in">{children}</div>
        </ViewTransition>

        <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} GO GLOBAL GROUP
        </p>
      </main>
    </div>
  );
}
