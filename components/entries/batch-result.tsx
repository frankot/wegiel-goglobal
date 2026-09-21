"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import type { SaveBatchResult } from "@/lib/entries/actions";

/** „Zapisano 2 z 3" — wynik zapisu częściowego (D4). */
export function BatchResult({ result }: { result: SaveBatchResult }) {
  const total = result.saved.length + result.failed.length;

  return (
    <Card className="space-y-2 p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        {result.failed.length === 0 ? (
          <CheckCircle2
            className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        )}
        Zapisano {result.saved.length} z {total}
        {result.saved.length > 0 && (
          <Link
            href="/entries"
            className="ml-1 font-normal text-primary underline-offset-4 hover:underline"
          >
            zobacz faktury
          </Link>
        )}
      </p>

      {result.failed.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Poniższe faktury zostały w podglądzie — popraw i zapisz ponownie:
          </p>
          {result.failed.map((f) => (
            <p key={f.clientId} className="text-xs text-destructive">
              {f.error}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
