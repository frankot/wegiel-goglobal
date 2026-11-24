import { getCurrentUser } from "@/lib/db/users";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportView } from "@/components/reports/report-view";
import { parseReportParams, periodTitle, reportParamsToSearch } from "@/lib/reports/params";
import { getReport, getReportFilterOptions } from "@/lib/reports/query";
import { canManage } from "@/lib/auth/permissions";
import { TEMPLATES } from "@/lib/reports/templates";
import { includesDrafts } from "@/lib/reports/params";
import { ReportTabs } from "@/components/reports/report-tabs";
import { GenerateReportButton } from "@/components/reports/generate-report";

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const user = await getCurrentUser();
  const params = parseReportParams(await searchParams);
  const [data, options] = await Promise.all([getReport(params), getReportFilterOptions()]);
  const query = reportParamsToSearch(params).toString();

  return (
    <div className="space-y-4">
      <PageHeader
        description={`Podgląd raportu śladu węglowego: ${periodTitle(params)}. Pobrany plik zawiera dokładnie te dane i filtry.`}
      />
      <TopbarActions>
        <GenerateReportButton
          query={query}
          period={periodTitle(params)}
          templateLabel={TEMPLATES[params.template].label}
          defaultTitle={`${params.template === "full" ? "Raport" : TEMPLATES[params.template].label} — ${periodTitle(params)}`}
          entryCount={data.entryCount}
          draftCount={includesDrafts(params) ? data.quality.byStatus.DRAFT.count : 0}
          canArchive={canManage(user)}
        />
      </TopbarActions>

      <ReportTabs />
      <ReportFilters params={params} sources={options.sources} />
      <ReportView data={data} />
    </div>
  );
}
