import {
  LayoutDashboard,
  Factory,
  Scale,
  FileText,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const SIDEBAR_COOKIE = "sidebar";

const ALL = ["MANAGER", "EMPLOYEE"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
      { href: "/reports", label: "Raporty", icon: BarChart3, roles: ALL },
    ],
  },
  {
    label: "Ewidencja",
    items: [
      { href: "/entries", label: "Faktury i wpisy", icon: FileText, roles: ALL },
      { href: "/sources", label: "Źródła emisji", icon: Factory, roles: ALL },
      { href: "/factors", label: "Współczynniki", icon: Scale, roles: ALL },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin", label: "Administracja", icon: Settings, roles: ["MANAGER"] },
    ],
  },
];

/** Podstrony, które mają własną nazwę w okruszkach. */
const SUBPAGES: Record<string, string> = {
  "/entries/new": "Dodaj faktury",
};

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function breadcrumbFor(pathname: string): string[] {
  const section = NAV_GROUPS.flatMap((g) => g.items).find((i) =>
    isActive(pathname, i.href),
  );
  if (!section) return [];
  const sub = SUBPAGES[pathname];
  return sub ? [section.label, sub] : [section.label];
}

export function roleLabel(role: string) {
  return role === "MANAGER" ? "Manager" : "Pracownik";
}

export function initials(name: string) {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
