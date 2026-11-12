/** Batch preview state */
import {
  divideByPowerOfTen,
  previewEmission,
  sumDecimals,
} from "@/lib/emissions/decimal-lite";
import { lookupUnit } from "@/lib/emissions/unit-table";
import { identityKeys } from "@/lib/import/dedupe";
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
  format: "KSEF_XML" | "WAPRO_XLSX" | "MANUAL";
  sourceRef?: string;
  sourceRows?: Record<string, unknown>[];
  original: {
    invoiceNumber: string;
    issueDate: string;
    periodStart: string;
    periodEnd: string;
    supplierName: string;
    supplierNip: string;
    buyerNip: string;
    ksefNumber: string;
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
  attachmentName?: string;
  saveError?: string;
  savedInvoiceId?: string;
}

const dateOnly = (iso?: string): string => (iso ? iso.slice(0, 10) : "");

export function toCardState(inv: EnrichedInvoice): CardState {
  return {
    clientId: inv.clientId,
    fileName: inv.fileName,
    format: inv.format,
    sourceRef: inv.sourceRef,
    sourceRows:
      inv.format === "WAPRO_XLSX" ? ((inv.raw as { rows?: Record<string, unknown>[] })?.rows ?? []) : undefined,
    original: {
      invoiceNumber: inv.invoiceNumber ?? "",
      issueDate: dateOnly(inv.issueDate),
      periodStart: dateOnly(inv.periodStart),
      periodEnd: dateOnly(inv.periodEnd),
      supplierName: inv.supplierName ?? "",
      supplierNip: inv.supplierNip ?? "",
      buyerNip: inv.buyerNip ?? "",
      ksefNumber: inv.ksefNumber ?? "",
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

export function emptyLine(lineNo: number): LineState {
  return {
    lineNo,
    description: "",
    original: { quantity: "", unit: "", sourceId: null, factorId: null },
    quantity: "",
    unit: "",
    sourceId: null,
    factorId: null,
    include: true,
    emissionRelevant: true,
    matchConfidence: "EXACT",
    matchReason: "",
    rememberPpe: false,
    note: "",
  };
}

export function emptyManualCard(clientId: string, attachmentName?: string): CardState {
  return {
    clientId,
    fileName: attachmentName ?? "",
    format: "MANUAL",
    original: {
      invoiceNumber: "",
      issueDate: "",
      periodStart: "",
      periodEnd: "",
      supplierName: "",
      supplierNip: "",
      buyerNip: "",
      ksefNumber: "",
    },
    invoiceNumber: "",
    ksefNumber: "",
    issueDate: "",
    periodStart: "",
    periodEnd: "",
    supplierNip: "",
    supplierName: "",
    buyerNip: "",
    lines: [emptyLine(1)],
    warnings: [],
    errors: [],
    attachmentName,
  };
}

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

export function lineIssue(line: LineState): string | null {
  if (!line.include) return null;
  if (!line.description.trim()) return `Pozycja ${line.lineNo}: wpisz opis pozycji.`;
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
  if (card.format === "MANUAL") {
    if (!card.invoiceNumber.trim()) issues.push("Podaj numer faktury.");
    if (!card.issueDate) issues.push("Podaj datę wystawienia.");
  }
  if (!card.periodStart || !card.periodEnd) {
    issues.push("Podaj okres rozliczeniowy (od–do).");
  } else if (card.periodStart > card.periodEnd) {
    issues.push("Początek okresu rozliczeniowego jest późniejszy niż koniec.");
  }
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

const isPlNip = (v: string) => /^(PL)?\d{10}$/i.test(v.replace(/[\s-]/g, ""));

export type SoftField = "supplierNip" | "buyerNip" | "ksefNumber";

export function cardSoftWarnings(card: CardState): Partial<Record<SoftField, string>> {
  const out: Partial<Record<SoftField, string>> = {};
  for (const field of ["supplierNip", "buyerNip"] as const) {
    const value = card[field].trim();
    if (!value) out[field] = "Puste pole — możesz zapisać bez niego.";
    else if (!isPlNip(value)) out[field] = "Nie wygląda na polski NIP (10 cyfr).";
  }
  if (!card.ksefNumber.trim()) out.ksefNumber = "Puste pole — możesz zapisać bez niego.";
  return out;
}

export function cardStatus(card: CardState): ParsedInvoiceStatus {
  if (card.errors.length > 0 || card.duplicateOf) return "ERROR";
  if (cardIssues(card).length > 0) return "NEEDS_ATTENTION";
  const included = card.lines.filter((l) => l.include);
  if (included.some((l) => l.matchConfidence !== "EXACT")) return "NEEDS_ATTENTION";
  if (card.warnings.length > 0) return "NEEDS_ATTENTION";
  return "OK";
}

function cardKeys(card: CardState) {
  return identityKeys({
    ksefNumber: card.ksefNumber,
    supplierNip: card.supplierNip,
    supplierName: card.supplierName,
    invoiceNumber: card.format === "MANUAL" ? card.invoiceNumber : card.original.invoiceNumber,
  });
}

export function removeCard(cards: CardState[], clientId: string): CardState[] {
  const removed = cards.find((c) => c.clientId === clientId);
  const rest = cards.filter((c) => c.clientId !== clientId);
  if (!removed || removed.duplicateOf) return rest;

  const k = cardKeys(removed);
  const twin = rest.find((c) => {
    if (c.duplicateOf?.where !== "BATCH") return false;
    const ck = cardKeys(c);
    return (
      (!!k.ksef && ck.ksef === k.ksef) ||
      (!!k.pair && ck.pair === k.pair) ||
      (!!k.named && ck.named === k.named)
    );
  });
  return rest.map((c) => (c === twin ? { ...c, duplicateOf: undefined } : c));
}

const STATUS_ORDER: Record<ParsedInvoiceStatus, number> = {
  OK: 0,
  NEEDS_ATTENTION: 1,
  ERROR: 2,
};

export function sortByStatus(cards: CardState[]): CardState[] {
  return [...cards].sort((a, b) => STATUS_ORDER[cardStatus(a)] - STATUS_ORDER[cardStatus(b)]);
}

export function isSavable(card: CardState): boolean {
  return !card.savedInvoiceId && cardIssues(card).length === 0;
}

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

export function cardTotalKg(card: CardState, factors: FactorOption[]): string {
  return sumDecimals(
    card.lines
      .map((l) => linePreview(l, factors))
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => p.co2eKg),
  );
}

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
      sourceRef: card.sourceRef,
      sourceRows: card.sourceRows,
      invoiceNumber: card.invoiceNumber.trim() || undefined,
      ksefNumber: card.ksefNumber || undefined,
      issueDate: card.issueDate || undefined,
      periodStart: card.periodStart || undefined,
      periodEnd: card.periodEnd || undefined,
      supplierNip: card.supplierNip.trim() || undefined,
      supplierName: card.supplierName.trim() || undefined,
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
