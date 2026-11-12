"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead } from "./table";
import { sortRows, type SortDir, type SortState, type SortValue } from "@/lib/table-sort";

export { sortRows, type SortDir, type SortState, type SortValue };

export function useSort<K extends string>(defaults: Partial<Record<K, SortDir>> = {}) {
  const [sort, setSort] = useState<SortState<K> | null>(null);
  const toggle = (key: K) =>
    setSort((cur) => {
      const first = defaults[key] ?? "asc";
      if (!cur || cur.key !== key) return { key, dir: first };
      if (cur.dir === first) return { key, dir: first === "asc" ? "desc" : "asc" };
      return null;
    });
  return { sort, toggle };
}

export function useSortedRows<T, K extends string>(
  rows: readonly T[],
  accessors: Record<K, (row: T) => SortValue>,
  defaults: Partial<Record<K, SortDir>> = {},
) {
  const { sort, toggle } = useSort<K>(defaults);
  const sorted = useMemo(() => sortRows(rows, sort, accessors), [rows, sort, accessors]);
  return { sorted, sort, toggle };
}

export function SortableHead<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
}: {
  label: React.ReactNode;
  sortKey: K;
  sort: SortState<K> | null;
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(align === "right" && "text-right", className)}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="group/sort relative inline-flex cursor-pointer items-center rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 size-3 -translate-y-1/2",
            align === "right" ? "right-full mr-0.5" : "left-full ml-0.5",
            active ? "text-primary" : "text-muted-foreground/50 group-hover/sort:text-muted-foreground",
          )}
        />
      </button>
    </TableHead>
  );
}
