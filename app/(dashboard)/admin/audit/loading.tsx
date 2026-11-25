import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AuditFiltersSkeleton, AuditListSkeleton } from "@/components/admin/skeletons";
import { PageSkeleton, PillSkeleton } from "@/components/ui/skeleton";

export default function AuditLoading() {
  return (
    <PageSkeleton>
      <PageHeader description="Historia operacji w systemie: kto, kiedy i co zmienił. Kliknij zdarzenie, aby zobaczyć szczegóły." />
      <TopbarActions>
        <PillSkeleton className="w-28" />
      </TopbarActions>
      <AdminTabs />
      <AuditFiltersSkeleton />
      <AuditListSkeleton />
    </PageSkeleton>
  );
}
