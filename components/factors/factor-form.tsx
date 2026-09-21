"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFactor, updateFactor, recalculateDrafts } from "@/lib/factors/actions";
import type { FactorDTO } from "@/lib/db/factors";

interface Props {
  factor?: FactorDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const dateOnly = (iso: string) => iso.slice(0, 10);

/** Base UI: bez `items` <SelectValue> pokazałby surowe „GHG_PROTOCOL"/„SCOPE_1". */
const SOURCE_ITEMS = [
  { value: "KOBIZE", label: "KOBIZE" },
  { value: "GHG_PROTOCOL", label: "GHG Protocol" },
  { value: "CUSTOM", label: "Własny" },
] as const;

const SCOPE_ITEMS = [
  { value: "SCOPE_1", label: "Zakres 1" },
  { value: "SCOPE_2", label: "Zakres 2" },
] as const;

export function FactorFormDialog({ factor, open, onOpenChange }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [pendingRecalc, setPendingRecalc] = useState<number | null>(null);
  const [saving, startSaving] = useTransition();

  function onSubmit(formData: FormData) {
    setErrors([]);
    startSaving(async () => {
      const res = factor
        ? await updateFactor(factor.id, formData)
        : await createFactor(formData);

      if (!res.ok) {
        setErrors(res.errors ?? ["Nie udało się zapisać wskaźnika."]);
        return;
      }

      // Zapisane wpisy zostają nietknięte; pytamy tylko o szkice (D10).
      if (res.affectedDrafts && res.affectedDrafts > 0) {
        setPendingRecalc(res.affectedDrafts);
        return;
      }

      router.refresh();
      onOpenChange(false);
    });
  }

  if (pendingRecalc !== null && factor) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przeliczyć wpisy robocze?</DialogTitle>
            <DialogDescription>
              Zmieniono wartość wskaźnika. <strong>{pendingRecalc}</strong>{" "}
              {pendingRecalc === 1 ? "wpis roboczy korzysta" : "wpisów roboczych korzysta"}{" "}
              z tej wersji.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Wpisy zweryfikowane i skorygowane nie zostaną zmienione — ich snapshot
            wskaźnika jest gwarancją odtwarzalności raportów.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingRecalc(null);
                router.refresh();
                onOpenChange(false);
              }}
            >
              Zostaw bez zmian
            </Button>
            <Button
              onClick={() =>
                startSaving(async () => {
                  await recalculateDrafts(factor.id);
                  setPendingRecalc(null);
                  router.refresh();
                  onOpenChange(false);
                })
              }
              disabled={saving}
            >
              Przelicz szkice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {factor ? "Edytuj wskaźnik" : "Dodaj wskaźnik"}
          </DialogTitle>
          <DialogDescription>
            Wartość i okres obowiązywania. Zmiana nie dotyka wpisów już zapisanych.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Nazwa</Label>
            <Input id="name" name="name" defaultValue={factor?.name} required />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="category">Kategoria</Label>
              <Input
                id="category"
                name="category"
                defaultValue={factor?.category}
                placeholder="np. Energia elektryczna"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit">Jednostka</Label>
              <Input
                id="unit"
                name="unit"
                defaultValue={factor?.unit}
                placeholder="kg CO₂e/kWh"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="value">Wartość</Label>
              <Input
                id="value"
                name="value"
                inputMode="decimal"
                defaultValue={factor?.value}
                placeholder="0,553"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Źródło</Label>
              <Select
                name="source"
                items={SOURCE_ITEMS}
                defaultValue={factor?.source ?? "KOBIZE"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_ITEMS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Zakres</Label>
              <Select
                name="scope"
                items={SCOPE_ITEMS}
                defaultValue={factor?.scope ?? "SCOPE_2"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_ITEMS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="validFrom">Ważny od</Label>
              <Input
                id="validFrom"
                name="validFrom"
                type="date"
                defaultValue={factor ? dateOnly(factor.validFrom) : ""}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="validTo">Ważny do</Label>
              <Input
                id="validTo"
                name="validTo"
                type="date"
                defaultValue={factor ? dateOnly(factor.validTo) : ""}
                required
              />
            </div>
          </div>

          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-sm text-destructive">
                  {e}
                </p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {factor ? "Zapisz zmiany" : "Dodaj wskaźnik"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
