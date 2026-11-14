import { getCurrentUser } from "@/lib/db/users";
import { writeAudit, clientIp } from "@/lib/db/audit";
import { parseReportParams, reportParamsToSearch } from "@/lib/reports/params";
import { isReportFormat, renderReport } from "@/lib/reports/render";

/** GET /api/reports/:format */
export async function GET(req: Request, ctx: RouteContext<"/api/reports/[format]">) {
  const user = await getCurrentUser();
  const { format } = await ctx.params;
  if (!isReportFormat(format)) return new Response("Nieobsługiwany format", { status: 404 });

  const params = parseReportParams(new URL(req.url).searchParams);
  const { files } = await renderReport(params, [format], user.name || user.email);
  const file = files[0]!;

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "CREATE",
    entity: "Report",
    details: JSON.stringify({ format, query: reportParamsToSearch(params).toString() }),
    ipAddress: await clientIp(),
  });

  return new Response(file.body as BodyInit, {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
