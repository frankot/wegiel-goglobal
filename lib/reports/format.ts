import { SOURCE_TYPE_LABELS, type SourceType } from "@/lib/emissions/source-types";
import { formatRange } from "./params";
import { STATUS_LABELS, type ReportParams } from "./params";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("pl-PL", { minimumFractionDigits: min, maximumFractionDigits: max });

export function fmtTon(kg: string | number): string {
  return `${nf(3, 3).format(Number(kg) / 1000)} t`;
}

export function fmtKg(kg: string | number): string {
  return `${nf(0, 0).format(Number(kg))} kg`;
}

export function fmtQty(q: string | number): string {
  return nf(0, 2).format(Number(q));
}

export function fmtFactor(v: string | number): string {
  return nf(0, 6).format(Number(v));
}

export function fmtPct(p: number): string {
  return `${nf(0, 1).format(p)}%`;
}

export function fmtChange(p: number | null): string {
  if (p === null) return "—";
  return `${p > 0 ? "+" : ""}${nf(0, 1).format(p)}%`;
}

export function fmtUsage(usage: { quantity: string; unit: string }[]): string {
  return usage.map((u) => `${fmtQty(u.quantity)} ${u.unit}`).join(" · ");
}

export function scopeLabel(scope: "SCOPE_1" | "SCOPE_2"): string {
  return scope === "SCOPE_1" ? "Zakres 1" : "Zakres 2";
}

export const ORIGIN_LABELS = {
  KOBIZE: "KOBiZE",
  GHG_PROTOCOL: "GHG Protocol",
  CUSTOM: "Własny",
} as const;

export function filtersSummary(
  p: ReportParams,
  sourceNames: Map<string, string>,
): string[] {
  const parts: string[] = [];
  parts.push(p.scopes.length === 1 ? scopeLabel(p.scopes[0]!) : "Zakres 1 i 2");
  if (p.types.length) parts.push(p.types.map((t: SourceType) => SOURCE_TYPE_LABELS[t]).join(", "));
  if (p.sourceIds.length) {
    parts.push(p.sourceIds.map((id) => sourceNames.get(id) ?? id).join(", "));
  }
  parts.push(`Statusy: ${p.statuses.map((s) => STATUS_LABELS[s].toLowerCase()).join(", ")}`);
  return parts;
}

export function reportFileName(p: ReportParams, ext: string): string {
  return `raport-slad-weglowy_${p.from}_${p.to}.${ext}`;
}

export { formatRange };

export function csvSafeText(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}
