import Link from "next/link";
import { getCurrentUser } from "@/lib/db/users";
import { loadManual } from "@/lib/manual/load";
import { ManualView } from "@/components/manual/manual-view";
import { TECHNICAL_DOCS_HREF } from "@/components/layout/nav";

export default async function ManualPage() {
  const user = await getCurrentUser();
  const chapters = await loadManual();

  return (
    <ManualView
      chapters={chapters}
      description={
        <>
          Jak korzystać z systemu krok po kroku — od pierwszego logowania po eksport raportu.
          {user.role === "ADMIN" && (
            <>
              {" "}
              <Link href={TECHNICAL_DOCS_HREF} className="text-primary underline-offset-4 hover:underline">
                Dokumentacja techniczna
              </Link>
            </>
          )}
        </>
      }
    />
  );
}
