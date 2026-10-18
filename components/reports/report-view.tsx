import { AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SOURCE_TYPE_LABELS } from "@/lib/emissions/source-types";
import type { Comparison, ReportData } from "@/lib/reports/aggregate";
import { SCOPE_COLORS } from "@/lib/reports/colors";
import { STATUS_LABELS, formatRange, includesDrafts } from "@/lib/reports/params";
import {
  ORIGIN_LABELS,
  fmtChange,
  fmtFactor,
  fmtKg,
  fmtPct,
  fmtTon,
  fmtUsage,
  scopeLabel,
} from "@/lib/reports/format";
import { MonthlyChart, ScopeDonut } from "./report-charts";

function ScopeSwatch({ scope }: { scope: "SCOPE_1" | "SCOPE_2" }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 shrink-0 rounded-[2px]"
      style={{ background: SCOPE_COLORS[scope] }}
    />
  );
}

function share(part: string, total: string): number {
  return Number(total) ? (Number(part) / Number(total)) * 100 : 0;
}

function Change({ value }: { value: number | null }) {
  return <span className="tabular-nums">{fmtChange(value)}</span>;
}

function Kpi({
  label,
  value,
  sub,
  scope,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  scope?: "SCOPE_1" | "SCOPE_2";
}) {
  return (
    <div className="rounded-sm bg-card px-5 py-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {scope && <ScopeSwatch scope={scope} />}
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-strong tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function ReportKpis({ data }: { data: ReportData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        label="Emisja łączna"
        value={`${fmtTon(data.totalKg)} CO₂e`}
        sub={`${data.entryCount} wpisów · ${data.sourceCount} źródeł · ${data.invoiceCount} faktur`}
      />
      <Kpi
        label="Zakres 1 — bezpośrednie"
        scope="SCOPE_1"
        value={fmtTon(data.scope1Kg)}
        sub={`${fmtPct(share(data.scope1Kg, data.totalKg))} emisji`}
      />
      <Kpi
        label="Zakres 2 — energia zakupiona"
        scope="SCOPE_2"
        value={fmtTon(data.scope2Kg)}
        sub={`${fmtPct(share(data.scope2Kg, data.totalKg))} emisji`}
      />
      <Kpi
        label="Zmiana rok do roku"
        value={<Change value={data.lastYear.changePct} />}
        sub={
          <>
            vs {formatRange(data.lastYear.from, data.lastYear.to)} ({fmtTon(data.lastYear.totalKg)})
          </>
        }
      />
    </div>
  );
}

function Notices({ data }: { data: ReportData }) {
  const q = data.quality;
  if (includesDrafts(data.params) && q.byStatus.DRAFT.count > 0) {
    return (
      <p className="flex items-start gap-2 rounded-sm border border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
        Podgląd zawiera {q.byStatus.DRAFT.count} niezweryfikowanych wpisów (szkiców) —{" "}
        {fmtTon(q.byStatus.DRAFT.kg)} CO₂e. Raport PDF zostanie oznaczony jako zawierający dane niezweryfikowane.
      </p>
    );
  }
  if (q.excludedDrafts > 0) {
    return (
      <p className="flex items-start gap-2 rounded-sm bg-card px-4 py-2.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Pominięto {q.excludedDrafts} wpisów w statusie „Szkic” ({fmtTon(q.byStatus.DRAFT.kg)} CO₂e). Włącz
        status „Szkic” w filtrach, żeby je uwzględnić.
      </p>
    );
  }
  return null;
}

function ComparisonRow({ label, c, change }: { label: string; c: Pick<Comparison, "from" | "to" | "scope1Kg" | "scope2Kg" | "totalKg">; change?: number | null }) {
  return (
    <TableRow>
      <TableCell>
        <span className="block text-strong">{label}</span>
        <span className="text-xs text-muted-foreground">{formatRange(c.from, c.to)}</span>
      </TableCell>
      <TableCell className="text-right tabular-nums">{fmtTon(c.scope1Kg)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtTon(c.scope2Kg)}</TableCell>
      <TableCell className="text-right font-semibold text-strong tabular-nums">{fmtTon(c.totalKg)}</TableCell>
      <TableCell className="text-right">{change === undefined ? "" : <Change value={change} />}</TableCell>
    </TableRow>
  );
}

function ScopesAndComparison({ data }: { data: ReportData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Podział na zakresy i porównanie okresów</CardTitle>
        <CardDescription>Zmiana liczona dla sumy obu zakresów.</CardDescription>
      </CardHeader>
      <CardContent className="grid items-center gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-5">
          <ScopeDonut scope1Kg={data.scope1Kg} scope2Kg={data.scope2Kg} totalKg={data.totalKg} />
          <ul className="space-y-3 text-sm">
            {(["SCOPE_1", "SCOPE_2"] as const).map((scope) => {
              const kg = scope === "SCOPE_1" ? data.scope1Kg : data.scope2Kg;
              return (
                <li key={scope}>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ScopeSwatch scope={scope} />
                    {scopeLabel(scope)}
                  </span>
                  <span className="font-semibold text-strong tabular-nums">
                    {fmtTon(kg)} · {fmtPct(share(kg, data.totalKg))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Okres</TableHead>
              <TableHead className="text-right">Zakres 1</TableHead>
              <TableHead className="text-right">Zakres 2</TableHead>
              <TableHead className="text-right">Razem</TableHead>
              <TableHead className="text-right">Zmiana</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <ComparisonRow label="Wybrany okres" c={{ ...data, from: data.params.from, to: data.params.to }} />
            <ComparisonRow label="Poprzedni okres" c={data.previous} change={data.previous.changePct} />
            <ComparisonRow label="Rok wcześniej" c={data.lastYear} change={data.lastYear.changePct} />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function MonthlyCard({ data, title = "Emisja w poszczególnych miesiącach" }: { data: ReportData; title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Każdy wpis liczony w miesiącu swojej daty (koniec okresu rozliczeniowego faktury).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MonthlyChart data={data.monthly} />
      </CardContent>
    </Card>
  );
}

export function CategoryCard({ data }: { data: ReportData }) {
  const max = Math.max(...data.byType.map((t) => Number(t.kg)), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Emisja według kategorii źródeł</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {data.byType.map((t) => (
            <li key={t.type} className="grid grid-cols-[minmax(8rem,12rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-strong">{t.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{fmtUsage(t.usage)}</span>
              </span>
              <span className="block h-3 rounded-r-[4px]" style={{ width: `${Math.max((Number(t.kg) / max) * 100, 0.5)}%`, background: SCOPE_COLORS[t.scope] }} title={scopeLabel(t.scope)} />
              <span className="text-right tabular-nums">
                <span className="font-semibold text-strong">{fmtTon(t.kg)}</span>
                <span className="ml-2 text-xs text-muted-foreground">{fmtPct(t.sharePct)}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SourcesCard({ data }: { data: ReportData }) {
  return (
    <Card className="pb-2">
      <CardHeader>
        <CardTitle>Emisja według źródeł</CardTitle>
        <CardDescription>Ilość w jednostce wskaźnika emisji, po przeliczeniu jednostek z faktur.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Źródło</TableHead>
            <TableHead>Kategoria</TableHead>
            <TableHead className="text-right">Zużycie</TableHead>
            <TableHead className="text-right">Wskaźnik</TableHead>
            <TableHead className="text-right">CO₂e [kg]</TableHead>
            <TableHead className="text-right">CO₂e [t]</TableHead>
            <TableHead className="text-right">Udział</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(["SCOPE_1", "SCOPE_2"] as const).map((scope) => {
            const list = data.bySource.filter((s) => s.scope === scope);
            if (!list.length) return null;
            const kg = scope === "SCOPE_1" ? data.scope1Kg : data.scope2Kg;
            return [
              <TableRow key={scope} className="bg-muted/40">
                <TableCell colSpan={4} className="font-semibold text-strong">
                  <span className="flex items-center gap-1.5">
                    <ScopeSwatch scope={scope} />
                    {scopeLabel(scope)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold text-strong tabular-nums">{fmtKg(kg)}</TableCell>
                <TableCell className="text-right font-semibold text-strong tabular-nums">{fmtTon(kg)}</TableCell>
                <TableCell className="text-right font-semibold text-strong tabular-nums">{fmtPct(share(kg, data.totalKg))}</TableCell>
              </TableRow>,
              ...list.map((s) => (
                <TableRow key={s.sourceId}>
                  <TableCell className="text-strong">{s.name}</TableCell>
                  <TableCell>{SOURCE_TYPE_LABELS[s.type]}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtUsage(s.usage)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.factors.map((f) => `${fmtFactor(f.value)} ${f.unit}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtKg(s.kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtTon(s.kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(s.sharePct)}</TableCell>
                </TableRow>
              )),
            ];
          })}
          <TableRow className="bg-muted/40">
            <TableCell colSpan={4} className="font-semibold text-strong">Razem</TableCell>
            <TableCell className="text-right font-semibold text-strong tabular-nums">{fmtKg(data.totalKg)}</TableCell>
            <TableCell className="text-right font-semibold text-strong tabular-nums">{fmtTon(data.totalKg)}</TableCell>
            <TableCell className="text-right font-semibold text-strong tabular-nums">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}

function FactorsCard({ data }: { data: ReportData }) {
  return (
    <Card className="pb-2">
      <CardHeader>
        <CardTitle>Zastosowane wskaźniki emisji</CardTitle>
        <CardDescription>Wartości z chwili zapisu wpisu.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Wskaźnik</TableHead>
            <TableHead>Pochodzenie</TableHead>
            <TableHead className="text-right">Wartość</TableHead>
            <TableHead className="text-right">Wpisy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.factors.map((f) => (
            <TableRow key={`${f.factorId}-${f.value}`}>
              <TableCell className="whitespace-normal text-strong">
                <span className="flex items-center gap-1.5">
                  <ScopeSwatch scope={f.scope} />
                  {f.name}
                </span>
              </TableCell>
              <TableCell>{ORIGIN_LABELS[f.origin]}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtFactor(f.value)} {f.unit}
              </TableCell>
              <TableCell className="text-right tabular-nums">{f.entryCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function QualityCard({ data }: { data: ReportData }) {
  const q = data.quality;
  return (
    <Card className="pb-2">
      <CardHeader>
        <CardTitle>Jakość danych</CardTitle>
        <CardDescription>
          {q.verifiedSharePct === null
            ? "Brak wpisów w okresie."
            : `${fmtPct(q.verifiedSharePct)} emisji w okresie pochodzi z wpisów zweryfikowanych lub skorygowanych.`}{" "}
          {q.withoutInvoice > 0 ? `${q.withoutInvoice} wpisów bez faktury.` : ""}
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Wpisy</TableHead>
            <TableHead className="text-right">CO₂e</TableHead>
            <TableHead className="text-right">W raporcie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(["VERIFIED", "CORRECTED", "DRAFT"] as const).map((s) => (
            <TableRow key={s}>
              <TableCell className="text-strong">{STATUS_LABELS[s]}</TableCell>
              <TableCell className="text-right tabular-nums">{q.byStatus[s].count}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtTon(q.byStatus[s].kg)}</TableCell>
              <TableCell className="text-right">{data.params.statuses.includes(s) ? "tak" : "nie"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function InvoicesCard({ data }: { data: ReportData }) {
  if (!data.invoices.length) return null;
  return (
    <Card className="pb-2">
      <details className="group">
        <summary className="cursor-pointer list-none px-5 [&::-webkit-details-marker]:hidden">
          <span className="text-[0.9375rem] text-strong">Faktury ujęte w raporcie ({data.invoices.length})</span>
          <span className="ml-2 text-xs text-primary group-open:hidden">pokaż</span>
          <span className="ml-2 hidden text-xs text-primary group-open:inline">ukryj</span>
        </summary>
        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numer faktury</TableHead>
                <TableHead>Dostawca</TableHead>
                <TableHead>Okres rozliczeniowy</TableHead>
                <TableHead className="text-right">Pozycje</TableHead>
                <TableHead className="text-right">CO₂e</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.map((i) => (
                <TableRow key={i.invoiceId}>
                  <TableCell className="text-strong">{i.invoiceNumber}</TableCell>
                  <TableCell>{i.supplierName ?? "—"}</TableCell>
                  <TableCell>{i.periodStart && i.periodEnd ? formatRange(i.periodStart, i.periodEnd) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{i.entryCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtTon(i.kg)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </Card>
  );
}

export function ReportView({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <Notices data={data} />
      <ReportKpis data={data} />
      {data.entryCount === 0 ? (
        <Card className="px-5">
          <p className="text-sm text-muted-foreground">
            W wybranym okresie i filtrach nie ma wpisów emisyjnych. Zmień zakres dat lub filtry.
          </p>
        </Card>
      ) : (
        <>
          <ScopesAndComparison data={data} />
          <MonthlyCard data={data} />
          <CategoryCard data={data} />
          <SourcesCard data={data} />
          <div className="grid gap-4 lg:grid-cols-2">
            <FactorsCard data={data} />
            <QualityCard data={data} />
          </div>
          <InvoicesCard data={data} />
        </>
      )}
    </div>
  );
}
