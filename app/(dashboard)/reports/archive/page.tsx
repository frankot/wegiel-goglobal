import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { listArchivedReports } from "@/lib/reports/archive";
import { PageHeader } from "@/components/layout/page-header";
import { ReportTabs } from "@/components/reports/report-tabs";
import { ArchiveTable } from "@/components/reports/archive-table";
import { ArchiveTableSkeleton } from "@/components/reports/report-skeletons";
import { Streamed } from "@/components/ui/streamed";

async function Archive() {
  const [user, reports] = await Promise.all([getCurrentUser(), listArchivedReports()]);
  return <ArchiveTable reports={reports} canManage={canManage(user)} />;
}

export default function ReportArchivePage() {
  return (
    <div className="space-y-4">
      <PageHeader description="Zapisane wersje raportów. Pliki są niezmienne — pokazują dane z chwili zapisu, nawet jeśli wpisy zmieniły się później." />
      <ReportTabs />
      <Streamed fallback={<ArchiveTableSkeleton />}>
        <Archive />
      </Streamed>
    </div>
  );
}
