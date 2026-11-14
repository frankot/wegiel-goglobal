import "server-only";
import { putPrivateFile } from "@/lib/import/storage";
import { prisma } from "@/lib/prisma";
import type { ReportFormat } from "./render";

/** Report archive */

export interface ArchivedFileDTO {
  id: string;
  format: ReportFormat;
  fileName: string;
  size: number;
}

export interface ArchivedReportDTO {
  id: string;
  title: string;
  note: string | null;
  query: string;
  periodFrom: string;
  periodTo: string;
  includesDrafts: boolean;
  totalCo2eKg: string;
  entryCount: number;
  createdAt: string;
  createdBy: string;
  files: ArchivedFileDTO[];
}

const FORMAT_ORDER: Record<string, number> = { pdf: 0, xlsx: 1, csv: 2 };

export async function listArchivedReports(): Promise<ArchivedReportDTO[]> {
  const rows = await prisma.archivedReport.findMany({
    include: {
      files: { select: { id: true, format: true, fileName: true, size: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    note: r.note,
    query: r.query,
    periodFrom: r.periodFrom.toISOString().slice(0, 10),
    periodTo: r.periodTo.toISOString().slice(0, 10),
    includesDrafts: r.includesDrafts,
    totalCo2eKg: r.totalCo2eKg.toString(),
    entryCount: r.entryCount,
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy.name || r.createdBy.email,
    files: r.files
      .map((f) => ({ ...f, format: f.format as ReportFormat }))
      .sort((a, b) => (FORMAT_ORDER[a.format] ?? 9) - (FORMAT_ORDER[b.format] ?? 9)),
  }));
}

export async function getArchivedFile(reportId: string, format: string) {
  return prisma.archivedReportFile.findUnique({
    where: { reportId_format: { reportId, format } },
    include: { report: { select: { title: true } } },
  });
}

export async function storeReportFile(file: { fileName: string; type: string; body: Uint8Array }) {
  return putPrivateFile(`raporty/${Date.now()}-${file.fileName}`, Buffer.from(file.body), file.type);
}
