import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { listFactors } from "@/lib/db/factors";
import { FactorTable } from "@/components/factors/factor-table";
import { AddFactorButton } from "@/components/factors/add-factor-button";

export default async function FactorsPage() {
  const user = await getCurrentUser();
  const factors = await listFactors();
  const manage = canManage(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Współczynniki emisji</h2>
          <p className="text-muted-foreground">
            Wskaźniki wersjonowane datami obowiązywania. Wpis emisyjny zapisuje
            snapshot wskaźnika, więc nowa wersja nie zmienia historycznych obliczeń.
          </p>
        </div>
        {manage && <AddFactorButton />}
      </div>

      <FactorTable factors={factors} canManage={manage} />
    </div>
  );
}
