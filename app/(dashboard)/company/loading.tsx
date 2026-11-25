import { CompanySkeleton } from "@/components/company/skeletons";
import { PageHeaderSkeleton, PageSkeleton } from "@/components/ui/skeleton";

export default function CompanyLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton lines={2} />
      <CompanySkeleton />
    </PageSkeleton>
  );
}
