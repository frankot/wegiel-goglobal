import { DEMO_PREFIX } from "./shim";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const demo = { startsWith: DEMO_PREFIX };

async function main() {
  const files = await prisma.archivedReportFile.findMany({
    where: { reportId: demo },
    select: { blobUrl: true },
  });
  if (files.length > 0) await del(files.map((f) => f.blobUrl));

  const [audit, reports, entries, , invoices, sources, factors, users] = await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { id: demo } }),
    prisma.archivedReport.deleteMany({ where: { id: demo } }),
    prisma.emissionEntry.deleteMany({ where: { id: demo } }),
    prisma.invoiceAttachment.deleteMany({ where: { invoiceId: demo } }),
    prisma.invoice.deleteMany({ where: { id: demo } }),
    prisma.emissionSource.deleteMany({ where: { id: demo } }),
    prisma.emissionFactor.deleteMany({ where: { id: demo } }),
    prisma.user.deleteMany({ where: { id: demo } }),
  ]);

  console.log(
    `Usunięto: ${entries.count} wpisów, ${invoices.count} faktur, ${sources.count} źródeł, ${factors.count} wskaźników, ` +
      `${users.count} użytkowników, ${reports.count} raportów (${files.length} plików), ${audit.count} zdarzeń.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
