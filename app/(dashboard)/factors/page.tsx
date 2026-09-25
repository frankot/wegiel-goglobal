import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { listFactors } from "@/lib/db/factors";
import { FactorTable } from "@/components/factors/factor-table";
import { AddFactorButton } from "@/components/factors/add-factor-button";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";

export default async function FactorsPage() {
  const user = await getCurrentUser();
  const factors = await listFactors();
  const manage = canManage(user);

  return (
    <div className="space-y-4">
      <PageHeader
        description="Wskaźniki wersjonowane datami obowiązywania. Wpis emisyjny zapisuje
          snapshot wskaźnika, więc nowa wersja nie zmienia historycznych obliczeń."
      />
      {manage && (
        <TopbarActions>
          <AddFactorButton />
        </TopbarActions>
      )}

      <FactorTable factors={factors} canManage={manage} />
    </div>
  );
}
