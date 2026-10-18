"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { MatchHint } from "./status-badge";
import { SourceFormDialog } from "@/components/sources/source-form";
import { FactorFormDialog } from "@/components/factors/factor-form";
import { inferSourceType } from "@/lib/emissions/match-source";
import { scopeForType } from "@/lib/emissions/source-types";
import { lookupUnit } from "@/lib/emissions/unit-table";
import { formatKg, formatTon, formatFactor } from "@/lib/emissions/format";
import {
  factorsForLine,
  linePreview,
  lineIssue,
  type FactorOption,
  type LineState,
  type SourceOption,
} from "@/lib/entries/batch-state";

interface Props {
  line: LineState;
  sources: SourceOption[];
  factors: FactorOption[];
  canManage: boolean;
  invoice: { supplierNip: string; periodStart: string; periodEnd: string };
  manual?: boolean;
  onChange: (patch: Partial<LineState>) => void;
  onRemove?: () => void;
}

function RevertButton({
  changed,
  onRevert,
  label,
}: {
  changed: boolean;
  onRevert: () => void;
  label: string;
}) {
  if (!changed) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={onRevert}
      title={label}
      aria-label={label}
    >
      <RotateCcw className="h-3 w-3" />
    </Button>
  );
}

function CreateToggle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-5 gap-0.5 px-1.5 text-[0.6875rem] font-medium"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Plus className="size-3" aria-hidden="true" />
      nowe
    </Button>
  );
}

export function EntryLineRow({
  line,
  sources,
  factors,
  canManage,
  invoice,
  manual = false,
  onChange,
  onRemove,
}: Props) {
  const [creating, setCreating] = useState<"source" | "factor" | null>(null);
  const source = sources.find((s) => s.id === line.sourceId);
  const available = factorsForLine(line, factors, source);
  const preview = linePreview(line, factors);
  const issue = lineIssue(line);

  const inferredType = inferSourceType(line.description) ?? undefined;
  const lineUnit = lookupUnit(line.unit)?.canonical;
  const year = (invoice.periodEnd || invoice.periodStart).slice(0, 4);

  const sourceItems = sources.map((s) => ({ value: s.id, label: s.name }));
  const factorItems = available.map((f) => ({
    value: f.id,
    label: `${f.name} — ${formatFactor(f.value)} ${f.unit}`,
  }));

  if (!line.emissionRelevant && !line.include) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-muted-foreground">
              {line.lineNo}. {line.description}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({line.quantity} {line.unit})
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ include: true })}
          >
            Użyj mimo to
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pominięto: {line.skipReason}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {manual ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-sm font-medium">{line.lineNo}.</span>
            <Input
              value={line.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Opis pozycji, np. Energia elektryczna czynna"
              aria-label={`Opis pozycji ${line.lineNo}`}
              className="flex-1"
            />
          </div>
        ) : (
          <p className="text-sm font-medium">
            {line.lineNo}. {line.description}
          </p>
        )}
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onRemove}
            title="Usuń pozycję"
            aria-label={`Usuń pozycję ${line.lineNo}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {!line.emissionRelevant && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ include: false })}
          >
            Pomiń
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Source */}
        <div className="space-y-1">
          <div className="flex h-5 items-center justify-between gap-2">
            <Label className="text-xs">Źródło emisji</Label>
            {canManage && (
              <CreateToggle label="Dodaj nowe źródło emisji" onClick={() => setCreating("source")} />
            )}
          </div>
          <Select
            items={sourceItems}
            value={line.sourceId ?? ""}
            onValueChange={(value) => {
              const next = sources.find((s) => s.id === value);
              onChange({
                sourceId: value as string,
                factorId: next?.defaultFactorId ?? line.factorId,
                ...(manual && next
                  ? {
                      unit: next.unit,
                      description: line.description.trim() ? line.description : next.name,
                    }
                  : {}),
              });
            }}
            className="w-full"
            aria-label="Źródło emisji"
            placeholder="Wybierz źródło…"
          />
          {!manual && (
            <MatchHint confidence={line.matchConfidence} reason={line.matchReason} />
          )}

          {/* Remember PPE */}
          {line.unknownPpe && line.sourceId && (
            <label className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={line.rememberPpe}
                onCheckedChange={(checked) =>
                  onChange({ rememberPpe: checked })
                }
              />
              <span>
                Zapamiętaj PPE {line.unknownPpe} dla tego źródła — kolejne faktury
                wejdą automatycznie
              </span>
            </label>
          )}
        </div>

        {/* Factor */}
        <div className="space-y-1">
          <div className="flex h-5 items-center justify-between gap-2">
            <Label className="text-xs">Wskaźnik emisji</Label>
            {canManage && (
              <CreateToggle label="Dodaj nowy wskaźnik emisji" onClick={() => setCreating("factor")} />
            )}
          </div>
          <Select
            items={factorItems}
            value={line.factorId ?? ""}
            onValueChange={(value) => onChange({ factorId: value as string })}
            className="w-full"
            aria-label="Wskaźnik emisji"
            placeholder="Wybierz wskaźnik…"
          />
          {line.factorMessage && (
            <p className="text-xs text-destructive">{line.factorMessage}</p>
          )}
          {line.factorId &&
            (() => {
              const f = factors.find((x) => x.id === line.factorId);
              if (!f) return null;
              return (
                <p className="text-xs text-muted-foreground">
                  wersja ważna {f.validFrom.slice(0, 10)} – {f.validTo.slice(0, 10)}
                </p>
              );
            })()}
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`qty-${line.lineNo}`}>
            Ilość
          </Label>
          <div className="flex items-center gap-1">
            <Input
              id={`qty-${line.lineNo}`}
              value={line.quantity}
              inputMode="decimal"
              onChange={(e) => onChange({ quantity: e.target.value })}
              className="flex-1"
            />
            <Input
              value={line.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              className="w-20"
              aria-label="Jednostka"
              placeholder="kWh"
            />
            <RevertButton
              changed={
                !manual &&
                (line.quantity !== line.original.quantity ||
                  line.unit !== line.original.unit)
              }
              onRevert={() =>
                onChange({
                  quantity: line.original.quantity,
                  unit: line.original.unit,
                })
              }
              label="Przywróć wartość z faktury"
            />
          </div>
        </div>

        {/* Result */}
        <div className="space-y-1">
          <Label className="text-xs">Wyliczona emisja</Label>
          {preview ? (
            <p className="text-sm font-medium tabular-nums">
              {formatKg(preview.co2eKg)} kg ={" "}
              <span className="text-primary">{formatTon(preview.co2eTon)} t CO₂e</span>
              {preview.unit !== line.unit && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({line.quantity} {line.unit} → {preview.quantity} {preview.unit})
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {issue && <p className="text-xs text-destructive">{issue}</p>}

      {creating === "source" && (
        <SourceFormDialog
          factors={factors}
          open
          onOpenChange={(open) => !open && setCreating(null)}
          defaults={{
            type: inferredType,
            unit: line.unit,
            ppeNumber: line.unknownPpe,
            supplierNip: invoice.supplierNip || undefined,
          }}
          onCreated={({ id, defaultFactorId }) =>
            onChange({
              sourceId: id,
              factorId: defaultFactorId || line.factorId,
              rememberPpe: false,
            })
          }
        />
      )}

      {creating === "factor" && (
        <FactorFormDialog
          open
          onOpenChange={(open) => !open && setCreating(null)}
          defaults={{
            unit: lineUnit ? `kg CO₂e/${lineUnit}` : undefined,
            scope: source?.scope ?? (inferredType && scopeForType(inferredType)),
            validFrom: /^\d{4}$/.test(year) ? `${year}-01-01` : undefined,
            validTo: /^\d{4}$/.test(year) ? `${year}-12-31` : undefined,
          }}
          onCreated={(id) => onChange({ factorId: id })}
        />
      )}
    </div>
  );
}
