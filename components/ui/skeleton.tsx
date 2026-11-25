import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  return <span aria-hidden="true" className={cn("skeleton block rounded-sm", className)} {...props} />;
}

// Line boxes
const LINE = {
  xs: ["h-4", "h-2.5"],
  sm: ["h-5", "h-3"],
  md: ["h-[1.375rem]", "h-3.5"],
  xl: ["h-7", "h-5"],
  "2xl": ["h-8", "h-6"],
} as const;

export function SkeletonText({
  size = "sm",
  className,
  align,
}: {
  size?: keyof typeof LINE;
  className?: string;
  align?: "right" | "center";
}) {
  const [box, bar] = LINE[size];
  return (
    <span
      aria-hidden="true"
      className={cn("flex items-center", box, align === "right" && "justify-end", align === "center" && "justify-center")}
    >
      <span className={cn("skeleton block max-w-full rounded-sm", bar, className ?? "w-24")} />
    </span>
  );
}

export function PageSkeleton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-4", className)}>
      <span className="sr-only">Wczytywanie…</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ lines = 1 }: { lines?: 1 | 2 }) {
  return (
    <div className="max-w-3xl">
      <SkeletonText className="w-[34rem]" />
      {lines === 2 && <SkeletonText className="w-[22rem]" />}
    </div>
  );
}

export function FieldSkeleton({ label, className, input = "w-full" }: { label: string; className?: string; input?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <Skeleton className={cn("h-8 rounded-md", input)} />
    </div>
  );
}

export function PillSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-7 w-24 rounded-full", className)} />;
}

// Table cells
export type SkeletonColumn = {
  label?: React.ReactNode;
  align?: "right";
  className?: string;
  cell?: "text" | "two" | "dot" | "pill" | "icon" | "actions" | "none";
  size?: "xs" | "sm";
  widths?: string[];
  sub?: string[];
};

const DEFAULT_WIDTHS = ["w-28", "w-20", "w-36", "w-24", "w-32"];

function Cell({ col, seed }: { col: SkeletonColumn; seed: number }) {
  const widths = col.widths ?? DEFAULT_WIDTHS;
  const w = widths[seed % widths.length];
  const align = col.align === "right" ? "right" : undefined;
  switch (col.cell ?? "text") {
    case "none":
      return null;
    case "two":
      return (
        <>
          <SkeletonText size={col.size} className={w} align={align} />
          <SkeletonText size="xs" className={(col.sub ?? widths)[(seed + 1) % (col.sub ?? widths).length]} align={align} />
        </>
      );
    case "dot":
      return (
        <span aria-hidden="true" className="flex h-4 items-center gap-1.5">
          <Skeleton className="size-1.5 rounded-full" />
          <Skeleton className={cn("h-2.5", w)} />
        </span>
      );
    case "pill":
      return <Skeleton className={cn("h-5 rounded-full", w)} />;
    case "icon":
      return <Skeleton className="size-4 rounded-[3px]" />;
    case "actions":
      return (
        <span aria-hidden="true" className="flex justify-end gap-1">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="size-7 rounded-full" />
        </span>
      );
    default:
      return <SkeletonText size={col.size} className={w} align={align} />;
  }
}

export function TableSkeleton({ columns, rows = 6 }: { columns: SkeletonColumn[]; rows?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c, i) => (
            <TableHead key={i} className={cn(c.align === "right" && "text-right", c.className)}>
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }, (_, r) => (
          <TableRow key={r} className="hover:bg-transparent!">
            {columns.map((c, i) => (
              <TableCell key={i} className={cn(c.align === "right" && "text-right", c.className)}>
                <Cell col={c} seed={r * 3 + i * 2} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
