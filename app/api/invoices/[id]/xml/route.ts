import { getCurrentUser } from "@/lib/db/users";
import { getInvoiceXml } from "@/lib/db/invoices";

/** GET /api/invoices/:id/xml — oryginalny plik faktury, tylko dla zalogowanych. */
export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]/xml">) {
  await getCurrentUser();
  const { id } = await ctx.params;

  const file = await getInvoiceXml(id);
  if (!file) return new Response("Brak zapisanego pliku XML", { status: 404 });

  return new Response(file.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
