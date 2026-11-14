import { SectionTabs } from "@/components/layout/section-tabs";

export function ReportTabs() {
  return (
    <SectionTabs
      label="Sekcje raportów"
      tabs={[
        { href: "/reports", label: "Raport" },
        { href: "/reports/archive", label: "Archiwum" },
      ]}
    />
  );
}
