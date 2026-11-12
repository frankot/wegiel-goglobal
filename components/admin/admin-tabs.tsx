"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Użytkownicy" },
  { href: "/admin/audit", label: "Dziennik zdarzeń" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sekcje administracji" className="flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary font-medium text-strong"
                : "border-transparent text-muted-foreground hover:text-strong",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
