import Link from "next/link";
import { getCurrentUser } from "@/lib/db/users";
import { canVerifyEntry } from "@/lib/auth/permissions";
import { listSources } from "@/lib/db/sources";
import { listFactors } from "@/lib/db/factors";
import { BatchPreview } from "@/components/entries/batch-preview";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function NewEntriesPage() {
  const user = await getCurrentUser();
  const [sources, factors] = await Promise.all([listSources(), listFactors()]);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/entries"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          Faktury i wpisy
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Dodaj faktury</h2>
        <p className="text-muted-foreground">
          Wrzuć jeden lub więcej plików XML z KSeF — system odczyta dane i wypełni
          formularz dla każdej faktury.
        </p>
      </div>

      {sources.length === 0 ? (
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
        />
      )}
    </div>
  );
}
