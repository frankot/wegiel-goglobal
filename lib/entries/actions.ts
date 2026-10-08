"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentUser } from "@/lib/db/users";
import { canVerifyEntry, canDeleteEntry, canEditEntry } from "@/lib/auth/permissions";
import { clientIp, writeAuditTx, writeAudit } from "@/lib/db/audit";
import { rememberPpeForSource } from "@/lib/db/sources";
import { getInvoiceDetail, getInvoiceEntries } from "@/lib/db/invoices";
import { calculateEmission } from "@/lib/emissions/calculate";
import { parseFile, isAttachmentFile, MAX_FILES_PER_BATCH, MAX_BATCH_BYTES } from "@/lib/import/registry";
import { enrichInvoices } from "@/lib/import/enrich";
import { identityKeys } from "@/lib/import/dedupe";
import { storeInvoiceFile } from "@/lib/import/storage";
import { InvoiceParseError, type EnrichedInvoice, type ParsedInvoice } from "@/lib/import/types";
import {
  batchEnvelopeSchema,
  invoiceSaveSchema,
  validateInvoiceForSave,
  type InvoiceSaveInput,
} from "@/schemas/invoice";
import { randomUUID } from "node:crypto";

export interface ParseBatchResult {
  ok: boolean;
  invoices?: EnrichedInvoice[];
  errors?: string[];
}

/**
 * Etap 2 przepływu (§4.3): parsuje całą paczkę i zwraca wypełnione karty.
 * NICZEGO nie zapisuje — ani do bazy, ani do Vercel Blob.
 */
export async function parseInvoiceBatch(formData: FormData): Promise<ParseBatchResult> {
  await getCurrentUser(); // oba role mogą importować (D6)

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return { ok: false, errors: ["Nie wybrano żadnego pliku."] };
  }
  if (files.length > MAX_FILES_PER_BATCH) {
    return {
      ok: false,
      errors: [`Maksymalnie ${MAX_FILES_PER_BATCH} plików na paczkę (wybrano ${files.length}).`],
    };
  }
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > MAX_BATCH_BYTES) {
    return {
      ok: false,
      errors: [
        `Łączny rozmiar plików (${(totalBytes / 1024 / 1024).toFixed(1)} MB) przekracza limit ${MAX_BATCH_BYTES / 1024 / 1024} MB.`,
      ],
    };
  }

  const parsed: ParsedInvoice[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const content = Buffer.from(await file.arrayBuffer());
    try {
      const invoice = parseFile({ name: file.name, content });
      parsed.push(invoice);
    } catch (e) {
      const message = e instanceof InvoiceParseError ? e.message : (e as Error).message;
      // Nieparsowalny plik dostaje własną kartę ERROR — nie znika po cichu.
      parsed.push({
        clientId: randomUUID(),
        fileName: file.name,
        format: isAttachmentFile(file.name) ? "MANUAL" : "KSEF_XML",
        lines: [],
        warnings: [],
        errors: [message],
        raw: null,
      });
      errors.push(`${file.name}: ${message}`);
    }
  }

  const invoices = await enrichInvoices(parsed);
  return { ok: true, invoices, errors: errors.length ? errors : undefined };
}

export interface SaveBatchResult {
  saved: Array<{ clientId: string; invoiceId: string; invoiceNumber: string }>;
  failed: Array<{ clientId: string; error: string }>;
}

/**
 * Etap 4 przepływu (§4.3): zapis PER FAKTURA (D4).
 *
 * Nie rzuca wyjątkiem na pierwszym błędzie — każda faktura ma własną
 * transakcję, wyniki zbierane są do saved/failed. Jedna zła faktura nie
 * unieważnia paczki dziesięciu dobrych.
 */
export async function saveInvoiceBatch(formData: FormData): Promise<SaveBatchResult> {
  const user = await getCurrentUser();

  const payloadRaw = formData.get("payload");
  if (typeof payloadRaw !== "string") {
    return { saved: [], failed: [{ clientId: "-", error: "Brak danych do zapisania." }] };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return { saved: [], failed: [{ clientId: "-", error: "Nieprawidłowy format danych." }] };
  }

  const envelope = batchEnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    return {
      saved: [],
      failed: [
        {
          clientId: "-",
          error: envelope.error.issues.map((i) => i.message).join("; "),
        },
      ],
    };
  }

  // Pracownik NIGDY nie zapisuje jako zweryfikowane, cokolwiek przyszło
  // z klienta (D6, kryterium akceptacji 8).
  const status = canVerifyEntry(user) ? envelope.data.status : "DRAFT";
  const ip = await clientIp();

  const result: SaveBatchResult = { saved: [], failed: [] };

  for (const raw of envelope.data.invoices) {
    // Walidacja PER FAKTURA — błąd w jednej nie unieważnia pozostałych (D4).
    const parsed = invoiceSaveSchema.safeParse(raw);
    if (!parsed.success) {
      const clientId =
        raw && typeof raw === "object" && "clientId" in raw
          ? String((raw as { clientId: unknown }).clientId)
          : "-";
      result.failed.push({
        clientId,
        error: parsed.error.issues.map((i) => i.message).join("; "),
      });
      continue;
    }

    try {
      const saved = await saveSingleInvoice(parsed.data, {
        formData,
        status,
        userId: user.id,
        userName: user.name || user.email,
        ip,
      });
      result.saved.push(saved);
    } catch (e) {
      result.failed.push({
        clientId: parsed.data.clientId,
        error: (e as Error).message,
      });
    }
  }

  // Rewalidacja raz po całej paczce, nie po każdej fakturze.
  if (result.saved.length > 0) {
    revalidatePath("/entries");
    revalidatePath("/dashboard");
  }

  return result;
}

async function saveSingleInvoice(
  input: InvoiceSaveInput,
  ctx: {
    formData: FormData;
    status: "DRAFT" | "VERIFIED";
    userId: string;
    userName: string;
    ip?: string;
  },
): Promise<{ clientId: string; invoiceId: string; invoiceNumber: string }> {
  const check = validateInvoiceForSave(input);
  if (!check.ok) throw new Error(check.error);

  // Ręcznie wpisana faktura nie przechodzi przez podgląd z deduplikacją (D7),
  // więc sprawdzamy tutaj — zamiast surowego błędu unikalności z bazy.
  const existing = await findExistingInvoice(input);
  if (existing) {
    throw new Error(
      `Duplikat — faktura ${existing.invoiceNumber ?? existing.ksefNumber} jest już w systemie.`,
    );
  }

  const includedLines = input.lines.filter((l) => l.include);

  // Wskaźniki pobierane z bazy po id — klient podaje WYBÓR, nie wartość.
  const factorIds = [...new Set(includedLines.map((l) => l.factorId))];
  const factors = await prisma.emissionFactor.findMany({
    where: { id: { in: factorIds } },
  });
  const factorById = new Map(factors.map((f) => [f.id, f]));

  const sourceIds = [...new Set(includedLines.map((l) => l.sourceId))];
  const sources = await prisma.emissionSource.findMany({
    where: { id: { in: sourceIds } },
    select: { id: true, active: true, name: true },
  });
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  // Obliczenia WYŁĄCZNIE serwerowo. Klient nigdy nie dyktuje wyniku.
  const computed = includedLines.map((line) => {
    const factor = factorById.get(line.factorId);
    if (!factor) throw new Error(`Pozycja ${line.lineNo}: wskaźnik nie istnieje.`);
    const source = sourceById.get(line.sourceId);
    if (!source) throw new Error(`Pozycja ${line.lineNo}: źródło emisji nie istnieje.`);
    if (!source.active) {
      throw new Error(`Pozycja ${line.lineNo}: źródło „${source.name}" jest nieaktywne.`);
    }

    const quantity = line.quantity.replace(",", ".");
    const r = calculateEmission({
      quantity,
      quantityUnit: line.unit,
      factorValue: factor.value.toString(),
      factorUnit: factor.unit,
    });

    return { line, factor, result: r, originalQuantity: quantity };
  });

  const entryDate = input.periodEnd ?? input.issueDate ?? new Date().toISOString();
  const rawPayload = await readSourceXml(input.clientId, ctx.formData);

  const invoiceId = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        ksefNumber: input.ksefNumber,
        issueDate: input.issueDate ? new Date(input.issueDate) : null,
        periodStart: input.periodStart ? new Date(input.periodStart) : null,
        periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
        sourceFormat: input.sourceFormat,
        importStatus: "PROCESSED",
        supplierNip: input.supplierNip,
        supplierName: input.supplierName,
        buyerNip: input.buyerNip,
        uploadedById: ctx.userId,
        rawPayload,
      },
    });

    for (const { line, factor, result, originalQuantity } of computed) {
      await tx.emissionEntry.create({
        data: {
          sourceId: line.sourceId,
          factorId: line.factorId,
          invoiceId: invoice.id,
          entryDate: new Date(entryDate),
          periodStart: input.periodStart ? new Date(input.periodStart) : null,
          periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
          quantity: new Prisma.Decimal(result.quantity.toString()),
          unit: result.unit,
          originalQuantity: new Prisma.Decimal(originalQuantity),
          originalUnit: line.unit,
          factorSnapshotValue: factor.value,
          factorSnapshotUnit: factor.unit,
          co2eKg: new Prisma.Decimal(result.co2eKg.toString()),
          co2eTon: new Prisma.Decimal(result.co2eTon.toString()),
          status: ctx.status,
          note: line.note,
          authorId: ctx.userId,
          verifierId: ctx.status === "VERIFIED" ? ctx.userId : null,
        },
      });
    }

    await writeAuditTx(tx, {
      userId: ctx.userId,
      userName: ctx.userName,
      action: "IMPORT",
      entity: "Invoice",
      entityId: invoice.id,
      details: JSON.stringify({
        format: input.sourceFormat,
        fileName: input.fileName,
        invoiceNumber: input.invoiceNumber,
        lines: computed.length,
        status: ctx.status,
        totalCo2eKg: computed
          .reduce((a, c) => a.add(c.result.co2eKg), new Prisma.Decimal(0))
          .toString(),
      }),
      ipAddress: ctx.ip,
    });

    return invoice.id;
  });

  // Po udanej transakcji: plik źródłowy do Bloba i zapamiętanie PPE.
  // Awaria tutaj nie unieważnia zapisanej faktury — logujemy i idziemy dalej.
  await attachSourceFiles(invoiceId, input.clientId, ctx.formData);
  await rememberPpeAssignments(includedLines);

  return {
    clientId: input.clientId,
    invoiceId,
    invoiceNumber: input.invoiceNumber ?? input.fileName ?? "(bez numeru)",
  };
}

async function findExistingInvoice(input: InvoiceSaveInput) {
  const keys = identityKeys(input);
  const or: Prisma.InvoiceWhereInput[] = [];
  if (keys.ksef) or.push({ ksefNumber: input.ksefNumber!.trim() });
  if (keys.pair) {
    or.push({
      supplierNip: input.supplierNip!.trim(),
      invoiceNumber: input.invoiceNumber!.trim(),
    });
  }
  if (or.length === 0) return null;
  return prisma.invoice.findFirst({
    where: { OR: or },
    select: { invoiceNumber: true, ksefNumber: true },
  });
}

/**
 * Oryginalny XML faktury trzymany w bazie (`Invoice.rawPayload`) — kilka KB.
 * Bez zależności od Vercel Blob: podgląd szczegółów i pobranie pliku działają
 * zawsze, a ponowna interpretacja dokumentu (nowa wersja parsera) jest możliwa.
 */
async function readSourceXml(
  clientId: string,
  formData: FormData,
): Promise<{ format: "KSEF_XML"; fileName: string; xml: string } | undefined> {
  const file = formData
    .getAll(`file_${clientId}`)
    .find((f): f is File => f instanceof File && !isAttachmentFile(f.name));
  if (!file) return undefined;
  return { format: "KSEF_XML", fileName: file.name, xml: await file.text() };
}

async function attachSourceFiles(
  invoiceId: string,
  clientId: string,
  formData: FormData,
): Promise<void> {
  const files = formData
    .getAll(`file_${clientId}`)
    .filter((f): f is File => f instanceof File);

  for (const file of files) {
    try {
      const stored = await storeInvoiceFile(
        file,
        isAttachmentFile(file.name) ? "EVIDENCE_PDF" : "SOURCE_XML",
      );
      await prisma.invoiceAttachment.create({
        data: {
          invoiceId,
          kind: stored.kind,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          blobUrl: stored.blobUrl,
        },
      });
    } catch (e) {
      console.error(`Nie udało się zapisać załącznika ${file.name}:`, e);
    }
  }
}

async function rememberPpeAssignments(
  lines: Array<{ sourceId: string; rememberPpe?: string }>,
): Promise<void> {
  for (const line of lines) {
    if (!line.rememberPpe) continue;
    try {
      await rememberPpeForSource(line.sourceId, line.rememberPpe);
    } catch (e) {
      console.error("Nie udało się zapamiętać PPE:", e);
    }
  }
}

/** Szczegóły faktury — modal na liście faktur. */
export async function getInvoiceDetailAction(invoiceId: string) {
  await getCurrentUser();
  return getInvoiceDetail(invoiceId);
}

/** Pozycje faktury — doczytywane przy rozwijaniu wiersza na liście. */
export async function getEntriesForInvoice(invoiceId: string) {
  await getCurrentUser();
  return getInvoiceEntries(invoiceId);
}

/* ---------------------------------------------------------------------- */
/* Operacje na pojedynczych wpisach                                        */
/* ---------------------------------------------------------------------- */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function verifyEntry(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canVerifyEntry(user)) return { ok: false, error: "Brak uprawnień" };

  const entry = await prisma.emissionEntry.findUnique({ where: { id } });
  if (!entry) return { ok: false, error: "Wpis nie istnieje" };

  await prisma.emissionEntry.update({
    where: { id },
    data: { status: "VERIFIED", verifierId: user.id },
  });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "VERIFY",
    entity: "EmissionEntry",
    entityId: id,
    details: JSON.stringify({ from: entry.status, to: "VERIFIED" }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function correctEntry(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canVerifyEntry(user)) return { ok: false, error: "Brak uprawnień" };

  const entry = await prisma.emissionEntry.findUnique({ where: { id } });
  if (!entry) return { ok: false, error: "Wpis nie istnieje" };

  await prisma.emissionEntry.update({
    where: { id },
    data: { status: "CORRECTED" },
  });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "CORRECT",
    entity: "EmissionEntry",
    entityId: id,
    details: JSON.stringify({ from: entry.status, to: "CORRECTED" }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/entries");
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canDeleteEntry(user)) return { ok: false, error: "Brak uprawnień" };

  const entry = await prisma.emissionEntry.findUnique({ where: { id } });
  if (!entry) return { ok: false, error: "Wpis nie istnieje" };

  await prisma.emissionEntry.delete({ where: { id } });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "DELETE",
    entity: "EmissionEntry",
    entityId: id,
    details: JSON.stringify({ co2eKg: entry.co2eKg.toString() }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canDeleteEntry(user)) return { ok: false, error: "Brak uprawnień" };

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { entries: { select: { id: true, status: true } } },
  });
  if (!invoice) return { ok: false, error: "Faktura nie istnieje" };

  await prisma.$transaction(async (tx) => {
    await tx.emissionEntry.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.delete({ where: { id } });
    await writeAuditTx(tx, {
      userId: user.id,
      userName: user.name || user.email,
      action: "DELETE",
      entity: "Invoice",
      entityId: id,
      details: JSON.stringify({
        invoiceNumber: invoice.invoiceNumber,
        entries: invoice.entries.length,
      }),
      ipAddress: await clientIp(),
    });
  });

  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateEntryQuantity(
  id: string,
  quantity: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();

  const entry = await prisma.emissionEntry.findUnique({
    where: { id },
    include: { factor: true },
  });
  if (!entry) return { ok: false, error: "Wpis nie istnieje" };

  if (!canEditEntry(user, entry.authorId, entry.status)) {
    return { ok: false, error: "Brak uprawnień do edycji tego wpisu" };
  }

  const normalized = quantity.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, error: "Ilość musi być liczbą dodatnią" };
  }

  const r = calculateEmission({
    quantity: normalized,
    quantityUnit: entry.originalUnit ?? entry.unit,
    factorValue: entry.factorSnapshotValue.toString(),
    factorUnit: entry.factorSnapshotUnit,
  });

  await prisma.emissionEntry.update({
    where: { id },
    data: {
      originalQuantity: new Prisma.Decimal(normalized),
      quantity: new Prisma.Decimal(r.quantity.toString()),
      co2eKg: new Prisma.Decimal(r.co2eKg.toString()),
      co2eTon: new Prisma.Decimal(r.co2eTon.toString()),
    },
  });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "UPDATE",
    entity: "EmissionEntry",
    entityId: id,
    details: JSON.stringify({
      quantity: { from: entry.quantity.toString(), to: r.quantity.toString() },
      co2eKg: { from: entry.co2eKg.toString(), to: r.co2eKg.toString() },
    }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { ok: true };
}
