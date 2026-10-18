import { getCurrentUser } from "@/lib/db/users";
import { getInvoiceXml } from "@/lib/db/invoices";
import { clientIp, writeAudit } from "@/lib/db/audit";

/** GET /api/invoices/:id/xml */
export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]/xml">) {
  const user = await getCurrentUser();
  const { id } = await ctx.params;

  const file = await getInvoiceXml(id);
  if (!file) return new Response("Brak zapisanego pliku XML", { status: 404 });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "DOWNLOAD",
    entity: "Invoice",
    entityId: id,
    details: JSON.stringify({ fileName: file.fileName }),
    ipAddress: await clientIp(),
  });

  return new Response(file.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
