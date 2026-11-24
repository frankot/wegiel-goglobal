"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Archive, Check, FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveReportToArchive, type ArchiveResult } from "@/lib/reports/archive-actions";
import { cn } from "@/lib/utils";

type Format = "pdf" | "xlsx" | "csv";

const FORMATS: { id: Format; label: string; hint: string; icon: typeof FileDown }[] = [
  { id: "pdf", label: "PDF", hint: "Dokument z wykresami, do druku i wysyłki", icon: FileDown },
  { id: "xlsx", label: "XLSX", hint: "Arkusz Excel z podsumowaniem i wpisami", icon: FileSpreadsheet },
  { id: "csv", label: "CSV", hint: "Prosta tabela do innych programów", icon: FileText },
];

interface Props {
  query: string;
  period: string;
  templateLabel: string;
  defaultTitle: string;
  entryCount: number;
  draftCount: number;
  canArchive: boolean;
}

type Done = { format: Format; archived: boolean };

function download(format: Format, query: string) {
  const a = document.createElement("a");
  a.href = `/api/reports/${format}?${query}`;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function GenerateReportButton({ query, period, templateLabel, defaultTitle, entryCount, draftCount, canArchive }: Props) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("pdf");
  const [archive, setArchive] = useState(false);
  const [result, setResult] = useState<ArchiveResult | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [pending, start] = useTransition();

  const archiveBlocked = !canArchive || entryCount === 0;
  const archiveHint = !canArchive
    ? "Zapis w archiwum jest dostępny tylko dla Analityka."
    : entryCount === 0
      ? "Raport nie zawiera wpisów — nie ma czego archiwizować."
      : "Zapisane zostaną pliki PDF, XLSX i CSV z obecnymi danymi — późniejsze zmiany wpisów ich nie zmienią.";

  function openDialog() {
    setResult(null);
    setDone(null);
    setArchive(false);
    setOpen(true);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    start(async () => {
      if (archive && !archiveBlocked) {
        const res = await saveReportToArchive({
          title: String(form.get("title") ?? ""),
          note: String(form.get("note") ?? ""),
          query,
        });
        setResult(res);
        if (!res.ok) return;
      }
      download(format, query);
      setDone({ format, archived: archive && !archiveBlocked });
    });
  }

  return (
    <>
      <Button size="sm" onClick={openDialog}>
        <FileDown aria-hidden="true" />
        Generuj raport
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generuj raport</DialogTitle>
            <DialogDescription>
              {templateLabel} · {period}
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <>
              <div className="space-y-2 rounded-sm border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm" role="status">
                <p className="flex items-center gap-2">
                  <Check className="size-4 text-green-ink" aria-hidden="true" />
                  Pobieranie pliku {done.format.toUpperCase()} rozpoczęte.
                </p>
                {done.archived && (
                  <p className="flex items-center gap-2">
                    <Archive className="size-4 text-green-ink" aria-hidden="true" />
                    Raport zapisano w archiwum (PDF, XLSX i CSV).
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => download(done.format, query)}>
                  Pobierz ponownie
                </Button>
                {done.archived ? (
                  <Link href="/reports/archive" className={buttonVariants()}>
                    Przejdź do archiwum
                  </Link>
                ) : (
                  <Button onClick={() => setOpen(false)}>Zamknij</Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-5">
              <fieldset className="space-y-2">
                <legend className="mb-2 text-[0.8125rem] font-medium text-strong">Format pliku</legend>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                  {FORMATS.map((f) => {
                    const Icon = f.icon;
                    const active = format === f.id;
                    return (
                      <label
                        key={f.id}
                        className={cn(
                          "flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                          active ? "border-primary bg-primary/5" : "border-border hover:border-[#c9d2de]",
                        )}
                      >
                        <input
                          type="radio"
                          name="format"
                          value={f.id}
                          checked={active}
                          onChange={() => setFormat(f.id)}
                          className="sr-only"
                        />
                        <span className="flex items-center gap-2 text-sm font-medium text-strong">
                          <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                          {f.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{f.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className={cn("space-y-3 rounded-md border border-border p-3", archiveBlocked && "bg-muted/40")}>
                <label className={cn("flex items-start gap-2.5", archiveBlocked ? "cursor-not-allowed" : "cursor-pointer")}>
                  <Checkbox
                    className="mt-0.5"
                    checked={archive && !archiveBlocked}
                    disabled={archiveBlocked}
                    onCheckedChange={setArchive}
                  />
                  <span className="space-y-0.5">
                    <span className={cn("block text-sm font-medium", archiveBlocked ? "text-muted-foreground" : "text-strong")}>
                      Zapisz kopię w archiwum
                    </span>
                    <span className="block text-xs text-muted-foreground">{archiveHint}</span>
                  </span>
                </label>

                {archive && !archiveBlocked && (
                  <div className="grid gap-3 pl-6.5">
                    <div className="space-y-1">
                      <Label htmlFor="archive-title">Nazwa *</Label>
                      <Input
                        id="archive-title"
                        name="title"
                        defaultValue={defaultTitle}
                        aria-invalid={result?.fieldErrors?.title ? true : undefined}
                        required
                      />
                      {result?.fieldErrors?.title && <p className="text-xs text-destructive">{result.fieldErrors.title}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="archive-note">Notatka</Label>
                      <Textarea
                        id="archive-note"
                        name="note"
                        rows={2}
                        placeholder="np. wersja przekazana audytorowi"
                        aria-invalid={result?.fieldErrors?.note ? true : undefined}
                      />
                      {result?.fieldErrors?.note && <p className="text-xs text-destructive">{result.fieldErrors.note}</p>}
                    </div>
                    {draftCount > 0 && (
                      <p className="rounded-sm border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs">
                        Raport zawiera {draftCount} niezweryfikowanych wpisów (szkiców) — w archiwum będzie oznaczony jako
                        zawierający dane niezweryfikowane.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {result?.error && <p className="text-sm text-destructive">{result.error}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileDown aria-hidden="true" />}
                  {pending
                    ? archive && !archiveBlocked
                      ? "Zapisywanie…"
                      : "Generowanie…"
                    : `Generuj ${format.toUpperCase()}${archive && !archiveBlocked ? " i zapisz" : ""}`}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
