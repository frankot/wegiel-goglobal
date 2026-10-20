"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Menu, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { MANUAL_HREF, pageTitleFor } from "./nav";
import { TopbarActionsSlot } from "./topbar-actions";

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
  const pathname = usePathname();
  const page = pageTitleFor(pathname);
  const onManual = pathname === MANUAL_HREF;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 sm:px-6 lg:px-8">
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

      <div className="flex min-w-0 flex-1 items-baseline gap-2 text-[0.9375rem]">
        {page?.parent && (
          <>
            <Link
              href={page.parent.href}
              className="hidden shrink-0 font-light text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              {page.parent.label}
            </Link>
            <span aria-hidden="true" className="hidden text-muted-foreground/60 sm:inline">
              /
            </span>
          </>
        )}
        {page && (
          <h1 className="truncate font-medium tracking-tight text-strong">
            {page.title}
          </h1>
        )}
      </div>

      <TopbarActionsSlot />

      <Tooltip side="bottom" content="Instrukcja obsługi">
        <Link
          href={MANUAL_HREF}
          aria-label="Instrukcja obsługi"
          aria-current={onManual ? "page" : undefined}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            onManual && "bg-muted text-strong",
          )}
        >
          <CircleHelp strokeWidth={1.6} aria-hidden="true" />
        </Link>
      </Tooltip>

      <time suppressHydrationWarning className="hidden text-xs text-muted-foreground xl:block">
        {today.format(new Date())}
      </time>
    </header>
  );
}
