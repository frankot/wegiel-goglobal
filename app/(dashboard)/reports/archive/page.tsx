import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { listArchivedReports } from "@/lib/reports/archive";
import { PageHeader } from "@/components/layout/page-header";
import { ReportTabs } from "@/components/reports/report-tabs";
import { ArchiveTable } from "@/components/reports/archive-table";

export default async function ReportArchivePage() {
  const user = await getCurrentUser();
  const reports = await listArchivedReports();

  return (
    <div className="space-y-4">
      <PageHeader description="Zapisane wersje raportów. Pliki są niezmienne — pokazują dane z chwili zapisu, nawet jeśli wpisy zmieniły się później." />
      <ReportTabs />
      <ArchiveTable reports={reports} canManage={canManage(user)} />
    </div>
  );
}
