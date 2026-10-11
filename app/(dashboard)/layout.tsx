import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/db/users";
import { getCompany } from "@/lib/db/company";
import { formatNip } from "@/lib/company/identifiers";
import { AppLayout } from "@/components/layout/app-layout";
import { SIDEBAR_COOKIE } from "@/components/layout/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore, company] = await Promise.all([
    getCurrentUser(),
    cookies(),
    getCompany(),
  ]);

  return (
    <AppLayout
      userName={user.name || user.email}
      userEmail={user.email}
      userRole={user.role}
      company={
        company
          ? {
              name: company.shortName || company.name,
              nip: company.nip ? formatNip(company.nip) : null,
            }
          : null
      }
      defaultCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      {children}
    </AppLayout>
  );
}
