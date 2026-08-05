import { getCurrentUser } from "@/lib/db/users";
import { AppLayout } from "@/components/layout/app-layout";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <TooltipProvider delay={200}>
      <AppLayout
        userName={user.name || user.email}
        userEmail={user.email}
        userRole={user.role}
      >
        {children}
      </AppLayout>
    </TooltipProvider>
  );
}
