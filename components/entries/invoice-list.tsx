"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Paperclip, Loader2 } from "lucide-react";
import { FORMAT_LABELS } from "@/lib/import/types";
import { EntryStatusBadge } from "./status-badge";
import { FORMAT_LABELS } from "@/lib/import/types";
import { InvoiceDetailDialog } from "./invoice-detail-dialog";
import { EntryRowActions, InvoiceActions, type Viewer } from "./entry-actions";
import {
  formatTon,
  formatQuantity,
  formatDate,
  formatFactor,
} from "@/lib/emissions/format";
import type { InvoiceListItem, InvoiceEntryItem } from "@/lib/db/invoices";

interface Props {
  invoices: InvoiceListItem[];
  loadEntries: (invoiceId: string) => Promise<InvoiceEntryItem[]>;
  viewer: Viewer;
}

export function InvoiceList({ invoices, loadEntries, viewer }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, InvoiceEntryItem[]>>(
    {},
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!entries[id]) {
      setLoading(id);
      const rows = await loadEntries(id);
      setEntries((prev) => ({ ...prev, [id]: rows }));
      setLoading(null);
    }
  }

  async function reload(id: string) {
    const rows = await loadEntries(id);
    if (rows.length === 0) removed(id);
    else {
      setEntries((prev) => ({ ...prev, [id]: rows }));
      router.refresh();
    }
  }

  function removed(id: string) {
    setExpanded(null);
    setEntries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    router.refresh();
  }

  if (invoices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Brak faktur. Dodaj pierwszą przez &bdquo;Dodaj faktury&rdquo;.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Numer</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Okres</TableHead>
            <TableHead>Dostawca</TableHead>
            <TableHead className="text-right">Poz.</TableHead>
            <TableHead className="text-right">CO₂e [t]</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Źródło</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <Fragment key={inv.id}>
              <TableRow>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggle(inv.id)}
                    aria-label={
                      expanded === inv.id ? "Zwiń pozycje" : "Rozwiń pozycje"
                    }
                    aria-expanded={expanded === inv.id}
                  >
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        expanded === inv.id ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    onClick={() => setDetailId(inv.id)}
                    className="cursor-pointer text-left text-strong underline-offset-4 hover:text-primary hover:underline"
                  >
                    {inv.invoiceNumber ?? "(bez numeru)"}
                  </button>
                  {inv.attachmentCount > 0 && (
                    <Paperclip
                      className="ml-1 inline h-3 w-3 text-muted-foreground"
                      aria-label={`${inv.attachmentCount} załączników`}
                    />
                  )}
                </TableCell>
                <TableCell>{formatDate(inv.issueDate)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {inv.periodStart
                    ? `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`
                    : "—"}
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {inv.supplierName ?? inv.supplierNip ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {inv.entryCount}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatTon(inv.totalCo2eTon)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {inv.statuses.map((s) => (
                      <EntryStatusBadge key={s} status={s} />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {FORMAT_LABELS[inv.sourceFormat] ?? inv.sourceFormat}
                  </Badge>
                </TableCell>
              </TableRow>

              {expanded === inv.id && (
                <TableRow>
                  <TableCell colSpan={9} className="bg-muted/30">
                    {loading === inv.id ? (
                      <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Wczytywanie pozycji…
                      </p>
                    ) : (
                      <div className="space-y-1 py-1">
                        <InvoiceActions
                          invoiceId={inv.id}
                          invoiceNumber={inv.invoiceNumber}
                          entries={entries[inv.id] ?? []}
                          viewer={viewer}
                          onDone={() => reload(inv.id)}
                          onDeleted={() => removed(inv.id)}
                        />
                        {(entries[inv.id] ?? []).map((e) => (
                          <div
                            key={e.id}
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border bg-background px-3 py-2 text-sm"
                          >
                            <span className="font-medium">{e.sourceName}</span>
                            <span className="tabular-nums">
                              {formatQuantity(e.quantity)} {e.unit}
                              {e.originalUnit && e.originalUnit !== e.unit && (
                                <span className="text-xs text-muted-foreground">
                                  {" "}
                                  (z faktury:{" "}
                                  {formatQuantity(e.originalQuantity!)}{" "}
                                  {e.originalUnit})
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              × {formatFactor(e.factorSnapshotValue)}{" "}
                              {e.factorSnapshotUnit}
                            </span>
                            <span className="font-medium tabular-nums">
                              = {formatTon(e.co2eTon)} t CO₂e
                            </span>
                            <EntryStatusBadge status={e.status} />
                            <span className="text-xs text-muted-foreground">
                              {e.authorName}
                            </span>
                            <EntryRowActions
                              entry={e}
                              viewer={viewer}
                              onlyEntry={(entries[inv.id] ?? []).length === 1}
                              onDone={() => reload(inv.id)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      {detailId && (
        <InvoiceDetailDialog
          key={detailId}
          invoiceId={detailId}
          open
          onOpenChange={(open) => !open && setDetailId(null)}
        />
      )}
    </>
  );
}
