import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { auditFiltersToSearch, getAuditPage, parseAuditFilters, PAGE_SIZE } from "@/lib/audit/query";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { buttonVariants } from "@/components/ui/button";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AuditFilters } from "@/components/admin/audit-filters";
import { AuditList } from "@/components/admin/audit-list";

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const user = await getCurrentUser();
  if (!canManage(user)) redirect("/dashboard");

  const filters = parseAuditFilters(await searchParams);
  const { rows, total, pageCount, options } = await getAuditPage(filters, user);
  const query = auditFiltersToSearch(filters, 1).toString();
  const pageHref = (p: number) => {
    const s = auditFiltersToSearch(filters, p).toString();
    return `/admin/audit${s ? `?${s}` : ""}`;
  };
  const first = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const last = Math.min(filters.page * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <PageHeader description="Historia operacji w systemie: kto, kiedy i co zmienił. Kliknij zdarzenie, aby zobaczyć szczegóły." />
      <TopbarActions>
        <a href={`/api/audit/csv${query ? `?${query}` : ""}`} download className={buttonVariants({ size: "sm", variant: "outline" })}>
          <FileText aria-hidden="true" />
          Eksport CSV
        </a>
      </TopbarActions>

      <AdminTabs />
      <AuditFilters users={options.users} entities={options.entities} actions={options.actions} />
      <AuditList rows={rows} />

      <div className="flex items-center justify-between text-[0.8125rem] text-muted-foreground">
        <span className="tabular-nums">
          {total === 0 ? "0 zdarzeń" : `${first}–${last} z ${total} zdarzeń`}
        </span>
        {pageCount > 1 && (
          <div className="flex gap-2">
            {filters.page > 1 ? (
              <Link href={pageHref(filters.page - 1)} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                <ChevronLeft aria-hidden="true" />
                Nowsze
              </Link>
            ) : null}
            {filters.page < pageCount ? (
              <Link href={pageHref(filters.page + 1)} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                Starsze
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
