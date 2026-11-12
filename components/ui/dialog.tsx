"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ctx {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const DialogContext = createContext<Ctx>({ open: false, onOpenChange: () => {} });

export function Dialog({
  open,
  onOpenChange,
  children,
}: Ctx & { children: React.ReactNode }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

export function useNativeDialog() {
  const { open, onOpenChange } = useContext(DialogContext);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return {
    ref,
    open,
    close: () => onOpenChange(false),
    onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) onOpenChange(false);
    },
    onClose: () => onOpenChange(false),
  };
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "default",
}: {
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: "default" | "wide";
}) {
  const { ref, open, close, onClick, onClose } = useNativeDialog();
  return (
    <dialog
      ref={ref}
      onClick={onClick}
      onClose={onClose}
      className={cn(
        "m-auto w-full max-w-[calc(100%-2rem)] bg-transparent p-0 text-left font-normal whitespace-normal text-foreground",
        size === "wide" ? "sm:max-w-3xl" : "sm:max-w-lg",
      )}
    >
      {open && (
        <div className={cn("relative grid gap-5 rounded-sm bg-card p-6 text-sm", className)}>
          {children}
          {showCloseButton && (
            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-4 grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-strong"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Zamknij</span>
            </button>
          )}
        </div>
      )}
    </dialog>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 pr-8", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-normal text-strong", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[0.8125rem] text-muted-foreground", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("-mx-6 -mb-6 flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
