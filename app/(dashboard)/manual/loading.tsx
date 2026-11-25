import { Card } from "@/components/ui/card";
import { PageHeaderSkeleton, PageSkeleton, SkeletonText } from "@/components/ui/skeleton";

const CHAPTERS = ["w-32", "w-40", "w-28", "w-36", "w-24", "w-40", "w-32", "w-28"];
const PARAGRAPHS = [
  ["w-full", "w-full", "w-11/12", "w-2/3"],
  ["w-full", "w-10/12", "w-full", "w-1/2"],
  ["w-full", "w-full", "w-3/4"],
];

export default function ManualLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="rounded-sm bg-card p-4">
          <p className="mb-2 text-[0.625rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Spis treści
          </p>
          <div className="space-y-2">
            {CHAPTERS.map((w, i) => (
              <SkeletonText key={i} className={w} />
            ))}
          </div>
        </div>
        <Card className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="max-w-3xl space-y-5">
            <SkeletonText size="xl" className="w-72" />
            {PARAGRAPHS.map((lines, p) => (
              <div key={p}>
                {lines.map((w, i) => (
                  <SkeletonText key={i} className={w} />
                ))}
              </div>
            ))}
            <SkeletonText size="md" className="w-56" />
            {PARAGRAPHS.slice(0, 2).map((lines, p) => (
              <div key={p}>
                {lines.map((w, i) => (
                  <SkeletonText key={i} className={w} />
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageSkeleton>
  );
}
