import { StatusDot, type Tone } from "@/components/ui/badge";
import type { ParsedInvoiceStatus } from "@/lib/import/types";

const CARD_STATUS: Record<ParsedInvoiceStatus, { label: string; tone: Tone }> = {
  OK: { label: "Gotowa", tone: "green" },
  NEEDS_ATTENTION: { label: "Wymaga uwagi", tone: "yellow" },
  ERROR: { label: "Błąd", tone: "pink" },
};

export function CardStatusBadge({ status }: { status: ParsedInvoiceStatus }) {
  const cfg = CARD_STATUS[status];
  return <StatusDot tone={cfg.tone}>{cfg.label}</StatusDot>;
}

const ENTRY_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Szkic", tone: "grey" },
  VERIFIED: { label: "Zweryfikowany", tone: "green" },
  CORRECTED: { label: "Skorygowany", tone: "orange" },
};

export function EntryStatusBadge({ status }: { status: string }) {
  const cfg = ENTRY_STATUS[status] ?? { label: status, tone: "grey" as const };
  return <StatusDot tone={cfg.tone}>{cfg.label}</StatusDot>;
}

const CONFIDENCE = {
  EXACT: {
    label: "dopasowano automatycznie",
    className: "text-green-ink",
  },
  LIKELY: { label: "prawdopodobne", className: "text-orange-ink" },
  GUESS: { label: "zgadywane", className: "text-orange-ink" },
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
