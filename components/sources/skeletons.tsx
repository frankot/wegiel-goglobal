import { Card } from "@/components/ui/card";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export function SourcesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
        <span className="flex items-center gap-2 text-sm">
          <Skeleton className="size-4 rounded-[3px]" />
          Pokaż nieaktywne
        </span>
      </div>
      <Card className="overflow-x-auto p-0">
        <TableSkeleton
          rows={8}
          columns={[
            { label: "Nazwa", cell: "two", widths: ["w-36", "w-28", "w-40"], sub: ["w-24", "w-20"] },
            { label: "Typ / zakres", cell: "two", size: "xs", widths: ["w-24", "w-20"], sub: ["w-16"] },
            { label: "Domyślny wskaźnik", size: "xs", widths: ["w-40", "w-32", "w-44"] },
            { label: "Identyfikatory", size: "xs", widths: ["w-32", "w-28", "w-20"] },
            { label: "Wpisy", align: "right", widths: ["w-4", "w-6"] },
            { label: "Status", cell: "pill", widths: ["w-16", "w-14"] },
          ]}
        />
      </Card>
    </div>
  );
}
