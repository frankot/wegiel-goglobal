import { PageHeader } from "@/components/layout/page-header";
import { BatchPreviewSkeleton } from "@/components/entries/skeletons";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function NewEntriesLoading() {
  return (
    <PageSkeleton>
      <PageHeader
        description="Wrzuć pliki XML z KSeF lub zestawienie przyjęć z WAPRO MAG — system odczyta dane
          i wypełni formularz dla każdej faktury. Fakturę bez pliku możesz wpisać ręcznie."
      />
      <BatchPreviewSkeleton />
    </PageSkeleton>
  );
}
