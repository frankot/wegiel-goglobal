import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText, TableSkeleton } from "@/components/ui/skeleton";

const GROUPS = [
  { title: "w-32", rows: 4 },
  { title: "w-24", rows: 3 },
];

export function FactorTableSkeleton() {
  return (
    <div className="space-y-4">
      <span className="flex w-fit items-center gap-2 text-sm">
        <Skeleton className="size-4 rounded-[3px]" />
        Pokaż wersje archiwalne
      </span>
      {GROUPS.map((g, i) => (
        <Card key={i} className="overflow-x-auto p-0">
          <div className="border-b px-4 py-2">
            <SkeletonText className={g.title} />
          </div>
          <TableSkeleton
            rows={g.rows}
            columns={[
              { label: "Nazwa", widths: ["w-48", "w-40", "w-56"] },
              { label: "Wartość", align: "right", widths: ["w-12", "w-14"] },
              { label: "Jednostka", size: "xs", widths: ["w-20", "w-16"] },
              { label: "Źródło", cell: "pill", widths: ["w-20", "w-16"] },
              { label: "Zakres", size: "xs", widths: ["w-16"] },
              { label: "Ważny od", size: "xs", widths: ["w-16"] },
              { label: "Ważny do", size: "xs", widths: ["w-16"] },
              { label: "Status", cell: "pill", widths: ["w-16", "w-20"] },
            ]}
          />
        </Card>
      ))}
    </div>
  );
}
