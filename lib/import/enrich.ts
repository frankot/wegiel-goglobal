import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateEmission } from "@/lib/emissions/calculate";
import { matchSource, type SourceCandidate } from "@/lib/emissions/match-source";
import {
  factorRefDate,
  resolveFactor,
  type FactorCandidate,
} from "@/lib/emissions/resolve-factor";
import { factorDenominatorUnit, lookupUnit } from "@/lib/emissions/units";
import { getSourceCandidates } from "@/lib/db/sources";
import { getFactorCandidates } from "@/lib/db/factors";
import { getCompany } from "@/lib/db/company";
import { buyerNipWarning } from "@/lib/company/identifiers";
import { findDuplicates, type ExistingInvoiceKey } from "./dedupe";
import { sameSupplierName } from "./supplier-name";
import { sumCo2eKg } from "@/lib/emissions/calculate";
import type {
  EnrichedInvoice,
  EnrichedLine,
  ParsedInvoice,
  ParsedInvoiceStatus,
} from "./types";

/** Import enrichment */
export async function enrichInvoices(
  input: ParsedInvoice[],
): Promise<EnrichedInvoice[]> {
  const [sources, factors, history, company] = await Promise.all([
    getSourceCandidates(),
    getFactorCandidates(),
    loadSupplierHistory(input),
    getCompany(),
  ]);

  const parsed = input.map((inv) => fillSupplierNip(inv, history));
  const existing = await loadExistingKeys(parsed);
  const duplicates = findDuplicates(parsed, existing);
  const lookalikes = await findLookalikes(parsed, duplicates);

  return parsed.map((parsedInv) => {
    const extra = [
      buyerNipWarning(parsedInv.buyerNip, company?.nip),
      ...(lookalikes.get(parsedInv.clientId) ?? []),
    ].filter((w): w is string => !!w);
    const inv = extra.length
      ? { ...parsedInv, warnings: [...parsedInv.warnings, ...extra] }
      : parsedInv;

    const refDate = resolveRefDate(inv);
    const previous = inv.format === "WAPRO_XLSX" ? previousSources(inv, history) : undefined;
    const lines = inv.lines.map((line) =>
      enrichLine(line, {
        sources,
        factors,
        refDate,
        supplierNip: inv.supplierNip,
        previousSourceId: previous?.get(lookupUnit(line.unit)?.canonical ?? ""),
        matchByUnit: inv.format === "WAPRO_XLSX",
      }),
    );

    const duplicateOf = duplicates.get(inv.clientId);
    const status = deriveStatus(inv, lines, !!duplicateOf);

    const totals = lines
      .filter((l) => l.emissionRelevant && l.preview)
      .map((l) => l.preview!.co2eKg);
    const totalKg = sumCo2eKg(totals);

    return {
      ...inv,
      lines,
      status,
      duplicateOf,
      totalCo2eKg: totalKg.toString(),
      totalCo2eTon: totalKg.div(1000).toString(),
    };
  });
}

function resolveRefDate(inv: ParsedInvoice): Date {
  const period = inv.periodEnd ? new Date(inv.periodEnd) : null;
  const issue = inv.issueDate ? new Date(inv.issueDate) : new Date();
  return factorRefDate(
    period && !Number.isNaN(period.getTime()) ? period : null,
    Number.isNaN(issue.getTime()) ? new Date() : issue,
  );
}

function enrichLine(
  line: ParsedInvoice["lines"][number],
  ctx: {
    sources: SourceCandidate[];
    factors: FactorCandidate[];
    refDate: Date;
    supplierNip?: string;
    previousSourceId?: string;
    matchByUnit?: boolean;
  },
): EnrichedLine {
  if (!line.emissionRelevant) {
    return {
      ...line,
      match: { sourceId: null, confidence: "NONE", reason: line.skipReason ?? "pominięta" },
      factor: { status: "NONE", message: line.skipReason ?? "pominięta" },
    };
  }

  const match = matchSource({
    sources: ctx.sources,
    ppeNumber: line.ppeNumber,
    meterNumber: line.meterNumber,
    supplierNip: ctx.supplierNip,
    description: line.description,
    previousSourceId: ctx.previousSourceId,
    unit: ctx.matchByUnit ? line.unit : undefined,
  });

  const source = match.sourceId
    ? ctx.sources.find((s) => s.id === match.sourceId)
    : undefined;

  const lineUnit = lookupUnit(line.unit);
  const candidates = ctx.factors.filter((f) => {
    const denom = factorDenominatorUnit(f.unit);
    const denomUnit = denom ? lookupUnit(denom) : null;
    if (!denomUnit || !lineUnit) return false;
    if (denomUnit.canonical !== lineUnit.canonical) return false;
    if (source && f.scope !== source.scope) return false;
    return true;
  });

  const factor = resolveFactor({
    candidates,
    refDate: ctx.refDate,
    defaultFactorId: source?.defaultFactorId,
  });

  const enriched: EnrichedLine = { ...line, match, factor };

  if (factor.status === "RESOLVED") {
    try {
      const r = calculateEmission({
        quantity: line.quantity,
        quantityUnit: line.unit,
        factorValue: factor.factor.value,
        factorUnit: factor.factor.unit,
      });
      enriched.preview = {
        quantity: r.quantity.toString(),
        unit: r.unit,
        co2eKg: r.co2eKg.toString(),
        co2eTon: r.co2eTon.toString(),
        converted: r.converted,
      };
    } catch (e) {
      enriched.previewError = (e as Error).message;
    }
  }

  return enriched;
}

function deriveStatus(
  inv: ParsedInvoice,
  lines: EnrichedLine[],
  isDuplicate: boolean,
): ParsedInvoiceStatus {
  if (isDuplicate || inv.errors.length > 0) return "ERROR";

  const relevant = lines.filter((l) => l.emissionRelevant);
  if (relevant.length === 0) return "NEEDS_ATTENTION";

  const needsWork = relevant.some(
    (l) =>
      l.match.confidence === "NONE" ||
      l.factor.status !== "RESOLVED" ||
      l.previewError,
  );
  if (needsWork) return "NEEDS_ATTENTION";

  const uncertain = relevant.some((l) => l.match.confidence !== "EXACT");
  if (uncertain) return "NEEDS_ATTENTION";

  return inv.warnings.length > 0 ? "NEEDS_ATTENTION" : "OK";
}

async function loadExistingKeys(
  parsed: ParsedInvoice[],
): Promise<ExistingInvoiceKey[]> {
  const ksefNumbers = parsed.map((p) => p.ksefNumber).filter(Boolean) as string[];
  const numbers = parsed.map((p) => p.invoiceNumber).filter(Boolean) as string[];

  if (ksefNumbers.length === 0 && numbers.length === 0) return [];

  const rows = await prisma.invoice.findMany({
    where: {
      OR: [
        ksefNumbers.length ? { ksefNumber: { in: ksefNumbers } } : undefined,
        numbers.length ? { invoiceNumber: { in: numbers } } : undefined,
      ].filter(Boolean) as object[],
    },
    select: { id: true, ksefNumber: true, supplierNip: true, supplierName: true, invoiceNumber: true },
  });
  return rows;
}

/* Supplier history */

interface PastInvoice {
  id: string;
  supplierName: string | null;
  supplierNip: string | null;
  entries: { sourceId: string; unit: string }[];
}

async function loadSupplierHistory(parsed: ParsedInvoice[]): Promise<PastInvoice[]> {
  if (!parsed.some((p) => p.format === "WAPRO_XLSX")) return [];
  return prisma.invoice.findMany({
    where: { supplierName: { not: null } },
    select: {
      id: true,
      supplierName: true,
      supplierNip: true,
      entries: { select: { sourceId: true, unit: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
}

function pastFor(inv: ParsedInvoice, history: PastInvoice[]): PastInvoice[] {
  return history.filter((h) =>
    inv.supplierNip ? h.supplierNip === inv.supplierNip : sameSupplierName(h.supplierName, inv.supplierName),
  );
}

function fillSupplierNip(inv: ParsedInvoice, history: PastInvoice[]): ParsedInvoice {
  if (inv.format !== "WAPRO_XLSX" || inv.supplierNip) return inv;
  const nip = pastFor(inv, history).find((h) => h.supplierNip)?.supplierNip;
  return nip ? { ...inv, supplierNip: nip } : inv;
}

function previousSources(inv: ParsedInvoice, history: PastInvoice[]): Map<string, string> {
  const byUnit = new Map<string, string>();
  for (const h of pastFor(inv, history)) {
    for (const e of h.entries) {
      const canonical = lookupUnit(e.unit)?.canonical;
      if (canonical && !byUnit.has(canonical)) byUnit.set(canonical, e.sourceId);
    }
  }
  return byUnit;
}

/* Lookalike invoices */

const canonicalQty = (quantity: string, unit: string): string | null => {
  const u = lookupUnit(unit);
  const q = Number(quantity.replace(",", "."));
  return u && Number.isFinite(q) ? `${(q * Number(u.multiplier)).toFixed(3)} ${u.canonical}` : null;
};

const plDate = (iso: string) => iso.slice(0, 10).split("-").reverse().join(".");

function sameSupplier(
  a: { supplierNip?: string | null; supplierName?: string | null },
  b: { supplierNip?: string | null; supplierName?: string | null },
): boolean {
  if (a.supplierNip && b.supplierNip) return a.supplierNip === b.supplierNip;
  return sameSupplierName(a.supplierName, b.supplierName);
}

async function findLookalikes(
  parsed: ParsedInvoice[],
  duplicates: Map<string, unknown>,
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const dated = parsed.filter((p) => p.issueDate && !duplicates.has(p.clientId));
  if (dated.length === 0) return result;

  const quantities = (inv: ParsedInvoice) =>
    new Set(
      inv.lines
        .filter((l) => l.emissionRelevant)
        .map((l) => canonicalQty(l.quantity, l.unit))
        .filter((q): q is string => !!q),
    );

  const days = [...new Set(dated.map((p) => p.issueDate!.slice(0, 10)))];
  const db = await prisma.invoice.findMany({
    where: { issueDate: { in: days.map((d) => new Date(d)) } },
    select: {
      invoiceNumber: true,
      issueDate: true,
      supplierNip: true,
      supplierName: true,
      entries: { select: { quantity: true, unit: true } },
    },
  });

  const warn = (inv: ParsedInvoice, number: string | null | undefined, day: string, qty: string) => {
    const list = result.get(inv.clientId) ?? [];
    list.push(
      `Możliwy duplikat: faktura ${number ?? "(bez numeru)"} z ${plDate(day)} od tego samego dostawcy ma tę samą ilość (${qty}) — sprawdź, czy to nie ta sama dostawa.`,
    );
    result.set(inv.clientId, list);
  };

  for (const inv of dated) {
    const day = inv.issueDate!.slice(0, 10);
    const mine = quantities(inv);
    if (mine.size === 0) continue;

    for (const other of db) {
      if (other.invoiceNumber === inv.invoiceNumber) continue;
      if (other.issueDate?.toISOString().slice(0, 10) !== day || !sameSupplier(inv, other)) continue;
      const hit = other.entries
        .map((e) => canonicalQty(e.quantity.toString(), e.unit))
        .find((q) => q && mine.has(q));
      if (hit) warn(inv, other.invoiceNumber, day, hit);
    }

    for (const other of dated) {
      if (other === inv || other.invoiceNumber === inv.invoiceNumber) continue;
      if (other.issueDate!.slice(0, 10) !== day || !sameSupplier(inv, other)) continue;
      const hit = [...quantities(other)].find((q) => mine.has(q));
      if (hit) warn(inv, other.invoiceNumber, day, hit);
    }
  }
  return result;
}
