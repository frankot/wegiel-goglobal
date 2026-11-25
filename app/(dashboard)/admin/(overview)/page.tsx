import { redirect } from "next/navigation";
import { getCurrentUser, listUsers } from "@/lib/db/users";
import { assignableRoles, canManage, type Role } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { InviteForm } from "@/components/admin/invite-form";
import { UserTable } from "@/components/admin/user-table";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { UserTableSkeleton } from "@/components/admin/skeletons";
import { Streamed } from "@/components/ui/streamed";

async function Users({ viewer, roles }: { viewer: { id: string; role: string }; roles: Role[] }) {
  const users = await listUsers(viewer.role === "ADMIN");
  return <UserTable users={users} viewer={viewer} roles={roles} />;
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!canManage(user)) redirect("/dashboard");

  const roles = assignableRoles(user);

  return (
    <div className="space-y-4">
      <PageHeader description="Zapraszanie osób do systemu i zarządzanie ich dostępem." />
      <AdminTabs />
      <InviteForm roles={roles} />
      <Streamed fallback={<UserTableSkeleton />}>
        <Users viewer={{ id: user.id, role: user.role }} roles={roles} />
      </Streamed>
    </div>
  );
}
