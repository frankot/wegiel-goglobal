/** Table sorting */

export type SortDir = "asc" | "desc";
export type SortValue = string | number | null | undefined;
export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

const collator = new Intl.Collator("pl", { numeric: true, sensitivity: "base" });

export function compareValues(a: SortValue, b: SortValue): number {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K> | null,
  accessors: Record<K, (row: T) => SortValue>,
): T[] {
  if (!sort) return [...rows];
  const get = accessors[sort.key];
  const sign = sort.dir === "asc" ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i, v: get(row) }))
    .sort((x, y) => {
      const empty = (v: SortValue) => v === null || v === undefined || v === "";
      if (empty(x.v) !== empty(y.v)) return empty(x.v) ? 1 : -1;
      return compareValues(x.v, y.v) * sign || x.i - y.i;
    })
    .map((x) => x.row);
}
