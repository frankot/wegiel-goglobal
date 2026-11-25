import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { InvoiceTableSkeleton } from "@/components/entries/skeletons";
import { PageHeaderSkeleton, PageSkeleton } from "@/components/ui/skeleton";

export default function EntriesLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <TopbarActions>
        <Link href="/entries/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Dodaj faktury
        </Link>
      </TopbarActions>
      <InvoiceTableSkeleton />
    </PageSkeleton>
  );
}
