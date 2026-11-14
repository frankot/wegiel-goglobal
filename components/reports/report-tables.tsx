"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, sortRows, useSort, useSortedRows } from "@/components/ui/sortable";
import { SOURCE_TYPE_LABELS } from "@/lib/emissions/source-types";
import type { FactorUsed, InvoiceSummary, ReportData, SourceBreakdown } from "@/lib/reports/aggregate";
import { SCOPE_COLORS } from "@/lib/reports/colors";
import { formatRange } from "@/lib/reports/params";
import { ORIGIN_LABELS, fmtFactor, fmtKg, fmtPct, fmtTon, fmtUsage, scopeLabel } from "@/lib/reports/format";

export function ScopeSwatch({ scope }: { scope: "SCOPE_1" | "SCOPE_2" }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 shrink-0 rounded-[2px]"
      style={{ background: SCOPE_COLORS[scope] }}
    />
  );
}

const share = (part: string, total: string) => (Number(total) ? (Number(part) / Number(total)) * 100 : 0);

const SOURCE_SORT = {
  name: (s: SourceBreakdown) => s.name,
  type: (s: SourceBreakdown) => SOURCE_TYPE_LABELS[s.type],
  kg: (s: SourceBreakdown) => Number(s.kg),
};

export function SourcesCard({ data }: { data: ReportData }) {
  const { sort, toggle } = useSort<keyof typeof SOURCE_SORT>({ kg: "desc" });
  const head = { sort, onSort: toggle };

  return (
    <Card className="pb-2">
      <CardHeader>
        <CardTitle>Emisja według źródeł</CardTitle>
        <CardDescription>Ilość w jednostce wskaźnika emisji, po przeliczeniu jednostek z faktur.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Źródło" sortKey="name" {...head} />
            <SortableHead label="Kategoria" sortKey="type" {...head} />
            <TableHead className="text-right">Zużycie</TableHead>
            <TableHead className="text-right">Wskaźnik</TableHead>
            <SortableHead label="CO₂e [kg]" sortKey="kg" align="right" {...head} />
            <TableHead className="text-right">CO₂e [t]</TableHead>
            <TableHead className="text-right">Udział</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(["SCOPE_1", "SCOPE_2"] as const).map((scope) => {
            const list = sortRows(
              data.bySource.filter((s) => s.scope === scope),
              sort,
              SOURCE_SORT,
            );
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
                  <TableCell className="text-right text-xs whitespace-normal tabular-nums">
                    {s.factors.map((f) => (
                      <span key={`${f.value}|${f.unit}`} className="block whitespace-nowrap">
                        {fmtFactor(f.value)} {f.unit}
                      </span>
                    ))}
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

const FACTOR_SORT = {
  name: (f: FactorUsed) => f.name,
  origin: (f: FactorUsed) => ORIGIN_LABELS[f.origin],
  value: (f: FactorUsed) => Number(f.value),
  entries: (f: FactorUsed) => f.entryCount,
};

export function FactorsCard({ data }: { data: ReportData }) {
  const { sorted, sort, toggle } = useSortedRows(data.factors, FACTOR_SORT, { value: "desc", entries: "desc" });
  const head = { sort, onSort: toggle };

  return (
    <Card className="pb-2">
      <CardHeader>
        <CardTitle>Zastosowane wskaźniki emisji</CardTitle>
        <CardDescription>Wartości z chwili zapisu wpisu.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Wskaźnik" sortKey="name" {...head} />
            <SortableHead label="Pochodzenie" sortKey="origin" {...head} />
            <SortableHead label="Wartość" sortKey="value" align="right" {...head} />
            <SortableHead label="Wpisy" sortKey="entries" align="right" {...head} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((f) => (
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

const INVOICE_SORT = {
  number: (i: InvoiceSummary) => i.invoiceNumber,
  supplier: (i: InvoiceSummary) => i.supplierName,
  period: (i: InvoiceSummary) => i.periodStart,
  entries: (i: InvoiceSummary) => i.entryCount,
  kg: (i: InvoiceSummary) => Number(i.kg),
};

export function InvoicesCard({ data }: { data: ReportData }) {
  const { sorted, sort, toggle } = useSortedRows(data.invoices, INVOICE_SORT, {
    period: "desc",
    entries: "desc",
    kg: "desc",
  });
  const head = { sort, onSort: toggle };
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
                <SortableHead label="Numer faktury" sortKey="number" {...head} />
                <SortableHead label="Dostawca" sortKey="supplier" {...head} />
                <SortableHead label="Okres rozliczeniowy" sortKey="period" {...head} />
                <SortableHead label="Pozycje" sortKey="entries" align="right" {...head} />
                <SortableHead label="CO₂e" sortKey="kg" align="right" {...head} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((i) => (
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
