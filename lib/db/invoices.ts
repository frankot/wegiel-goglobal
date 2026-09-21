import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

/** Wszystkie Decimal zmapowane na string — granica RSC (§8). */
export interface InvoiceListItem {
  id: string;
  invoiceNumber: string | null;
  ksefNumber: string | null;
  issueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  supplierName: string | null;
  supplierNip: string | null;
  sourceFormat: string;
  entryCount: number;
  totalCo2eKg: string;
  totalCo2eTon: string;
  statuses: string[];
  attachmentCount: number;
  createdAt: string;
}

export interface InvoiceEntryItem {
  id: string;
  sourceName: string;
  factorName: string;
  quantity: string;
  unit: string;
  originalQuantity: string | null;
  originalUnit: string | null;
  factorSnapshotValue: string;
  factorSnapshotUnit: string;
  co2eKg: string;
  co2eTon: string;
  status: string;
  note: string | null;
  authorName: string;
  entryDate: string;
}

export interface InvoiceFilters {
  from?: string;
  to?: string;
  supplierNip?: string;
  status?: string;
  scope?: "SCOPE_1" | "SCOPE_2";
}

export async function listInvoices(
  filters: InvoiceFilters = {},
): Promise<InvoiceListItem[]> {
  const rows = await prisma.invoice.findMany({
    where: {
      issueDate:
        filters.from || filters.to
          ? {
              gte: filters.from ? new Date(filters.from) : undefined,
              lte: filters.to ? new Date(filters.to) : undefined,
            }
          : undefined,
      supplierNip: filters.supplierNip || undefined,
      entries: filters.status || filters.scope
        ? {
            some: {
              status: filters.status
                ? (filters.status as "DRAFT" | "VERIFIED" | "CORRECTED")
                : undefined,
              source: filters.scope ? { scope: filters.scope } : undefined,
            },
          }
        : undefined,
    },
    include: {
      entries: { select: { co2eKg: true, co2eTon: true, status: true } },
      _count: { select: { attachments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((inv) => {
    const totalKg = inv.entries.reduce(
      (a, e) => a.add(e.co2eKg),
      new Prisma.Decimal(0),
    );
    const totalTon = inv.entries.reduce(
      (a, e) => a.add(e.co2eTon),
      new Prisma.Decimal(0),
    );

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      ksefNumber: inv.ksefNumber,
      issueDate: inv.issueDate?.toISOString() ?? null,
      periodStart: inv.periodStart?.toISOString() ?? null,
      periodEnd: inv.periodEnd?.toISOString() ?? null,
      supplierName: inv.supplierName,
      supplierNip: inv.supplierNip,
      sourceFormat: inv.sourceFormat,
      entryCount: inv.entries.length,
      totalCo2eKg: totalKg.toString(),
      totalCo2eTon: totalTon.toString(),
      statuses: [...new Set(inv.entries.map((e) => e.status))],
      attachmentCount: inv._count.attachments,
      createdAt: inv.createdAt.toISOString(),
    };
  });
}

export async function getInvoiceEntries(
  invoiceId: string,
): Promise<InvoiceEntryItem[]> {
  const rows = await prisma.emissionEntry.findMany({
    where: { invoiceId },
    include: {
      source: { select: { name: true } },
      factor: { select: { name: true } },
      author: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((e) => ({
    id: e.id,
    sourceName: e.source.name,
    factorName: e.factor.name,
    quantity: e.quantity.toString(),
    unit: e.unit,
    originalQuantity: e.originalQuantity?.toString() ?? null,
    originalUnit: e.originalUnit,
    factorSnapshotValue: e.factorSnapshotValue.toString(),
    factorSnapshotUnit: e.factorSnapshotUnit,
    co2eKg: e.co2eKg.toString(),
    co2eTon: e.co2eTon.toString(),
    status: e.status,
    note: e.note,
    authorName: e.author.name || e.author.email,
    entryDate: e.entryDate.toISOString(),
  }));
}

export async function getInvoiceDetail(id: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      attachments: true,
      uploadedBy: { select: { name: true, email: true } },
    },
  });
  if (!inv) return null;

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    ksefNumber: inv.ksefNumber,
    issueDate: inv.issueDate?.toISOString() ?? null,
    periodStart: inv.periodStart?.toISOString() ?? null,
    periodEnd: inv.periodEnd?.toISOString() ?? null,
    supplierName: inv.supplierName,
    supplierNip: inv.supplierNip,
    buyerNip: inv.buyerNip,
    sourceFormat: inv.sourceFormat,
    uploadedBy: inv.uploadedBy
      ? inv.uploadedBy.name || inv.uploadedBy.email
      : null,
    createdAt: inv.createdAt.toISOString(),
    attachments: inv.attachments.map((a) => ({
      id: a.id,
      kind: a.kind,
      fileName: a.fileName,
      mimeType: a.mimeType,
      blobUrl: a.blobUrl,
    })),
  };
}

export async function listSupplierOptions(): Promise<
  Array<{ nip: string; name: string }>
> {
  const rows = await prisma.invoice.findMany({
    where: { supplierNip: { not: null } },
    select: { supplierNip: true, supplierName: true },
    distinct: ["supplierNip"],
    orderBy: { supplierName: "asc" },
  });
  return rows
    .filter((r) => r.supplierNip)
    .map((r) => ({ nip: r.supplierNip!, name: r.supplierName ?? r.supplierNip! }));
}
