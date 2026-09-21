import Link from "next/link";
import { getCurrentUser } from "@/lib/db/users";
import { listInvoices } from "@/lib/db/invoices";
import { getEntriesForInvoice } from "@/lib/entries/actions";
import { InvoiceList } from "@/components/entries/invoice-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { formatTon } from "@/lib/emissions/format";
import { sumDecimals, divideByPowerOfTen } from "@/lib/emissions/decimal-lite";

export default async function EntriesPage() {
  await getCurrentUser();
  const invoices = await listInvoices();

  const totalTon =
    divideByPowerOfTen(sumDecimals(invoices.map((i) => i.totalCo2eKg)), 3) ?? "0";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Faktury i wpisy</h2>
          <p className="text-muted-foreground">
            {invoices.length === 0
              ? "Brak zaimportowanych faktur."
              : `${invoices.length} faktur · łącznie ${formatTon(totalTon)} t CO₂e`}
          </p>
        </div>
        {/* nativeButton={false}: to nawigacja, więc renderujemy <a>, nie <button>.
            Base UI domyślnie zakłada natywny <button> i bez tego ostrzega. */}
        <Button render={<Link href="/entries/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Dodaj faktury
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <InvoiceList invoices={invoices} loadEntries={getEntriesForInvoice} />
      </Card>
    </div>
  );
}
