import Link from "next/link";
import { getCurrentUser } from "@/lib/db/users";
import { canManage, canVerifyEntry } from "@/lib/auth/permissions";
import { listSources } from "@/lib/db/sources";
import { listFactors } from "@/lib/db/factors";
import { BatchPreview } from "@/components/entries/batch-preview";
import { BatchPreviewSkeleton } from "@/components/entries/skeletons";
import { Card } from "@/components/ui/card";
import { Streamed } from "@/components/ui/streamed";
import { PageHeader } from "@/components/layout/page-header";

async function Batch() {
  const [user, sources, factors] = await Promise.all([getCurrentUser(), listSources(), listFactors()]);
  const manage = canManage(user);

  if (sources.length === 0 && !manage) {
    return (
      <Card className="p-4">
        <p className="text-sm">
          Nie masz jeszcze żadnego źródła emisji. Import wymaga przypisania pozycji
          faktury do źródła —{" "}
          <Link href="/sources" className="text-primary underline-offset-4 hover:underline">
            dodaj źródło emisji
          </Link>
          , zanim zaczniesz.
        </p>
      </Card>
    );
  }

  return (
    <BatchPreview
      sources={sources.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        scope: s.scope,
        unit: s.unit,
        defaultFactorId: s.defaultFactorId,
        ppeNumber: s.ppeNumber,
      }))}
      factors={factors.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        value: f.value,
        unit: f.unit,
        scope: f.scope,
        validFrom: f.validFrom,
        validTo: f.validTo,
      }))}
      canVerify={canVerifyEntry(user)}
      canManage={manage}
    />
  );
}

export default function NewEntriesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        description="Wrzuć pliki XML z KSeF lub zestawienie przyjęć z WAPRO MAG — system odczyta dane
          i wypełni formularz dla każdej faktury. Fakturę bez pliku możesz wpisać ręcznie."
      />
      <Streamed fallback={<BatchPreviewSkeleton />}>
        <Batch />
      </Streamed>
    </div>
  );
}
