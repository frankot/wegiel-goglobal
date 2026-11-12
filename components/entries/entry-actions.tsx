"use client";

import { useState, useTransition } from "react";
import { Check, CheckCheck, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteEntry,
  deleteInvoice,
  updateEntryQuantity,
  verifyEntry,
  verifyInvoiceDrafts,
  type ActionResult,
} from "@/lib/entries/actions";
import { formatQuantity } from "@/lib/emissions/format";
import { isManagerRole } from "@/lib/auth/permissions";
import type { InvoiceEntryItem } from "@/lib/db/invoices";

export interface Viewer {
  id: string;
  role: string;
}

const isManager = (v: Viewer) => isManagerRole(v.role);

function useAction(onDone: () => void) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<ActionResult>, after?: () => void) => {
    setError(null);
    start(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Operacja nie powiodła się.");
        return;
      }
      after?.();
      onDone();
    });
  };
  return { pending, error, run };
}

export function EntryRowActions({
  entry,
  viewer,
  onlyEntry,
  onDone,
}: {
  entry: InvoiceEntryItem;
  viewer: Viewer;
  onlyEntry: boolean;
  onDone: () => void;
}) {
  const { pending, error, run } = useAction(onDone);
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const manager = isManager(viewer);
  const canEdit = manager || (entry.authorId === viewer.id && entry.status === "DRAFT");
  const editUnit = entry.originalUnit ?? entry.unit;

  if (editing) {
    return (
      <form
        className="flex flex-wrap items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateEntryQuantity(entry.id, quantity), () => setEditing(false));
        }}
      >
        <Input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          inputMode="decimal"
          aria-label="Nowa ilość"
          className="h-7 w-28"
          autoFocus
        />
        <span className="text-xs text-muted-foreground">{editUnit}</span>
        <Button type="submit" size="icon-sm" variant="ghost" disabled={pending} aria-label="Zapisz ilość">
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditing(false)} aria-label="Anuluj">
          <X />
        </Button>
        {entry.status !== "DRAFT" && (
          <span className="w-full text-xs text-orange-ink">
            Wpis zmieni status na „Skorygowany”.
          </span>
        )}
        {error && <span className="w-full text-xs text-destructive">{error}</span>}
      </form>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-1">
      {error && <span className="text-xs text-destructive">{error}</span>}
      {manager && entry.status === "DRAFT" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => verifyEntry(entry.id))}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
          Zweryfikuj
        </Button>
      )}
      {canEdit && (
        <Button
          size="icon-sm"
          variant="ghost"
          title={entry.status === "DRAFT" ? "Popraw ilość" : "Skoryguj ilość"}
          aria-label={entry.status === "DRAFT" ? "Popraw ilość" : "Skoryguj ilość"}
          onClick={() => {
            setQuantity(formatQuantity(entry.originalQuantity ?? entry.quantity).replace(/\s/g, ""));
            setEditing(true);
          }}
        >
          <Pencil />
        </Button>
      )}
      {manager && (
        <Button
          size="icon-sm"
          variant="ghost"
          title={onlyEntry ? "Usuń fakturę" : "Usuń wpis"}
          aria-label={onlyEntry ? "Usuń fakturę" : "Usuń wpis"}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 />
        </Button>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={onlyEntry ? "Usunąć fakturę?" : "Usunąć wpis?"}
          description={
            onlyEntry
              ? "To jedyny wpis tej faktury — usunięta zostanie cała faktura wraz z załącznikami. Operacji nie można cofnąć."
              : `Wpis „${entry.sourceName}” zostanie usunięty i przestanie być liczony w raportach. Operacji nie można cofnąć.`
          }
          confirmLabel="Usuń"
          pending={pending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => run(() => deleteEntry(entry.id), () => setConfirmDelete(false))}
        />
      )}
    </div>
  );
}

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  entries,
  viewer,
  onDone,
  onDeleted,
}: {
  invoiceId: string;
  invoiceNumber: string | null;
  entries: InvoiceEntryItem[];
  viewer: Viewer;
  onDone: () => void;
  onDeleted: () => void;
}) {
  const verify = useAction(onDone);
  const remove = useAction(onDeleted);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isManager(viewer)) return null;
  const drafts = entries.filter((e) => e.status === "DRAFT").length;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pb-1">
      {(verify.error || remove.error) && (
        <span className="text-xs text-destructive">{verify.error ?? remove.error}</span>
      )}
      {drafts > 0 && (
        <Button
          size="sm"
          variant="outline"
          disabled={verify.pending}
          onClick={() => verify.run(() => verifyInvoiceDrafts(invoiceId))}
        >
          {verify.pending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
          Zweryfikuj szkice ({drafts})
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
        <Trash2 />
        Usuń fakturę
      </Button>
      {confirmDelete && (
        <ConfirmDialog
          title="Usunąć fakturę?"
          description={`Faktura ${invoiceNumber ?? "(bez numeru)"} zostanie usunięta razem z ${entries.length} ${entries.length === 1 ? "wpisem" : "wpisami"} i załącznikami. Operacji nie można cofnąć.`}
          confirmLabel="Usuń fakturę"
          pending={remove.pending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => remove.run(() => deleteInvoice(invoiceId), () => setConfirmDelete(false))}
        />
      )}
    </div>
  );
}
