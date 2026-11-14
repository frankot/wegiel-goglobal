import { SectionTabs } from "@/components/layout/section-tabs";

export function AdminTabs() {
  return (
    <SectionTabs
      label="Sekcje administracji"
      tabs={[
        { href: "/admin", label: "Użytkownicy" },
        { href: "/admin/audit", label: "Dziennik zdarzeń" },
      ]}
    />
  );
}
