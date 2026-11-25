import type { SortDir, SortState } from "@/lib/table-sort";

/** Invoice list sorting */

export const INVOICE_PAGE_SIZE = 25;

export const INVOICE_SORT_KEYS = ["number", "date", "supplier", "entries", "co2e", "status", "format"] as const;
export type InvoiceSortKey = (typeof INVOICE_SORT_KEYS)[number];
export type InvoiceSort = SortState<InvoiceSortKey>;

export const INVOICE_SORT_DEFAULTS: Partial<Record<InvoiceSortKey, SortDir>> = {
  date: "desc",
  entries: "desc",
  co2e: "desc",
};

export function parseInvoiceSort(key: unknown, dir: unknown): InvoiceSort | null {
  if (typeof key !== "string" || !(INVOICE_SORT_KEYS as readonly string[]).includes(key)) return null;
  const k = key as InvoiceSortKey;
  return { key: k, dir: dir === "asc" || dir === "desc" ? dir : (INVOICE_SORT_DEFAULTS[k] ?? "asc") };
}

export function parsePage(raw: unknown): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function invoiceListHref({ page = 1, sort }: { page?: number; sort?: InvoiceSort | null }): string {
  const s = new URLSearchParams();
  if (sort) {
    s.set("sortuj", sort.key);
    s.set("kierunek", sort.dir);
  }
  if (page > 1) s.set("strona", String(page));
  const q = s.toString();
  return `/entries${q ? `?${q}` : ""}`;
}
