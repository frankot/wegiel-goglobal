import { getCurrentUser } from "@/lib/db/users";

export default async function SourcesPage() {
  await getCurrentUser();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Źródła emisji</h2>
      <p className="text-muted-foreground">
        Zarządzanie źródłami emisji — Faza 2.
      </p>
    </div>
  );
}
