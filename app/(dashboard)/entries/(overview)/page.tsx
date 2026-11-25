import Link from "next/link";
import { getCurrentUser } from "@/lib/db/users";
import { listInvoices, type InvoiceListItem } from "@/lib/db/invoices";
import { getEntriesForInvoice } from "@/lib/entries/actions";
import { InvoiceList } from "@/components/entries/invoice-list";
import { InvoiceTableSkeleton } from "@/components/entries/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeaderSkeleton } from "@/components/ui/skeleton";
import { Streamed } from "@/components/ui/streamed";
import { Plus } from "lucide-react";
import { formatTon } from "@/lib/emissions/format";
import { sumDecimals, divideByPowerOfTen } from "@/lib/emissions/decimal-lite";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { getReminders } from "@/lib/reminders/query";
import { MissingDataBanner } from "@/components/reminders/reminder-panel";

type Invoices = Promise<InvoiceListItem[]>;

async function Summary({ invoices }: { invoices: Invoices }) {
  const list = await invoices;
  const totalTon = divideByPowerOfTen(sumDecimals(list.map((i) => i.totalCo2eKg)), 3) ?? "0";
  return (
    <PageHeader
      description={
        list.length === 0
          ? "Brak zaimportowanych faktur."
          : `${list.length} faktur · łącznie ${formatTon(totalTon)} t CO₂e`
      }
    />
  );
}

async function MissingData() {
  return <MissingDataBanner reminders={await getReminders()} />;
}

async function Invoices({ invoices, openInvoiceId }: { invoices: Invoices; openInvoiceId?: string }) {
  const [user, list] = await Promise.all([getCurrentUser(), invoices]);
  return (
    <Card className="overflow-x-auto p-0">
      <InvoiceList
        invoices={list}
        loadEntries={getEntriesForInvoice}
        viewer={{ id: user.id, role: user.role }}
        openInvoiceId={openInvoiceId}
      />
    </Card>
  );
}

export default async function EntriesPage({ searchParams }: PageProps<"/entries">) {
  const { faktura } = await searchParams;
  const invoices = listInvoices();

  return (
    <div className="space-y-4">
      <Streamed fallback={<PageHeaderSkeleton />}>
        <Summary invoices={invoices} />
      </Streamed>
      <Streamed expand>
        <MissingData />
      </Streamed>
      <TopbarActions>
        <Link href="/entries/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Dodaj faktury
        </Link>
      </TopbarActions>

      <Streamed fallback={<InvoiceTableSkeleton />}>
        <Invoices invoices={invoices} openInvoiceId={typeof faktura === "string" ? faktura : undefined} />
      </Streamed>
    </div>
  );
}
