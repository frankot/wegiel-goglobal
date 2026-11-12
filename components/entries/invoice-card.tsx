"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, RotateCcw, FileX2, AlertTriangle, Plus, Paperclip } from "lucide-react";
import { CardStatusBadge } from "./status-badge";
import { EntryLineRow } from "./entry-line-row";
import { formatTon } from "@/lib/emissions/format";
import {
  cardIssues,
  cardSoftWarnings,
  cardStatus,
  cardTotalKg,
  type CardState,
  type FactorOption,
  type LineState,
  type SourceOption,
} from "@/lib/entries/batch-state";
import { divideByPowerOfTen } from "@/lib/emissions/decimal-lite";

interface Props {
  card: CardState;
  sources: SourceOption[];
  factors: FactorOption[];
  canManage: boolean;
  onChange: (patch: Partial<CardState>) => void;
  onLineChange: (lineNo: number, patch: Partial<LineState>) => void;
  onRemove: () => void;
  onAddLine: () => void;
  onRemoveLine: (lineNo: number) => void;
}

function HeaderField({
  label,
  value,
  original,
  onChange,
  type = "text",
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  original?: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
  placeholder?: string;
}) {
  const changed = original !== undefined && value !== original;
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="flex-1"
        />
        {changed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onChange(original)}
            title="Przywróć wartość z faktury"
            aria-label={`Przywróć ${label} z faktury`}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
      {hint && <p className="text-[0.6875rem] text-amber-700 dark:text-amber-400">{hint}</p>}
    </div>
  );
}

export function InvoiceCard({
  card,
  sources,
  factors,
  canManage,
  onChange,
  onLineChange,
  onRemove,
  onAddLine,
  onRemoveLine,
}: Props) {
  const manual = card.format === "MANUAL";
  const original = manual ? undefined : card.original;
  const status = cardStatus(card);
  const [open, setOpen] = useState(status !== "OK");
  const issues = cardIssues(card);
  const soft = cardSoftWarnings(card);
  const totalKg = cardTotalKg(card, factors);
  const totalTon = divideByPowerOfTen(totalKg, 3) ?? "0";
  const includedCount = card.lines.filter((l) => l.include).length;

  if (card.savedInvoiceId) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
        ✓ Zapisano {card.invoiceNumber || card.fileName}
      </div>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={`rounded-lg border ${
        status === "ERROR"
          ? "border-destructive/40"
          : status === "NEEDS_ATTENTION"
            ? "border-amber-500/40"
            : "border-emerald-500/30"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
          <ChevronRight
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {card.supplierName || (manual ? "Faktura wprowadzana ręcznie" : "(nieznany dostawca)")}{" "}
              <span className="font-normal text-muted-foreground">
                {card.invoiceNumber || card.fileName}
              </span>
            </span>
            <span className="block text-xs text-muted-foreground">
              {includedCount} poz. · {formatTon(totalTon)} t CO₂e
              {card.periodStart && ` · ${card.periodStart} – ${card.periodEnd}`}
            </span>
          </span>
        </CollapsibleTrigger>

        <CardStatusBadge status={status} />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          title="Usuń z paczki"
        >
          <FileX2 className="h-4 w-4" />
          <span className="sr-only">Usuń z paczki</span>
        </Button>
      </div>

      {(issues.length > 0 || card.warnings.length > 0) && (
        <div className="space-y-1 border-t px-3 py-2">
          {issues.map((issue, i) => (
            <p key={`e${i}`} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              {issue}
            </p>
          ))}
          {card.warnings.map((w, i) => (
            <p key={`w${i}`} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              {w}
            </p>
          ))}
          {card.saveError && (
            <p className="text-xs font-medium text-destructive">
              Zapis nie powiódł się: {card.saveError}
            </p>
          )}
        </div>
      )}

      <CollapsibleContent>
        <div className="space-y-4 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeaderField
              label={
                manual ? "Numer faktury *" : card.format === "WAPRO_XLSX" ? "Numer dokumentu" : "Numer faktury"
              }
              value={card.invoiceNumber}
              original={original?.invoiceNumber}
              onChange={(v) => onChange({ invoiceNumber: v })}
            />
            <HeaderField
              label={manual ? "Data wystawienia *" : "Data wystawienia"}
              type="date"
              value={card.issueDate}
              original={original?.issueDate}
              onChange={(v) => onChange({ issueDate: v })}
            />
            <HeaderField
              label="Okres od *"
              type="date"
              value={card.periodStart}
              original={original?.periodStart}
              onChange={(v) => onChange({ periodStart: v })}
            />
            <HeaderField
              label="Okres do *"
              type="date"
              value={card.periodEnd}
              original={original?.periodEnd}
              onChange={(v) => onChange({ periodEnd: v })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <HeaderField
                label="Dostawca"
                value={card.supplierName}
                original={original?.supplierName}
                onChange={(v) => onChange({ supplierName: v })}
              />
            </div>
            <HeaderField
              label="NIP dostawcy"
              value={card.supplierNip}
              original={original?.supplierNip}
              placeholder="0000000000"
              hint={soft.supplierNip}
              onChange={(v) => onChange({ supplierNip: v })}
            />
            <HeaderField
              label="NIP odbiorcy"
              value={card.buyerNip}
              original={original?.buyerNip}
              placeholder="0000000000"
              hint={soft.buyerNip}
              onChange={(v) => onChange({ buyerNip: v })}
            />
            <div className="sm:col-span-2">
              <HeaderField
                label="Numer KSeF"
                value={card.ksefNumber}
                original={original?.ksefNumber}
                hint={soft.ksefNumber}
                onChange={(v) => onChange({ ksefNumber: v })}
              />
            </div>
            {(card.attachmentName || (!manual && card.fileName)) && (
              <p className="flex items-end gap-1.5 pb-2 text-xs text-muted-foreground sm:col-span-2">
                <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{card.attachmentName ?? card.fileName}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            {card.lines.map((line) => (
              <EntryLineRow
                key={line.lineNo}
                line={line}
                sources={sources}
                factors={factors}
                canManage={canManage}
                invoice={card}
                manual={manual}
                onChange={(patch) => onLineChange(line.lineNo, patch)}
                onRemove={
                  manual && card.lines.length > 1
                    ? () => onRemoveLine(line.lineNo)
                    : undefined
                }
              />
            ))}
            {manual && (
              <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Dodaj pozycję
              </Button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
