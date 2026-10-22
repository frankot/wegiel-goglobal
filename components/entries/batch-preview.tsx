"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { InvoiceDropzone } from "./invoice-dropzone";
import { InvoiceCard } from "./invoice-card";
import { BatchResult } from "./batch-result";
import { formatTon } from "@/lib/emissions/format";
import { parseInvoiceBatch, saveInvoiceBatch } from "@/lib/entries/actions";
import { isAttachmentFile } from "@/lib/import/limits";
import {
  batchTotals,
  buildSavePayload,
  emptyLine,
  emptyManualCard,
  isSavable,
  removeCard,
  sortByStatus,
  toCardState,
  type CardState,
  type FactorOption,
  type LineState,
  type SourceOption,
} from "@/lib/entries/batch-state";
import type { SaveBatchResult } from "@/lib/entries/actions";

interface Props {
  sources: SourceOption[];
  factors: FactorOption[];
  canVerify: boolean;
  canManage: boolean;
}

export function BatchPreview({ sources, factors, canVerify, canManage }: Props) {
  const router = useRouter();
  const [cards, setCards] = useState<CardState[]>([]);
  const [filesByCard, setFilesByCard] = useState<Record<string, File>>({});
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<SaveBatchResult | null>(null);
  const [parsing, startParsing] = useTransition();
  const [saving, startSaving] = useTransition();

  const totals = batchTotals(cards, factors);
  const savableCount = cards.filter(isSavable).length;

  function addManualCard(pdf?: File) {
    const card = emptyManualCard(crypto.randomUUID(), pdf?.name);
    setCards((prev) => [...prev, card]);
    if (pdf) setFilesByCard((prev) => ({ ...prev, [card.clientId]: pdf }));
  }

  function handleFiles(all: File[]) {
    setResult(null);
    setParseErrors([]);

    for (const pdf of all.filter((f) => isAttachmentFile(f.name))) addManualCard(pdf);
    const files = all.filter((f) => !isAttachmentFile(f.name));
    if (files.length === 0) return;

    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    startParsing(async () => {
      const res = await parseInvoiceBatch(formData);
      if (!res.ok || !res.invoices) {
        setParseErrors(res.errors ?? ["Nie udało się przetworzyć plików."]);
        return;
      }

      const nextFiles: Record<string, File> = {};
      res.invoices.forEach((inv, i) => {
        const file = files[i];
        if (file) nextFiles[inv.clientId] = file;
      });

      setCards((prev) => sortByStatus([...prev, ...res.invoices!.map(toCardState)]));
      setFilesByCard((prev) => ({ ...prev, ...nextFiles }));
      if (res.errors?.length) setParseErrors(res.errors);
    });
  }

  function patchCard(clientId: string, patch: Partial<CardState>) {
    setCards((prev) =>
      prev.map((c) => (c.clientId === clientId ? { ...c, ...patch } : c)),
    );
  }

  function handleRemove(clientId: string) {
    setCards((prev) => removeCard(prev, clientId));
    setFilesByCard((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  }

  function patchLine(clientId: string, lineNo: number, patch: Partial<LineState>) {
    setCards((prev) =>
      prev.map((c) =>
        c.clientId === clientId
          ? {
              ...c,
              lines: c.lines.map((l) =>
                l.lineNo === lineNo ? { ...l, ...patch } : l,
              ),
            }
          : c,
      ),
    );
  }

  function addLine(clientId: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.clientId === clientId
          ? {
              ...c,
              lines: [
                ...c.lines,
                emptyLine(Math.max(0, ...c.lines.map((l) => l.lineNo)) + 1),
              ],
            }
          : c,
      ),
    );
  }

  function removeLine(clientId: string, lineNo: number) {
    setCards((prev) =>
      prev.map((c) =>
        c.clientId === clientId
          ? {
              ...c,
              lines: c.lines
                .filter((l) => l.lineNo !== lineNo)
                .map((l, i) => ({ ...l, lineNo: i + 1 })),
            }
          : c,
      ),
    );
  }

  function handleSave(status: "DRAFT" | "VERIFIED") {
    const payload = buildSavePayload(cards, status);
    if (payload.invoices.length === 0) return;

    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    for (const invoice of payload.invoices) {
      const file = filesByCard[invoice.clientId];
      if (file) formData.append(`file_${invoice.clientId}`, file);
    }

    startSaving(async () => {
      const res = await saveInvoiceBatch(formData);
      setResult(res);

      const savedIds = new Map(res.saved.map((s) => [s.clientId, s.invoiceId]));
      const failures = new Map(res.failed.map((f) => [f.clientId, f.error]));

      setCards((prev) =>
        prev
          .map((c) => ({
            ...c,
            savedInvoiceId: savedIds.get(c.clientId) ?? c.savedInvoiceId,
            saveError: failures.get(c.clientId),
          }))
          .filter((c) => !savedIds.has(c.clientId)),
      );

      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <InvoiceDropzone onFiles={handleFiles} busy={parsing} />

      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <span>Nie masz pliku XML?</span>
        <Button type="button" variant="outline" size="sm" onClick={() => addManualCard()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Dodaj fakturę ręcznie
        </Button>
      </div>

      {parseErrors.length > 0 && (
        <Card className="border-destructive/40 p-3">
          {parseErrors.map((e, i) => (
            <p key={i} className="text-sm text-destructive">
              {e}
            </p>
          ))}
        </Card>
      )}

      {result && <BatchResult result={result} />}

      {cards.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Faktury do zapisania: {cards.length}{" "}
              {cards.length === 1 ? "faktura" : "faktury"}
            </h3>
            {cards.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCards([]);
                  setFilesByCard({});
                  setResult(null);
                }}
              >
                Wyczyść paczkę
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {cards.map((card) => (
              <InvoiceCard
                key={card.clientId}
                card={card}
                sources={sources}
                factors={factors}
                canManage={canManage}
                onChange={(patch) => patchCard(card.clientId, patch)}
                onLineChange={(lineNo, patch) =>
                  patchLine(card.clientId, lineNo, patch)
                }
                onRemove={() => handleRemove(card.clientId)}
                onAddLine={() => addLine(card.clientId)}
                onRemoveLine={(lineNo) => removeLine(card.clientId, lineNo)}
              />
            ))}
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
            <p className="text-sm">
              Do zapisania: <strong>{totals.invoiceCount}</strong>{" "}
              {totals.invoiceCount === 1 ? "faktura" : "faktury"} · Σ{" "}
              <strong className="tabular-nums">{formatTon(totals.totalTon)} t CO₂e</strong>
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={savableCount === 0 || saving}
                onClick={() => handleSave("DRAFT")}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Zapisz jako szkice
              </Button>
              {canVerify && (
                <Button
                  type="button"
                  disabled={savableCount === 0 || saving}
                  onClick={() => handleSave("VERIFIED")}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Zapisz i zweryfikuj
                </Button>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
