"use client";

import { Fragment, useState } from "react";
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
import { EntryStatusBadge } from "./status-badge";
import { formatTon, formatQuantity, formatDate, formatFactor } from "@/lib/emissions/format";
import type { InvoiceListItem, InvoiceEntryItem } from "@/lib/db/invoices";

interface Props {
  invoices: InvoiceListItem[];
  loadEntries: (invoiceId: string) => Promise<InvoiceEntryItem[]>;
}

export function InvoiceList({ invoices, loadEntries }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, InvoiceEntryItem[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

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

  if (invoices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Brak faktur. Dodaj pierwszą przez &bdquo;Dodaj faktury&rdquo;.
      </p>
    );
  }

  return (
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
                  aria-label={expanded === inv.id ? "Zwiń pozycje" : "Rozwiń pozycje"}
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
                {inv.invoiceNumber ?? "—"}
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
              <TableCell className="text-right tabular-nums">{inv.entryCount}</TableCell>
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
                  {inv.sourceFormat === "KSEF_XML" ? "KSeF XML" : "Ręczna"}
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
                                (z faktury: {formatQuantity(e.originalQuantity!)}{" "}
                                {e.originalUnit})
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            × {formatFactor(e.factorSnapshotValue)} {e.factorSnapshotUnit}
                          </span>
                          <span className="font-medium tabular-nums">
                            = {formatTon(e.co2eTon)} t CO₂e
                          </span>
                          <EntryStatusBadge status={e.status} />
                          <span className="text-xs text-muted-foreground">
                            {e.authorName}
                          </span>
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
  );
}
