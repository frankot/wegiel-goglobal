"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { History, Plus, Pencil } from "lucide-react";
import { FactorFormDialog } from "./factor-form";
import { FactorVersionDialog } from "./factor-version-dialog";
import { FactorHistoryDialog } from "./factor-history-dialog";
import { formatFactor, formatDate } from "@/lib/emissions/format";
import type { FactorDTO } from "@/lib/db/factors";

interface Props {
  factors: FactorDTO[];
  canManage: boolean;
}

type Status = "ACTIVE" | "FUTURE" | "ARCHIVED";

function statusOf(f: FactorDTO, now = new Date()): Status {
  if (new Date(f.validTo) < now) return "ARCHIVED";
  if (new Date(f.validFrom) > now) return "FUTURE";
  return "ACTIVE";
}

const SOURCE_LABEL: Record<string, string> = {
  KOBIZE: "KOBIZE",
  GHG_PROTOCOL: "GHG Protocol",
  CUSTOM: "Własny",
};

export function FactorTable({ factors, canManage }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<FactorDTO | null>(null);
  const [versioning, setVersioning] = useState<FactorDTO | null>(null);
  const [history, setHistory] = useState<FactorDTO | null>(null);

  const visible = factors.filter(
    (f) => showArchived || statusOf(f) !== "ARCHIVED",
  );

  const byCategory = visible.reduce<Record<string, FactorDTO[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <label className="flex w-fit items-center gap-2 text-sm">
        <Checkbox
          checked={showArchived}
          onCheckedChange={setShowArchived}
        />
        <span>Pokaż wersje archiwalne</span>
      </label>

      {Object.entries(byCategory).map(([category, rows]) => (
        <Card key={category} className="overflow-x-auto p-0">
          <div className="border-b px-4 py-2">
            <h3 className="text-sm font-semibold">{category}</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead className="text-right">Wartość</TableHead>
                <TableHead>Jednostka</TableHead>
                <TableHead>Źródło</TableHead>
                <TableHead>Zakres</TableHead>
                <TableHead>Ważny od</TableHead>
                <TableHead>Ważny do</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Akcje</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => {
                const status = statusOf(f);
                return (
                  <TableRow
                    key={f.id}
                    className={status === "ARCHIVED" ? "text-muted-foreground" : ""}
                  >
                    <TableCell className="max-w-64 font-medium">{f.name}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatFactor(f.value)}
                    </TableCell>
                    <TableCell className="text-xs">{f.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{SOURCE_LABEL[f.source] ?? f.source}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {f.scope === "SCOPE_1" ? "Zakres 1" : "Zakres 2"}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(f.validFrom)}</TableCell>
                    <TableCell className="text-xs">{formatDate(f.validTo)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="ghost"
                        className={
                          status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : status === "FUTURE"
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {status === "ACTIVE"
                          ? "Aktywny"
                          : status === "FUTURE"
                            ? "Przyszły"
                            : "Archiwalny"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVersioning(f)}
                            title="Dodaj nową wersję"
                          >
                            <Plus className="h-3 w-3" />
                            <span className="sr-only">Nowa wersja</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(f)}
                            title="Edytuj"
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="sr-only">Edytuj</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistory(f)}
                            title="Historia wersji"
                          >
                            <History className="h-3 w-3" />
                            <span className="sr-only">Historia</span>
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ))}

      {visible.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Brak wskaźników do wyświetlenia.
        </p>
      )}

      {editing && (
        <FactorFormDialog
          factor={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      {versioning && (
        <FactorVersionDialog
          factor={versioning}
          open
          onOpenChange={(o) => !o && setVersioning(null)}
        />
      )}
      {history && (
        <FactorHistoryDialog
          factor={history}
          open
          onOpenChange={(o) => !o && setHistory(null)}
        />
      )}
    </div>
  );
}

export { statusOf };
export type { Status };
