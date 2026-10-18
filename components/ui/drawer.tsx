"use client";

import { Dialog, useNativeDialog } from "./dialog";

export { Dialog as Drawer };

export function DrawerContent({ label, children }: { label: string; children: React.ReactNode }) {
  const { ref, onClick, onClose } = useNativeDialog();
  return (
    <dialog
      ref={ref}
      onClick={onClick}
      onClose={onClose}
      aria-label={label}
      data-side="left"
      className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] bg-transparent p-0"
    >
      {children}
    </dialog>
  );
}
