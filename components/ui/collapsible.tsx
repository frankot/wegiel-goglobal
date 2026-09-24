"use client";

import { createContext, useContext, useId } from "react";

interface Ctx {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
}
const CollapsibleContext = createContext<Ctx | null>(null);

function useCollapsible() {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) throw new Error("Collapsible* musi być wewnątrz <Collapsible>");
  return ctx;
}

export function Collapsible({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<"div"> & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const id = useId();
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange, id }}>
      <div data-open={open || undefined} {...props} />
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger(props: React.ComponentProps<"button">) {
  const { open, onOpenChange, id } = useCollapsible();
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => onOpenChange(!open)}
      {...props}
    />
  );
}

export function CollapsibleContent(props: React.ComponentProps<"div">) {
  const { open, id } = useCollapsible();
  return <div id={id} hidden={!open} {...props} />;
}
