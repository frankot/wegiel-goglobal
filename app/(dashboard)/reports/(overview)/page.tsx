import { Suspense } from "react";
import { getCurrentUser } from "@/lib/db/users";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportView } from "@/components/reports/report-view";
import {
  GenerateReportSkeleton,
  ReportFiltersSkeleton,
  ReportViewSkeleton,
} from "@/components/reports/report-skeletons";
import { Streamed } from "@/components/ui/streamed";
import { parseReportParams, periodTitle, reportParamsToSearch, type ReportParams } from "@/lib/reports/params";
import { getReport, getReportFilterOptions } from "@/lib/reports/query";
import { canManage } from "@/lib/auth/permissions";
import { TEMPLATES } from "@/lib/reports/templates";
import { includesDrafts } from "@/lib/reports/params";
import { ReportTabs } from "@/components/reports/report-tabs";
import { GenerateReportButton } from "@/components/reports/generate-report";

type Report = ReturnType<typeof getReport>;

async function Generate({ params, report }: { params: ReportParams; report: Report }) {
  const [user, data] = await Promise.all([getCurrentUser(), report]);
  return (
    <TopbarActions>
      <GenerateReportButton
        query={reportParamsToSearch(params).toString()}
        period={periodTitle(params)}
        templateLabel={TEMPLATES[params.template].label}
        defaultTitle={`${params.template === "full" ? "Raport" : TEMPLATES[params.template].label} — ${periodTitle(params)}`}
        entryCount={data.entryCount}
        draftCount={includesDrafts(params) ? data.quality.byStatus.DRAFT.count : 0}
        canArchive={canManage(user)}
      />
    </TopbarActions>
  );
}

async function Filters({ params }: { params: ReportParams }) {
  const options = await getReportFilterOptions();
  return <ReportFilters params={params} sources={options.sources} />;
}

async function View({ report }: { report: Report }) {
  return <ReportView data={await report} />;
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = parseReportParams(await searchParams);
  const report = getReport(params);

  return (
    <div className="space-y-4">
      <PageHeader
        description={`Podgląd raportu śladu węglowego: ${periodTitle(params)}. Pobrany plik zawiera dokładnie te dane i filtry.`}
      />
      <Suspense fallback={<GenerateReportSkeleton />}>
        <Generate params={params} report={report} />
      </Suspense>

      <ReportTabs />
      <Streamed fallback={<ReportFiltersSkeleton />}>
        <Filters params={params} />
      </Streamed>
      <Streamed fallback={<ReportViewSkeleton />}>
        <View report={report} />
      </Streamed>
    </div>
  );
}
