import { getCurrentUser } from "@/lib/db/users";
import { getAttachmentForDownload } from "@/lib/db/invoices";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { isBlobUrl, readStoredFile } from "@/lib/import/storage";

/** GET /api/attachments/:id */
const SERVE_AS: Record<string, { type: string; disposition: "inline" | "attachment" }> = {
  EVIDENCE_PDF: { type: "application/pdf", disposition: "inline" },
  SOURCE_XML: { type: "application/xml; charset=utf-8", disposition: "attachment" },
};

export async function GET(_req: Request, ctx: RouteContext<"/api/attachments/[id]">) {
  const user = await getCurrentUser();
  const { id } = await ctx.params;

  const attachment = await getAttachmentForDownload(id);
  if (!attachment) return new Response("Załącznik nie istnieje", { status: 404 });

  const serveAs = SERVE_AS[attachment.kind];
  if (!serveAs || !isBlobUrl(attachment.blobUrl)) {
    return new Response("Nieobsługiwany załącznik", { status: 404 });
  }

  const stream = await readStoredFile(attachment.blobUrl);
  if (!stream) return new Response("Plik jest niedostępny", { status: 502 });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "DOWNLOAD",
    entity: "InvoiceAttachment",
    entityId: attachment.id,
    details: JSON.stringify({ invoiceId: attachment.invoiceId, fileName: attachment.fileName }),
    ipAddress: await clientIp(),
  });

  return new Response(stream, {
    headers: {
      "Content-Type": serveAs.type,
      "Content-Disposition": `${serveAs.disposition}; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
