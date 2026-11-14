import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MissingData, Reminders } from "@/lib/reminders/query";

const MAX_LISTED = 6;

function MissingList({ missing }: { missing: MissingData[] }) {
  const shown = missing.slice(0, MAX_LISTED);
  return (
    <ul className="space-y-1">
      {shown.map((m) => (
        <li key={m.sourceId}>
          <span className="text-strong">{m.sourceName}</span>{" "}
          <span className="text-muted-foreground">— brak danych za {m.period.label}</span>
        </li>
      ))}
      {missing.length > shown.length && (
        <li className="text-muted-foreground">i {missing.length - shown.length} innych źródeł</li>
      )}
    </ul>
  );
}

function Banner({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-sm border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm" role="status">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
      <div className="min-w-0 space-y-1.5">
        <p className="font-medium text-strong">{title}</p>
        {children}
      </div>
    </div>
  );
}

const ActionLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
    {children}
    <ArrowRight className="size-3.5" aria-hidden="true" />
  </Link>
);

export function MissingDataBanner({ reminders }: { reminders: Reminders }) {
  if (reminders.missing.length === 0) return null;
  return (
    <Banner title="Brakujące dane za ostatni okres rozliczeniowy">
      <MissingList missing={reminders.missing} />
    </Banner>
  );
}

export function FactorWarningsBanner({ reminders, canManage }: { reminders: Reminders; canManage: boolean }) {
  if (reminders.factors.length === 0) return null;
  return (
    <Banner title="Wskaźniki emisji wymagają uwagi">
      <ul className="list-disc space-y-1 pl-4">
        {reminders.factors.map((f) => (
          <li key={f.text}>{f.text}</li>
        ))}
      </ul>
      {!canManage && <p className="text-xs text-muted-foreground">Wskaźniki aktualizuje Analityk.</p>}
    </Banner>
  );
}

export function RemindersCard({ reminders, canManage }: { reminders: Reminders; canManage: boolean }) {
  const { missing, factors } = reminders;
  if (missing.length === 0 && factors.length === 0) return null;
  return (
    <Card className="border border-amber-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
          Wymaga uwagi
        </CardTitle>
        <CardDescription>Sprawdzane na podstawie częstotliwości rozliczeń źródeł i okresów ważności wskaźników.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 text-sm md:grid-cols-2">
        {missing.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Brakujące dane</h3>
            <MissingList missing={missing} />
            <ActionLink href="/entries/new">Dodaj faktury</ActionLink>
          </section>
        )}
        {factors.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Wskaźniki emisji</h3>
            <ul className="list-disc space-y-1 pl-4">
              {factors.map((f) => (
                <li key={f.text}>{f.text}</li>
              ))}
            </ul>
            {canManage ? (
              <ActionLink href="/factors">Przejdź do Współczynników</ActionLink>
            ) : (
              <p className="text-xs text-muted-foreground">Wskaźniki aktualizuje Analityk.</p>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
