"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { breadcrumbFor } from "./nav";

interface TopbarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
}

const today = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function Topbar({ collapsed, onToggleSidebar, onOpenMobile }: TopbarProps) {
  const crumbs = breadcrumbFor(usePathname());

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 lg:hidden"
        onClick={onOpenMobile}
        aria-label="Otwórz nawigację"
      >
        <Menu />
      </Button>

      <Tooltip
        side="bottom"
        className="hidden lg:flex"
        content={
          <>
            {collapsed ? "Rozwiń panel" : "Zwiń panel"}
            <kbd className="rounded border border-white/25 px-1 font-mono text-[0.625rem] leading-4 text-white/70">
              [
            </kbd>
          </>
        }
      >
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Rozwiń panel boczny" : "Zwiń panel boczny"}
          aria-expanded={!collapsed}
        >
          <PanelLeft strokeWidth={1.6} />
        </Button>
      </Tooltip>

      <nav aria-label="Okruszki" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-[0.9375rem] font-light">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={c}>
                {i > 0 && (
                  <li aria-hidden="true" className="text-muted-foreground/60">
                    /
                  </li>
                )}
                <li
                  className={last ? "truncate text-strong" : "truncate text-muted-foreground"}
                  aria-current={last ? "page" : undefined}
                >
                  {c.toLowerCase()}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      {/* Data renderowana po stronie klienta może różnić się od serwerowej o północy. */}
      <time suppressHydrationWarning className="hidden text-xs text-muted-foreground sm:block">
        {today.format(new Date())}
      </time>
    </header>
  );
}
