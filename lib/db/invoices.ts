import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { cleanText, ksefXmlParser } from "@/lib/import/ksef-xml";
import { groupWaproRows, type WaproRow } from "@/lib/import/wapro-xlsx";
import { INVOICE_PAGE_SIZE, type InvoiceSort, type InvoiceSortKey } from "@/lib/entries/invoice-sort";

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
  authorId: string;
  authorName: string;
  entryDate: string;
}

type InvoiceRow = Prisma.InvoiceGetPayload<{
  include: {
    entries: { select: { co2eKg: true; co2eTon: true; status: true } };
    _count: { select: { attachments: true } };
  };
}>;

function toListItem(inv: InvoiceRow): InvoiceListItem {
  const totalKg = inv.entries.reduce((a, e) => a.add(e.co2eKg), new Prisma.Decimal(0));
  const totalTon = inv.entries.reduce((a, e) => a.add(e.co2eTon), new Prisma.Decimal(0));
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
}

// Sort columns
const ORDER: Record<InvoiceSortKey, Prisma.Sql> = {
  number: Prisma.sql`lower(i."invoiceNumber")`,
  date: Prisma.sql`i."issueDate"`,
  supplier: Prisma.sql`lower(coalesce(i."supplierName", i."supplierNip"))`,
  entries: Prisma.sql`coalesce(e.n, 0)`,
  co2e: Prisma.sql`coalesce(e.kg, 0)`,
  status: Prisma.sql`e.st`,
  format: Prisma.sql`i."sourceFormat"`,
};

async function pageIds(sort: InvoiceSort | null, page: number) {
  const order = sort
    ? Prisma.sql`${ORDER[sort.key]} ${sort.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`} NULLS LAST,`
    : Prisma.empty;
  return prisma.$queryRaw<{ id: string; total: number }[]>`
    SELECT i.id, count(*) OVER ()::int AS total
    FROM "Invoice" i
    LEFT JOIN (
      SELECT "invoiceId", count(*)::int AS n, sum("co2eKg") AS kg,
        min(CASE status WHEN 'DRAFT' THEN 0 WHEN 'CORRECTED' THEN 1 ELSE 2 END) AS st
      FROM "EmissionEntry"
      WHERE "invoiceId" IS NOT NULL
      GROUP BY "invoiceId"
    ) e ON e."invoiceId" = i.id
    ORDER BY ${order} i."createdAt" DESC, i.id
    LIMIT ${INVOICE_PAGE_SIZE} OFFSET ${(page - 1) * INVOICE_PAGE_SIZE}`;
}

export async function listInvoicePage(
  requestedPage: number,
  sort: InvoiceSort | null,
): Promise<{ items: InvoiceListItem[]; total: number; page: number; pageCount: number }> {
  let page = requestedPage;
  let ids = await pageIds(sort, page);
  let total = ids[0]?.total ?? 0;
  if (ids.length === 0 && page > 1) {
    total = await prisma.invoice.count();
    page = Math.max(1, Math.ceil(total / INVOICE_PAGE_SIZE));
    ids = await pageIds(sort, page);
  }

  const rows = await prisma.invoice.findMany({
    where: { id: { in: ids.map((r) => r.id) } },
    include: {
      entries: { select: { co2eKg: true, co2eTon: true, status: true } },
      _count: { select: { attachments: true } },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  return {
    items: ids.flatMap((r) => {
      const row = byId.get(r.id);
      return row ? [toListItem(row)] : [];
    }),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / INVOICE_PAGE_SIZE)),
  };
}

export async function getInvoiceSummary(): Promise<{ count: number; totalCo2eKg: string }> {
  const [count, sum] = await Promise.all([
    prisma.invoice.count(),
    prisma.emissionEntry.aggregate({ where: { invoiceId: { not: null } }, _sum: { co2eKg: true } }),
  ]);
  return { count, totalCo2eKg: (sum._sum.co2eKg ?? new Prisma.Decimal(0)).toString() };
}

export async function invoiceExists(id: string): Promise<boolean> {
  return (await prisma.invoice.count({ where: { id } })) > 0;
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
    authorId: e.authorId,
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
    downloadable: boolean;
    currency: string | null;
    netTotal: string | null;
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

function readDocument(raw: unknown): InvoiceDetail["document"] {
  const wapro = readWaproDocument(raw);
  if (wapro) return wapro;
  const stored = storedXml(raw);
  if (!stored) return null;
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
      downloadable: true,
      currency: cleanText(fa.KodWaluty) || null,
      netTotal: cleanText(fa.P_13_1) || null,
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
