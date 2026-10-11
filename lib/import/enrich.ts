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
import { sumCo2eKg } from "@/lib/emissions/calculate";
import type {
  EnrichedInvoice,
  EnrichedLine,
  ParsedInvoice,
  ParsedInvoiceStatus,
} from "./types";

/**
 * Wzbogaca sparsowane faktury o: dopasowanie źródła, wersję wskaźnika,
 * podgląd emisji i status karty. Czysta logika siedzi w `lib/emissions/*`,
 * tutaj jest tylko orkiestracja i dostęp do bazy.
 */
export async function enrichInvoices(
  parsed: ParsedInvoice[],
): Promise<EnrichedInvoice[]> {
  const [sources, factors, existing, company] = await Promise.all([
    getSourceCandidates(),
    getFactorCandidates(),
    loadExistingKeys(parsed),
    getCompany(),
  ]);

  const duplicates = findDuplicates(parsed, existing);

  return parsed.map((parsedInv) => {
    // Faktura na inny podmiot nie jest blokowana — tylko wymaga spojrzenia.
    const buyerWarning = buyerNipWarning(parsedInv.buyerNip, company?.nip);
    const inv = buyerWarning
      ? { ...parsedInv, warnings: [...parsedInv.warnings, buyerWarning] }
      : parsedInv;

    const refDate = resolveRefDate(inv);
    const lines = inv.lines.map((line) =>
      enrichLine(line, { sources, factors, refDate, supplierNip: inv.supplierNip }),
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
  },
): EnrichedLine {
  // Pozycja nieemisyjna („Opłata handlowa") zostaje widoczna, ale nie jest
  // dopasowywana ani liczona — kryterium akceptacji 4.
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
  });

  const source = match.sourceId
    ? ctx.sources.find((s) => s.id === match.sourceId)
    : undefined;

  // Kandydaci: wskaźniki, których mianownik da się przeliczyć z jednostki
  // pozycji, zawężone do zakresu źródła gdy je znamy.
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

  // Dopasowanie po NIP/słowniku jest tylko prawdopodobne — niech człowiek
  // rzuci okiem, zanim to wejdzie do raportu.
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
    select: { id: true, ksefNumber: true, supplierNip: true, invoiceNumber: true },
  });
  return rows;
}
