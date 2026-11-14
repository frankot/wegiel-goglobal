import "server-only";
import { getCompany } from "@/lib/db/company";
import type { ReportParams } from "./params";
import { getReport, getReportFilterOptions } from "./query";
import { renderReportPdf } from "./pdf";
import { renderReportCsv, renderReportXlsx } from "./export";
import { reportFileName } from "./format";
import type { ReportData } from "./aggregate";

/** Report files */

export const REPORT_FORMATS = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
} as const;

export type ReportFormat = keyof typeof REPORT_FORMATS;

export function isReportFormat(v: string): v is ReportFormat {
  return v in REPORT_FORMATS;
}

export interface RenderedReport {
  data: ReportData;
  files: { format: ReportFormat; fileName: string; type: string; body: Uint8Array }[];
}

export async function renderReport(
  params: ReportParams,
  formats: readonly ReportFormat[],
  generatedBy: string,
): Promise<RenderedReport> {
  const [data, company, options] = await Promise.all([getReport(params), getCompany(), getReportFilterOptions()]);
  const generatedAt = new Date();
  const sourceNames = new Map(options.sources.map((s) => [s.id, s.name]));

  const files = formats.map((format) => {
    const body =
      format === "pdf"
        ? renderReportPdf(data, { company, generatedBy, generatedAt, sourceNames })
        : format === "xlsx"
          ? renderReportXlsx(data)
          : renderReportCsv(data);
    return {
      format,
      fileName: reportFileName(params, format),
      type: REPORT_FORMATS[format],
      body,
    };
  });

  return { data, files };
}
