import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { parseIsoDate, previousPeriod, samePeriodLastYear, toIsoDate, type ReportParams } from "./params";
import { buildReport, type ReportData, type ReportRow } from "./aggregate";

function dateWhere(from: string, to: string): Prisma.DateTimeFilter {
  return {
    gte: parseIsoDate(from),
    lt: new Date(parseIsoDate(to).getTime() + 86_400_000),
  };
}

function entryWhere(
  p: ReportParams,
  range: { from: string; to: string },
  withStatusFilter: boolean,
): Prisma.EmissionEntryWhereInput {
  return {
    entryDate: dateWhere(range.from, range.to),
    status: withStatusFilter ? { in: p.statuses } : undefined,
    sourceId: p.sourceIds.length ? { in: p.sourceIds } : undefined,
    source: {
      scope: p.scopes.length ? { in: p.scopes } : undefined,
      type: p.types.length ? { in: p.types } : undefined,
    },
  };
}

const include = {
  source: { select: { name: true, type: true, scope: true } },
  factor: { select: { name: true, source: true } },
  invoice: { select: { invoiceNumber: true, supplierName: true } },
  author: { select: { name: true, email: true } },
} satisfies Prisma.EmissionEntryInclude;

async function loadRows(where: Prisma.EmissionEntryWhereInput): Promise<ReportRow[]> {
  const entries = await prisma.emissionEntry.findMany({
    where,
    include,
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  return entries.map((e) => ({
    id: e.id,
    entryDate: toIsoDate(e.entryDate),
    periodStart: e.periodStart ? toIsoDate(e.periodStart) : null,
    periodEnd: e.periodEnd ? toIsoDate(e.periodEnd) : null,
    sourceId: e.sourceId,
    sourceName: e.source.name,
    sourceType: e.source.type,
    scope: e.source.scope,
    quantity: e.quantity.toString(),
    unit: e.unit,
    factorId: e.factorId,
    factorName: e.factor.name,
    factorOrigin: e.factor.source,
    factorValue: e.factorSnapshotValue.toString(),
    factorUnit: e.factorSnapshotUnit,
    co2eKg: e.co2eKg.toString(),
    status: e.status,
    invoiceId: e.invoiceId,
    invoiceNumber: e.invoice?.invoiceNumber ?? null,
    supplierName: e.invoice?.supplierName ?? null,
    authorName: e.author.name || e.author.email,
  }));
}

export async function getReport(p: ReportParams): Promise<ReportData> {
  const [all, previous, lastYear] = await Promise.all([
    loadRows(entryWhere(p, p, false)),
    loadRows(entryWhere(p, previousPeriod(p.from, p.to), true)),
    loadRows(entryWhere(p, samePeriodLastYear(p.from, p.to), true)),
  ]);
  return buildReport(p, all, previous, lastYear);
}

export interface ReportFilterOptions {
  sources: { id: string; name: string; type: ReportRow["sourceType"]; scope: ReportRow["scope"]; active: boolean }[];
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const sources = await prisma.emissionSource.findMany({
    select: { id: true, name: true, type: true, scope: true, active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return { sources };
}
