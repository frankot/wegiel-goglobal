import { PageHeader } from "@/components/layout/page-header";
import { FactorTableSkeleton } from "@/components/factors/skeletons";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function FactorsLoading() {
  return (
    <PageSkeleton>
      <PageHeader
        description="Wskaźniki wersjonowane datami obowiązywania. Wpis emisyjny zapisuje
          snapshot wskaźnika, więc nowa wersja nie zmienia historycznych obliczeń."
      />
      <FactorTableSkeleton />
    </PageSkeleton>
  );
}
