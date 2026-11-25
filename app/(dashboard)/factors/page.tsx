import { Suspense } from "react";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { listFactors } from "@/lib/db/factors";
import { FactorTable } from "@/components/factors/factor-table";
import { FactorTableSkeleton } from "@/components/factors/skeletons";
import { AddFactorButton } from "@/components/factors/add-factor-button";
import { Streamed } from "@/components/ui/streamed";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { getReminders } from "@/lib/reminders/query";
import { FactorWarningsBanner } from "@/components/reminders/reminder-panel";

async function Actions() {
  const user = await getCurrentUser();
  if (!canManage(user)) return null;
  return (
    <TopbarActions>
      <AddFactorButton />
    </TopbarActions>
  );
}

async function Warnings() {
  const [user, reminders] = await Promise.all([getCurrentUser(), getReminders()]);
  return <FactorWarningsBanner reminders={reminders} canManage={canManage(user)} />;
}

async function Factors() {
  const [user, factors] = await Promise.all([getCurrentUser(), listFactors()]);
  return <FactorTable factors={factors} canManage={canManage(user)} />;
}

export default function FactorsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        description="Wskaźniki wersjonowane datami obowiązywania. Wpis emisyjny zapisuje
          snapshot wskaźnika, więc nowa wersja nie zmienia historycznych obliczeń."
      />
      <Suspense>
        <Actions />
      </Suspense>

      <Streamed expand>
        <Warnings />
      </Streamed>
      <Streamed fallback={<FactorTableSkeleton />}>
        <Factors />
      </Streamed>
    </div>
  );
}
