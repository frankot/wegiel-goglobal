import { z } from "zod";

/** Data w formacie ISO (YYYY-MM-DD) lub pełny ISO timestamp. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Nieprawidłowa data")
  .optional();

/** Liczba dziesiętna jako string — nigdy przez Number. */
const decimalString = z
  .string()
  .min(1, "Podaj ilość")
  .regex(/^-?\d+([.,]\d+)?$/, "Ilość musi być liczbą");

export const lineSaveSchema = z
  .object({
    lineNo: z.number().int().min(1),
    description: z.string().min(1, "Opis pozycji jest wymagany"),
    quantity: decimalString,
    unit: z.string().min(1, "Jednostka jest wymagana"),
    /**
     * UWAGA: źródło i wskaźnik są wymagane TYLKO dla pozycji zapisywanych.
     * Pozycje pominięte (np. „Opłata handlowa" w jednostce `mc`) jadą
     * w payloadzie razem z resztą — po to, by pozostały widoczne i dało się
     * je włączyć przyciskiem „Użyj mimo to" — ale z natury nie mają
     * przypisanego źródła ani wskaźnika. Bezwarunkowy `min(1)` odrzucał
     * przez nie całą fakturę.
     */
    sourceId: z.string(),
    factorId: z.string(),
    /** Pozycja wchodzi do zapisu. Pominięte zostają false. */
    include: z.boolean(),
    note: z.string().max(500).optional(),
    /** PPE do zapamiętania na źródle po ręcznym przypisaniu (§5.4). */
    rememberPpe: z.string().optional(),
  })
  .superRefine((line, ctx) => {
    if (!line.include) return;
    if (!line.sourceId) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceId"],
        message: `Pozycja ${line.lineNo}: wskaż źródło emisji`,
      });
    }
    if (!line.factorId) {
      ctx.addIssue({
        code: "custom",
        path: ["factorId"],
        message: `Pozycja ${line.lineNo}: wskaż wskaźnik emisji`,
      });
    }
  });

export const invoiceSaveSchema = z
  .object({
    clientId: z.string().min(1),
    fileName: z.string().optional(),
    sourceFormat: z.enum(["KSEF_XML", "MANUAL"]),
    invoiceNumber: z.string().max(200).optional(),
    ksefNumber: z.string().max(200).optional(),
    issueDate: isoDate,
    periodStart: isoDate,
    periodEnd: isoDate,
    supplierNip: z.string().max(20).optional(),
    supplierName: z.string().max(300).optional(),
    buyerNip: z.string().max(20).optional(),
    lines: z.array(lineSaveSchema),
  })
  .superRefine((inv, ctx) => {
    // Faktura wprowadzona ręcznie nie ma dokumentu źródłowego — numer i data
    // to jedyne, po czym da się ją później odnaleźć i zdeduplikować.
    if (inv.sourceFormat !== "MANUAL") return;
    if (!inv.invoiceNumber?.trim()) {
      ctx.addIssue({ code: "custom", path: ["invoiceNumber"], message: "Podaj numer faktury" });
    }
    if (!inv.issueDate) {
      ctx.addIssue({ code: "custom", path: ["issueDate"], message: "Podaj datę wystawienia" });
    }
  });

export const batchSaveSchema = z.object({
  status: z.enum(["DRAFT", "VERIFIED"]),
  invoices: z.array(invoiceSaveSchema).min(1, "Brak faktur do zapisania"),
});

/**
 * Koperta paczki walidowana OSOBNO od faktur.
 *
 * Każda faktura jest walidowana pojedynczo w pętli zapisu, żeby błąd
 * w jednej nie unieważniał całej paczki — to jest sens zapisu częściowego
 * (D4). Walidacja `batchSaveSchema` w jednym kroku łamała tę obietnicę:
 * jedna zła pozycja dawała „Zapisano 0 z N".
 */
export const batchEnvelopeSchema = z.object({
  status: z.enum(["DRAFT", "VERIFIED"]),
  invoices: z.array(z.unknown()).min(1, "Brak faktur do zapisania"),
});

export type LineSaveInput = z.infer<typeof lineSaveSchema>;
export type InvoiceSaveInput = z.infer<typeof invoiceSaveSchema>;
export type BatchSaveInput = z.infer<typeof batchSaveSchema>;

/** Walidacja pojedynczej faktury przed zapisem — używana per karta (D4). */
export function validateInvoiceForSave(
  input: InvoiceSaveInput,
): { ok: true } | { ok: false; error: string } {
  const included = input.lines.filter((l) => l.include);
  if (included.length === 0) {
    return { ok: false, error: "Faktura nie ma ani jednej pozycji do zapisania." };
  }
  for (const line of included) {
    if (!line.sourceId) {
      return { ok: false, error: `Pozycja ${line.lineNo}: brak źródła emisji.` };
    }
    if (!line.factorId) {
      return { ok: false, error: `Pozycja ${line.lineNo}: brak wskaźnika emisji.` };
    }
  }
  return { ok: true };
}
