import { PageHeader } from "@/components/layout/page-header";
import { SourcesSkeleton } from "@/components/sources/skeletons";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function SourcesLoading() {
  return (
    <PageSkeleton>
      <PageHeader
        description="Liczniki, instalacje i pojazdy, których zużycie rejestrujesz. Każde
          źródło ma domyślny wskaźnik emisji używany przy imporcie faktur."
      />
      <SourcesSkeleton />
    </PageSkeleton>
  );
}
