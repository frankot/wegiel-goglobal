import { redirect } from "next/navigation";
import { getCurrentUser, listUsers } from "@/lib/db/users";
import { assignableRoles, canManage } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { InviteForm } from "@/components/admin/invite-form";
import { UserTable } from "@/components/admin/user-table";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!canManage(user)) redirect("/dashboard");

  const users = await listUsers(user.role === "ADMIN");
  const roles = assignableRoles(user);

  return (
    <div className="space-y-4">
      <PageHeader description="Zapraszanie osób do systemu i zarządzanie ich dostępem." />
      <AdminTabs />
      <InviteForm roles={roles} />
      <UserTable users={users} viewer={{ id: user.id, role: user.role }} roles={roles} />
    </div>
  );
}
