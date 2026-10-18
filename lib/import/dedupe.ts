/** Invoice deduplication */
import type { ParsedInvoice } from "./types";

export interface DuplicateRef {
  invoiceId: string | null;
  invoiceNumber: string;
  where: "DB" | "BATCH";
}

export interface ExistingInvoiceKey {
  id: string;
  ksefNumber: string | null;
  supplierNip: string | null;
  invoiceNumber: string | null;
}

export function identityKeys(inv: {
  ksefNumber?: string;
  supplierNip?: string;
  invoiceNumber?: string;
}): { ksef: string | null; pair: string | null } {
  return {
    ksef: inv.ksefNumber?.trim() || null,
    pair:
      inv.supplierNip?.trim() && inv.invoiceNumber?.trim()
        ? `${inv.supplierNip.trim()}::${inv.invoiceNumber.trim()}`
        : null,
  };
}

function existingKeys(e: ExistingInvoiceKey) {
  return identityKeys({
    ksefNumber: e.ksefNumber ?? undefined,
    supplierNip: e.supplierNip ?? undefined,
    invoiceNumber: e.invoiceNumber ?? undefined,
  });
}

export function findDuplicates(
  invoices: ParsedInvoice[],
  existing: ExistingInvoiceKey[],
): Map<string, DuplicateRef> {
  const result = new Map<string, DuplicateRef>();

  const dbByKsef = new Map<string, ExistingInvoiceKey>();
  const dbByPair = new Map<string, ExistingInvoiceKey>();
  for (const e of existing) {
    const k = existingKeys(e);
    if (k.ksef) dbByKsef.set(k.ksef, e);
    if (k.pair) dbByPair.set(k.pair, e);
  }

  const seenKsef = new Map<string, ParsedInvoice>();
  const seenPair = new Map<string, ParsedInvoice>();

  for (const inv of invoices) {
    const k = identityKeys(inv);

    const dbHit =
      (k.ksef && dbByKsef.get(k.ksef)) || (k.pair && dbByPair.get(k.pair)) || null;
    if (dbHit) {
      result.set(inv.clientId, {
        invoiceId: dbHit.id,
        invoiceNumber: dbHit.invoiceNumber ?? dbHit.ksefNumber ?? "(bez numeru)",
        where: "DB",
      });
      continue;
    }

    const batchHit =
      (k.ksef && seenKsef.get(k.ksef)) || (k.pair && seenPair.get(k.pair)) || null;
    if (batchHit) {
      result.set(inv.clientId, {
        invoiceId: null,
        invoiceNumber: batchHit.invoiceNumber ?? batchHit.fileName,
        where: "BATCH",
      });
      continue;
    }

    if (k.ksef) seenKsef.set(k.ksef, inv);
    if (k.pair) seenPair.set(k.pair, inv);
  }

  return result;
}
