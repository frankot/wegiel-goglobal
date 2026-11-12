import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AuditRow } from "@/lib/audit/query";

const dateTime = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

export function AuditList({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="px-5">
        <p className="text-sm text-muted-foreground">Brak zdarzeń dla wybranych filtrów.</p>
      </Card>
    );
  }

  return (
    <Card className="gap-0 p-0">
      <div className="hidden grid-cols-[9.5rem_12rem_minmax(0,1fr)] gap-4 border-b border-border px-5 py-2.5 text-[0.8125rem] text-strong md:grid">
        <span>Data</span>
        <span>Użytkownik</span>
        <span>Zdarzenie</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id}>
            <details className="group">
              <summary className="grid cursor-pointer list-none gap-x-4 gap-y-0.5 px-5 py-2.5 text-[0.8125rem] hover:bg-[#f6f8fb] md:grid-cols-[9.5rem_12rem_minmax(0,1fr)] [&::-webkit-details-marker]:hidden">
                <time dateTime={r.at} className="tabular-nums text-muted-foreground">
                  {dateTime.format(new Date(r.at))}
                </time>
                <span className="truncate text-strong">{r.actor}</span>
                <span className="flex min-w-0 items-start gap-1.5">
                  <ChevronRight
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                  />
                  <span className="min-w-0">
                    {r.summary}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.entity} · {r.action}
                    </span>
                  </span>
                </span>
              </summary>
              <div className="space-y-2 bg-muted/40 px-5 py-3 text-[0.8125rem] md:pl-[calc(21.5rem+2rem+1.25rem)]">
                {r.details.length > 0 ? (
                  <dl className="grid grid-cols-[minmax(8rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-1">
                    {r.details.map((d) => (
                      <div key={d.label} className="contents">
                        <dt className="text-muted-foreground">{d.label}</dt>
                        <dd className="break-words text-strong">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-muted-foreground">Brak dodatkowych szczegółów.</p>
                )}
                {r.link && (
                  <Link href={r.link} className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                    Przejdź do obiektu
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  );
}
