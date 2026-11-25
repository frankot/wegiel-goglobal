import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PillSkeleton, Skeleton, SkeletonText, TableSkeleton } from "@/components/ui/skeleton";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ScopeSwatch } from "./report-tables";
import { PRESETS, STATUS_LABELS } from "@/lib/reports/params";
import { TEMPLATE_IDS } from "@/lib/reports/templates";
import { GROWTH_PCT } from "@/lib/reports/recommendations";
import { scopeLabel } from "@/lib/reports/format";
import { SCOPE_COLORS } from "@/lib/reports/colors";

const KPIS = [
  { label: "Emisja łączna" },
  { label: "Zakres 1 — bezpośrednie", scope: "SCOPE_1" },
  { label: "Zakres 2 — energia zakupiona", scope: "SCOPE_2" },
  { label: "Zmiana rok do roku" },
] as const;

export function KpisSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {KPIS.map((k, i) => (
        <div key={k.label} className="rounded-sm bg-card px-5 py-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {"scope" in k && <ScopeSwatch scope={k.scope} />}
            {k.label}
          </p>
          <div className="mt-1">
            <SkeletonText size="2xl" className={i === 0 ? "w-36" : "w-24"} />
          </div>
          <div className="mt-0.5">
            <SkeletonText size="xs" className={i === 0 ? "w-44" : "w-20"} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Monthly chart
const BARS = [46, 58, 52, 40, 33, 27, 24, 29, 38, 55, 64, 70];

export function MonthlyChartSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-2 flex justify-end gap-4">
        {(["SCOPE_1", "SCOPE_2"] as const).map((s) => (
          <span key={s} className="flex h-4 items-center gap-1.5 text-xs text-foreground">
            <span className="inline-block size-2.5 rounded-[2px] opacity-40" style={{ background: SCOPE_COLORS[s] }} />
            {s === "SCOPE_1" ? "Zakres 1" : "Zakres 2"}
          </span>
        ))}
      </div>
      <div className="flex h-[260px] gap-2">
        <div className="flex w-9 flex-col justify-between pt-1 pb-7">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="ml-auto h-2.5 w-6" />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex-1 border-b border-border">
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-t border-border/70" />
              ))}
            </div>
            <div className="absolute inset-0 grid grid-cols-12">
              {BARS.map((h, i) => (
                <div key={i} className="flex items-end justify-center">
                  <Skeleton className="w-[72%] rounded-t-[4px] rounded-b-none" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="grid h-6 grid-cols-12 items-center">
            {BARS.map((_, i) => (
              <Skeleton key={i} className="mx-auto h-2.5 w-6" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonthlyCardSkeleton({ title = "Emisja w poszczególnych miesiącach" }: { title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Każdy wpis liczony w miesiącu swojej daty (koniec okresu rozliczeniowego faktury).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MonthlyChartSkeleton />
      </CardContent>
    </Card>
  );
}

const CATEGORY_BARS = [100, 64, 38, 17];

export function CategoryCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Emisja według kategorii źródeł</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {CATEGORY_BARS.map((w, i) => (
            <li key={i} className="grid grid-cols-[minmax(8rem,12rem)_1fr_auto] items-center gap-3">
              <span>
                <SkeletonText className={i % 2 ? "w-24" : "w-32"} />
                <SkeletonText size="xs" className="w-20" />
              </span>
              <Skeleton className="h-3 rounded-l-none rounded-r-[4px]" style={{ width: `${w}%` }} />
              <SkeletonText className="w-20" align="right" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function TopSourcesCardSkeleton({
  limit = 10,
  title = "Top 10 źródeł emisji",
  footer,
}: {
  limit?: number;
  title?: string;
  footer?: string;
}) {
  const compact = limit <= 5;
  return (
    <Card className="pb-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Źródła o największej emisji w okresie. Zmiana liczona rok do roku — wzrost o {GROWTH_PCT}% i więcej jest
          wyróżniony.
        </CardDescription>
      </CardHeader>
      <TableSkeleton
        rows={limit}
        columns={[
          { label: "#", align: "right", className: "w-10", widths: ["w-3"] },
          { label: "Źródło", cell: "two", widths: ["w-36", "w-28", "w-40", "w-24"] },
          compact
            ? { label: "Udział", align: "right", widths: ["w-10", "w-8"] }
            : { label: "Udział", className: "w-[30%]", widths: ["w-[80%]", "w-1/2", "w-1/3", "w-1/4"] },
          { label: "CO₂e", align: "right", widths: ["w-16", "w-14"] },
          { label: "Zmiana r/r", align: "right", widths: ["w-12", "w-10"] },
        ]}
      />
      {footer && (
        <div className="px-5 pt-2">
          <SkeletonText className="w-48" />
        </div>
      )}
    </Card>
  );
}

const COMPARISON = ["Wybrany okres", "Poprzedni okres", "Rok wcześniej"];

export function ScopesCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Podział na zakresy i porównanie okresów</CardTitle>
        <CardDescription>Zmiana liczona dla sumy obu zakresów.</CardDescription>
      </CardHeader>
      <CardContent className="grid items-center gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-5">
          <div aria-hidden="true" className="relative size-40 shrink-0">
            <Skeleton className="size-full rounded-full" />
            <div className="absolute inset-[18%] rounded-full bg-card" />
          </div>
          <ul className="space-y-3 text-sm">
            {(["SCOPE_1", "SCOPE_2"] as const).map((scope) => (
              <li key={scope}>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ScopeSwatch scope={scope} />
                  {scopeLabel(scope)}
                </span>
                <SkeletonText className="w-28" />
              </li>
            ))}
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
            {COMPARISON.map((label, i) => (
              <TableRow key={label} className="hover:bg-transparent!">
                <TableCell>
                  <span className="block text-strong">{label}</span>
                  <SkeletonText size="xs" className="w-36" />
                </TableCell>
                <TableCell><SkeletonText className="w-14" align="right" /></TableCell>
                <TableCell><SkeletonText className="w-14" align="right" /></TableCell>
                <TableCell><SkeletonText className="w-16" align="right" /></TableCell>
                <TableCell>{i > 0 && <SkeletonText className="w-12" align="right" />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function GroupSkeleton({ label, widths }: { label: string; widths: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold text-foreground">{label}</span>
      {widths.map((w, i) => (
        <PillSkeleton key={i} className={w} />
      ))}
    </div>
  );
}

const pills = (n: number, widths = ["w-24", "w-20", "w-28", "w-16"]) =>
  Array.from({ length: n }, (_, i) => widths[i % widths.length]);

export function ReportFiltersSkeleton() {
  return (
    <div className="space-y-3 rounded-sm bg-card px-5 py-4">
      <div className="space-y-1.5 border-b border-border pb-3">
        <GroupSkeleton label="Szablon" widths={pills(TEMPLATE_IDS.length, ["w-20", "w-24", "w-28"])} />
        <SkeletonText size="xs" className="w-96" />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <GroupSkeleton label="Okres" widths={pills(PRESETS.length)} />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-[8.5rem] rounded-md" />
          <span className="text-xs text-muted-foreground">–</span>
          <Skeleton className="h-7 w-[8.5rem] rounded-md" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <GroupSkeleton label="Zakres" widths={["w-24", "w-24"]} />
        <GroupSkeleton label="Kategoria" widths={pills(4, ["w-28", "w-20", "w-24", "w-32"])} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <GroupSkeleton label="Źródła" widths={["w-36"]} />
        <GroupSkeleton label="Status wpisów" widths={pills(Object.keys(STATUS_LABELS).length, ["w-28", "w-24", "w-16"])} />
      </div>
    </div>
  );
}

export function GenerateReportSkeleton() {
  return (
    <TopbarActions>
      <PillSkeleton className="w-36" />
    </TopbarActions>
  );
}

export function ReportViewSkeleton() {
  return (
    <div className="space-y-4">
      <KpisSkeleton />
      <ScopesCardSkeleton />
      <MonthlyCardSkeleton />
      <CategoryCardSkeleton />
    </div>
  );
}

export function DashboardReportSkeleton({ year }: { year: string }) {
  return (
    <div className="space-y-4">
      <KpisSkeleton />
      <MonthlyCardSkeleton title={`Emisja miesięczna ${year}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryCardSkeleton />
        <TopSourcesCardSkeleton limit={5} title="Top 5 źródeł emisji" footer="Pełny ranking i rekomendacje" />
      </div>
    </div>
  );
}

export function ArchiveTableSkeleton() {
  return (
    <Card className="p-0">
      <TableSkeleton
        rows={6}
        columns={[
          { label: "Nazwa", cell: "two", widths: ["w-56", "w-44", "w-64"], sub: ["w-32", "w-24"] },
          { label: "Okres", size: "xs", widths: ["w-36", "w-28"] },
          { label: "CO₂e", align: "right", cell: "two", widths: ["w-14", "w-16"], sub: ["w-12"] },
          { label: "Zapisano", cell: "two", size: "xs", widths: ["w-24"], sub: ["w-20", "w-16"] },
          { label: "Pliki", cell: "actions" },
        ]}
      />
    </Card>
  );
}
