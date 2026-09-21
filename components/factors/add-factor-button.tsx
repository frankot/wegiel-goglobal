"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FactorFormDialog } from "./factor-form";

export function AddFactorButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Dodaj wskaźnik
      </Button>
      {open && <FactorFormDialog open onOpenChange={setOpen} />}
    </>
  );
}
