"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth/actions";
import { Tooltip } from "@/components/ui/tooltip";
import { NAV_GROUPS, initials, isActive, roleLabel } from "./nav";

interface SidebarProps {
  collapsed: boolean;
  userName: string;
  userEmail: string;
  userRole: string;
  onNavigate?: () => void;
}

/** Tooltip tylko w wersji zwiniętej — rozwinięta ma etykiety na wierzchu. */
function MaybeTooltip({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return collapsed ? <Tooltip content={label}>{children}</Tooltip> : children;
}

export function Sidebar({
  collapsed,
  userName,
  userEmail,
  userRole,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const [loggingOut, startLogout] = useTransition();

  return (
    <div className="flex h-full flex-col bg-navy text-navy-foreground">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn("flex h-16 shrink-0 items-center gap-3", collapsed ? "justify-center" : "px-6")}
        aria-label="Ślad węglowy — strona główna"
      >
        {/* Liść z dwóch łuków — znak marki zamiast gotowej ikony. */}
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" aria-hidden="true">
          <path
            d="M4.5 19.5C4.5 11 9.5 4.5 19.5 4.5c0 10-6.5 15-15 15Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M4.5 19.5 14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {!collapsed && (
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[1.0625rem] font-light">carbon <span className="text-green-400">print</span></span>
            <span className="block truncate text-[0.625rem] font-semibold tracking-[0.12em] text-white/45">
              GO GLOBAL GROUP
            </span>
          </span>
        )}
      </Link>

      <nav
        aria-label="Główna nawigacja"
        className={cn("flex-1 pt-3", !collapsed && "overflow-y-auto")}
      >
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter((i) => i.roles.includes(userRole));
          if (items.length === 0) return null;
          return (
            <div key={gi} className={cn(gi > 0 && "mt-4")}>
              {group.label &&
                (collapsed ? (
                  <span aria-hidden="true" className="mx-auto mb-2 block h-px w-5 bg-white/15" />
                ) : (
                  <p className="mb-1 px-6 text-[0.625rem] font-semibold tracking-[0.12em] text-white/40 uppercase">
                    {group.label}
                  </p>
                ))}
              <ul>
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <MaybeTooltip collapsed={collapsed} label={item.label}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative flex h-11 w-full items-center gap-4 text-[0.9375rem] font-light transition-colors duration-150 focus-visible:-outline-offset-2",
                            collapsed ? "justify-center" : "px-6",
                            active
                              ? "bg-navy-deep text-white"
                              : "text-white/80 hover:bg-white/[0.06] hover:text-white",
                          )}
                        >
                          {/* Cienka jasna kreska przy aktywnej pozycji. */}
                          {active && (
                            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-blue" />
                          )}
                          <item.icon aria-hidden="true" strokeWidth={1.4} className="size-5 shrink-0" />
                          <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                        </Link>
                      </MaybeTooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-t border-white/10 py-4",
          collapsed ? "flex-col" : "px-6",
        )}
      >
        <span
          title={`${userName} · ${userEmail}`}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-white/12 text-[0.6875rem] font-bold tracking-wide"
        >
          {initials(userName)}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[0.8125rem]">{userName}</span>
            <span className="block truncate text-[0.6875rem] text-white/50">
              {roleLabel(userRole)}
            </span>
          </span>
        )}
        <Tooltip content="Wyloguj się" side={collapsed ? "right" : "top"}>
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => startLogout(() => logout())}
            aria-label="Wyloguj się"
            className="grid size-8 cursor-pointer place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
