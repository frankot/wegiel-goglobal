import { PageHeader } from "@/components/layout/page-header";
import { ReportTabs } from "@/components/reports/report-tabs";
import { ArchiveTableSkeleton } from "@/components/reports/report-skeletons";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function ReportArchiveLoading() {
  return (
    <PageSkeleton>
      <PageHeader description="Zapisane wersje raportów. Pliki są niezmienne — pokazują dane z chwili zapisu, nawet jeśli wpisy zmieniły się później." />
      <ReportTabs />
      <ArchiveTableSkeleton />
    </PageSkeleton>
  );
}
