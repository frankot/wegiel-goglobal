import { getCurrentUser } from "@/lib/db/users";
import { PageHeader } from "@/components/layout/page-header";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        description={`Witaj, ${user.name || user.email}. Przegląd emisji CO₂e — Scope 1 i 2.`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Całkowite CO₂e (2026)</p>
          <p className="text-2xl font-bold">— t</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Scope 1</p>
          <p className="text-2xl font-bold text-green-600">— t</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Scope 2</p>
          <p className="text-2xl font-bold text-blue-600">— t</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Zmiana YoY</p>
          <p className="text-2xl font-bold">—</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">
          Wykresy i szczegółowe dane zostaną dodane w Fazie 3 (Raporty).
        </p>
      </div>
    </div>
  );
}
