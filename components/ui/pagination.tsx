import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function pageList(page: number, count: number): (number | "gap")[] {
  const pages = [...new Set([1, 2, page - 1, page, page + 1, count - 1, count])]
    .filter((p) => p >= 1 && p <= count)
    .sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1]! > 1 ? ["gap" as const, p] : [p]));
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  label,
  href,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  label: (total: number) => string;
  href: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const step = cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2");

  return (
    <nav aria-label="Strony" className="flex flex-wrap items-center justify-between gap-3 text-[0.8125rem] text-muted-foreground">
      <span className="tabular-nums">
        {first}–{last} z {total} {label(total)}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className={step}>
            <ChevronLeft aria-hidden="true" />
            Poprzednia
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(step, "pointer-events-none opacity-45")}>
            <ChevronLeft aria-hidden="true" />
            Poprzednia
          </span>
        )}
        {pageList(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <span key={`gap${i}`} aria-hidden="true" className="w-5 text-center">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Strona ${p}`}
              className={cn(
                buttonVariants({ variant: p === page ? "default" : "ghost", size: "icon-sm" }),
                "tabular-nums",
                p === page && "pointer-events-none",
              )}
            >
              {p}
            </Link>
          ),
        )}
        {page < pageCount ? (
          <Link href={href(page + 1)} className={step}>
            Następna
            <ChevronRight aria-hidden="true" />
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(step, "pointer-events-none opacity-45")}>
            Następna
            <ChevronRight aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
