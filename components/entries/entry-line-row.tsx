"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RotateCcw } from "lucide-react";
import { MatchHint } from "./status-badge";
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
  onChange: (patch: Partial<LineState>) => void;
}

/** Przycisk ↺ — przywraca wartość z dokumentu. Widoczny tylko gdy zmieniono. */
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

export function EntryLineRow({ line, sources, factors, onChange }: Props) {
  const source = sources.find((s) => s.id === line.sourceId);
  const available = factorsForLine(line, factors, source);
  const preview = linePreview(line, factors);
  const issue = lineIssue(line);

  const sourceItems = sources.map((s) => ({ value: s.id, label: s.name }));
  const factorItems = available.map((f) => ({
    value: f.id,
    label: `${f.name} — ${formatFactor(f.value)} ${f.unit}`,
  }));

  // Pozycja nieemisyjna — pokazana, ale nie licząca się. Nigdy nie znika.
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
        <p className="text-sm font-medium">
          {line.lineNo}. {line.description}
        </p>
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
        {/* Źródło emisji */}
        <div className="space-y-1">
          <Label className="text-xs">Źródło emisji</Label>
          <Select
            items={sourceItems}
            value={line.sourceId ?? ""}
            onValueChange={(value) => {
              const next = sources.find((s) => s.id === value);
              onChange({
                sourceId: value as string,
                // zmiana źródła podmienia wskaźnik na domyślny dla tego źródła
                factorId: next?.defaultFactorId ?? line.factorId,
              });
            }}
            className="w-full"
            aria-label="Źródło emisji"
            placeholder="Wybierz źródło…"
          />
          <MatchHint confidence={line.matchConfidence} reason={line.matchReason} />

          {/* Oferta zapamiętania PPE — mechanizm samouczenia (§5.4) */}
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

        {/* Wskaźnik */}
        <div className="space-y-1">
          <Label className="text-xs">Wskaźnik emisji</Label>
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

        {/* Ilość */}
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
            />
            <RevertButton
              changed={
                line.quantity !== line.original.quantity ||
                line.unit !== line.original.unit
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

        {/* Wynik */}
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
    </div>
  );
}
