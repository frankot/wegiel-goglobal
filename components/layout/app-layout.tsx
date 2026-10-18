"use client";

import { useCallback, useEffect, useState, ViewTransition } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TopbarActionsProvider } from "@/components/layout/topbar-actions";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { SIDEBAR_COOKIE } from "./nav";
import type { SidebarCompany } from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: string;
  company: SidebarCompany | null;
  defaultCollapsed: boolean;
}

export function AppLayout({
  children,
  userName,
  userEmail,
  userRole,
  company,
  defaultCollapsed,
}: AppLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      toggleCollapsed();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const user = { userName, userEmail, userRole, company };

  return (
    <TopbarActionsProvider>
      <div className="flex h-dvh overflow-hidden bg-canvas">
        <ViewTransition name="brand-panel" share="brand-panel" default="none">
          <aside
            className={cn(
              "relative z-20 hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
              collapsed ? "w-[68px]" : "w-64 overflow-hidden",
            )}
          >
            <Sidebar collapsed={collapsed} brandTransition {...user} />
          </aside>
        </ViewTransition>

        <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerContent label="Nawigacja">
            <Sidebar
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              {...user}
            />
          </DrawerContent>
        </Drawer>

        <ViewTransition enter="auth-enter" exit="auth-exit" default="none">
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              collapsed={collapsed}
              onToggleSidebar={toggleCollapsed}
              onOpenMobile={() => setMobileOpen(true)}
            />
            <main className="flex-1 overflow-y-auto">
              <div
                key={pathname}
                className="mx-auto w-full max-w-7xl animate-page-in px-4 pt-6 pb-10 sm:px-6 lg:px-8"
              >
                {children}
              </div>
            </main>
          </div>
        </ViewTransition>
      </div>
    </TopbarActionsProvider>
  );
}
