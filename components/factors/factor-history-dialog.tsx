"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { getFactorHistory } from "@/lib/factors/actions";
import { formatFactor, formatDate } from "@/lib/emissions/format";
import type { FactorDTO } from "@/lib/db/factors";

interface Props {
  factor: FactorDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FactorHistoryDialog({ factor, open, onOpenChange }: Props) {
  const [versions, setVersions] = useState<FactorDTO[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFactorHistory(factor.id).then((rows) => {
      if (!cancelled) setVersions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [factor.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historia wersji</DialogTitle>
          <DialogDescription>{factor.name}</DialogDescription>
        </DialogHeader>

        {versions === null ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Wczytywanie…
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Wartość</TableHead>
                <TableHead>Ważny od</TableHead>
                <TableHead>Ważny do</TableHead>
                <TableHead>Nazwa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id} className={v.id === factor.id ? "font-medium" : ""}>
                  <TableCell className="text-right tabular-nums">
                    {formatFactor(v.value)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(v.validFrom)}</TableCell>
                  <TableCell className="text-xs">{formatDate(v.validTo)}</TableCell>
                  <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                    {v.name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <p className="text-xs text-muted-foreground">
          Wpisy emisyjne przechowują snapshot wskaźnika z momentu zapisu, więc
          dodanie nowej wersji nie zmienia historycznych obliczeń.
        </p>
      </DialogContent>
    </Dialog>
  );
}
