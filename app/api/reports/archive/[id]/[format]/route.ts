import { getCurrentUser } from "@/lib/db/users";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { getArchivedFile } from "@/lib/reports/archive";
import { REPORT_FORMATS, isReportFormat } from "@/lib/reports/render";
import { readStoredFile } from "@/lib/import/storage";

/** GET /api/reports/archive/:id/:format */
export async function GET(_req: Request, ctx: RouteContext<"/api/reports/archive/[id]/[format]">) {
  const user = await getCurrentUser();
  const { id, format } = await ctx.params;
  if (!isReportFormat(format)) return new Response("Nieobsługiwany format", { status: 404 });

  const file = await getArchivedFile(id, format);
  if (!file) return new Response("Plik nie istnieje", { status: 404 });

  const stream = await readStoredFile(file.blobUrl);
  if (!stream) return new Response("Plik jest niedostępny", { status: 502 });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "DOWNLOAD",
    entity: "ArchivedReport",
    entityId: id,
    details: JSON.stringify({ title: file.report.title, format, fileName: file.fileName }),
    ipAddress: await clientIp(),
  });

  return new Response(stream, {
    headers: {
      "Content-Type": REPORT_FORMATS[format],
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
