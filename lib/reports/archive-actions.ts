"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { deleteInvoiceFiles } from "@/lib/import/storage";
import { includesDrafts, parseIsoDate, parseReportParams, reportParamsToSearch } from "./params";
import { REPORT_FORMATS, renderReport, type ReportFormat } from "./render";
import { storeReportFile } from "./archive";

export interface ArchiveResult {
  ok: boolean;
  error?: string;
  fieldErrors?: { title?: string; note?: string };
  reportId?: string;
}

const saveSchema = z.object({
  title: z.string().trim().min(3, "Nazwa musi mieć min. 3 znaki").max(200, "Nazwa jest za długa"),
  note: z.string().trim().max(1000, "Notatka jest za długa").optional(),
  query: z.string().max(4000),
});

export async function saveReportToArchive(input: { title: string; note?: string; query: string }): Promise<ArchiveResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, error: "Brak uprawnień" };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: ArchiveResult["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as "title" | "note";
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const params = parseReportParams(new URLSearchParams(parsed.data.query));
  const query = reportParamsToSearch(params).toString();
  const { data, files } = await renderReport(params, Object.keys(REPORT_FORMATS) as ReportFormat[], user.name || user.email);
  if (data.entryCount === 0) return { ok: false, error: "Raport nie zawiera żadnych wpisów — nie ma czego archiwizować." };

  const uploaded: { format: ReportFormat; fileName: string; blobUrl: string; size: number }[] = [];
  try {
    for (const f of files) {
      uploaded.push({ format: f.format, fileName: f.fileName, blobUrl: await storeReportFile(f), size: f.body.byteLength });
    }
    const report = await prisma.archivedReport.create({
      data: {
        title: parsed.data.title,
        note: parsed.data.note || null,
        query,
        periodFrom: parseIsoDate(params.from),
        periodTo: parseIsoDate(params.to),
        includesDrafts: includesDrafts(params) && data.quality.byStatus.DRAFT.count > 0,
        totalCo2eKg: new Prisma.Decimal(data.totalKg),
        entryCount: data.entryCount,
        createdById: user.id,
        files: { create: uploaded },
      },
      select: { id: true },
    });

    await writeAudit({
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "ArchivedReport",
      entityId: report.id,
      details: JSON.stringify({ title: parsed.data.title, query, totalCo2eKg: data.totalKg }),
      ipAddress: await clientIp(),
    });

    revalidatePath("/reports/archive");
    return { ok: true, reportId: report.id };
  } catch (e) {
    await deleteInvoiceFiles(uploaded.map((u) => u.blobUrl));
    console.error("Nie udało się zarchiwizować raportu:", e);
    return { ok: false, error: "Nie udało się zapisać raportu w archiwum. Spróbuj ponownie." };
  }
}

export async function deleteArchivedReport(id: string): Promise<ArchiveResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, error: "Brak uprawnień" };

  const report = await prisma.archivedReport.findUnique({
    where: { id },
    include: { files: { select: { blobUrl: true } } },
  });
  if (!report) return { ok: false, error: "Raport nie istnieje" };

  await prisma.archivedReport.delete({ where: { id } });
  await deleteInvoiceFiles(report.files.map((f) => f.blobUrl));

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "DELETE",
    entity: "ArchivedReport",
    entityId: id,
    details: JSON.stringify({ title: report.title, query: report.query }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/reports/archive");
  return { ok: true };
}
