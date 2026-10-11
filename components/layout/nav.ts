import {
  LayoutDashboard,
  Factory,
  Scale,
  FileText,
  BarChart3,
  Settings,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Pełny tytuł strony w górnym pasku — gdy inny niż krótka etykieta w menu. */
  title?: string;
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
      { href: "/factors", label: "Współczynniki", title: "Współczynniki emisji", icon: Scale, roles: ALL },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/company", label: "O firmie", title: "Dane firmy", icon: Building2, roles: ALL },
      { href: "/admin", label: "Administracja", icon: Settings, roles: ["MANAGER"] },
    ],
  },
];

/** Podstrony — tytuł w górnym pasku, nad nim link do sekcji nadrzędnej. */
const SUBPAGES: Record<string, string> = {
  "/entries/new": "Dodaj faktury",
};

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export interface PageTitle {
  title: string;
  parent?: { label: string; href: string };
}

export function pageTitleFor(pathname: string): PageTitle | null {
  const section = NAV_GROUPS.flatMap((g) => g.items).find((i) =>
    isActive(pathname, i.href),
  );
  if (!section) return null;
  const sectionTitle = section.title ?? section.label;
  const sub = SUBPAGES[pathname];
  return sub
    ? { title: sub, parent: { label: sectionTitle, href: section.href } }
    : { title: sectionTitle };
}

export function roleLabel(role: string) {
  return role === "MANAGER" ? "Manager" : "Pracownik";
}

export function initials(name: string) {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
