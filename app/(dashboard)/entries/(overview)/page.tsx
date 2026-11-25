import Link from "next/link";
import { getCurrentUser } from "@/lib/db/users";
import { getInvoiceSummary, invoiceExists, listInvoicePage } from "@/lib/db/invoices";
import { getEntriesForInvoice } from "@/lib/entries/actions";
import { InvoiceList } from "@/components/entries/invoice-list";
import { InvoiceTableSkeleton } from "@/components/entries/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { PageHeaderSkeleton } from "@/components/ui/skeleton";
import { Streamed } from "@/components/ui/streamed";
import { Plus } from "lucide-react";
import { formatTon } from "@/lib/emissions/format";
import { divideByPowerOfTen } from "@/lib/emissions/decimal-lite";
import { plural } from "@/lib/reminders/rules";
import {
  INVOICE_PAGE_SIZE,
  invoiceListHref,
  parseInvoiceSort,
  parsePage,
  type InvoiceSort,
} from "@/lib/entries/invoice-sort";
import { PageHeader } from "@/components/layout/page-header";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { getReminders } from "@/lib/reminders/query";
import { MissingDataBanner } from "@/components/reminders/reminder-panel";

const invoiceLabel = (n: number) => plural(n, "faktura", "faktury", "faktur");

async function Summary() {
  const { count, totalCo2eKg } = await getInvoiceSummary();
  const totalTon = divideByPowerOfTen(totalCo2eKg, 3) ?? "0";
  return (
    <PageHeader
      description={
        count === 0
          ? "Brak zaimportowanych faktur."
          : `${count} ${invoiceLabel(count)} · łącznie ${formatTon(totalTon)} t CO₂e`
      }
    />
  );
}

async function MissingData() {
  return <MissingDataBanner reminders={await getReminders()} />;
}

async function Invoices({ page, sort, openInvoiceId }: { page: number; sort: InvoiceSort | null; openInvoiceId?: string }) {
  const [user, list, open] = await Promise.all([
    getCurrentUser(),
    listInvoicePage(page, sort),
    openInvoiceId ? invoiceExists(openInvoiceId) : false,
  ]);
  return (
    <>
      <Card className="overflow-x-auto p-0">
        <InvoiceList
          invoices={list.items}
          sort={sort}
          loadEntries={getEntriesForInvoice}
          viewer={{ id: user.id, role: user.role }}
          openInvoiceId={open ? openInvoiceId : undefined}
        />
      </Card>
      <Pagination
        page={list.page}
        pageCount={list.pageCount}
        total={list.total}
        pageSize={INVOICE_PAGE_SIZE}
        label={invoiceLabel}
        href={(p) => invoiceListHref({ page: p, sort })}
      />
    </>
  );
}

export default async function EntriesPage({ searchParams }: PageProps<"/entries">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sort = parseInvoiceSort(one(params.sortuj), one(params.kierunek));
  const page = parsePage(one(params.strona));
  const faktura = one(params.faktura);

  return (
    <div className="space-y-4">
      <Streamed fallback={<PageHeaderSkeleton />}>
        <Summary />
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

      <Streamed fallback={<InvoiceTableSkeleton />} className="space-y-4">
        <Invoices page={page} sort={sort} openInvoiceId={faktura} />
      </Streamed>
    </div>
  );
}
