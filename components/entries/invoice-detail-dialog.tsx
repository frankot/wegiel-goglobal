"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EntryStatusBadge } from "./status-badge";
import { getInvoiceDetailAction } from "@/lib/entries/actions";
import {
  formatDate,
  formatFactor,
  formatKg,
  formatPeriod,
  formatQuantity,
  formatTon,
} from "@/lib/emissions/format";
import type { InvoiceDetail } from "@/lib/db/invoices";

interface Props {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-strong">{children || "—"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function InvoiceDetailDialog({ invoiceId, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<InvoiceDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getInvoiceDetailAction(invoiceId).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [invoiceId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide" className="max-h-[85vh] overflow-y-auto">
        {detail === undefined ? (
          <p className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Wczytywanie faktury…
          </p>
        ) : detail === null ? (
          <p className="py-6 text-muted-foreground">Faktura nie istnieje.</p>
        ) : (
          <Detail detail={detail} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ detail: d }: { detail: InvoiceDetail }) {
  const doc = d.document;
  const pdfs = d.attachments.filter((a) => a.kind === "EVIDENCE_PDF");

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {d.invoiceNumber ?? "Faktura bez numeru"}
          <Badge variant="outline">{d.sourceFormat === "KSEF_XML" ? "KSeF XML" : "Ręczna"}</Badge>
        </DialogTitle>
        <DialogDescription>
          Dodana {formatDate(d.createdAt)}
          {d.uploadedBy && <> przez {d.uploadedBy}</>}
        </DialogDescription>
      </DialogHeader>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Field label="Dostawca">{d.supplierName}</Field>
        <Field label="NIP dostawcy">{d.supplierNip}</Field>
        <Field label="NIP nabywcy">{d.buyerNip}</Field>
        <Field label="Data wystawienia">{formatDate(d.issueDate)}</Field>
        <Field label="Okres rozliczeniowy">{formatPeriod(d.periodStart, d.periodEnd)}</Field>
        <Field label="Numer KSeF">{d.ksefNumber}</Field>
        {doc?.ppeNumber && <Field label="Punkt poboru (PPE)">{doc.ppeNumber}</Field>}
        {doc?.meterNumber && <Field label="Numer licznika">{doc.meterNumber}</Field>}
        {doc?.tariffGroup && <Field label="Grupa taryfowa">{doc.tariffGroup}</Field>}
        {doc?.grossTotal && (
          <Field label="Wartość brutto">
            {formatQuantity(doc.grossTotal)} {doc.currency ?? ""}
          </Field>
        )}
      </dl>

      <Section title="Wpisy emisyjne">
        {d.entries.length === 0 ? (
          <p className="text-muted-foreground">Brak wpisów.</p>
        ) : (
          <div className="space-y-1.5">
            {d.entries.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-3 py-2"
              >
                <span className="font-medium text-strong">{e.sourceName}</span>
                <span className="tabular-nums">
                  {formatQuantity(e.quantity)} {e.unit}
                  {e.originalUnit && e.originalUnit !== e.unit && (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      (z faktury: {formatQuantity(e.originalQuantity!)} {e.originalUnit})
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground" title={e.factorName}>
                  × {formatFactor(e.factorSnapshotValue)} {e.factorSnapshotUnit}
                </span>
                <span className="ml-auto font-medium tabular-nums">
                  {formatKg(e.co2eKg)} kg CO₂e
                </span>
                <EntryStatusBadge status={e.status} />
              </div>
            ))}
            <p className="pt-1 text-right">
              Razem{" "}
              <strong className="tabular-nums">{formatTon(d.totalCo2eTon)} t CO₂e</strong>
            </p>
          </div>
        )}
      </Section>

      <Section title="Pozycje na dokumencie">
        {doc ? (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-normal">#</th>
                    <th className="px-3 py-2 font-normal">Opis</th>
                    <th className="px-3 py-2 text-right font-normal">Ilość</th>
                    <th className="px-3 py-2 text-right font-normal">Netto</th>
                    <th className="px-3 py-2 font-normal">Emisja</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lines.map((l) => (
                    <tr key={l.lineNo} className="border-b last:border-0">
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">{l.lineNo}</td>
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                        {formatQuantity(l.quantity)} {l.unit}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                        {l.netValue ? formatQuantity(l.netValue) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {l.emissionRelevant ? (
                          "liczona"
                        ) : (
                          <span className="text-muted-foreground" title={l.skipReason ?? undefined}>
                            pominięta
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {doc.warnings.map((w) => (
              <p key={w} className="text-xs text-amber-700 dark:text-amber-400">
                {w}
              </p>
            ))}
          </>
        ) : (
          <p className="text-muted-foreground">
            Oryginał dokumentu nie został zapisany — faktura zaimportowana przed
            włączeniem archiwizacji XML albo dodana ręcznie.
          </p>
        )}
      </Section>

      {(doc || pdfs.length > 0) && (
        <Section title="Pliki">
          <div className="flex flex-wrap gap-2">
            {doc && (
              <a
                href={`/api/invoices/${d.id}/xml`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Download aria-hidden="true" />
                {doc.fileName}
              </a>
            )}
            {pdfs.map((a) => (
              <a
                key={a.id}
                href={a.blobUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <FileText aria-hidden="true" />
                {a.fileName}
              </a>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
