import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SOURCE_TYPE_LABELS } from "@/lib/emissions/source-types";
import type { ReportData } from "@/lib/reports/aggregate";
import { SCOPE_COLORS } from "@/lib/reports/colors";
import { fmtChange, fmtPct, fmtTon } from "@/lib/reports/format";
import { GROWTH_PCT, buildRecommendations } from "@/lib/reports/recommendations";
import { cn } from "@/lib/utils";

function YoyChange({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const up = value > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        value >= GROWTH_PCT ? "font-medium text-destructive" : up ? "text-orange-ink" : value < 0 ? "text-green-ink" : "",
      )}
    >
      {value !== 0 && <Icon className="size-3" aria-hidden="true" />}
      {fmtChange(value)}
    </span>
  );
}

export function TopSourcesCard({
  data,
  limit = 10,
  title = "Top 10 źródeł emisji",
  footerLink,
}: {
  data: ReportData;
  limit?: number;
  title?: string;
  footerLink?: { href: string; label: string };
}) {
  const compact = limit <= 5;
  const top = data.bySource.slice(0, limit);
  if (top.length === 0) return null;
  const max = Math.max(...top.map((s) => Number(s.kg)), 1);

  return (
    <Card className="pb-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Źródła o największej emisji w okresie. Zmiana liczona rok do roku — wzrost o {GROWTH_PCT}% i więcej jest
          wyróżniony.
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-right">#</TableHead>
            <TableHead>Źródło</TableHead>
            <TableHead className={compact ? "text-right" : "w-[30%]"}>Udział</TableHead>
            <TableHead className="text-right">CO₂e</TableHead>
            <TableHead className="text-right">Zmiana r/r</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.map((s, i) => (
            <TableRow key={s.sourceId}>
              <TableCell className="text-right tabular-nums text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="max-w-64 whitespace-normal">
                <span className="block text-strong">{s.name}</span>
                <span className="block text-xs text-muted-foreground">{SOURCE_TYPE_LABELS[s.type]}</span>
              </TableCell>
              <TableCell className={compact ? "text-right tabular-nums text-muted-foreground" : undefined}>
                {compact ? (
                  fmtPct(s.sharePct)
                ) : (
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="block h-2.5 rounded-r-[3px]"
                      style={{ width: `${Math.max((Number(s.kg) / max) * 100, 1)}%`, background: SCOPE_COLORS[s.scope] }}
                    />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtPct(s.sharePct)}</span>
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-strong">{fmtTon(s.kg)}</TableCell>
              <TableCell className="text-right">
                <YoyChange value={s.changePct} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {footerLink && (
        <div className="px-5 pt-2">
          <Link href={footerLink.href} className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
            {footerLink.label}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Card>
  );
}

export function RecommendationsCard({ data }: { data: ReportData }) {
  const groups = buildRecommendations(data.bySource);
  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-600" aria-hidden="true" />
          Rekomendacje redukcji emisji
        </CardTitle>
        <CardDescription>
          Dla źródeł, które razem dają ok. 80% emisji w okresie, oraz tych, których emisja wzrosła o {GROWTH_PCT}% i
          więcej rok do roku. Kierunki działań są ogólne — przed decyzją wymagają oceny technicznej i kosztowej.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map((g) => (
          <section key={g.type} className="rounded-sm border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[0.9375rem] text-strong">{g.label}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{fmtPct(g.sharePct)} emisji w okresie</span>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {g.sources.map((s) => (
                <li key={s.sourceId} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-strong">
                  {s.name}
                  <span className="text-muted-foreground">
                    {" "}
                    · {fmtTon(s.kg)}
                    {s.reasons.includes("growth") && s.changePct !== null && (
                      <span className="font-medium text-destructive"> · {fmtChange(s.changePct)} r/r</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {g.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
