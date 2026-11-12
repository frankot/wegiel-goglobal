import Papa from "papaparse";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { getAuditExport, parseAuditFilters } from "@/lib/audit/query";
import { csvSafeText } from "@/lib/reports/format";

const HEADERS = ["Data", "Użytkownik", "Obiekt", "Akcja", "Zdarzenie", "Szczegóły"];

const stamp = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Europe/Warsaw",
});

// GET /api/audit/csv
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!canManage(user)) return new Response("Brak uprawnień", { status: 403 });

  const raw = Object.fromEntries(new URL(req.url).searchParams);
  const filters = parseAuditFilters(raw);
  const rows = await getAuditExport(filters, user);

  const csv = Papa.unparse(
    {
      fields: HEADERS,
      data: rows.map((r) => [
        stamp.format(new Date(r.at)),
        csvSafeText(r.actor),
        r.entity,
        r.action,
        csvSafeText(r.summary),
        csvSafeText(r.details.map((d) => `${d.label}: ${d.value}`).join("; ")),
      ]),
    },
    { delimiter: ";", newline: "\r\n" },
  );

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "DOWNLOAD",
    entity: "AuditLog",
    details: JSON.stringify({ rows: rows.length, filters: new URLSearchParams(raw).toString() }),
    ipAddress: await clientIp(),
  });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(new TextEncoder().encode(`\uFEFF${csv}`), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dziennik-zdarzen-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
