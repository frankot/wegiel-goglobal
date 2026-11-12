import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Nieprawidłowa data")
  .optional();

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
    sourceId: z.string(),
    factorId: z.string(),
    include: z.boolean(),
    note: z.string().max(500).optional(),
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
    sourceFormat: z.enum(["KSEF_XML", "WAPRO_XLSX", "MANUAL"]),
    sourceRef: z.string().max(200).optional(),
    sourceRows: z.array(z.record(z.string(), z.unknown())).max(500).optional(),
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

export const batchEnvelopeSchema = z.object({
  status: z.enum(["DRAFT", "VERIFIED"]),
  invoices: z.array(z.unknown()).min(1, "Brak faktur do zapisania"),
});

export type LineSaveInput = z.infer<typeof lineSaveSchema>;
export type InvoiceSaveInput = z.infer<typeof invoiceSaveSchema>;
export type BatchSaveInput = z.infer<typeof batchSaveSchema>;

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
