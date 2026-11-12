import Link from "next/link";
import { getCurrentUser } from "@/lib/db/users";
import { listInvoices } from "@/lib/db/invoices";
import { getEntriesForInvoice } from "@/lib/entries/actions";
import { InvoiceList } from "@/components/entries/invoice-list";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { formatTon } from "@/lib/emissions/format";
import { sumDecimals, divideByPowerOfTen } from "@/lib/emissions/decimal-lite";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";

export default async function EntriesPage({ searchParams }: PageProps<"/entries">) {
  const user = await getCurrentUser();
  const { faktura } = await searchParams;
  const invoices = await listInvoices();

  const totalTon =
    divideByPowerOfTen(sumDecimals(invoices.map((i) => i.totalCo2eKg)), 3) ?? "0";

  return (
    <div className="space-y-4">
      <PageHeader
        description={
          invoices.length === 0
            ? "Brak zaimportowanych faktur."
            : `${invoices.length} faktur · łącznie ${formatTon(totalTon)} t CO₂e`
        }
      />
      <TopbarActions>
        <Link href="/entries/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Dodaj faktury
        </Link>
      </TopbarActions>

      <Card className="overflow-x-auto p-0">
        <InvoiceList
          invoices={invoices}
          loadEntries={getEntriesForInvoice}
          viewer={{ id: user.id, role: user.role }}
          openInvoiceId={typeof faktura === "string" ? faktura : undefined}
        />
      </Card>
    </div>
  );
}
