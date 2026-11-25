import { ReportTabs } from "@/components/reports/report-tabs";
import { PageHeaderSkeleton, PageSkeleton } from "@/components/ui/skeleton";
import {
  GenerateReportSkeleton,
  ReportFiltersSkeleton,
  ReportViewSkeleton,
} from "@/components/reports/report-skeletons";

export default function ReportsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <GenerateReportSkeleton />
      <ReportTabs />
      <ReportFiltersSkeleton />
      <ReportViewSkeleton />
    </PageSkeleton>
  );
}
