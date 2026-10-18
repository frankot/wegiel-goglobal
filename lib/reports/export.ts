import "server-only";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { SOURCE_TYPE_LABELS } from "@/lib/emissions/source-types";
import type { ReportData } from "./aggregate";
import { STATUS_LABELS } from "./params";
import { ORIGIN_LABELS, csvSafeText, scopeLabel } from "./format";

const HEADERS = [
  "Data wpisu",
  "Okres od",
  "Okres do",
  "Źródło emisji",
  "Kategoria",
  "Zakres",
  "Ilość",
  "Jednostka",
  "Wskaźnik",
  "Wartość wskaźnika",
  "Jednostka wskaźnika",
  "Pochodzenie wskaźnika",
  "CO₂e [kg]",
  "CO₂e [t]",
  "Status",
  "Faktura",
  "Dostawca",
  "Autor",
] as const;

function tableRows(
  data: ReportData,
  decimal: (v: string) => string | number,
  text: (v: string) => string = (v) => v,
) {
  return data.rows.map((r) => [
    r.entryDate,
    r.periodStart ?? "",
    r.periodEnd ?? "",
    text(r.sourceName),
    SOURCE_TYPE_LABELS[r.sourceType],
    scopeLabel(r.scope),
    decimal(r.quantity),
    text(r.unit),
    text(r.factorName),
    decimal(r.factorValue),
    text(r.factorUnit),
    ORIGIN_LABELS[r.factorOrigin],
    decimal(r.co2eKg),
    decimal(shiftDecimal(r.co2eKg, 3)),
    STATUS_LABELS[r.status],
    text(r.invoiceNumber ?? ""),
    text(r.supplierName ?? ""),
    text(r.authorName),
  ]);
}

function shiftDecimal(v: string, n: number): string {
  const neg = v.startsWith("-");
  const [int, frac = ""] = (neg ? v.slice(1) : v).split(".");
  const padded = int!.padStart(n + 1, "0");
  const head = padded.slice(0, -n);
  const tail = (padded.slice(-n) + frac).replace(/0+$/, "");
  return `${neg ? "-" : ""}${head}${tail ? `.${tail}` : ""}`;
}

export function renderReportCsv(data: ReportData): Uint8Array {
  const csv = Papa.unparse(
    { fields: [...HEADERS], data: tableRows(data, (v) => v.replace(".", ","), csvSafeText) },
    { delimiter: ";", newline: "\r\n" },
  );
  // UTF-8 BOM
  return new TextEncoder().encode(`﻿${csv}`);
}

export function renderReportXlsx(data: ReportData): Uint8Array {
  const wb = XLSX.utils.book_new();

  const entries = XLSX.utils.aoa_to_sheet([[...HEADERS], ...tableRows(data, Number)]);
  entries["!cols"] = HEADERS.map((h, i) => ({
    wch: Math.min(
      40,
      Math.max(h.length, ...data.rows.slice(0, 500).map((_, j) => String(entries[XLSX.utils.encode_cell({ r: j + 1, c: i })]?.v ?? "").length)) + 2,
    ),
  }));
  entries["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.rows.length, c: HEADERS.length - 1 } }) };

  const summary = XLSX.utils.aoa_to_sheet([
    ["Okres", `${data.params.from} – ${data.params.to}`],
    [],
    ["", "CO₂e [kg]", "CO₂e [t]"],
    ["Zakres 1", Number(data.scope1Kg), Number(shiftDecimal(data.scope1Kg, 3))],
    ["Zakres 2", Number(data.scope2Kg), Number(shiftDecimal(data.scope2Kg, 3))],
    ["Razem", Number(data.totalKg), Number(shiftDecimal(data.totalKg, 3))],
    [],
    ["Źródło", "Kategoria", "Zakres", "CO₂e [kg]", "Udział [%]"],
    ...data.bySource.map((s) => [s.name, SOURCE_TYPE_LABELS[s.type], scopeLabel(s.scope), Number(s.kg), s.sharePct]),
  ]);
  summary["!cols"] = [{ wch: 32 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];

  XLSX.utils.book_append_sheet(wb, summary, "Podsumowanie");
  XLSX.utils.book_append_sheet(wb, entries, "Wpisy");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

export { shiftDecimal };
