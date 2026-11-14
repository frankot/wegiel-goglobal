import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/db/users";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryCard, MonthlyCard, ReportKpis } from "@/components/reports/report-view";
import { parseReportParams } from "@/lib/reports/params";
import { getReport } from "@/lib/reports/query";
import { getReminders } from "@/lib/reminders/query";
import { TopSourcesCard } from "@/components/reports/top-sources";
import { canManage } from "@/lib/auth/permissions";
import { RemindersCard } from "@/components/reminders/reminder-panel";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const params = parseReportParams({ preset: "currentYear" });
  const [data, reminders] = await Promise.all([getReport(params), getReminders()]);
  const year = params.from.slice(0, 4);

  return (
    <div className="space-y-4">
      <PageHeader
        description={`Witaj, ${user.name || user.email}. Emisje CO₂e w ${year} r. (od początku roku, wpisy zweryfikowane) — Zakres 1 i 2.`}
      />

      <RemindersCard reminders={reminders} canManage={canManage(user)} />

      <ReportKpis data={data} />

      {data.entryCount === 0 ? (
        <Card className="px-5">
          <p className="text-sm text-muted-foreground">
            W tym roku nie ma jeszcze zweryfikowanych wpisów.{" "}
            <Link href="/entries/new" className="text-primary underline-offset-4 hover:underline">
              Dodaj faktury
            </Link>{" "}
            albo zweryfikuj szkice na liście faktur.
          </p>
        </Card>
      ) : (
        <>
          <MonthlyCard data={data} title={`Emisja miesięczna ${year}`} />
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryCard data={data} />
            <TopSourcesCard
              data={data}
              limit={5}
              title="Top 5 źródeł emisji"
              footerLink={{ href: "/reports", label: "Pełny ranking i rekomendacje" }}
            />
          </div>
        </>
      )}

      {data.quality.excludedDrafts > 0 && (
        <p className="text-xs text-muted-foreground">
          {data.quality.excludedDrafts} wpisów czeka na weryfikację i nie jest ujętych w podsumowaniu.
        </p>
      )}

      <div className="flex justify-end">
        <Link href="/reports" className={buttonVariants({ variant: "outline" })}>
          Pełny raport i eksport
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
