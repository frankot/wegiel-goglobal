import { getCurrentUser } from "@/lib/db/users";
import { getCompany } from "@/lib/db/company";
import { writeAudit, clientIp } from "@/lib/db/audit";
import { parseReportParams, reportParamsToSearch } from "@/lib/reports/params";
import { getReport, getReportFilterOptions } from "@/lib/reports/query";
import { renderReportPdf } from "@/lib/reports/pdf";
import { renderReportCsv, renderReportXlsx } from "@/lib/reports/export";
import { reportFileName } from "@/lib/reports/format";

const FORMATS = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
} as const;

/**
 * GET /api/reports/:format?preset=…&scope=… — plik raportu budowany na żądanie
 * z tych samych parametrów co podgląd na /reports. Nic nie jest zapisywane.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/reports/[format]">) {
  const user = await getCurrentUser();
  const { format } = await ctx.params;
  if (!(format in FORMATS)) return new Response("Nieobsługiwany format", { status: 404 });
  const fmt = format as keyof typeof FORMATS;

  const params = parseReportParams(new URL(req.url).searchParams);
  const [report, company, options] = await Promise.all([
    getReport(params),
    getCompany(),
    getReportFilterOptions(),
  ]);

  const body =
    fmt === "pdf"
      ? renderReportPdf(report, {
          company,
          generatedBy: user.name || user.email,
          generatedAt: new Date(),
          sourceNames: new Map(options.sources.map((s) => [s.id, s.name])),
        })
      : fmt === "xlsx"
        ? renderReportXlsx(report)
        : renderReportCsv(report);

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "CREATE",
    entity: "Report",
    details: JSON.stringify({ format: fmt, query: reportParamsToSearch(params).toString() }),
    ipAddress: await clientIp(),
  });

  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": FORMATS[fmt],
      "Content-Disposition": `attachment; filename="${reportFileName(params, fmt)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
