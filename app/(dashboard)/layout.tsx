import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/db/users";
import { AppLayout } from "@/components/layout/app-layout";
import { SIDEBAR_COOKIE } from "@/components/layout/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);

  return (
    <AppLayout
      userName={user.name || user.email}
      userEmail={user.email}
      userRole={user.role}
      defaultCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      {children}
    </AppLayout>
  );
}
