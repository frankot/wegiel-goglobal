import { PageHeader } from "@/components/layout/page-header";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { InviteFormSkeleton, UserTableSkeleton } from "@/components/admin/skeletons";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <PageSkeleton>
      <PageHeader description="Zapraszanie osób do systemu i zarządzanie ich dostępem." />
      <AdminTabs />
      <InviteFormSkeleton />
      <UserTableSkeleton />
    </PageSkeleton>
  );
}
