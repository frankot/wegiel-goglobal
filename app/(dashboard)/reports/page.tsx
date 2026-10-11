import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/db/users";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { buttonVariants } from "@/components/ui/button";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportView } from "@/components/reports/report-view";
import { parseReportParams, periodTitle, reportParamsToSearch } from "@/lib/reports/params";
import { getReport, getReportFilterOptions } from "@/lib/reports/query";

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await getCurrentUser();
  const params = parseReportParams(await searchParams);
  const [data, options] = await Promise.all([getReport(params), getReportFilterOptions()]);
  const query = reportParamsToSearch(params).toString();

  return (
    <div className="space-y-4">
      <PageHeader
        description={`Podgląd raportu śladu węglowego: ${periodTitle(params)}. Pobrany plik zawiera dokładnie te dane i filtry.`}
      />
      <TopbarActions>
        <a href={`/api/reports/csv?${query}`} download className={buttonVariants({ size: "sm", variant: "ghost" })}>
          <FileText aria-hidden="true" />
          CSV
        </a>
        <a href={`/api/reports/xlsx?${query}`} download className={buttonVariants({ size: "sm", variant: "outline" })}>
          <FileSpreadsheet aria-hidden="true" />
          XLSX
        </a>
        <a href={`/api/reports/pdf?${query}`} download className={buttonVariants({ size: "sm" })}>
          <FileDown aria-hidden="true" />
          Generuj PDF
        </a>
      </TopbarActions>

      <ReportFilters params={params} sources={options.sources} />
      <ReportView data={data} />
    </div>
  );
}
