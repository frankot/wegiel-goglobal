import type { SourceMatch } from "@/lib/emissions/match-source";
import type { FactorResolution } from "@/lib/emissions/resolve-factor";

export type InvoiceFormat = "KSEF_XML" | "MANUAL";

export type ParsedInvoiceStatus = "OK" | "NEEDS_ATTENTION" | "ERROR";

export interface ParsedLine {
  lineNo: number;
  description: string;
  indeks?: string;
  /** Ilość jako string — do `Prisma.Decimal` bez wycieczki przez Number. */
  quantity: string;
  /** Jednostka surowa z dokumentu ("kWh", "mc"). */
  unit: string;
  /** Cena/wartość netto — wyłącznie podgląd, nigdy podstawa obliczeń. */
  netValue?: string;
  ppeNumber?: string;
  meterNumber?: string;
  tariffGroup?: string;
  /** false dla pozycji typu „Opłata handlowa" — nie tworzy wpisu. */
  emissionRelevant: boolean;
  skipReason?: string;
}

/** Pozycja wzbogacona o dopasowanie źródła i wskaźnika (robi to serwer). */
export interface EnrichedLine extends ParsedLine {
  match: SourceMatch;
  factor: FactorResolution;
  /** Podgląd wyliczonej emisji — wartość wiążąca liczona ponownie przy zapisie. */
  preview?: {
    quantity: string;
    unit: string;
    co2eKg: string;
    co2eTon: string;
    converted: boolean;
  };
  previewError?: string;
}

export interface ParsedInvoice {
  /** Id karty w podglądzie — nadawane przy parsowaniu, stabilne do zapisu. */
  clientId: string;
  fileName: string;
  format: InvoiceFormat;
  invoiceNumber?: string;
  ksefNumber?: string;
  /** Daty jako ISO string — Date nie przechodzi czysto przez granicę RSC. */
  issueDate?: string;
  periodStart?: string;
  periodEnd?: string;
  supplierNip?: string;
  supplierName?: string;
  buyerNip?: string;
  lines: ParsedLine[];
  warnings: string[];
  errors: string[];
  raw: unknown;
}

export interface EnrichedInvoice extends Omit<ParsedInvoice, "lines"> {
  lines: EnrichedLine[];
  status: ParsedInvoiceStatus;
  duplicateOf?: {
    invoiceId: string | null;
    invoiceNumber: string;
    where: "DB" | "BATCH";
  };
  totalCo2eKg: string;
  totalCo2eTon: string;
}

export interface InvoiceParser {
  id: string;
  detect(file: { name: string; content: Buffer }): boolean;
  parse(file: { name: string; content: Buffer }): ParsedInvoice;
}

export class InvoiceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceParseError";
  }
}
