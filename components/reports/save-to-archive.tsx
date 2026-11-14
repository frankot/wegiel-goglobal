"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Archive, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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

interface Props {
  query: string;
  defaultTitle: string;
  period: string;
  draftCount: number;
  disabled?: boolean;
}

export function SaveToArchiveButton({ query, defaultTitle, period, draftCount, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ArchiveResult | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    start(async () => {
      setResult(
        await saveReportToArchive({
          title: String(form.get("title") ?? ""),
          note: String(form.get("note") ?? ""),
          query,
        }),
      );
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled}
        title={disabled ? "Raport nie zawiera wpisów" : undefined}
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        <Archive aria-hidden="true" />
        Zapisz w archiwum
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zapisz raport w archiwum</DialogTitle>
            <DialogDescription>
              {period}. Zapisane zostaną pliki PDF, XLSX i CSV z obecnymi danymi — późniejsze zmiany wpisów ich nie
              zmienią.
            </DialogDescription>
          </DialogHeader>

          {result?.ok ? (
            <>
              <p className="rounded-sm border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm" role="status">
                Raport zapisano w archiwum.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Zamknij
                </Button>
                <Link href="/reports/archive" className={buttonVariants()}>
                  Przejdź do archiwum
                </Link>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-4">
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
                  rows={3}
                  placeholder="np. wersja przekazana audytorowi 14.11.2026"
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
              {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {pending ? "Zapisywanie…" : "Zapisz w archiwum"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
