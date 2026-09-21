/**
 * Model stanu podglądu paczki + czysta logika (bez Reacta, bez Prismy).
 *
 * Trzymanie tego poza komponentami daje dwie rzeczy: komponenty są cienkie,
 * a reguły „kiedy karta jest gotowa do zapisu" i „co leci na serwer" dają się
 * przetestować bez renderowania czegokolwiek.
 */
import {
  divideByPowerOfTen,
  previewEmission,
  sumDecimals,
} from "@/lib/emissions/decimal-lite";
import { lookupUnit } from "@/lib/emissions/unit-table";
import type { MatchConfidence } from "@/lib/emissions/match-source";
import type { EnrichedInvoice, ParsedInvoiceStatus } from "@/lib/import/types";

export interface SourceOption {
  id: string;
  name: string;
  type: string;
  scope: "SCOPE_1" | "SCOPE_2";
  unit: string;
  defaultFactorId: string | null;
  ppeNumber: string | null;
}

export interface FactorOption {
  id: string;
  name: string;
  category: string;
  value: string;
  unit: string;
  scope: "SCOPE_1" | "SCOPE_2";
  validFrom: string;
  validTo: string;
}

export interface LineState {
  lineNo: number;
  description: string;
  /** Wartości z dokumentu — do przycisku „przywróć" (↺). */
  original: { quantity: string; unit: string; sourceId: string | null; factorId: string | null };
  quantity: string;
  unit: string;
  sourceId: string | null;
  factorId: string | null;
  include: boolean;
  emissionRelevant: boolean;
  skipReason?: string;
  matchConfidence: MatchConfidence;
  matchReason: string;
  unknownPpe?: string;
  rememberPpe: boolean;
  factorMessage?: string;
  note: string;
}

export interface CardState {
  clientId: string;
  fileName: string;
  format: "KSEF_XML" | "MANUAL";
  original: {
    invoiceNumber: string;
    issueDate: string;
    periodStart: string;
    periodEnd: string;
  };
  invoiceNumber: string;
  ksefNumber: string;
  issueDate: string;
  periodStart: string;
  periodEnd: string;
  supplierNip: string;
  supplierName: string;
  buyerNip: string;
  lines: LineState[];
  warnings: string[];
  errors: string[];
  duplicateOf?: EnrichedInvoice["duplicateOf"];
  /** Usunięta z paczki przez użytkownika — nie idzie do zapisu. */
  removed: boolean;
  saveError?: string;
  savedInvoiceId?: string;
}

const dateOnly = (iso?: string): string => (iso ? iso.slice(0, 10) : "");

export function toCardState(inv: EnrichedInvoice): CardState {
  return {
    clientId: inv.clientId,
    fileName: inv.fileName,
    format: inv.format,
    original: {
      invoiceNumber: inv.invoiceNumber ?? "",
      issueDate: dateOnly(inv.issueDate),
      periodStart: dateOnly(inv.periodStart),
      periodEnd: dateOnly(inv.periodEnd),
    },
    invoiceNumber: inv.invoiceNumber ?? "",
    ksefNumber: inv.ksefNumber ?? "",
    issueDate: dateOnly(inv.issueDate),
    periodStart: dateOnly(inv.periodStart),
    periodEnd: dateOnly(inv.periodEnd),
    supplierNip: inv.supplierNip ?? "",
    supplierName: inv.supplierName ?? "",
    buyerNip: inv.buyerNip ?? "",
    warnings: inv.warnings,
    errors: inv.errors,
    duplicateOf: inv.duplicateOf,
    removed: false,
    lines: inv.lines.map((l) => ({
      lineNo: l.lineNo,
      description: l.description,
      original: {
        quantity: l.quantity,
        unit: l.unit,
        sourceId: l.match.sourceId,
        factorId: l.factor.status === "RESOLVED" ? l.factor.factor.id : null,
      },
      quantity: l.quantity,
      unit: l.unit,
      sourceId: l.match.sourceId,
      factorId: l.factor.status === "RESOLVED" ? l.factor.factor.id : null,
      // Pozycja nieemisyjna startuje wyłączona, ale zostaje widoczna.
      include: l.emissionRelevant,
      emissionRelevant: l.emissionRelevant,
      skipReason: l.skipReason,
      matchConfidence: l.match.confidence,
      matchReason: l.match.reason,
      unknownPpe: l.match.unknownPpe,
      rememberPpe: false,
      factorMessage: l.factor.status !== "RESOLVED" ? l.factor.message : undefined,
      note: "",
    })),
  };
}

/** Wskaźniki pasujące do jednostki pozycji i zakresu źródła. */
export function factorsForLine(
  line: LineState,
  factors: FactorOption[],
  source?: SourceOption,
): FactorOption[] {
  const lineUnit = lookupUnit(line.unit);
  if (!lineUnit) return [];
  return factors.filter((f) => {
    const denom = f.unit.split("/").pop()?.trim();
    const denomUnit = denom ? lookupUnit(denom) : null;
    if (!denomUnit || denomUnit.canonical !== lineUnit.canonical) return false;
    if (source && f.scope !== source.scope) return false;
    return true;
  });
}

export function linePreview(line: LineState, factors: FactorOption[]) {
  if (!line.include || !line.factorId) return null;
  const factor = factors.find((f) => f.id === line.factorId);
  if (!factor) return null;
  return previewEmission({
    quantity: line.quantity,
    quantityUnit: line.unit,
    factorValue: factor.value,
    factorUnit: factor.unit,
  });
}

/** Czy linia jest gotowa do zapisu. */
export function lineIssue(line: LineState): string | null {
  if (!line.include) return null;
  if (!line.sourceId) return `Pozycja ${line.lineNo}: wskaż źródło emisji.`;
  if (!line.factorId) return `Pozycja ${line.lineNo}: wskaż wskaźnik emisji.`;
  if (!lookupUnit(line.unit)) {
    return `Pozycja ${line.lineNo}: jednostka "${line.unit}" nie jest jednostką zużycia.`;
  }
  if (!/^\d+([.,]\d+)?$/.test(line.quantity.trim())) {
    return `Pozycja ${line.lineNo}: ilość musi być liczbą dodatnią.`;
  }
  return null;
}

export function cardIssues(card: CardState): string[] {
  const issues: string[] = [];
  if (card.errors.length) issues.push(...card.errors);
  if (card.duplicateOf) {
    issues.push(
      card.duplicateOf.where === "DB"
        ? `Duplikat — faktura ${card.duplicateOf.invoiceNumber} jest już w systemie.`
        : `Duplikat w tej paczce — ta sama faktura co ${card.duplicateOf.invoiceNumber}.`,
    );
  }
  const included = card.lines.filter((l) => l.include);
  if (included.length === 0) {
    issues.push("Faktura nie ma ani jednej pozycji do zapisania.");
  }
  for (const line of card.lines) {
    const issue = lineIssue(line);
    if (issue) issues.push(issue);
  }
  return issues;
}

/** Status przeliczany po każdej edycji — badge reaguje na poprawki. */
export function cardStatus(card: CardState): ParsedInvoiceStatus {
  if (card.errors.length > 0 || card.duplicateOf) return "ERROR";
  if (cardIssues(card).length > 0) return "NEEDS_ATTENTION";
  const included = card.lines.filter((l) => l.include);
  if (included.some((l) => l.matchConfidence !== "EXACT")) return "NEEDS_ATTENTION";
  if (card.warnings.length > 0) return "NEEDS_ATTENTION";
  return "OK";
}

export function isSavable(card: CardState): boolean {
  return !card.removed && !card.savedInvoiceId && cardIssues(card).length === 0;
}

/** Suma CO₂e liczona TYLKO z faktur, które faktycznie pójdą do zapisu. */
export function batchTotals(cards: CardState[], factors: FactorOption[]) {
  const values: string[] = [];
  let invoiceCount = 0;

  for (const card of cards) {
    if (!isSavable(card)) continue;
    invoiceCount++;
    for (const line of card.lines) {
      const p = linePreview(line, factors);
      if (p) values.push(p.co2eKg);
    }
  }

  const totalKg = sumDecimals(values);
  return {
    invoiceCount,
    totalKg,
    totalTon: divideByPowerOfTen(totalKg, 3) ?? "0",
  };
}

/** Suma CO₂e jednej faktury — nagłówek zwiniętej karty. */
export function cardTotalKg(card: CardState, factors: FactorOption[]): string {
  return sumDecimals(
    card.lines
      .map((l) => linePreview(l, factors))
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => p.co2eKg),
  );
}

/** Payload wysyłany do `saveInvoiceBatch`. */
export function buildSavePayload(
  cards: CardState[],
  status: "DRAFT" | "VERIFIED",
) {
  return {
    status,
    invoices: cards.filter(isSavable).map((card) => ({
      clientId: card.clientId,
      fileName: card.fileName,
      sourceFormat: card.format,
      invoiceNumber: card.invoiceNumber || undefined,
      ksefNumber: card.ksefNumber || undefined,
      issueDate: card.issueDate || undefined,
      periodStart: card.periodStart || undefined,
      periodEnd: card.periodEnd || undefined,
      supplierNip: card.supplierNip || undefined,
      supplierName: card.supplierName || undefined,
      buyerNip: card.buyerNip || undefined,
      lines: card.lines.map((line) => ({
        lineNo: line.lineNo,
        description: line.description,
        quantity: line.quantity.replace(",", "."),
        unit: line.unit,
        sourceId: line.sourceId ?? "",
        factorId: line.factorId ?? "",
        include: line.include,
        note: line.note || undefined,
        rememberPpe:
          line.rememberPpe && line.unknownPpe ? line.unknownPpe : undefined,
      })),
    })),
  };
}
