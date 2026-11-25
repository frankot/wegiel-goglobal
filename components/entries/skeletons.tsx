import { Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PillSkeleton, SkeletonText, TableSkeleton } from "@/components/ui/skeleton";

export function InvoiceTableSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="overflow-x-auto p-0">
        <TableSkeleton
          rows={10}
          columns={[
            { className: "w-8", cell: "icon" },
            { label: "Numer", widths: ["w-28", "w-36", "w-24", "w-32"] },
            { label: "Data / okres", cell: "two", widths: ["w-20"], sub: ["w-36"] },
            { label: "Dostawca", widths: ["w-32", "w-40", "w-24", "w-36"] },
            { label: "Poz.", align: "right", widths: ["w-4", "w-3"] },
            { label: "CO₂e [t]", align: "right", widths: ["w-12", "w-14", "w-10"] },
            { label: "Status", cell: "dot", widths: ["w-20", "w-12", "w-16"] },
            { label: "Źródło", cell: "pill", widths: ["w-14", "w-16"] },
          ]}
        />
      </Card>
      <div className="flex items-center justify-between">
        <SkeletonText className="w-32" />
        <PillSkeleton className="w-64" />
      </div>
    </div>
  );
}

export function BatchPreviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
        <Upload className="mb-2 h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
        <SkeletonText className="w-[30rem]" align="center" />
        <div className="mt-1 w-full">
          <SkeletonText size="xs" className="w-[38rem]" align="center" />
          <SkeletonText size="xs" className="w-[26rem]" align="center" />
        </div>
        <PillSkeleton className="mt-3 w-28" />
      </div>
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <span>Nie masz pliku XML?</span>
        <PillSkeleton className="w-44" />
      </div>
    </div>
  );
}
