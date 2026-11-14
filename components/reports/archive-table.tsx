"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useSortedRows } from "@/components/ui/sortable";
import { deleteArchivedReport } from "@/lib/reports/archive-actions";
import { formatRange } from "@/lib/reports/params";
import { fmtTon } from "@/lib/reports/format";
import type { ArchivedReportDTO } from "@/lib/reports/archive";

const savedAt = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

const SORT = {
  title: (r: ArchivedReportDTO) => r.title,
  period: (r: ArchivedReportDTO) => r.periodFrom,
  co2e: (r: ArchivedReportDTO) => Number(r.totalCo2eKg),
  saved: (r: ArchivedReportDTO) => r.createdAt,
};

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function ArchiveTable({ reports, canManage }: { reports: ArchivedReportDTO[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<ArchivedReportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { sorted, sort, toggle } = useSortedRows(reports, SORT, { period: "desc", co2e: "desc", saved: "desc" });
  const head = { sort, onSort: toggle };

  if (reports.length === 0) {
    return (
      <Card className="px-5">
        <p className="text-sm text-muted-foreground">
          Archiwum jest puste.{" "}
          {canManage
            ? "Ustaw filtry w zakładce „Raport” i kliknij „Zapisz w archiwum”, aby zachować wersję raportu."
            : "Zapisane wersje raportów pojawią się tutaj."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      {error && <p className="px-5 pt-4 text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Nazwa" sortKey="title" {...head} />
            <SortableHead label="Okres" sortKey="period" {...head} />
            <SortableHead label="CO₂e" sortKey="co2e" align="right" {...head} />
            <SortableHead label="Zapisano" sortKey="saved" {...head} />
            <TableHead>Pliki</TableHead>
            {canManage && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="max-w-72 whitespace-normal">
                <span className="block font-medium text-strong">{r.title}</span>
                {r.note && <span className="block text-xs text-muted-foreground">{r.note}</span>}
                {r.includesDrafts && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    zawiera dane niezweryfikowane
                  </span>
                )}
                <Link
                  href={`/reports${r.query ? `?${r.query}` : ""}`}
                  className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-primary underline-offset-4 hover:underline"
                >
                  Otwórz z aktualnymi danymi
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              </TableCell>
              <TableCell className="text-xs">{formatRange(r.periodFrom, r.periodTo)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtTon(r.totalCo2eKg)}
                <span className="block text-xs text-muted-foreground">{r.entryCount} wpisów</span>
              </TableCell>
              <TableCell className="text-xs">
                {savedAt.format(new Date(r.createdAt))}
                <span className="block text-muted-foreground">{r.createdBy}</span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {r.files.map((f) => (
                    <a
                      key={f.id}
                      href={`/api/reports/archive/${r.id}/${f.format}`}
                      download
                      title={`${f.fileName} · ${kb(f.size)}`}
                      className={buttonVariants({ size: "sm", variant: f.format === "pdf" ? "outline" : "ghost" })}
                    >
                      {f.format.toUpperCase()}
                    </a>
                  ))}
                </div>
              </TableCell>
              {canManage && (
                <TableCell>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Usuń z archiwum"
                    aria-label={`Usuń z archiwum: ${r.title}`}
                    onClick={() => setConfirm(r)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {confirm && (
        <ConfirmDialog
          title="Usunąć raport z archiwum?"
          description={`„${confirm.title}” zostanie usunięty razem z plikami PDF, XLSX i CSV. Operacji nie można cofnąć.`}
          confirmLabel="Usuń"
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            start(async () => {
              const res = await deleteArchivedReport(confirm.id);
              setConfirm(null);
              if (!res.ok) setError(res.error ?? "Nie udało się usunąć raportu.");
              router.refresh();
            })
          }
        />
      )}
    </Card>
  );
}
