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
import { ArrowRight } from "lucide-react";
import { createFactorVersion } from "@/lib/factors/actions";
import { formatFactor, formatDate } from "@/lib/emissions/format";
import type { FactorDTO } from "@/lib/db/factors";

interface Props {
  factor: FactorDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Coroczna aktualizacja KOBIZE. Pyta tylko o nową wartość i datę startu —
 * resztę (nazwa, kategoria, jednostka, zakres) dziedziczy, a poprzednią
 * wersję domyka sama. Dwie minuty raz na rok.
 */
export function FactorVersionDialog({ factor, open, onOpenChange }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [saving, startSaving] = useTransition();

  const nextYear = new Date(factor.validTo).getFullYear() + 1;
  const suggestedFrom = `${nextYear}-01-01`;
  const suggestedTo = `${nextYear}-12-31`;

  function onSubmit(formData: FormData) {
    setErrors([]);
    startSaving(async () => {
      const res = await createFactorVersion(formData);
      if (!res.ok) {
        setErrors(res.errors ?? ["Nie udało się dodać wersji."]);
        return;
      }
      router.refresh();
      onOpenChange(false);
    });
  }

  const effectiveFrom = validFrom || suggestedFrom;
  const previousEnd = new Date(new Date(effectiveFrom).getTime() - 86400000);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowa wersja wskaźnika</DialogTitle>
          <DialogDescription>{factor.name}</DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="parentId" value={factor.id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="value">Nowa wartość [{factor.unit}]</Label>
              <Input
                id="value"
                name="value"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={factor.value}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="validFrom">Obowiązuje od</Label>
              <Input
                id="validFrom"
                name="validFrom"
                type="date"
                value={validFrom || suggestedFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="validTo">Obowiązuje do</Label>
            <Input
              id="validTo"
              name="validTo"
              type="date"
              defaultValue={suggestedTo}
              required
            />
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="tabular-nums">{formatFactor(factor.value)}</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
              <span className="font-medium tabular-nums">
                {value ? formatFactor(value.replace(",", ".")) : "…"}
              </span>
              <span className="text-muted-foreground">{factor.unit}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Poprzednia wersja zostanie domknięta na {formatDate(previousEnd)}.
              Wpisy z wcześniejszych okresów zachowają dotychczasową wartość.
            </p>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              Dodaj wersję
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
