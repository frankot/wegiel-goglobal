import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { listSourceRows } from "@/lib/db/sources";
import { listFactors } from "@/lib/db/factors";
import { SourceTable } from "@/components/sources/source-table";

export default async function SourcesPage() {
  const user = await getCurrentUser();
  const [sources, factors] = await Promise.all([listSourceRows(), listFactors()]);

  const withoutIdentifiers = sources.filter(
    (s) => s.active && s.scope === "SCOPE_2" && !s.ppeNumber && !s.meterNumber,
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Źródła emisji</h2>
        <p className="text-muted-foreground">
          Liczniki, instalacje i pojazdy, których zużycie rejestrujesz. Każde
          źródło ma domyślny wskaźnik emisji używany przy imporcie faktur.
        </p>
      </div>

      {withoutIdentifiers > 0 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
          {withoutIdentifiers}{" "}
          {withoutIdentifiers === 1
            ? "źródło energii nie ma numeru PPE ani licznika"
            : "źródła energii nie mają numeru PPE ani licznika"}{" "}
          — faktury nie przypiszą się do nich automatycznie. Uzupełnij
          identyfikatory z faktury, żeby import działał bez ręcznego wskazywania.
        </p>
      )}

      <SourceTable
        sources={sources}
        factors={factors}
        canManage={canManage(user)}
      />
    </div>
  );
}
