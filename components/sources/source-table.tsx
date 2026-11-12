"use client";

import { useState, useTransition } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Pencil, Plus, Power, KeyRound } from "lucide-react";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { SourceFormDialog } from "./source-form";
import { setSourceActive } from "@/lib/sources/actions";
import { SOURCE_TYPE_LABELS, type SourceType } from "@/lib/emissions/source-types";
import type { SourceRow } from "@/lib/db/sources";
import type { FactorDTO } from "@/lib/db/factors";
import { SortableHead, useSortedRows } from "@/components/ui/sortable";

const SORT = {
  name: (s: SourceRow) => s.name,
  type: (s: SourceRow) => SOURCE_TYPE_LABELS[s.type],
  factor: (s: SourceRow) => s.defaultFactorName,
  ids: (s: SourceRow) => s.ppeNumber ?? s.meterNumber ?? s.registrationNumber,
  entries: (s: SourceRow) => s.entryCount,
  status: (s: SourceRow) => (s.active ? 0 : 1),
};

interface Props {
  sources: SourceRow[];
  factors: FactorDTO[];
  canManage: boolean;
}

const TYPE_FILTER_ITEMS = [
  { value: "ALL", label: "Wszystkie typy" },
  ...(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((t) => ({
    value: t,
    label: SOURCE_TYPE_LABELS[t],
  })),
];

const SCOPE_FILTER_ITEMS = [
  { value: "ALL", label: "Oba zakresy" },
  { value: "SCOPE_1", label: "Zakres 1" },
  { value: "SCOPE_2", label: "Zakres 2" },
];

export function SourceTable({ sources, factors, canManage }: Props) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<SourceRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = sources.filter(
    (s) =>
      (showInactive || s.active) &&
      (typeFilter === "ALL" || s.type === typeFilter) &&
      (scopeFilter === "ALL" || s.scope === scopeFilter),
  );
  const { sorted, sort, toggle } = useSortedRows(visible, SORT, { entries: "desc" });
  const head = { sort, onSort: toggle };

  function toggleActive(source: SourceRow) {
    setError(null);
    startTransition(async () => {
      const res = await setSourceActive(source.id, !source.active);
      if (!res.ok) setError(res.errors?.join(" ") ?? "Nie udało się zmienić statusu.");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select items={TYPE_FILTER_ITEMS} value={typeFilter} onValueChange={setTypeFilter} aria-label="Filtr typu" />

        <Select items={SCOPE_FILTER_ITEMS} value={scopeFilter} onValueChange={setScopeFilter} aria-label="Filtr zakresu" />

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <span>Pokaż nieaktywne</span>
        </label>

        {canManage && (
          <TopbarActions>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Dodaj źródło
            </Button>
          </TopbarActions>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Nazwa" sortKey="name" {...head} />
              <SortableHead label="Typ / zakres" sortKey="type" {...head} />
              <SortableHead label="Domyślny wskaźnik" sortKey="factor" {...head} />
              <SortableHead label="Identyfikatory" sortKey="ids" {...head} />
              <SortableHead label="Wpisy" sortKey="entries" align="right" {...head} />
              <SortableHead label="Status" sortKey="status" {...head} />
              {canManage && <TableHead className="text-right">Akcje</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s) => (
              <TableRow key={s.id} className={s.active ? "" : "text-muted-foreground"}>
                <TableCell className="max-w-48 font-medium whitespace-normal">
                  {s.name}
                  {s.location && (
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {s.location}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {SOURCE_TYPE_LABELS[s.type]}
                  <span className="block text-muted-foreground">
                    {s.scope === "SCOPE_1" ? "Zakres 1" : "Zakres 2"} · {s.unit}
                  </span>
                </TableCell>
                <TableCell className="max-w-44 text-xs whitespace-normal">
                  {s.defaultFactorName ? (
                    <span className="line-clamp-2" title={s.defaultFactorName}>
                      {s.defaultFactorName}
                    </span>
                  ) : (
                    <span className="text-destructive">brak</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {s.ppeNumber ? (
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <KeyRound className="h-3 w-3" aria-hidden="true" />
                      PPE {s.ppeNumber}
                    </span>
                  ) : s.meterNumber ? (
                    <span>licznik {s.meterNumber}</span>
                  ) : s.registrationNumber ? (
                    <span>{s.registrationNumber}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.entryCount}
                  {s.draftCount > 0 && (
                    <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
                      ({s.draftCount} szk.)
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="ghost"
                    className={
                      s.active
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {s.active ? "Aktywne" : "Nieaktywne"}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(s)}
                        title="Edytuj"
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="sr-only">Edytuj {s.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        onClick={() => toggleActive(s)}
                        title={s.active ? "Dezaktywuj" : "Aktywuj"}
                      >
                        <Power className="h-3 w-3" />
                        <span className="sr-only">
                          {s.active ? "Dezaktywuj" : "Aktywuj"} {s.name}
                        </span>
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {sources.length === 0
              ? "Brak źródeł emisji. Dodaj licznik, instalację lub pojazd, żeby móc importować faktury."
              : "Żadne źródło nie pasuje do filtrów."}
          </p>
        )}
      </Card>

      {adding && (
        <SourceFormDialog factors={factors} open onOpenChange={setAdding} />
      )}
      {editing && (
        <SourceFormDialog
          source={editing}
          factors={factors}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}
