"use client";

import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Akcje strony (np. „Dodaj wskaźnik") renderowane w górnym pasku.
 * Strona deklaruje je u siebie przez <TopbarActions>, a portal przenosi je
 * do slotu w `Topbar` — dzięki temu strony serwerowe nie muszą znać layoutu.
 */
const SlotContext = createContext<{
  target: HTMLElement | null;
  setTarget: (el: HTMLElement | null) => void;
} | null>(null);

export function TopbarActionsProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  return <SlotContext.Provider value={{ target, setTarget }}>{children}</SlotContext.Provider>;
}

export function TopbarActionsSlot() {
  const ctx = useContext(SlotContext);
  return <div ref={ctx?.setTarget} className="flex shrink-0 items-center gap-2 empty:hidden" />;
}

export function TopbarActions({ children }: { children: React.ReactNode }) {
  const target = useContext(SlotContext)?.target;
  return target ? createPortal(children, target) : null;
}
