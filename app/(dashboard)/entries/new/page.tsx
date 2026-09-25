import Link from "next/link";
import { getCurrentUser } from "@/lib/db/users";
import { canManage, canVerifyEntry } from "@/lib/auth/permissions";
import { listSources } from "@/lib/db/sources";
import { listFactors } from "@/lib/db/factors";
import { BatchPreview } from "@/components/entries/batch-preview";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default async function NewEntriesPage() {
  const user = await getCurrentUser();
  const [sources, factors] = await Promise.all([listSources(), listFactors()]);
  const manage = canManage(user);

  return (
    <div className="space-y-4">
      <PageHeader
        description="Wrzuć jeden lub więcej plików XML z KSeF — system odczyta dane i wypełni
          formularz dla każdej faktury."
      />

      {/* Manager doda źródło prosto z karty faktury; pracownik musi poprosić. */}
      {sources.length === 0 && !manage ? (
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
      ) : (
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
      )}
    </div>
  );
}
