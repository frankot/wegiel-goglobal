/** Report aggregation */
import { Prisma } from "@/lib/generated/prisma/client";
import { SOURCE_TYPE_LABELS, type Scope, type SourceType } from "@/lib/emissions/source-types";
import {
  monthsInRange,
  previousPeriod,
  samePeriodLastYear,
  type EntryStatus,
  type ReportParams,
} from "./params";

type Decimal = Prisma.Decimal;
const D = (v: string | number) => new Prisma.Decimal(v);
const ZERO = D(0);

export interface ReportRow {
  id: string;
  entryDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  scope: Scope;
  quantity: string;
  unit: string;
  factorId: string;
  factorName: string;
  factorOrigin: "KOBIZE" | "GHG_PROTOCOL" | "CUSTOM";
  factorValue: string;
  factorUnit: string;
  co2eKg: string;
  status: EntryStatus;
  invoiceId: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  authorName: string;
}

export interface ScopeTotals {
  totalKg: string;
  scope1Kg: string;
  scope2Kg: string;
}

export interface Comparison extends ScopeTotals {
  from: string;
  to: string;
  changePct: number | null;
}

export interface MonthPoint {
  month: string;
  scope1Kg: string;
  scope2Kg: string;
  totalKg: string;
  lastYearKg: string;
}

export interface UsageTotal {
  quantity: string;
  unit: string;
}

export interface TypeBreakdown {
  type: SourceType;
  label: string;
  scope: Scope;
  kg: string;
  sharePct: number;
  usage: UsageTotal[];
  entryCount: number;
}

export interface SourceBreakdown {
  sourceId: string;
  name: string;
  type: SourceType;
  scope: Scope;
  kg: string;
  sharePct: number;
  usage: UsageTotal[];
  factors: { value: string; unit: string }[];
  entryCount: number;
  lastYearKg: string | null;
  changePct: number | null;
}

export interface FactorUsed {
  factorId: string;
  name: string;
  origin: ReportRow["factorOrigin"];
  value: string;
  unit: string;
  scope: Scope;
  entryCount: number;
}

export interface InvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  kg: string;
  entryCount: number;
}

export interface DataQuality {
  byStatus: Record<EntryStatus, { count: number; kg: string }>;
  verifiedSharePct: number | null;
  withoutInvoice: number;
  excludedDrafts: number;
}

export interface ReportData extends ScopeTotals {
  params: ReportParams;
  totalTon: string;
  entryCount: number;
  invoiceCount: number;
  sourceCount: number;
  previous: Comparison;
  lastYear: Comparison;
  monthly: MonthPoint[];
  byType: TypeBreakdown[];
  bySource: SourceBreakdown[];
  factors: FactorUsed[];
  invoices: InvoiceSummary[];
  quality: DataQuality;
  rows: ReportRow[];
}

function sum(rows: ReportRow[]): Decimal {
  return rows.reduce((a, r) => a.add(r.co2eKg), ZERO);
}

function scopeTotals(rows: ReportRow[]): ScopeTotals {
  return {
    totalKg: sum(rows).toString(),
    scope1Kg: sum(rows.filter((r) => r.scope === "SCOPE_1")).toString(),
    scope2Kg: sum(rows.filter((r) => r.scope === "SCOPE_2")).toString(),
  };
}

export function changePct(current: string, base: string): number | null {
  const b = D(base);
  if (b.isZero()) return null;
  return D(current).sub(b).div(b).mul(100).toDecimalPlaces(1).toNumber();
}

function sharePct(part: Decimal, total: Decimal): number {
  return total.isZero() ? 0 : part.div(total).mul(100).toDecimalPlaces(1).toNumber();
}

function usageTotals(rows: ReportRow[]): UsageTotal[] {
  const byUnit = new Map<string, Decimal>();
  for (const r of rows) byUnit.set(r.unit, (byUnit.get(r.unit) ?? ZERO).add(r.quantity));
  return [...byUnit].map(([unit, q]) => ({ unit, quantity: q.toString() }));
}

function groupBy<K, T>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

const byKgDesc = (a: { kg: string }, b: { kg: string }) => D(b.kg).cmp(D(a.kg));

export function buildReport(
  params: ReportParams,
  all: ReportRow[],
  previous: ReportRow[],
  lastYear: ReportRow[],
): ReportData {
  const rows = all.filter((r) => params.statuses.includes(r.status));
  const totals = scopeTotals(rows);
  const total = D(totals.totalKg);

  const prevRange = previousPeriod(params.from, params.to);
  const lyRange = samePeriodLastYear(params.from, params.to);
  const prevTotals = scopeTotals(previous);
  const lyTotals = scopeTotals(lastYear);

  const byMonth = groupBy(rows, (r) => r.entryDate.slice(0, 7));
  const lyByMonth = groupBy(lastYear, (r) => r.entryDate.slice(0, 7));
  const monthly: MonthPoint[] = monthsInRange(params.from, params.to).map((month) => {
    const t = scopeTotals(byMonth.get(month) ?? []);
    const lyKey = `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
    return { month, ...t, lastYearKg: sum(lyByMonth.get(lyKey) ?? []).toString() };
  });

  const byType: TypeBreakdown[] = [...groupBy(rows, (r) => r.sourceType)]
    .map(([type, list]) => {
      const kg = sum(list);
      return {
        type,
        label: SOURCE_TYPE_LABELS[type],
        scope: list[0]!.scope,
        kg: kg.toString(),
        sharePct: sharePct(kg, total),
        usage: usageTotals(list),
        entryCount: list.length,
      };
    })
    .sort(byKgDesc);

  const lyBySource = new Map([...groupBy(lastYear, (r) => r.sourceId)].map(([id, list]) => [id, sum(list)]));
  const bySource: SourceBreakdown[] = [...groupBy(rows, (r) => r.sourceId)]
    .map(([sourceId, list]) => {
      const kg = sum(list);
      const ly = lyBySource.get(sourceId);
      const factors = [
        ...new Map(list.map((r) => [`${r.factorValue}|${r.factorUnit}`, r])).values(),
      ].map((r) => ({ value: r.factorValue, unit: r.factorUnit }));
      return {
        sourceId,
        name: list[0]!.sourceName,
        type: list[0]!.sourceType,
        scope: list[0]!.scope,
        kg: kg.toString(),
        sharePct: sharePct(kg, total),
        usage: usageTotals(list),
        factors,
        entryCount: list.length,
        lastYearKg: ly ? ly.toString() : null,
        changePct: ly && !ly.isZero() ? changePct(kg.toString(), ly.toString()) : null,
      };
    })
    .sort(byKgDesc);

  const factors: FactorUsed[] = [
    ...groupBy(rows, (r) => `${r.factorId}|${r.factorValue}|${r.factorUnit}`).values(),
  ]
    .map((list) => {
      const r = list[0]!;
      return {
        factorId: r.factorId,
        name: r.factorName,
        origin: r.factorOrigin,
        value: r.factorValue,
        unit: r.factorUnit,
        scope: r.scope,
        entryCount: list.length,
      };
    })
    .sort((a, b) => a.scope.localeCompare(b.scope) || a.name.localeCompare(b.name, "pl"));

  const invoices: InvoiceSummary[] = [
    ...groupBy(
      rows.filter((r) => r.invoiceId),
      (r) => r.invoiceId!,
    ),
  ]
    .map(([invoiceId, list]) => {
      const r = list[0]!;
      return {
        invoiceId,
        invoiceNumber: r.invoiceNumber ?? "(bez numeru)",
        supplierName: r.supplierName,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        kg: sum(list).toString(),
        entryCount: list.length,
      };
    })
    .sort((a, b) => (a.periodEnd ?? "").localeCompare(b.periodEnd ?? ""));

  const statusRows = (s: EntryStatus) => all.filter((r) => r.status === s);
  const byStatus = Object.fromEntries(
    (["DRAFT", "VERIFIED", "CORRECTED"] as const).map((s) => [
      s,
      { count: statusRows(s).length, kg: sum(statusRows(s)).toString() },
    ]),
  ) as DataQuality["byStatus"];
  const allKg = sum(all);
  const verifiedKg = D(byStatus.VERIFIED.kg).add(byStatus.CORRECTED.kg);

  return {
    params,
    ...totals,
    totalTon: total.div(1000).toString(),
    entryCount: rows.length,
    invoiceCount: invoices.length,
    sourceCount: bySource.length,
    previous: { ...prevRange, ...prevTotals, changePct: changePct(totals.totalKg, prevTotals.totalKg) },
    lastYear: { ...lyRange, ...lyTotals, changePct: changePct(totals.totalKg, lyTotals.totalKg) },
    monthly,
    byType,
    bySource,
    factors,
    invoices,
    quality: {
      byStatus,
      verifiedSharePct: allKg.isZero() ? null : sharePct(verifiedKg, allKg),
      withoutInvoice: rows.filter((r) => !r.invoiceId).length,
      excludedDrafts: params.statuses.includes("DRAFT") ? 0 : byStatus.DRAFT.count,
    },
    rows,
  };
}
