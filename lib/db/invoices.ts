import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { cleanText, ksefXmlParser } from "@/lib/import/ksef-xml";
import { groupWaproRows, type WaproRow } from "@/lib/import/wapro-xlsx";

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

export interface InvoiceDocumentLine {
  lineNo: number;
  description: string;
  quantity: string;
  unit: string;
  netValue: string | null;
  emissionRelevant: boolean;
  skipReason: string | null;
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string | null;
  ksefNumber: string | null;
  issueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  supplierName: string | null;
  supplierNip: string | null;
  buyerNip: string | null;
  sourceFormat: string;
  uploadedBy: string | null;
  createdAt: string;
  entries: InvoiceEntryItem[];
  totalCo2eKg: string;
  totalCo2eTon: string;
  attachments: Array<{ id: string; kind: string; fileName: string }>;
  document: {
    fileName: string;
    currency: string | null;
    netTotal: string | null;
    downloadable: boolean;
    grossTotal: string | null;
    ppeNumber: string | null;
    meterNumber: string | null;
    tariffGroup: string | null;
    lines: InvoiceDocumentLine[];
    warnings: string[];
  } | null;
}

export function storedXml(raw: unknown): { fileName: string; xml: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { xml?: unknown; fileName?: unknown };
  return typeof r.xml === "string"
    ? { fileName: typeof r.fileName === "string" ? r.fileName : "faktura.xml", xml: r.xml }
    : null;
}

function readDocument(raw: unknown): InvoiceDetail["document"] {
  const stored = storedXml(raw);
function readWaproDocument(raw: unknown): InvoiceDetail["document"] {
  const r = raw as { format?: unknown; fileName?: unknown; rows?: unknown };
  if (r?.format !== "WAPRO_XLSX" || !Array.isArray(r.rows) || r.rows.length === 0) return null;
  const fileName = typeof r.fileName === "string" ? r.fileName : "zestawienie.xlsx";
  const [parsed] = groupWaproRows(r.rows as WaproRow[], fileName);
  if (!parsed) return null;
  return {
    fileName,
    downloadable: false,
    currency: "PLN",
    netTotal: null,
    grossTotal: null,
    ppeNumber: null,
    meterNumber: null,
    tariffGroup: null,
    lines: parsed.lines.map((l) => ({
      lineNo: l.lineNo,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      netValue: l.netValue ?? null,
      emissionRelevant: l.emissionRelevant,
      skipReason: l.skipReason ?? null,
    })),
    warnings: [],
  };
}

  if (!stored) return null;
  const wapro = readWaproDocument(raw);
  if (wapro) return wapro;
  try {
    const parsed = ksefXmlParser.parse({
      name: stored.fileName,
      content: Buffer.from(stored.xml, "utf8"),
    });
    const fa = ((parsed.raw as { Faktura?: { Fa?: Record<string, unknown> } }).Faktura?.Fa ??
      {}) as Record<string, unknown>;
    const energy = parsed.lines.find((l) => l.emissionRelevant);
    return {
      fileName: stored.fileName,
      currency: cleanText(fa.KodWaluty) || null,
      netTotal: cleanText(fa.P_13_1) || null,
      downloadable: true,
      grossTotal: cleanText(fa.P_15) || null,
      ppeNumber: energy?.ppeNumber ?? null,
      meterNumber: energy?.meterNumber ?? null,
      tariffGroup: energy?.tariffGroup ?? null,
      lines: parsed.lines.map((l) => ({
        lineNo: l.lineNo,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        netValue: l.netValue ?? null,
        emissionRelevant: l.emissionRelevant,
        skipReason: l.skipReason ?? null,
      })),
      warnings: parsed.warnings,
    };
  } catch {
    return null;
  }
}

export async function getInvoiceDetail(id: string): Promise<InvoiceDetail | null> {
  const [inv, entries] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        attachments: true,
        uploadedBy: { select: { name: true, email: true } },
      },
    }),
    getInvoiceEntries(id),
  ]);
  if (!inv) return null;

  const totalKg = entries.reduce((a, e) => a.add(e.co2eKg), new Prisma.Decimal(0));

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
    uploadedBy: inv.uploadedBy ? inv.uploadedBy.name || inv.uploadedBy.email : null,
    createdAt: inv.createdAt.toISOString(),
    entries,
    totalCo2eKg: totalKg.toString(),
    totalCo2eTon: totalKg.div(1000).toString(),
    attachments: inv.attachments.map((a) => ({
      id: a.id,
      kind: a.kind,
      fileName: a.fileName,
    })),
    document: readDocument(inv.rawPayload),
  };
}

export async function getAttachmentForDownload(id: string) {
  return prisma.invoiceAttachment.findUnique({
    where: { id },
    select: { id: true, invoiceId: true, kind: true, fileName: true, blobUrl: true },
  });
}

export async function getInvoiceXml(id: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { rawPayload: true },
  });
  return inv ? storedXml(inv.rawPayload) : null;
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
