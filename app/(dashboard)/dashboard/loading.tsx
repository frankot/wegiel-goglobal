import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeaderSkeleton, PageSkeleton } from "@/components/ui/skeleton";
import { DashboardReportSkeleton } from "@/components/reports/report-skeletons";

export default function DashboardLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <DashboardReportSkeleton year={String(new Date().getFullYear())} />
      <div className="flex justify-end">
        <Link href="/reports" className={buttonVariants({ variant: "outline" })}>
          Pełny raport i eksport
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </PageSkeleton>
  );
}
