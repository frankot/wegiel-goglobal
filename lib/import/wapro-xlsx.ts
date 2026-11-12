import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { isKnownUnit } from "@/lib/emissions/unit-table";
import { multiplyDecimal } from "@/lib/emissions/decimal-lite";
import { isSpreadsheetFile } from "./limits";
import { InvoiceParseError, type ParsedInvoice, type ParsedLine } from "./types";

/** WAPRO MAG receipts */

const COLUMNS = {
  supplier: ["nazwa dostawcy"],
  document: ["dok. magazynowy"],
  tradeDocument: ["dok. handlowy"],
  date: ["data"],
  netPrice: ["cena netto"],
  quantity: ["ilość pierwotna z dostawy", "ilość"],
  unit: ["j.m", "j.m.", "jm"],
} as const;

type Column = keyof typeof COLUMNS;
const REQUIRED: Column[] = ["supplier", "document", "date", "quantity", "unit"];

export interface WaproRow {
  row: number;
  supplier: string;
  document: string;
  tradeDocument?: string;
  date?: string;
  netPrice?: string;
  quantity: string;
  unit: string;
}

const norm = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();

function text(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

export function parseQuantity(v: unknown): string | null {
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : null;
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export function parseDate(v: unknown): string | undefined {
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return undefined;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = text(v);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const pl = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (pl) return `${pl[3]}-${pl[2]!.padStart(2, "0")}-${pl[1]!.padStart(2, "0")}`;
  return undefined;
}

function findHeader(rows: unknown[][]): { index: number; cols: Partial<Record<Column, number>> } | null {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cells = (rows[i] ?? []).map(norm);
    const cols: Partial<Record<Column, number>> = {};
    for (const [key, names] of Object.entries(COLUMNS) as [Column, readonly string[]][]) {
      const idx = names.map((n) => cells.indexOf(n)).find((x) => x >= 0);
      if (idx !== undefined) cols[key] = idx;
    }
    if (REQUIRED.every((c) => cols[c] !== undefined)) return { index: i, cols };
  }
  return null;
}

export function readWaproRows(content: Buffer): WaproRow[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(content, { type: "buffer" });
  } catch {
    throw new InvoiceParseError("Nie udało się otworzyć arkusza (XLSX, XLS lub ODS).");
  }

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, {
      header: 1,
      raw: true,
      defval: null,
    });
    const header = findHeader(rows);
    if (!header) continue;

    const c = header.cols;
    const out: WaproRow[] = [];
    rows.slice(header.index + 1).forEach((r, i) => {
      const cell = (col: Column) => (c[col] === undefined ? null : r[c[col]!]);
      const supplier = text(cell("supplier"));
      const document = text(cell("document"));
      const quantity = text(cell("quantity"));
      if (!supplier && !document && !quantity) return;
      out.push({
        row: header.index + i + 2,
        supplier,
        document,
        tradeDocument: text(cell("tradeDocument")) || undefined,
        date: parseDate(cell("date")),
        netPrice: parseQuantity(cell("netPrice")) ?? undefined,
        quantity: parseQuantity(cell("quantity")) ?? quantity,
        unit: text(cell("unit")),
      });
    });
    return out;
  }

  throw new InvoiceParseError(
    "Nie rozpoznano układu arkusza. Obsługiwane jest zestawienie przyjęć z WAPRO MAG " +
      "(kolumny: Nazwa dostawcy, Dok. magazynowy, Data, Ilość pierwotna z dostawy, J.M).",
  );
}

function netValue(row: WaproRow): string | undefined {
  if (!row.netPrice || !/^-?\d/.test(row.quantity)) return undefined;
  const value = multiplyDecimal(row.quantity, row.netPrice);
  return value === null ? undefined : Number(value).toFixed(2);
}

function toLine(row: WaproRow, lineNo: number): ParsedLine {
  const base = {
    lineNo,
    description: `Przyjęcie ${row.document}`,
    quantity: row.quantity,
    unit: row.unit,
    netValue: netValue(row),
  };
  if (!row.unit) return { ...base, emissionRelevant: false, skipReason: "pozycja bez jednostki" };
  if (!isKnownUnit(row.unit)) {
    return { ...base, emissionRelevant: false, skipReason: `jednostka „${row.unit}" nie jest jednostką zużycia` };
  }
  if (!/^\d+(\.\d+)?$/.test(row.quantity) || Number(row.quantity) <= 0) {
    return { ...base, emissionRelevant: false, skipReason: `ilość „${row.quantity}" nie jest dodatnią liczbą` };
  }
  return { ...base, emissionRelevant: true };
}

export function groupWaproRows(rows: WaproRow[], fileName: string): ParsedInvoice[] {
  const groups = new Map<string, WaproRow[]>();
  for (const row of rows) {
    const key = row.document || `wiersz ${row.row}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()].map(([document, group]) => {
    const first = group[0]!;
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!first.document) errors.push(`Wiersz ${first.row}: brak numeru dokumentu magazynowego.`);
    if (!first.date) warnings.push(`Dokument ${document}: brak lub nieczytelna data — uzupełnij datę wystawienia.`);
    if (group.some((r) => r.supplier !== first.supplier)) {
      warnings.push(`Dokument ${document} ma różnych dostawców w wierszach — sprawdź plik.`);
    }

    return {
      clientId: randomUUID(),
      fileName,
      format: "WAPRO_XLSX",
      sourceRef: first.document || undefined,
      invoiceNumber: first.tradeDocument ?? (first.document || undefined),
      issueDate: first.date,
      supplierName: first.supplier || undefined,
      lines: group.map((r, i) => toLine(r, i + 1)),
      warnings,
      errors,
      raw: { format: "WAPRO_XLSX", fileName, document, rows: group },
    };
  });
}

export const waproXlsxParser = {
  id: "WAPRO_XLSX",

  detect({ name }: { name: string }) {
    return isSpreadsheetFile(name);
  },

  parseAll({ name, content }: { name: string; content: Buffer }): ParsedInvoice[] {
    const rows = readWaproRows(content);
    if (rows.length === 0) throw new InvoiceParseError("Arkusz nie zawiera żadnych przyjęć.");
    return groupWaproRows(rows, name);
  },
};
