import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { loadTechnicalDocs } from "@/lib/manual/load";
import { ManualView } from "@/components/manual/manual-view";

export default async function TechnicalDocsPage() {
  const user = await getCurrentUser();
  if (!canManage(user)) notFound();
  const chapters = await loadTechnicalDocs();

  return (
    <ManualView
      chapters={chapters}
      description="Architektura, baza danych, konfiguracja, wdrożenie, bezpieczeństwo, logika obliczeń i procedury utrzymaniowe. Źródło: docs/technical/ w repozytorium."
    />
  );
}
