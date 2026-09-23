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
import { createSource, updateSource } from "@/lib/sources/actions";
import {
  SOURCE_TYPE_HINTS,
  SOURCE_TYPE_LABELS,
  UNITS_BY_TYPE,
  isUnitCompatibleWithFactor,
  scopeForType,
  supportsGridIdentifiers,
  type SourceType,
} from "@/lib/emissions/source-types";
import { formatFactor } from "@/lib/emissions/format";
import type { SourceRow } from "@/lib/db/sources";
import type { FactorDTO } from "@/lib/db/factors";

interface Props {
  source?: SourceRow;
  factors: FactorDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_ITEMS = (Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((t) => ({
  value: t,
  label: SOURCE_TYPE_LABELS[t],
}));

export function SourceFormDialog({ source, factors, open, onOpenChange }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, startSaving] = useTransition();

  const [type, setType] = useState<SourceType>(source?.type ?? "ELECTRICITY");
  const [unit, setUnit] = useState(source?.unit ?? "kWh");
  const [factorId, setFactorId] = useState(source?.defaultFactorId ?? "");

  const scope = scopeForType(type);
  const showGridIds = supportsGridIdentifiers(type);

  // Pokazujemy tylko wskaźniki, które faktycznie da się użyć z tym typem
  // i jednostką — zamiast pozwolić wybrać i odrzucić dopiero przy zapisie.
  const usableFactors = factors.filter(
    (f) =>
      f.scope === scope &&
      isUnitCompatibleWithFactor(unit, f.unit) &&
      new Date(f.validTo) >= new Date(),
  );
  const factorItems = usableFactors.map((f) => ({
    value: f.id,
    label: `${f.name} — ${formatFactor(f.value)} ${f.unit}`,
  }));

  const unitItems = UNITS_BY_TYPE[type].map((u) => ({ value: u, label: u }));

  function onSubmit(formData: FormData) {
    setErrors([]);
    startSaving(async () => {
      const res = source
        ? await updateSource(source.id, formData)
        : await createSource(formData);
      if (!res.ok) {
        setErrors(res.errors ?? ["Nie udało się zapisać źródła."]);
        return;
      }
      router.refresh();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {source ? "Edytuj źródło emisji" : "Dodaj źródło emisji"}
          </DialogTitle>
          <DialogDescription>
            Licznik, instalacja lub pojazd, którego zużycie rejestrujesz.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Nazwa</Label>
            <Input
              id="name"
              name="name"
              defaultValue={source?.name}
              placeholder="np. Licznik główny — hala A"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Typ źródła</Label>
              <Select
                name="type"
                items={TYPE_ITEMS}
                value={type}
                onValueChange={(v) => {
                  const next = v as SourceType;
                  setType(next);
                  setUnit(UNITS_BY_TYPE[next][0]!);
                  setFactorId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ITEMS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {SOURCE_TYPE_HINTS[type]}
              </p>
            </div>

            <div className="space-y-1">
              <Label>Zakres</Label>
              <div className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm">
                {scope === "SCOPE_1" ? "Zakres 1" : "Zakres 2"}
              </div>
              <p className="text-xs text-muted-foreground">
                wynika z typu źródła (GHG Protocol)
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Jednostka zużycia</Label>
              <Select
                name="unit"
                items={unitItems}
                value={unit}
                onValueChange={(v) => {
                  setUnit(v as string);
                  setFactorId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitItems.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Domyślny wskaźnik</Label>
              <Select
                name="defaultFactorId"
                items={factorItems}
                value={factorId}
                onValueChange={(v) => setFactorId(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz wskaźnik…" />
                </SelectTrigger>
                <SelectContent>
                  {factorItems.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {usableFactors.length === 0 && (
                <p className="text-xs text-destructive">
                  Brak aktywnego wskaźnika dla {scope === "SCOPE_1" ? "Zakresu 1" : "Zakresu 2"}{" "}
                  w jednostce {unit}. Dodaj go w zakładce Współczynniki.
                </p>
              )}
            </div>
          </div>

          {showGridIds ? (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Identyfikatory z faktury — po ich uzupełnieniu kolejne faktury
                tego dostawcy przypiszą się do tego źródła automatycznie.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="ppeNumber">Numer PPE</Label>
                  <Input
                    id="ppeNumber"
                    name="ppeNumber"
                    defaultValue={source?.ppeNumber ?? ""}
                    placeholder="590543550100711505"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meterNumber">Numer licznika</Label>
                  <Input
                    id="meterNumber"
                    name="meterNumber"
                    defaultValue={source?.meterNumber ?? ""}
                    placeholder="50436458"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supplierNip">NIP dostawcy</Label>
                  <Input
                    id="supplierNip"
                    name="supplierNip"
                    defaultValue={source?.supplierNip ?? ""}
                    placeholder="9730421440"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="registrationNumber">
                Numer rejestracyjny / identyfikator
              </Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={source?.registrationNumber ?? ""}
                placeholder="np. WZ 12345"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="location">Lokalizacja</Label>
            <Input
              id="location"
              name="location"
              defaultValue={source?.location ?? ""}
              placeholder="np. Boya-Żeleńskiego 11, Rzeszów"
            />
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
            <Button type="submit" disabled={saving || usableFactors.length === 0}>
              {source ? "Zapisz zmiany" : "Dodaj źródło"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
