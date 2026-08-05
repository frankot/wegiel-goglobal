import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Factory,
  Scale,
  FileText,
  BarChart3,
  Settings,
  Leaf,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/lib/auth/actions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["MANAGER", "EMPLOYEE"],
  },
  {
    href: "/sources",
    label: "Źródła emisji",
    icon: Factory,
    roles: ["MANAGER", "EMPLOYEE"],
  },
  {
    href: "/factors",
    label: "Współczynniki",
    icon: Scale,
    roles: ["MANAGER", "EMPLOYEE"],
  },
  {
    href: "/entries",
    label: "Faktury i wpisy",
    icon: FileText,
    roles: ["MANAGER", "EMPLOYEE"],
  },
  {
    href: "/reports",
    label: "Raporty",
    icon: BarChart3,
    roles: ["MANAGER", "EMPLOYEE"],
  },
  {
    href: "/admin",
    label: "Administracja",
    icon: Settings,
    roles: ["MANAGER"],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userName: string;
  userEmail: string;
  userRole: string;
}

export function Sidebar({
  collapsed,
  onToggle,
  userName,
  userEmail,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-3">
        <Leaf className="h-5 w-5 shrink-0 text-primary" />
        {!collapsed && (
          <span className="font-semibold text-sm">Ślad węglowy</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto h-7 w-7", collapsed && "mx-auto ml-0 rotate-180")}
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.filter((item) => item.roles.includes(userRole)).map(
          (item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const linkClasses = cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger
                    className={linkClasses}
                    onClick={() => router.push(item.href)}
                    aria-label={item.label}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={linkClasses}>
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          },
        )}
      </nav>

      <Separator />

      {/* User info + logout */}
      <div className="p-2">
        <form action={logout}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            type="submit"
            title="Wyloguj się"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Wyloguj się</span>}
          </Button>
        </form>
        {!collapsed && (
          <div className="mt-2 px-3 pb-2">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {userRole === "MANAGER" ? "Manager" : "Pracownik"}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
