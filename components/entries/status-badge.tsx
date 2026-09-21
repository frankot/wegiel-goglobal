import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ParsedInvoiceStatus } from "@/lib/import/types";

const CARD_STATUS = {
  OK: {
    label: "Gotowa",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  NEEDS_ATTENTION: {
    label: "Wymaga uwagi",
    icon: AlertTriangle,
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  ERROR: {
    label: "Błąd",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
} as const;

export function CardStatusBadge({ status }: { status: ParsedInvoiceStatus }) {
  const cfg = CARD_STATUS[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="ghost" className={cfg.className}>
      <Icon aria-hidden="true" />
      {cfg.label}
    </Badge>
  );
}

const ENTRY_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Szkic", className: "bg-muted text-muted-foreground" },
  VERIFIED: {
    label: "Zweryfikowany",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  CORRECTED: {
    label: "Skorygowany",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

export function EntryStatusBadge({ status }: { status: string }) {
  const cfg = ENTRY_STATUS[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="ghost" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

const CONFIDENCE = {
  EXACT: {
    label: "dopasowano automatycznie",
    className: "text-emerald-700 dark:text-emerald-400",
  },
  LIKELY: { label: "prawdopodobne", className: "text-amber-700 dark:text-amber-400" },
  GUESS: { label: "zgadywane", className: "text-amber-700 dark:text-amber-400" },
  NONE: { label: "brak dopasowania", className: "text-destructive" },
} as const;

export function MatchHint({
  confidence,
  reason,
}: {
  confidence: keyof typeof CONFIDENCE;
  reason: string;
}) {
  const cfg = CONFIDENCE[confidence];
  return (
    <span className={`text-xs ${cfg.className}`}>
      {confidence === "EXACT" ? "✓" : confidence === "NONE" ? "✗" : "⚠"} {reason}
    </span>
  );
}
